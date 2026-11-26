from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from bson import ObjectId

from app.auth import CurrentUser, get_optional_user
from app.database import db
from app.rag import rag_service
from app.ai_service import ai_service
from app.lead_scorer import calculate_lead_score, analyze_sentiment, evaluate_bant
from app.services.memory_service import save_lead_memory, format_memory_context, get_lead_memories

router = APIRouter(prefix="/api/agent", tags=["Voice Agent & Interaction"])

class InteractRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, description="User's transcribed voice speech or typed text")
    mode: str = Field("voice", description="Interaction mode: 'voice' or 'text'")
    language: Optional[str] = Field("en-IN", description="Preferred language code: en-IN, hi-IN, te-IN, ta-IN, kn-IN, ml-IN")
    candidate_name: Optional[str] = Field(None, description="Registered candidate name")
    candidate_email: Optional[str] = Field(None, description="Registered candidate email")
    candidate_phone: Optional[str] = Field(None, description="Registered candidate phone")

class RegisterCandidateRequest(BaseModel):
    session_id: str
    name: str
    email: str
    phone: str
    interested_course: Optional[str] = "Python Programming & Automation"

@router.post("/register-candidate")
async def register_candidate(req: RegisterCandidateRequest):
    """
    Registers candidate details before or during consultation and links them to the session.
    """
    name = req.name.strip()
    email = req.email.strip()
    phone = req.phone.strip()
    course = (req.interested_course or "Python Programming & Automation").strip()
    session_id = req.session_id.strip()

    if not name or not email or not phone:
        raise HTTPException(status_code=400, detail="Name, email, and phone number are required.")

    lead_id = None
    now = datetime.utcnow()
    lead_payload = {
        "name": name,
        "email": email,
        "phone": phone,
        "interested_course": course,
        "lead_score": 45,
        "lead_category": "Warm",
        "sentiment": "Positive",
        "summary": f"{name} registered for {course}. Consultation active.",
        "updated_at": now
    }

    if db.connected and db.db is not None:
        try:
            # Check if this session already has a lead
            conv = db.db.conversations.find_one({"session_id": session_id})
            existing_lead_id = conv.get("lead_id") if conv else None

            if existing_lead_id:
                try:
                    db.db.leads.update_one(
                        {"_id": ObjectId(existing_lead_id)},
                        {"$set": lead_payload}
                    )
                    lead_id = str(existing_lead_id)
                except Exception:
                    existing_lead_id = None

            if not lead_id:
                # Match existing lead strictly by email AND name
                existing_lead = db.db.leads.find_one({"email": email, "name": name})
                if existing_lead:
                    lead_id = str(existing_lead["_id"])
                    db.db.leads.update_one(
                        {"_id": existing_lead["_id"]},
                        {"$set": lead_payload}
                    )
                else:
                    # New distinct candidate profile
                    lead_payload["created_at"] = now
                    ins = db.db.leads.insert_one(lead_payload)
                    lead_id = str(ins.inserted_id)

            db.db.conversations.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "session_id": session_id,
                        "lead_id": lead_id,
                        "customer_name": name,
                        "customer_phone": phone,
                        "customer_email": email,
                        "interested_course": course,
                        "updated_at": now
                    },
                    "$setOnInsert": {
                        "messages": [],
                        "created_at": now
                    }
                },
                upsert=True
            )
        except Exception as e:
            pass

    return {
        "success": True,
        "message": f"Welcome, {name}! Your candidate profile is verified and linked to Call History.",
        "lead_id": lead_id,
        "candidate": {
            "name": name,
            "email": email,
            "phone": phone,
            "interested_course": course
        }
    }

