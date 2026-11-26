import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.database import db

logger = logging.getLogger("voxsales.memory")


def _build_identity_filter(
    lead_id: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    clauses = []
    if lead_id:
        clauses.append({"lead_id": str(lead_id)})
    if email:
        clauses.append({"email": email.strip().lower()})
    if phone:
        clauses.append({"phone": phone.strip()})
    if not clauses:
        return None
    return {"$or": clauses} if len(clauses) > 1 else clauses[0]


def save_lead_memory(
    category: str,
    content: str,
    lead_id: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    session_id: Optional[str] = None,
    org_id: str = "org_default",
) -> None:
    """Persist a cross-call memory entry for a lead, scoped to org_id."""
    if not db.connected or db.db is None or not content.strip():
        return
    identity = _build_identity_filter(lead_id, email, phone)
    if not identity:
        return

    clean_content = content.strip()
    existing = db.db.lead_memories.find_one({**identity, "org_id": org_id, "category": category, "content": clean_content})
    if existing:
        return

    doc = {
        "org_id": org_id,
        "lead_id": str(lead_id) if lead_id else None,
        "email": email.strip().lower() if email else None,
        "phone": phone.strip() if phone else None,
        "session_id": session_id,
        "category": category,
        "content": clean_content,
        "created_at": datetime.utcnow(),
    }
    try:
        db.db.lead_memories.insert_one(doc)
    except Exception as exc:
        logger.warning(f"Failed to save lead memory: {exc}")


def get_lead_memories(
    lead_id: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    limit: int = 12,
    org_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve chronological cross-call memories for a prospect, scoped by org_id."""
    if not db.connected or db.db is None:
        return []
    identity = _build_identity_filter(lead_id, email, phone)
    if not identity:
        return []

    query = {**identity, "org_id": org_id} if org_id else identity
    try:
        cursor = db.db.lead_memories.find(query).sort("created_at", -1).limit(limit)
        memories = []
        for doc in cursor:
            memories.append({
                "id": str(doc.pop("_id")),
                "category": doc.get("category", "context"),
                "content": doc.get("content", ""),
                "session_id": doc.get("session_id"),
                "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
            })
        return list(reversed(memories))
    except Exception as exc:
        logger.warning(f"Failed to fetch lead memories: {exc}")
        return []


def format_memory_context(
    lead_id: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    org_id: Optional[str] = None,
) -> str:
    """Format stored cross-call memories into a concise prompt block for the AI."""
    memories = get_lead_memories(lead_id=lead_id, email=email, phone=phone, limit=8, org_id=org_id)
    if not memories:
        return ""
    lines = ["CROSS-CALL LEAD MEMORY (from previous interactions with this prospect):"]
    for mem in memories:
        lines.append(f"- [{mem['category']}] {mem['content']}")
    return "\n".join(lines)


def update_lead_memory(memory_id: str, content: str, org_id: str) -> bool:
    from bson import ObjectId
    if not db.connected or db.db is None or not content.strip():
        return False
    res = db.db.lead_memories.update_one(
        {"_id": ObjectId(memory_id), "org_id": org_id},
        {"$set": {"content": content.strip(), "updated_at": datetime.utcnow()}},
    )
    return res.matched_count > 0


def delete_lead_memory(memory_id: str, org_id: str) -> bool:
    from bson import ObjectId
    if not db.connected or db.db is None:
        return False
    res = db.db.lead_memories.delete_one({"_id": ObjectId(memory_id), "org_id": org_id})
    return res.deleted_count > 0
