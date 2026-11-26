import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    BASE_DIR: Path = BASE_DIR
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "").strip()
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "").strip()
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "").strip()
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "").strip()
    HUBSPOT_ACCESS_TOKEN: str = os.getenv("HUBSPOT_ACCESS_TOKEN", "").strip()
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "voxsales_db")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: int = int(os.getenv("PORT", "8000")) if False else os.getenv("HOST", "127.0.0.1")
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "voxsales_admin_secret_2026")
    RAG_MIN_SIMILARITY: float = float(os.getenv("RAG_MIN_SIMILARITY", "0.22"))
    ALLOW_UNAUTH_DEMO: bool = os.getenv("ALLOW_UNAUTH_DEMO", "true").lower() == "true"
    GOOGLE_CALENDAR_CLIENT_ID: str = os.getenv("GOOGLE_CALENDAR_CLIENT_ID", "").strip()
    GOOGLE_CALENDAR_CLIENT_SECRET: str = os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET", "").strip()
    GOOGLE_CALENDAR_REFRESH_TOKEN: str = os.getenv("GOOGLE_CALENDAR_REFRESH_TOKEN", "").strip()
    KB_FILE_PATH: Path = BASE_DIR / "data" / "courses_knowledge_base.txt"
    FAISS_INDEX_PATH: Path = BASE_DIR / "data" / "faiss_index.bin"
    CHUNKS_FILE_PATH: Path = BASE_DIR / "data" / "kb_chunks.json"

settings = Settings()
