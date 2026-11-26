# One-Page Project Report: VoxSales AI (with SalesPilot AI Capabilities)

- **Project Title**: VoxSales AI — Autonomous AI Sales Voice Agent & CRM Platform
- **Problem Statement**: Education and B2C sales teams lose high-intent prospects due to delayed callbacks, inconsistent lead qualification, ungrounded answers about pricing/syllabi, and manual CRM/calendar entry.
- **Proposed Solution**: An autonomous voice-first AI sales counselor that conducts natural real-time conversations, grounds every answer in a FAISS vector knowledge base, qualifies leads using both a 0–100 rubric and BANT scoring, retains cross-call memory, and automates appointment booking and CRM synchronization.
- **Key Features**:
  - Dual Voice Pipeline: Browser Web Speech API + Deepgram Nova-2/Aura & LiveKit WebRTC token minting.
  - Sub-second LLM Inference: Groq LPU (`qwen/qwen3.8-27b`) with Gemini fallback and deterministic counselor engine.
  - Live RAG Knowledge Base: FAISS `IndexFlatIP` + `all-MiniLM-L6-v2` supporting `.pdf`, `.docx`, `.txt`, `.csv`, and pasted text uploads.
  - Qualification & Memory: 0–100 Lead Score, BANT breakdown (Budget 25, Authority 20, Need 35, Timeline 20), sentiment analysis, and MongoDB cross-call `lead_memories`.
  - Autonomous Actions: Atomic slot booking with 409 conflict prevention, `.ics` calendar export, optional HubSpot CRM sync, follow-up tasks, human escalation, Do-Not-Call enforcement, and CSV export.
- **Technology Stack**: React 19, Vite, Tailwind CSS, FastAPI, Python 3.14, MongoDB 8.x, Meta FAISS, Sentence Transformers, Groq LPU, Google Gemini, Deepgram, LiveKit, Docker.
- **Architecture Overview**: React SPA communicates over REST with FastAPI, which orchestrates RAG retrieval (`rag.py`), AI inference (`ai_service.py`), scoring (`lead_scorer.py`), cross-call memory (`memory_service.py`), HubSpot sync (`hubspot_service.py`), and MongoDB persistence (`database.py`).
- **Business Value**: Cuts response time to <1 second, eliminates double-booked counseling slots, standardizes BANT qualification, and reduces manual CRM entry.
- **Current Implementation Status**: End-to-end MVP running locally and containerized (`Dockerfile`, `docker-compose.yml`, `render.yaml`) with live Groq, Gemini, Deepgram, LiveKit, and MongoDB verified.
- **Future Scalability**: Designed to scale to 100,000 users using stateless FastAPI replicas, Redis caching/rate limiting, Qdrant/pgvector, S3 document storage, and isolated LiveKit voice workers (`ARCHITECTURE.md`).
