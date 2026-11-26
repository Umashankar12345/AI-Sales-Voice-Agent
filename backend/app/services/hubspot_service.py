import logging
from datetime import datetime
from typing import Dict, Any, Optional
import httpx
from app.config import settings
from app.database import db

logger = logging.getLogger("voxsales.hubspot")

HUBSPOT_BASE = "https://api.hubapi.com"
NOT_CONNECTED_ERROR = "HubSpot is not connected — HUBSPOT_ACCESS_TOKEN is not set."


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.HUBSPOT_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }


def _record_sync_log(
    lead_id: Optional[str],
    direction: str,
    result: str,
    hubspot_id: str = "",
    error: str = "",
) -> Dict[str, Any]:
    entry = {
        "lead_id": str(lead_id) if lead_id else None,
        "direction": direction,
        "result": result,
        "hubspot_id": hubspot_id,
        "error": error,
        "created_at": datetime.utcnow(),
    }
    if db.connected and db.db is not None:
        try:
            res = db.db.sync_logs.insert_one(entry)
            entry["id"] = str(res.inserted_id)
            entry.pop("_id", None)
        except Exception as exc:
            logger.warning(f"Failed to write HubSpot sync log: {exc}")
    entry["created_at"] = entry["created_at"].isoformat()
    return entry


def _search_contact(client: httpx.Client, prop: str, value: str) -> Optional[str]:
    resp = client.post(
        f"{HUBSPOT_BASE}/crm/v3/objects/contacts/search",
        headers=_headers(),
        json={
            "filterGroups": [{"filters": [{"propertyName": prop, "operator": "EQ", "value": value}]}],
            "properties": ["email", "phone"],
            "limit": 1,
        },
    )
    if resp.status_code != 200:
        raise RuntimeError(f"HubSpot HTTP {resp.status_code}: {resp.text[:300]}")
    results = resp.json().get("results") or []
    return results[0]["id"] if results else None


def sync_lead_to_hubspot(lead_doc: Dict[str, Any], trigger: str = "manual") -> Dict[str, Any]:
    """
    Sync a MongoDB lead to HubSpot CRM (search by email/phone -> update or create contact -> attach note).
    Returns {"ok": bool, "hubspot_id": str|None, "error": str|None}.
    """
    lead_id = str(lead_doc.get("_id") or lead_doc.get("id") or "")
    if not settings.HUBSPOT_ACCESS_TOKEN:
        _record_sync_log(lead_id, trigger, "error", error=NOT_CONNECTED_ERROR)
        return {"ok": False, "hubspot_id": None, "error": NOT_CONNECTED_ERROR}

    full_name = (lead_doc.get("name") or "Prospect").strip()
    parts = full_name.split(" ", 1)
    properties = {
        "firstname": parts[0],
        "lastname": parts[1] if len(parts) > 1 else "",
        "email": lead_doc.get("email") or "",
        "phone": lead_doc.get("phone") or "",
        "hs_lead_status": "OPEN" if lead_doc.get("lead_category") == "Hot" else "IN_PROGRESS",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            contact_id = None
            if lead_doc.get("email"):
                contact_id = _search_contact(client, "email", lead_doc["email"])
            if not contact_id and lead_doc.get("phone"):
                contact_id = _search_contact(client, "phone", lead_doc["phone"])

            if contact_id:
                resp = client.patch(
                    f"{HUBSPOT_BASE}/crm/v3/objects/contacts/{contact_id}",
                    headers=_headers(),
                    json={"properties": properties},
                )
                if resp.status_code not in (200, 204):
                    raise RuntimeError(f"HubSpot HTTP {resp.status_code}: {resp.text[:300]}")
            else:
                resp = client.post(
                    f"{HUBSPOT_BASE}/crm/v3/objects/contacts",
                    headers=_headers(),
                    json={"properties": properties},
                )
                if resp.status_code not in (200, 201):
                    raise RuntimeError(f"HubSpot HTTP {resp.status_code}: {resp.text[:300]}")
                contact_id = resp.json().get("id")

            # Attach qualification note
            bant = lead_doc.get("bant") or {}
            note_lines = [
                f"VoxSales AI + SalesPilot Sync for {full_name}",
                f"Course Interest: {lead_doc.get('interested_course') or 'N/A'}",
                f"Lead Score: {lead_doc.get('lead_score', 0)}/100 ({lead_doc.get('lead_category', 'Cold')})",
                f"Sentiment: {lead_doc.get('sentiment', 'Neutral')}",
            ]
            if bant:
                note_lines.append(f"BANT Score: {bant.get('total', 0)}/100 ({bant.get('category', 'Cold')})")
            if lead_doc.get("summary"):
                note_lines.append(f"Summary: {lead_doc['summary']}")

            note_resp = client.post(
                f"{HUBSPOT_BASE}/crm/v3/objects/notes",
                headers=_headers(),
                json={
                    "properties": {
                        "hs_note_body": "\n".join(note_lines),
                        "hs_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                    },
                    "associations": [
                        {
                            "to": {"id": contact_id},
                            "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 202}],
                        }
                    ],
                },
            )
            if note_resp.status_code not in (200, 201):
                logger.warning(f"HubSpot note attachment failed: {note_resp.text[:200]}")

        _record_sync_log(lead_id, trigger, "success", hubspot_id=str(contact_id or ""))
        return {"ok": True, "hubspot_id": str(contact_id or ""), "error": None}
    except Exception as exc:
        err_msg = str(exc)
        _record_sync_log(lead_id, trigger, "error", error=err_msg)
        return {"ok": False, "hubspot_id": None, "error": err_msg}
