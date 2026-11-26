from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path
import os
from app.config import settings
from app.ai_service import ai_service

router = APIRouter(prefix="/api/settings", tags=["Settings & Model Configuration"])

class ApiKeyUpdate(BaseModel):
    gemini_api_key: Optional[str] = Field(None, description="Google Gemini API Key")
    groq_api_key: Optional[str] = Field(None, description="Groq Ultra-Fast API Key")


class IntegrationsKeyUpdate(BaseModel):
    deepgram_api_key: Optional[str] = None
    livekit_url: Optional[str] = None
    livekit_api_key: Optional[str] = None
    livekit_api_secret: Optional[str] = None
    hubspot_access_token: Optional[str] = None


def _upsert_env_vars(updates: dict[str, str]) -> None:
    env_path = settings.BASE_DIR / ".env"
    lines = []
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    remaining = dict(updates)
    new_lines = []
    for line in lines:
        matched = False
        for k, v in updates.items():
            if line.startswith(f"{k}="):
                new_lines.append(f"{k}={v}\n")
                remaining.pop(k, None)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    for k, v in remaining.items():
        new_lines.append(f"{k}={v}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

@router.get("/status")
def get_settings_status():
    has_gemini = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 8)
    has_groq = bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 8)
    has_deepgram = bool(settings.DEEPGRAM_API_KEY and len(settings.DEEPGRAM_API_KEY) > 8)
    has_livekit = bool(settings.LIVEKIT_URL and settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET)
    has_hubspot = bool(settings.HUBSPOT_ACCESS_TOKEN and len(settings.HUBSPOT_ACCESS_TOKEN) > 8)
    
    groq_preview = f"{settings.GROQ_API_KEY[:6]}...{settings.GROQ_API_KEY[-4:]}" if has_groq else None
    gemini_preview = f"{settings.GEMINI_API_KEY[:6]}...{settings.GEMINI_API_KEY[-4:]}" if has_gemini else None

    active_provider = "Groq LPU (Ultra-Fast 300ms)" if getattr(ai_service, 'groq_client', None) else ("Gemini Flash" if getattr(ai_service, 'client', None) else "Instant Contextual Counselor")

    return {
        "groq_active": bool(getattr(ai_service, 'groq_client', None) is not None),
        "gemini_active": bool(getattr(ai_service, 'client', None) is not None),
        "has_groq_key": has_groq,
        "has_gemini_key": has_gemini,
        "has_deepgram_key": has_deepgram,
        "has_livekit": has_livekit,
        "has_hubspot_token": has_hubspot,
        "livekit_url": settings.LIVEKIT_URL or None,
        "groq_preview": groq_preview,
        "gemini_preview": gemini_preview,
        "active_provider": active_provider,
        "model_name": "qwen/qwen3.8-27b (Groq LPU)" if getattr(ai_service, 'groq_client', None) else ("gemini-2.5-flash" if getattr(ai_service, 'client', None) else "Autonomous Educational Counselor Engine")
    }

@router.post("/groq-key")
def update_groq_key(req: ApiKeyUpdate):
    """
    Saves new Groq API key to .env and immediately reinitializes the Groq client.
    """
    key = (req.groq_api_key or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Groq API key cannot be empty")

    settings.GROQ_API_KEY = key
    os.environ["GROQ_API_KEY"] = key

    # Persist to .env file
    env_path = settings.BASE_DIR / ".env"
    try:
        lines = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        
        found = False
        new_lines = []
        for line in lines:
            if line.startswith("GROQ_API_KEY="):
                new_lines.append(f"GROQ_API_KEY={key}\n")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.insert(0, f"GROQ_API_KEY={key}\n")

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        ai_service._init_groq()

        return {
            "success": True,
            "message": "Groq API key activated! Real-time voice agent is now running on LPU inference (<400ms).",
            "groq_active": ai_service.groq_client is not None,
            "model": "llama-3.3-70b-versatile"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save Groq key: {e}")

@router.post("/gemini-key")
def update_gemini_key(req: ApiKeyUpdate):
    """
    Saves new Gemini API key to .env and immediately reinitializes the AI service client.
    """
    key = req.gemini_api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty")

    settings.GEMINI_API_KEY = key
    os.environ["GEMINI_API_KEY"] = key

    # Persist to .env file
    env_path = settings.BASE_DIR / ".env"
    try:
        lines = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        
        found = False
        new_lines = []
        for line in lines:
            if line.startswith("GEMINI_API_KEY="):
                new_lines.append(f"GEMINI_API_KEY={key}\n")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.insert(0, f"GEMINI_API_KEY={key}\n")

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        # Re-initialize Gemini client
        ai_service._init_gemini()

        return {
            "success": True,
            "message": "Gemini API key successfully saved and activated! AI model is now live.",
            "gemini_active": ai_service.client is not None,
            "model": "gemini-2.5-flash"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save API key: {e}")


@router.post("/integrations")
def update_integrations(req: IntegrationsKeyUpdate):
    """Save Deepgram, LiveKit, and HubSpot keys to .env and live settings."""
    updates: dict[str, str] = {}
    if req.deepgram_api_key is not None and req.deepgram_api_key.strip():
        val = req.deepgram_api_key.strip()
        settings.DEEPGRAM_API_KEY = val
        os.environ["DEEPGRAM_API_KEY"] = val
        updates["DEEPGRAM_API_KEY"] = val
    if req.livekit_url is not None and req.livekit_url.strip():
        val = req.livekit_url.strip()
        settings.LIVEKIT_URL = val
        os.environ["LIVEKIT_URL"] = val
        updates["LIVEKIT_URL"] = val
    if req.livekit_api_key is not None and req.livekit_api_key.strip():
        val = req.livekit_api_key.strip()
        settings.LIVEKIT_API_KEY = val
        os.environ["LIVEKIT_API_KEY"] = val
        updates["LIVEKIT_API_KEY"] = val
    if req.livekit_api_secret is not None and req.livekit_api_secret.strip():
        val = req.livekit_api_secret.strip()
        settings.LIVEKIT_API_SECRET = val
        os.environ["LIVEKIT_API_SECRET"] = val
        updates["LIVEKIT_API_SECRET"] = val
    if req.hubspot_access_token is not None and req.hubspot_access_token.strip():
        val = req.hubspot_access_token.strip()
        settings.HUBSPOT_ACCESS_TOKEN = val
        os.environ["HUBSPOT_ACCESS_TOKEN"] = val
        updates["HUBSPOT_ACCESS_TOKEN"] = val

    if not updates:
        raise HTTPException(status_code=400, detail="Provide at least one integration key to save.")

    _upsert_env_vars(updates)
    return {"success": True, "message": "Integration credentials saved.", "updated": list(updates.keys())}
