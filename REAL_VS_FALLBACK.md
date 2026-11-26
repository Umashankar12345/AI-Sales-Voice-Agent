# Real vs Fallback Integration Matrix

| Component | Real Implementation | Fallback / Local Mode | UI & API Transparency |
|---|---|---|---|
| **LLM Inference** | Groq LPU (`qwen/qwen3.8-27b`) & Google Gemini (`gemini-3.8-flash`) with bounded retry (`ai_service.py`) | Deterministic `_generate_intelligent_fallback()` | Returns `is_fallback: true/false`, `provider`, `model`, and `request_id`; `VoiceAgentPage.jsx` displays `GROQ` / `GEMINI` / `FALLBACK` badge. |
| **Speech-to-Text** | Deepgram Nova-2 (`POST /api/voice/turn`) & Browser `SpeechRecognition` | Text chat input | `VoiceAgentPage.jsx` has explicit mode selector (`Web Speech API` / `Deepgram STT+TTS` / `LiveKit Room`). |
| **Text-to-Speech** | Deepgram Aura (`aura-2-thalia-en`) & Browser `speechSynthesis` | Silent text mode (`autoSpeak: false`) | Deepgram returns base64 MP3; Hindi TTS relies on browser `hi-IN` voices (Deepgram `aura-2-thalia-en` is English). |
| **LiveKit Voice** | `POST /api/voice/livekit-token` + `voice-agent/agent.py` worker | Browser Web Speech / Deepgram turn-based | Token minting verified; live room participation requires running `python voice-agent/agent.py start`. |
| **RAG Retrieval** | `all-MiniLM-L6-v2` (384-dim) + FAISS `IndexFlatIP` + MongoDB `kb_documents` | TF-IDF + FAISS if `sentence-transformers` unavailable | `RAG_MIN_SIMILARITY=0.22` filters out unrelated queries (`0` chunks returned). |
| **CRM & HubSpot** | MongoDB `leads` + CSV export + HubSpot API (`hubspot_service.py`) | Built-in MongoDB CRM only | HubSpot returns `{ok: false, error: "HubSpot is not connected..."}` when `HUBSPOT_ACCESS_TOKEN` is unset. |
| **Calendar** | Standard `.ics` calendar export (`GET /api/appointments/{id}/ics`) | `.ics` file download | `GET /api/appointments/google-calendar/status` reports `connected: false` when OAuth env vars are unset. |
| **Authentication** | `bcrypt` + HS256 JWT + `org_id` tenant isolation (`auth.py`) | `ALLOW_UNAUTH_DEMO=true` (`org_default` for local demo) | `AuthModal.jsx` + `Navbar.jsx` allow Sign In / Register Org / Logout; set `ALLOW_UNAUTH_DEMO=false` for strict prod. |
