# System Architecture — VoxSales AI + SalesPilot Capabilities

## A. Individual MVP Architecture (Implemented & Running)

The current MVP runs cleanly on a single host or via `docker-compose.yml` (`Dockerfile` + `mongo:8`):

```mermaid
flowchart TD
    User(["Prospective Student / Browser"]) -->|"Web Speech API or Mic Audio"| FE["React 19 + Vite Frontend (:5173)"]
    FE -->|"REST JSON / Multipart Audio"| API["FastAPI Backend (:8000)"]
    API -->|"Turn-based STT/TTS"| DG["Deepgram Nova-2 & Aura"]
    API -->|"WebRTC Room Token"| LK["LiveKit Cloud"]
    API -->|"384-dim Vector Search"| RAG["FAISS IndexFlatIP + all-MiniLM-L6-v2"]
    API -->|"Sub-300ms Inference"| LLM["Groq LPU (qwen3.8-27b) / Gemini 3.8 Flash"]
    API -->|"BANT + 0-100 Score + Memory"| DB[("MongoDB 8.x (voxsales_db)")]
    API -->|"Optional CRM Sync"| HS["HubSpot CRM API"]
```

## B. Production-Scale Architecture for 100,000 Users (Proposed)

To scale toward 100,000 registered users and concurrent voice calls without single-node bottlenecks:

```mermaid
flowchart LR
    Clients(["100k Users (Web / Mobile)"]) --> CDN["Cloudflare CDN + WAF + Rate Limiter"]
    CDN -->|"Static SPA"| S3UI["Object Storage (S3 / R2)"]
    CDN -->|"HTTPS / WSS"| ALB["Load Balancer (AWS ALB / Nginx)"]
    ALB -->|"Horizontal Pods"| API["Stateless FastAPI Cluster (Auto-scaling)"]
    Clients <-->|"WebRTC Audio"| LK["LiveKit SFU Cluster"]
    LK <-->|"Realtime Media"| Workers["Dedicated LiveKit Voice-Agent Workers"]
    Workers -->|"STT / TTS"| DG["Deepgram Streaming API"]
    Workers -->|"LLM"| Groq["Groq LPU / Gemini"]
    API --> Redis[("Redis Cluster (Rate Limits, Sessions, Cache)")]
    API --> Queue["Task Queue (Celery / BullMQ)"]
    Queue -->|"Async HubSpot / Emails / Analytics"| WorkersBG["Background Workers"]
    API --> DB[("MongoDB Atlas / PostgreSQL Primary + Read Replicas")]
    API --> VecDB[("Qdrant / pgvector Cluster")]
    API --> Docs["S3 / R2 Document Storage"]
    API --> Obs["Prometheus + Grafana + Sentry"]
```

### Key Scaling Decisions (100k Users)
- **Stateless API Tier**: Move FAISS local memory index to a shared vector store (Qdrant / pgvector) so multiple FastAPI replicas share uploaded documents.
- **Voice Worker Isolation**: Run LiveKit voice-agent workers on separate auto-scaling compute nodes from REST API pods.
- **Database & Caching**: Connection pooling, compound indexes on `(lead_id, created_at)` and `(slot_date, slot_time)`, plus Redis caching for dashboard aggregations and rate limiting.
- **High Availability**: Multi-AZ database replicas, automated daily snapshots, and circuit breakers around Groq/Gemini/Deepgram.