@router.post("/interact")
async def interact(req: InteractRequest, current: Optional[CurrentUser] = Depends(get_optional_user)):
    """
    Main conversational endpoint:
    1. Retrieves conversation history.
    2. Searches course knowledge base using FAISS (RAG), scoped to org_id.
    3. Generates conversational sales response with Groq/Gemini.
    4. Extracts prospect details and computes rule-based lead score + BANT.
    5. Saves lead, cross-call memory, and session transcript into MongoDB.
    6. Returns assistant voice-ready reply, RAG sources, and live lead metrics.
    """
    org_id = current.org_id if current else "org_default"
    session_id = req.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    user_text = req.message.strip()

    # 1. Retrieve or initialize conversation from MongoDB
    history_messages = []
    conv_doc = None
    lead_id = None
    existing_lead_data = {
        "name": None,
        "email": None,
        "phone": None,
        "interested_course": None
    }

    if db.connected and db.db is not None:
        try:
            conv_doc = db.db.conversations.find_one({"session_id": session_id})
            if conv_doc:
                history_messages = conv_doc.get("messages", [])
                lead_id = conv_doc.get("lead_id")
                if lead_id:
                    lead_doc = db.db.leads.find_one({"_id": ObjectId(lead_id)})
                    if lead_doc:
                        existing_lead_data = {
                            "name": lead_doc.get("name"),
                            "email": lead_doc.get("email"),
                            "phone": lead_doc.get("phone"),
                            "interested_course": lead_doc.get("interested_course")
                        }
        except Exception as e:
            pass

    # 1.5 Enforce Do-Not-Call (DNC) if lead is flagged
    if db.connected and db.db is not None and (lead_id or req.candidate_email or req.candidate_phone):
        dnc_clauses = []
        if lead_id:
            try:
                dnc_clauses.append({"_id": ObjectId(lead_id)})
            except Exception:
                pass
        if req.candidate_email:
            dnc_clauses.append({"email": req.candidate_email.strip().lower()})
        if req.candidate_phone:
            dnc_clauses.append({"phone": req.candidate_phone.strip()})
        if dnc_clauses:
            dnc_lead = db.db.leads.find_one({"$or": dnc_clauses, "do_not_call": True})
            if dnc_lead:
                raise HTTPException(status_code=403, detail="Prospect has Do-Not-Call (DNC) enabled. Interaction blocked.")

    # 2. Retrieve top-3 matching chunks via FAISS (org-scoped)
    rag_sources = rag_service.search(user_text, top_k=3, org_id=org_id)

    # Merge registered candidate details with existing lead profile
    merged_lead = existing_lead_data.copy()
    if req.candidate_name:
        merged_lead["name"] = req.candidate_name.strip()
    if req.candidate_email:
        merged_lead["email"] = req.candidate_email.strip()
    if req.candidate_phone:
        merged_lead["phone"] = req.candidate_phone.strip()

    # 3. Generate AI response with cross-call lead memory
    memory_context = format_memory_context(
        lead_id=lead_id,
        email=merged_lead.get("email"),
        phone=merged_lead.get("phone"),
        org_id=org_id,
    )
    ai_result = ai_service.generate_response(
        user_text,
        history_messages,
        rag_sources,
        language=req.language,
        candidate_name=merged_lead.get("name"),
        memory_context=memory_context,
    )
    ai_reply = ai_result.get("reply", "I am here to help you explore our technical training programs.")
    extracted_lead = ai_result.get("extracted_lead", {})
    sentiment = ai_result.get("sentiment", analyze_sentiment(user_text))
    booking_intent = ai_result.get("booking_intent", False)

    placeholders = {"Candidate", "Anonymous Prospect", "Tech Cohorts", "General Tech Courses"}
    for key in ["name", "email", "phone", "interested_course"]:
        val = extracted_lead.get(key)
        if val and (not merged_lead.get(key) or merged_lead.get(key) in placeholders):
            merged_lead[key] = val

    # Update conversation history with new turn
    user_turn = {
        "role": "user",
        "content": user_text,
        "mode": req.mode,
        "timestamp": datetime.utcnow().isoformat()
    }
    assistant_turn = {
        "role": "assistant",
        "content": ai_reply,
        "timestamp": datetime.utcnow().isoformat()
    }
    history_messages.extend([user_turn, assistant_turn])

    # 4. Calculate rule-based lead score & category
    user_lower = user_text.lower()
    rejection_keywords = [
        "dont want", "don't want", "not interested", "no courses", "no course",
        "not looking for courses", "not looking for any", "waste", "scam",
        "dont need", "don't need", "no need", "cancel", "stop calling", "not for me",
        "leave me alone", "no thanks", "do not want", "dont like", "don't like"
    ]
    is_rejected = any(kw in user_lower for kw in rejection_keywords)
    if is_rejected or (sentiment == "Negative" and any(w in user_lower for w in ["no", "not", "dont", "don't", "stop", "cancel"])):
        sentiment = "Negative"
        merged_lead["interested_course"] = "Not Interested"
        lead_score = 0
        lead_category = "Cold"
    else:
        lead_score, lead_category = calculate_lead_score(merged_lead, history_messages, sentiment=sentiment)

    bant = evaluate_bant(merged_lead, history_messages)

    # 5. Persist Lead and Conversation into MongoDB
    saved_lead_doc = None
    if db.connected and db.db is not None:
        try:
            now = datetime.utcnow()
            lead_query = None
            if lead_id:
                try:
                    lead_query = {"_id": ObjectId(lead_id)}
                except Exception:
                    lead_query = None
            elif merged_lead.get("email") and merged_lead.get("name"):
                lead_query = {"email": merged_lead["email"], "name": merged_lead["name"]}
            elif merged_lead.get("email"):
                lead_query = {"email": merged_lead["email"]}

            resolved_name = merged_lead.get("name") or "Candidate"
            resolved_email = merged_lead.get("email") or ""
            resolved_phone = merged_lead.get("phone") or ""

            if is_rejected:
                course_text = "Not Interested"
                summary_text = f"{resolved_name} stated they do not want courses. Qualified as Cold (0/100) with Negative interest."
            else:
                course_text = merged_lead.get("interested_course") or "Tech Cohorts"
                summary_text = f"{resolved_name} inquired about {course_text}. Recent question: \"{user_text[:80]}\". Qualified as {lead_category} ({lead_score}/100) with {sentiment} interest."

            lead_payload = {
                "org_id": org_id,
                "name": resolved_name,
                "email": resolved_email,
                "phone": resolved_phone,
                "interested_course": course_text,
                "lead_score": lead_score,
                "lead_category": lead_category,
                "bant": bant,
                "sentiment": sentiment,
                "summary": summary_text,
                "updated_at": now
            }

            if lead_query:
                # Update existing lead
                res = db.db.leads.find_one_and_update(
                    lead_query,
                    {"$set": lead_payload, "$setOnInsert": {"created_at": now}},
                    upsert=True,
                    return_document=True
                )
                saved_lead_doc = res
            elif any(merged_lead.values()):
                # Create new lead document
                lead_payload["created_at"] = now
                res = db.db.leads.insert_one(lead_payload)
                lead_payload["_id"] = res.inserted_id
                saved_lead_doc = lead_payload

            if saved_lead_doc:
                lead_id = str(saved_lead_doc["_id"])

            # Persist cross-call lead memory entries
            if course_text and course_text not in ("Tech Cohorts", "Not Interested"):
                save_lead_memory("course_interest", f"Interested in {course_text}", lead_id=lead_id, email=resolved_email, phone=resolved_phone, session_id=session_id, org_id=org_id)
            if bant.get("total", 0) > 0:
                save_lead_memory("bant", f"BANT {bant['total']}/100 ({bant['category']}) — Need: {bant['need']['level']}, Budget: {bant['budget']['level']}, Timeline: {bant['timeline']['level']}", lead_id=lead_id, email=resolved_email, phone=resolved_phone, session_id=session_id, org_id=org_id)
            save_lead_memory("inquiry", f"Asked: {user_text[:120]}", lead_id=lead_id, email=resolved_email, phone=resolved_phone, session_id=session_id, org_id=org_id)

            # Upsert conversation document
            db.db.conversations.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "org_id": org_id,
                        "session_id": session_id,
                        "lead_id": lead_id,
                        "customer_name": resolved_name,
                        "customer_phone": resolved_phone,
                        "customer_email": resolved_email,
                        "messages": history_messages,
                        "last_message": user_text,
                        "sentiment": sentiment,
                        "lead_score": lead_score,
                        "lead_category": lead_category,
                        "updated_at": now
                    },
                    "$setOnInsert": {
                        "created_at": now
                    }
                },
                upsert=True
            )
        except Exception as e:
            pass

    memories = get_lead_memories(
        lead_id=lead_id,
        email=merged_lead.get("email"),
        phone=merged_lead.get("phone"),
        limit=10,
        org_id=org_id,
    )

    return {
        "session_id": session_id,
        "reply": ai_reply,
        "sentiment": sentiment,
        "booking_intent": booking_intent,
        "lead_score": lead_score,
        "lead_category": lead_category,
        "bant": bant,
        "memories": memories,
        "lead": {
            "id": lead_id,
            "name": merged_lead.get("name"),
            "email": merged_lead.get("email"),
            "phone": merged_lead.get("phone"),
            "interested_course": merged_lead.get("interested_course"),
            "score": lead_score,
            "category": lead_category,
            "bant": bant,
        },
        "rag_sources": [
            {
                "id": s.get("id"),
                "course": s.get("course"),
                "score": s.get("score"),
                "preview": s.get("preview") or s.get("content", "")[:140]
            }
            for s in rag_sources
        ],
        "transcript": history_messages
    }

