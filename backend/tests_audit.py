import concurrent.futures
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app
from app.database import db
from app.auth import hash_password, verify_password


def run_audit_suite():
    print("=== VOXSALES AI DEEP TECHNICAL AUDIT TEST SUITE ===")
    with TestClient(app) as client:
        # 1. Auth, Password Hashing & Tenant Isolation
        pw_hash = hash_password("SecurePass123!")
        assert pw_hash.startswith("$2"), "Password must be bcrypt-hashed"
        assert verify_password("SecurePass123!", pw_hash)
        assert not verify_password("WrongPass", pw_hash)

        unauth = client.get("/api/auth/me")
        assert unauth.status_code == 401, f"Expected 401, got {unauth.status_code}"

        uid = uuid.uuid4().hex[:6]
        reg_a = client.post("/api/auth/register", json={
            "email": f"admin_a_{uid}@example.com",
            "password": "Password123!",
            "full_name": "Admin A",
            "organization_name": "Org Alpha",
            "role": "admin",
        })
        assert reg_a.status_code == 201, reg_a.text
        tok_a = reg_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {tok_a}"}

        reg_b = client.post("/api/auth/register", json={
            "email": f"member_b_{uid}@example.com",
            "password": "Password123!",
            "full_name": "Member B",
            "organization_name": "Org Beta",
            "role": "member",
        })
        assert reg_b.status_code == 201, reg_b.text
        tok_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {tok_b}"}

        # Create lead in Org A with CSV-injection payload
        lead_a = client.post("/api/leads", headers=headers_a, json={
            "name": "=CMD|'/C calc'!A0",
            "email": f"lead_{uid}@alpha.com",
            "phone": "9988776655",
            "interested_course": "Python Programming & Automation",
        })
        assert lead_a.status_code == 200, lead_a.text
        lead_a_id = lead_a.json()["id"]

        # Org B cannot access Org A's lead
        cross_get = client.get(f"/api/leads/{lead_a_id}", headers=headers_b)
        assert cross_get.status_code == 404, f"Cross-tenant leak! {cross_get.status_code}"

        # CSV formula injection check
        csv_res = client.get("/api/leads/export/csv", headers=headers_a)
        assert csv_res.status_code == 200
        assert "'=CMD" in csv_res.text, "CSV formula injection guard missing"
        print("[PASS] 1. Auth, bcrypt hashing, 401 guard, tenant isolation & CSV formula guard.")

        # 2. RAG Upload, Duplicate Check, Tenant Isolation & Deletion
        up_a = client.post("/api/knowledge/upload", headers=headers_a, data={
            "title": f"AlphaSecret_{uid}",
            "pasted_text": f"AlphaSecret unique discount code is ALPHA99_{uid} for robotics lab.",
        })
        assert up_a.status_code == 200, up_a.text

        dup_a = client.post("/api/knowledge/upload", headers=headers_a, data={
            "title": f"AlphaSecret_{uid}",
            "pasted_text": f"AlphaSecret unique discount code is ALPHA99_{uid} for robotics lab.",
        })
        assert dup_a.status_code == 409, f"Expected 409 duplicate, got {dup_a.status_code}"

        search_a = client.post("/api/knowledge/search", headers=headers_a, json={"query": f"ALPHA99_{uid} robotics", "top_k": 3})
        assert any(f"ALPHA99_{uid}" in r["content"] for r in search_a.json()["results"]), "Org A should retrieve its doc"

        search_b = client.post("/api/knowledge/search", headers=headers_b, json={"query": f"ALPHA99_{uid} robotics", "top_k": 3})
        assert not any(f"ALPHA99_{uid}" in r["content"] for r in search_b.json()["results"]), "Org B must NOT retrieve Org A's doc"

        del_a = client.delete(f"/api/knowledge/document/AlphaSecret_{uid}", headers=headers_a)
        assert del_a.status_code == 200, del_a.text
        print("[PASS] 2. RAG upload, duplicate 409, tenant isolation & document deletion.")

        # 3. Appointment Past Rejection, Simultaneous Booking, Reschedule & Cancel
        past = client.post("/api/appointments/book", json={
            "customer_name": "Past User",
            "email": "past@example.com",
            "phone": "9876543210",
            "slot_date": "2020-01-01",
            "slot_time": "10:00 AM",
        })
        assert past.status_code == 422, f"Expected 422 for past date, got {past.status_code}"

        race_date = "2099-12-31"
        race_time = f"10:{uid[:2]} AM"
        # Ensure clean slate for race slot
        if db.connected and db.db is not None:
            db.db.appointments.delete_many({"slot_date": race_date, "slot_time": race_time})

        def _book_race(idx: int):
            return client.post("/api/appointments/book", json={
                "customer_name": f"Racer {idx}",
                "email": f"racer{idx}_{uid}@example.com",
                "phone": f"987654321{idx}",
                "slot_date": race_date,
                "slot_time": race_time,
            }).status_code

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            statuses = list(pool.map(_book_race, range(5)))

        assert statuses.count(200) == 1, f"Expected exactly 1 success in race, got {statuses}"
        assert statuses.count(409) == 4, f"Expected 4 conflicts in race, got {statuses}"

        # Fetch created appointment, reschedule, then cancel
        apps = client.get("/api/appointments").json()["appointments"]
        race_app = next(a for a in apps if a["slot_date"] == race_date and a["slot_time"] == race_time)

        resched = client.patch(f"/api/appointments/{race_app['id']}/reschedule", json={
            "slot_date": "2099-12-30",
            "slot_time": "11:30 AM",
        })
        assert resched.status_code == 200, resched.text

        cancel = client.delete(f"/api/appointments/{race_app['id']}")
        assert cancel.status_code == 200, cancel.text
        print("[PASS] 3. Appointments: past date 422, 5-way concurrent race (1x200, 4x409), reschedule & cancel.")

        # 4. Latency Benchmark (20 concurrent health + search requests)
        latencies = []
        errors = 0

        def _bench(_):
            t0 = time.perf_counter()
            r = client.post("/api/knowledge/search", headers=headers_a, json={"query": "Python course fee", "top_k": 3})
            latencies.append((time.perf_counter() - t0) * 1000)
            return r.status_code

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            bench_codes = list(pool.map(_bench, range(20)))
        errors = sum(1 for c in bench_codes if c != 200)
        latencies.sort()
        p50 = round(latencies[len(latencies) // 2], 2)
        p95 = round(latencies[int(len(latencies) * 0.95)], 2)
        assert errors == 0, f"Benchmark had {errors} errors"
        print(f"[PASS] 4. Latency benchmark (20 concurrent RAG searches): p50={p50}ms, p95={p95}ms, errors={errors}/20.")

        print("\n>>> ALL AUDIT TESTS PASSED! <<<")


if __name__ == "__main__":
    run_audit_suite()
