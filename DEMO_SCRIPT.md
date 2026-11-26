# End-to-End Demo Script — VoxSales AI + SalesPilot Capabilities

Follow this walkthrough during a live demonstration or technical interview:

1. **Start Services**: Run `run_demo.bat` (or `docker compose up --build`) and open `http://localhost:5173/`.
2. **Verify API Keys**: Click **AI Keys** in the navbar (or open **Settings**) to see live connection status for **Groq LPU**, **Gemini**, **Deepgram**, **LiveKit**, and **HubSpot**.
3. **Upload Knowledge Base Document**: Open **Knowledge Base** (`/knowledge`) or call `POST /api/knowledge/upload` with a `.pdf`, `.docx`, `.txt`, `.csv`, or pasted text, then test semantic search latency in the FAISS simulator.
4. **Register Prospect**: On **Voice Agent** (`/agent`), enter Name, Email, Phone, and Target Course to link the session to MongoDB CRM.
5. **Voice / Multilingual Consultation**: Click the microphone (or type in English / Hindi / Hinglish) and ask: *"What is the Python course fee, duration, and EMI?"*
6. **Inspect RAG & AI Response**: Point out the retrieved FAISS chunks + cosine similarity scores and the sub-second Groq LPU reply spoken aloud.
7. **Live BANT & Lead Scoring**: Observe the right-hand CRM panel updating both the **0–100 Lead Score** and **BANT breakdown** (Budget, Authority, Need, Timeline) plus **Sentiment**.
8. **Cross-Call Memory**: Start a new session with the same email/phone and ask a follow-up; show that `lead_memories` are loaded into context automatically.
9. **Book Appointment & Export `.ics`**: Click **Book Slot**, confirm an open slot (attempting the same slot again demonstrates `409 Conflict` double-booking protection), then go to **Appointments** (`/appointments`) and click **.ics** to download the calendar invite.
10. **CRM, HubSpot Sync & CSV Export**: Open **Leads** (`/leads`), click **View** on the prospect to inspect BANT + Cross-Call Memory, click **Sync HubSpot** (shows live sync or honest `HUBSPOT_ACCESS_TOKEN is not set` message), and export leads via `/api/leads/export/csv`.
11. **Executive Dashboard**: Open **Dashboard** (`/`) and **Analytics** (`/analytics`) to verify all KPIs, charts, and conversion numbers reflect real MongoDB records.
