import base64
import hashlib
import hmac
import json
import time
import uuid
import httpx
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.routes.agent import InteractRequest, interact

router = APIRouter(prefix="/api/voice", tags=["Real-Time Voice (Deepgram + LiveKit)"])

DEEPGRAM_LISTEN_URL = "https://api.deepgram.com/v1/listen"
DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak"
TTS_MODEL = "aura-2-thalia-en"
LANGUAGE_MAP = {"en-IN": "en", "hi-IN": "hi", "te-IN": "en", "ta-IN": "en", "kn-IN": "en", "ml-IN": "en"}


class LiveKitTokenRequest(BaseModel):
    room_name: Optional[str] = None
    identity: Optional[str] = None


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _mint_livekit_jwt(api_key: str, api_secret: str, room_name: str, identity: str) -> str:
    now = int(time.time())
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64url(
        json.dumps(
            {
                "iss": api_key,
                "sub": identity,
                "nbf": now,
                "exp": now + 3600,
                "video": {
                    "room": room_name,
                    "roomJoin": True,
                    "canPublish": True,
                    "canSubscribe": True,
                },
            },
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode()
    sig = _b64url(hmac.new(api_secret.encode(), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


@router.post("/turn")
async def deepgram_voice_turn(
    audio: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    language: str = Form("en-IN"),
    candidate_name: Optional[str] = Form(None),
    candidate_email: Optional[str] = Form(None),
    candidate_phone: Optional[str] = Form(None),
):
    """
    SalesPilot-style turn-based voice endpoint:
    1. Transcribe uploaded audio via Deepgram Nova-2 STT.
    2. Run VoxSales RAG + AI + BANT + Cross-Call Memory pipeline.
    3. Synthesize spoken reply via Deepgram Aura TTS.
    """
    if not settings.DEEPGRAM_API_KEY:
        return JSONResponse(
            status_code=503,
            content={"detail": "Deepgram is not connected — set DEEPGRAM_API_KEY in Settings."},
        )

    audio_bytes = await audio.read()
    if not audio_bytes:
        return JSONResponse(status_code=422, content={"detail": "Empty audio upload"})

    content_type = audio.content_type or "audio/webm"
    dg_lang = LANGUAGE_MAP.get(language, "en")
    dg_headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            stt_resp = await client.post(
                DEEPGRAM_LISTEN_URL,
                params={"model": "nova-2", "smart_format": "true", "language": dg_lang},
                headers={**dg_headers, "Content-Type": content_type},
                content=audio_bytes,
            )
    except httpx.HTTPError as exc:
        return JSONResponse(status_code=502, content={"detail": f"Deepgram STT failed: {exc}"})

    if stt_resp.status_code != 200:
        return JSONResponse(status_code=502, content={"detail": f"Deepgram STT HTTP {stt_resp.status_code}: {stt_resp.text[:300]}"})

    try:
        user_text = (stt_resp.json()["results"]["channels"][0]["alternatives"][0].get("transcript") or "").strip()
    except (KeyError, IndexError, ValueError):
        return JSONResponse(status_code=502, content={"detail": "Unexpected Deepgram STT response"})

    if not user_text:
        return {"user_text": "", "reply": "", "audio_base64": "", "audio_content_type": "audio/mpeg", "audio_error": "No speech detected."}

    agent_res = await interact(
        InteractRequest(
            session_id=session_id,
            message=user_text,
            mode="voice",
            language=language,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone,
        )
    )

    audio_b64 = ""
    audio_err = None
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            tts_resp = await client.post(
                DEEPGRAM_SPEAK_URL,
                params={"model": TTS_MODEL},
                headers={**dg_headers, "Content-Type": "application/json"},
                json={"text": agent_res["reply"]},
            )
        if tts_resp.status_code == 200:
            audio_b64 = base64.b64encode(tts_resp.content).decode("ascii")
        else:
            audio_err = f"Deepgram TTS HTTP {tts_resp.status_code}"
    except httpx.HTTPError as exc:
        audio_err = f"Deepgram TTS failed: {exc}"

    return {
        **agent_res,
        "user_text": user_text,
        "audio_base64": audio_b64,
        "audio_content_type": "audio/mpeg",
        "audio_error": audio_err,
    }


@router.post("/livekit-token")
def create_livekit_token(req: LiveKitTokenRequest):
    """Mint a LiveKit WebRTC room token for real-time voice streaming."""
    missing = [
        name
        for name, val in [
            ("LIVEKIT_URL", settings.LIVEKIT_URL),
            ("LIVEKIT_API_KEY", settings.LIVEKIT_API_KEY),
            ("LIVEKIT_API_SECRET", settings.LIVEKIT_API_SECRET),
        ]
        if not val
    ]
    if missing:
        return JSONResponse(
            status_code=503,
            content={"detail": f"LiveKit is not connected — missing {', '.join(missing)}."},
        )

    room_name = (req.room_name or f"voxsales-{uuid.uuid4().hex[:8]}").strip()
    identity = (req.identity or f"prospect-{uuid.uuid4().hex[:6]}").strip()
    token = _mint_livekit_jwt(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET, room_name, identity)
    return {"url": settings.LIVEKIT_URL, "room_name": room_name, "identity": identity, "token": token}
