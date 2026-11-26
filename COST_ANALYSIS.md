# Cost & Commercial Analysis (INR)

All figures below are **planning estimates** in Indian Rupees (assuming `1 USD = ₹85`), separating usage-based AI API costs from fixed infrastructure costs.

## Core Usage Assumptions
- **Active callers**: 20% of registered users make calls in a given month.
- **Average calls per active user**: 2 calls/month (average **3 minutes/call** = 6 voice minutes/active user/month).
- **LLM tokens per 3-minute call**: ~2,500 input tokens + ~600 output tokens (RAG context + 6–8 conversational turns).
- **Provider unit rates (estimated public tiers)**:
  - **Deepgram Nova-2 STT**: ~₹0.37/min (`$0.0043/min`)
  - **Deepgram Aura TTS**: ~₹0.26/min (`$0.015/1k chars` ≈ 200 chars/min)
  - **Groq LPU (`qwen` / `llama`)**: ~₹0.05 per 3-min call (or ₹0 on Browser Web Speech API)
  - **LiveKit Cloud**: Free tier up to 5,000 participant-mins/mo; ~₹0.34/min thereafter

## Monthly Cost Breakdown by Scale

| User Tier | Active Callers/Mo | Total Call Mins/Mo | STT + TTS (Deepgram) | LLM (Groq/Gemini) | LiveKit Media | Infra (App + DB + Redis + Storage + Monitoring) | **Estimated Monthly Total** | **Est. Cost / Call** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **100 Users** | 20 | 120 mins | ₹76 (₹0 with Web Speech) | ₹5 | ₹0 (Free tier) | ₹0 – ₹600 (Render Free/Starter) | **₹81 – ₹681** | **₹2.00 – ₹17.00** |
| **1,000 Users** | 200 | 1,200 mins | ₹756 | ₹50 | ₹0 (Free tier) | ₹2,500 (1× App + Managed DB) | **₹3,306** | **₹8.27** |
| **10,000 Users** | 2,000 | 12,000 mins | ₹7,560 | ₹500 | ₹2,380 | ₹12,000 (2× App + DB + Redis + S3) | **₹22,440** | **₹5.61** |
| **100,000 Users** | 20,000 | 120,000 mins | ₹75,600 | ₹5,000 | ₹39,100 | ₹68,000 (Auto-scale API + Workers + HA DB + Redis + Observability) | **₹1,87,700** | **₹4.69** |

> **Note**: Using browser-native Web Speech API (STT + TTS) reduces Deepgram + LiveKit costs to **₹0** for web-only deployments, bringing the 1,000-user tier down to ~₹2,550/month. Actual enterprise volume discounts from Deepgram, Groq, and LiveKit will lower per-minute rates at 100k+ scale.
