"""LiveKit Agents real-time voice worker for VoxSales AI.

Connects to LiveKit Cloud rooms using Deepgram STT + Groq LLM + Deepgram Aura TTS
with Silero VAD, and forwards turns/transcripts to the VoxSales FastAPI backend.

Run:
    pip install -r requirements.txt
    python agent.py start
"""

import os
import logging
import httpx
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, groq, silero

logger = logging.getLogger("voxsales.livekit_worker")

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Connected to LiveKit room: {ctx.room.name}")

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are VoxSales AI, a helpful technical education counselor for Fortivex Education. "
            "Keep spoken replies concise (1-3 sentences), qualify leads on Budget, Authority, Need, "
            "and Timeline, and never invent pricing or course details."
        ),
    )

    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-2"),
        llm=groq.LLM(model="qwen/qwen3.8-27b"),
        tts=deepgram.TTS(model="aura-2-thalia-en"),
        chat_ctx=initial_ctx,
        allow_interruptions=True,
    )
    assistant.start(ctx.room)

    @assistant.on("user_speech_committed")
    def on_user_speech(msg: llm.ChatMessage):
        try:
            httpx.post(
                f"{BACKEND_URL}/api/agent/interact",
                json={"session_id": ctx.room.name, "message": str(msg.content), "mode": "voice"},
                timeout=5.0,
            )
        except Exception as exc:
            logger.warning(f"Failed to persist LiveKit turn: {exc}")

    await assistant.say("Hello! Welcome to VoxSales Academy. How can I help you today?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="voxsales-agent"))