@router.get("/conversations")
async def list_conversations(limit: int = 50, skip: int = 0, current: Optional[CurrentUser] = Depends(get_optional_user)):
    """
    Returns list of saved conversation sessions for the Call History tab, scoped by org_id.
    """
    if not db.connected or db.db is None:
        return {"total": 0, "conversations": []}
    try:
        query: Dict[str, Any] = {"org_id": current.org_id} if current else {}
        total = db.db.conversations.count_documents(query)
        cursor = db.db.conversations.find(query).sort("updated_at", -1).skip(skip).limit(limit)
        results = []
        for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            for k, v in list(doc.items()):
                if isinstance(v, datetime):
                    doc[k] = v.isoformat()
            messages = doc.get("messages", [])
            doc["message_count"] = len(messages)
            if not doc.get("summary"):
                customer = doc.get("customer_name") or "Prospective Candidate"
                last_q = doc.get("last_message") or "inquired about course programs"
                doc["summary"] = f"{customer} interacted with AI sales advisor. Query: \"{last_q[:80]}\". Qualified as {doc.get('lead_category', 'Warm')}."
            results.append(doc)
        return {"total": total, "conversations": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{session_id}")
async def get_conversation_detail(session_id: str):
    """
    Returns the full conversation session document with complete transcript.
    """
    if not db.connected or db.db is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    try:
        doc = db.db.conversations.find_one({"session_id": session_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Conversation not found")
        doc["id"] = str(doc.pop("_id"))
        for k, v in list(doc.items()):
            if isinstance(v, datetime):
                doc[k] = v.isoformat()
        return doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class EscalateRequest(BaseModel):
    session_id: Optional[str] = None
    lead_id: Optional[str] = None
    reason: str = Field(..., min_length=2)


@router.post("/escalate")
async def escalate_to_human(req: EscalateRequest, current: Optional[CurrentUser] = Depends(get_optional_user)):
    """Escalate a conversation or lead to a human counselor and log an audit + follow-up task."""
    org_id = current.org_id if current else "org_default"
    now = datetime.utcnow()
    if db.connected and db.db is not None:
        db.db.tasks.insert_one({
            "org_id": org_id,
            "lead_id": req.lead_id,
            "session_id": req.session_id,
            "title": f"Human Escalation: {req.reason.strip()}",
            "priority": "High",
            "status": "Open",
            "created_at": now,
        })
        db.db.audit_logs.insert_one({
            "org_id": org_id,
            "action": "human_escalation",
            "lead_id": req.lead_id,
            "session_id": req.session_id,
            "detail": req.reason.strip(),
            "created_at": now,
        })
    return {
        "success": True,
        "message": "Escalated to human counselor. High-priority follow-up task and audit log recorded.",
    }


@router.get("/audit-logs")
async def get_audit_logs(limit: int = 50, current: Optional[CurrentUser] = Depends(get_optional_user)):
    if not db.connected or db.db is None:
        return {"logs": []}
    query: Dict[str, Any] = {"org_id": current.org_id} if current else {}
    cursor = db.db.audit_logs.find(query).sort("created_at", -1).limit(limit)
    logs = []
    for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        logs.append(doc)
    return {"logs": logs}
