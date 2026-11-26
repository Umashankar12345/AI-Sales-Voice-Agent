import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app
from app.database import db

def test_full_workflow():
    print("=== STARTING VOXSALES AI END-TO-END TECHNICAL EVALUATION TEST ===")
    
    with TestClient(app) as client:
        # 1. Health & Root
        res = client.get("/")
        assert res.status_code == 200, f"Root failed: {res.text}"
        print("[PASS] 1. Root & Lifespan initialization successful.")

        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["mongodb"] == "connected", f"MongoDB should be connected: {data}"
        assert data["rag_chunks"] >= 5, f"RAG should have chunks: {data}"
        print(f"[PASS] 2. System Health verified: MongoDB={data['mongodb']}, RAG Chunks={data['rag_chunks']}.")

        # 2. Knowledge Base & FAISS
        res = client.get("/api/knowledge/chunks")
        assert res.status_code == 200
        chunks_data = res.json()
        print(f"[PASS] 3. Knowledge Base Chunks: {chunks_data['total_chunks']} chunks in {chunks_data['embedding_model']} ({chunks_data['vector_dimension']} dims).")

        res = client.post("/api/knowledge/search", json={"query": "Python course fees and duration", "top_k": 2})
        assert res.status_code == 200
        search_data = res.json()
        assert len(search_data["results"]) > 0
        top_result = search_data["results"][0]
        print(f"[PASS] 4. FAISS Search Latency: {search_data['latency_ms']}ms, Top Match: '{top_result['course']}' with cosine score {top_result['score']}.")

        # 3. Autonomous AI Agent Conversation - Turn 1 (Inquiry)
        session_id = "test_eval_session_001"
        turn1_payload = {
            "session_id": session_id,
            "message": "Hi, I am looking for the Python course syllabus, duration, and placement details.",
            "mode": "voice"
        }
        res = client.post("/api/agent/interact", json=turn1_payload)
        assert res.status_code == 200, f"Turn 1 failed: {res.text}"
        turn1 = res.json()
        assert turn1["reply"], "Reply should not be empty"
        assert len(turn1["rag_sources"]) > 0, "RAG sources should be attached"
        print(f"[PASS] 5. Agent Turn 1: RAG context retrieved ({len(turn1['rag_sources'])} sources). AI Reply: '{turn1['reply'][:80]}...'")

        # 4. Autonomous AI Agent Conversation - Turn 2 (Lead Capture)
        turn2_payload = {
            "session_id": session_id,
            "message": "My name is Vikram Malhotra, email vikram.m@gmail.com and phone 9876543210. I am interested in Python Programming and would like to join the next batch.",
            "mode": "voice"
        }
        res = client.post("/api/agent/interact", json=turn2_payload)
        assert res.status_code == 200, f"Turn 2 failed: {res.text}"
        turn2 = res.json()
        lead = turn2["lead"]
        assert lead["name"] == "Vikram Malhotra" or "Vikram" in str(lead["name"]), f"Name extraction failed: {lead}"
        assert lead["email"] == "vikram.m@gmail.com", f"Email extraction failed: {lead}"
        assert "9876543210" in lead["phone"], f"Phone extraction failed: {lead}"
        assert turn2["lead_score"] >= 70, f"Lead should qualify as Hot (score >= 70): {turn2['lead_score']}"
        assert turn2["lead_category"] == "Hot", f"Lead category should be Hot: {turn2['lead_category']}"
        print(f"[PASS] 6. Agent Turn 2 Lead Qualification: Name='{lead['name']}', Email='{lead['email']}', Phone='{lead['phone']}', Score={turn2['lead_score']}, Category='{turn2['lead_category']}', Sentiment='{turn2['sentiment']}'.")

        # 5. Lead Management & Persistence
        res = client.get("/api/leads?search=Vikram")
        assert res.status_code == 200
        leads_data = res.json()
        assert leads_data["total"] >= 1
        found_lead = leads_data["leads"][0]
        assert found_lead["email"] == "vikram.m@gmail.com"
        print(f"[PASS] 7. Lead saved and retrieved from MongoDB: ID={found_lead['id']}, Course='{found_lead['interested_course']}'.")

        # 6. Appointment Booking & Duplicate Prevention
        res = client.get("/api/appointments/slots")
        assert res.status_code == 200
        slots = res.json()["slots"]
        available_slot = next((s for s in slots if not s["is_booked"]), None)
        assert available_slot is not None, "At least one available slot required"
        print(f"[PASS] 8. Found open slot on {available_slot['slot_date']} at {available_slot['slot_time']}.")

        # Book the slot
        book_req = {
            "customer_name": "Vikram Malhotra",
            "email": "vikram.m@gmail.com",
            "phone": "+91 98765 43210",
            "course": "Python Programming & Automation",
            "slot_date": available_slot["slot_date"],
            "slot_time": available_slot["slot_time"],
            "notes": "Interested in scholarship assessment and placement referral assistance."
        }
        res = client.post("/api/appointments/book", json=book_req)
        assert res.status_code == 200, f"Booking failed: {res.text}"
        booking_res = res.json()
        assert booking_res["success"] is True
        print(f"[PASS] 9. Appointment successfully booked in MongoDB: {booking_res['message']}")

        # Prevent duplicate booking test
        res = client.post("/api/appointments/book", json=book_req)
        assert res.status_code == 409, f"Duplicate booking should return 409 Conflict, got {res.status_code}"
        print("[PASS] 10. Concurrency & Duplicate Booking Prevention verified: 409 Conflict returned as expected.")

        # 7. Dashboard Stats Verification
        res = client.get("/api/dashboard/stats")
        assert res.status_code == 200
        stats = res.json()
        assert stats["total_leads"] >= 1
        assert stats["hot_leads"] >= 1
        assert stats["total_appointments"] >= 1
        assert len(stats["activity_timeline"]) == 7
        print(f"[PASS] 11. Dashboard Live Metrics Verified: Total Leads={stats['total_leads']}, Hot Leads={stats['hot_leads']}, Appointments={stats['total_appointments']}, Conversations={stats['total_conversations']}.")

        print("\n>>> ALL 11 END-TO-END TEST CASES PASSED WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    test_full_workflow()
