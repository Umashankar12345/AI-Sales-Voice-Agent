import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from collections import defaultdict
import time
import uvicorn
from datetime import datetime, timedelta

from app.config import settings
from app.database import db
from app.rag import rag_service
from app import auth
from app.routes import agent, leads, appointments, dashboard, knowledge, settings as settings_route, voice_live

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("voxsales.main")

def seed_initial_demo_leads():
    """
    Disabled demo seeding so that database starts at 0 and stores user consultations manually.
    """
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect MongoDB & Initialize RAG Knowledge Base
    logger.info("Starting VoxSales AI Backend Service...")
    db.connect()
    rag_service.initialize(settings.KB_FILE_PATH)
    # seed_initial_demo_leads() is disabled for clean manual logging
    yield
    # Shutdown
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB client connection.")

app = FastAPI(
    title="VoxSales AI – Autonomous AI Sales Voice Agent API",
    description="Backend API powering RAG-driven autonomous voice sales conversations, lead scoring, and appointment scheduling.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sliding-window per-IP rate limiter (180 requests / 60s)
_rate_buckets: dict[str, list[float]] = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = [t for t in _rate_buckets[client_ip] if now - t < 60.0]
        if len(window) >= 180:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again shortly."})
        window.append(now)
        _rate_buckets[client_ip] = window
    return await call_next(request)

# Register API routers
app.include_router(auth.router)
app.include_router(agent.router)
app.include_router(leads.router)
app.include_router(appointments.router)
app.include_router(dashboard.router)
app.include_router(knowledge.router)
app.include_router(settings_route.router)
app.include_router(voice_live.router)

# Serve built frontend static bundle in Docker/Render/Railway production deployments
_frontend_dist = settings.BASE_DIR.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "VoxSales AI Backend API",
        "version": "1.0.0",
        "db_connected": db.connected,
        "rag_ready": rag_service.is_ready,
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "mongodb": "connected" if db.connected else "disconnected",
        "rag_chunks": len(rag_service.chunks),
        "embedding_model": rag_service.model_name
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
