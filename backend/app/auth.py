import base64
import hashlib
import hmac
import json
import time
import uuid
from datetime import datetime
from typing import Optional

import bcrypt
from bson import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.database import db

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

TOKEN_TTL_SECONDS = 86400  # 24 hours


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    organization_name: str = Field(..., min_length=2)
    role: Optional[str] = "admin"


class LoginRequest(BaseModel):
    email: str
    password: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def create_access_token(user_id: str, org_id: str, role: str, email: str) -> str:
    now = int(time.time())
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64url_encode(
        json.dumps(
            {
                "sub": user_id,
                "org_id": org_id,
                "role": role,
                "email": email,
                "iat": now,
                "exp": now + TOKEN_TTL_SECONDS,
            },
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode()
    sig = _b64url_encode(hmac.new(settings.ADMIN_SECRET_KEY.encode(), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def decode_access_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token structure")
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = _b64url_encode(hmac.new(settings.ADMIN_SECRET_KEY.encode(), signing_input, hashlib.sha256).digest())
        if not hmac.compare_digest(sig_b64, expected_sig):
            raise ValueError("Invalid signature")
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token expired")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid or expired token: {exc}")


class CurrentUser(BaseModel):
    user_id: str
    org_id: str
    role: str
    email: str


def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    return CurrentUser(
        user_id=payload["sub"],
        org_id=payload["org_id"],
        role=payload.get("role", "member"),
        email=payload.get("email", ""),
    )


def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[CurrentUser]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    return CurrentUser(
        user_id=payload["sub"],
        org_id=payload["org_id"],
        role=payload.get("role", "member"),
        email=payload.get("email", ""),
    )


def require_admin(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest):
    if not db.connected or db.db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    email = req.email.strip().lower()
    if db.db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.utcnow()
    org_id = f"org_{uuid.uuid4().hex[:10]}"
    db.db.organizations.insert_one({
        "org_id": org_id,
        "name": req.organization_name.strip(),
        "created_at": now,
    })

    role = req.role if req.role in ("admin", "member") else "admin"
    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "full_name": req.full_name.strip(),
        "org_id": org_id,
        "role": role,
        "created_at": now,
    }
    res = db.db.users.insert_one(user_doc)
    user_id = str(res.inserted_id)
    token = create_access_token(user_id, org_id, role, email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "full_name": user_doc["full_name"],
            "org_id": org_id,
            "role": role,
        },
    }


@router.post("/login")
def login(req: LoginRequest):
    if not db.connected or db.db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    email = req.email.strip().lower()
    user = db.db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id, user["org_id"], user.get("role", "member"), email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "full_name": user.get("full_name", ""),
            "org_id": user["org_id"],
            "role": user.get("role", "member"),
        },
    }


@router.get("/me")
def me(current: CurrentUser = Depends(get_current_user)):
    return current


@router.get("/admin-check")
def admin_check(current: CurrentUser = Depends(require_admin)):
    return {"ok": True, "role": current.role, "org_id": current.org_id}
