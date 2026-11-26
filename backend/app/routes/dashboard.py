from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from app.auth import CurrentUser, get_optional_user
from app.database import db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return {}
    doc["id"] = str(doc.pop("_id"))
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

@router.get("/stats")
async def get_dashboard_stats(current: Optional[CurrentUser] = Depends(get_optional_user)):
    """
    Computes all SaaS metrics live from MongoDB collections, scoped by org_id when authenticated:
    - Total leads
    - Hot, Warm, Cold leads breakdown
    - Total conversations
    - Total appointments
    - Recent leads list
    - Course interest distribution
    - Activity timeline (last 7 days)
    """
    if not db.connected or db.db is None:
        return {
            "total_leads": 0,
            "hot_leads": 0,
            "warm_leads": 0,
            "cold_leads": 0,
            "total_conversations": 0,
            "total_appointments": 0,
            "recent_leads": [],
            "course_distribution": [],
            "activity_timeline": []
        }

    try:
        org_filter: Dict[str, Any] = {"org_id": current.org_id} if current else {}
        total_leads = db.db.leads.count_documents(org_filter)
        hot_leads = db.db.leads.count_documents({**org_filter, "lead_category": "Hot"})
        warm_leads = db.db.leads.count_documents({**org_filter, "lead_category": "Warm"})
        cold_leads = db.db.leads.count_documents({**org_filter, "lead_category": "Cold"})
        total_conversations = db.db.conversations.count_documents(org_filter)
        total_appointments = db.db.appointments.count_documents(org_filter)

        # Recent leads (last 8)
        recent_cursor = db.db.leads.find(org_filter).sort("created_at", -1).limit(8)
        recent_leads = [serialize_doc(doc) for doc in recent_cursor]

        # Course distribution aggregation (top 5 programs for compact layout)
        course_pipeline = [
            {"$match": org_filter},
            {"$group": {"_id": "$interested_course", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        course_agg = list(db.db.leads.aggregate(course_pipeline))
        course_distribution = [
            {"course": item["_id"] or "General", "count": item["count"]}
            for item in course_agg
            if item.get("_id")
        ][:5]

        # Daily activity for the last 7 days (100% strictly from MongoDB collections)
        today = datetime.utcnow().date()
        days_map = {}
        for d in range(6, -1, -1):
            day_str = (today - timedelta(days=d)).strftime("%Y-%m-%d")
            day_label = (today - timedelta(days=d)).strftime("%b %d")
            days_map[day_str] = {
                "day": day_label, 
                "leads": 0, 
                "conversations": 0, 
                "appointments": 0
            }

        # Count leads by day (adds live DB counts)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        lead_date_agg = list(db.db.leads.aggregate([
            {"$match": {"created_at": {"$gte": seven_days_ago}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1}
                }
            }
        ]))
        for item in lead_date_agg:
            if item["_id"] in days_map:
                days_map[item["_id"]]["leads"] += item["count"]

        # Count conversations by day (adds live DB counts)
        conv_date_agg = list(db.db.conversations.aggregate([
            {"$match": {"created_at": {"$gte": seven_days_ago}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1}
                }
            }
        ]))
        for item in conv_date_agg:
            if item["_id"] in days_map:
                days_map[item["_id"]]["conversations"] += item["count"]

        # Count appointments by day (adds live DB counts)
        app_date_agg = list(db.db.appointments.aggregate([
            {"$match": {"created_at": {"$gte": seven_days_ago}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1}
                }
            }
        ]))
        for item in app_date_agg:
            if item["_id"] in days_map:
                days_map[item["_id"]]["appointments"] += item["count"]

        activity_timeline = list(days_map.values())

        return {
            "total_leads": total_leads,
            "hot_leads": hot_leads,
            "warm_leads": warm_leads,
            "cold_leads": cold_leads,
            "total_conversations": total_conversations,
            "total_appointments": total_appointments,
            "recent_leads": recent_leads,
            "course_distribution": course_distribution,
            "activity_timeline": activity_timeline
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
