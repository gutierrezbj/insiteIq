"""
InsiteIQ v1 Fase 1 — Smoke test

End-to-end sanity check against a running local stack:
  - health endpoint
  - auth login (Juan, SRS owner)
  - list work_orders
  - full state-machine happy path (intake -> triage -> pre_flight -> dispatched)
  - state-machine guards (pre_flight without all_green, illegal skip)
  - audit_log rich entries present

Run:
  docker compose exec -T api python -m scripts.smoke_test
  # or from host if you set API_BASE=http://127.0.0.1:4110
"""
import os
import sys
import time

import httpx

API_BASE = os.environ.get("API_BASE", "http://api:8000")
JUAN_EMAIL = "juancho@systemrapid.com"
JUAN_PWD = "InsiteIQ2026!"

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

failures: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    status = PASS if ok else FAIL
    print(f"  [{status}] {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


def main() -> int:
    print(f"Smoke test against {API_BASE}")
    client = httpx.Client(base_url=API_BASE, timeout=10.0)

    # Wait up to ~10s for health (cold-boot safety)
    for _ in range(10):
        try:
            r = client.get("/health")
            if r.status_code == 200 and r.json().get("mongo") == "ok":
                break
        except Exception:
            pass
        time.sleep(1)
    else:
        print("API not ready after 10s")
        return 2

    # 1. Health
    r = client.get("/health")
    check("health 200", r.status_code == 200)
    check("mongo ok", r.json().get("mongo") == "ok")

    # 2. Login
    r = client.post("/api/auth/login", json={"email": JUAN_EMAIL, "password": JUAN_PWD})
    check("login Juan 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        print("Aborting — login failed. Is seed populated?")
        return 2
    tok = r.json()["access_token"]
    auth = {"Authorization": f"Bearer {tok}"}

    # 3. Wrong password
    r = client.post(
        "/api/auth/login", json={"email": JUAN_EMAIL, "password": "wrong"}
    )
    check("wrong password 401", r.status_code == 401)

    # 4. /me
    r = client.get("/api/auth/me", headers=auth)
    check("/me 200 + srs_coordinators", r.status_code == 200 and any(
        m["space"] == "srs_coordinators" for m in r.json()["memberships"]
    ))

    # 5. List work_orders (Juan sees all)
    r = client.get("/api/work-orders", headers=auth)
    check("list work_orders 200", r.status_code == 200)
    wos = r.json()
    check("seed has >= 3 work_orders", len(wos) >= 3, f"count={len(wos)}")

    # 6. Intake a new work_order (smoke)
    r = client.get("/api/service-agreements", headers=auth)
    agreements = r.json()
    frac = next(a for a in agreements if a["contract_ref"] == "FRAC-TEL-2026-2029")

    r = client.get("/api/sites", headers=auth)
    sites = r.json()
    site = next(s for s in sites if s["code"] == "ZARA-CL-TAL")

    ref = f"SMOKE-{int(time.time())}"
    r = client.post("/api/work-orders", headers=auth, json={
        "organization_id": frac["organization_id"],
        "site_id": site["id"],
        "service_agreement_id": frac["id"],
        "reference": ref,
        "title": "Smoke test work order",
        "severity": "normal",
    })
    check("intake work_order 201", r.status_code == 201, f"status={r.status_code}")
    if r.status_code != 201:
        return 2
    wo = r.json()
    wo_id = wo["id"]
    check("status=intake on create", wo["status"] == "intake")
    check("ball=srs on create", wo["ball_in_court"]["side"] == "srs")
    check("shield snapshot = bronze_plus", wo["shield_level"] == "bronze_plus")

    # 7. Happy path intake -> triage -> pre_flight
    for target in ("triage", "pre_flight"):
        r = client.post(
            f"/api/work-orders/{wo_id}/advance",
            headers=auth,
            json={"target_status": target},
        )
        check(f"advance -> {target}", r.status_code == 200, f"status={r.status_code}")
        check(f"state is {target}", r.json()["status"] == target)

    # 8. Guard: pre_flight -> dispatched without all_green
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=auth,
        json={"target_status": "dispatched"},
    )
    check("guard all_green blocks dispatch (400)", r.status_code == 400)

    # 9. Guard: illegal skip pre_flight -> on_site
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=auth,
        json={"target_status": "on_site"},
    )
    check("guard state-machine blocks skip (400)", r.status_code == 400)

    # 10. Set preflight all_green then dispatch
    r = client.post(
        f"/api/work-orders/{wo_id}/preflight",
        headers=auth,
        json={"checklist": {
            "kit_verified": True, "parts_ready": True,
            "site_bible_read": True, "all_green": True,
        }},
    )
    check("preflight.set 200", r.status_code == 200)

    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=auth,
        json={"target_status": "dispatched"},
    )
    check("dispatch after all_green", r.status_code == 200)
    check("ball=tech after dispatch", r.json()["ball_in_court"]["side"] == "tech")

    # 11. Ticket Thread: post shared + internal messages (lazy creation)
    r = client.post(
        f"/api/work-orders/{wo_id}/threads/shared/messages",
        headers=auth,
        json={"text": "Triage kickoff note (smoke)"},
    )
    check("post shared message 201", r.status_code == 201, f"status={r.status_code}")

    r = client.post(
        f"/api/work-orders/{wo_id}/threads/internal/messages",
        headers=auth,
        json={"text": "Internal coord note (smoke)"},
    )
    check("post internal message 201", r.status_code == 201)

    r = client.get(f"/api/work-orders/{wo_id}/threads", headers=auth)
    check("list threads 200", r.status_code == 200)
    threads = r.json()
    check("two threads exist (shared + internal)", len(threads) == 2)

    # 12. Advance again to generate a system_event in shared thread
    r = client.get(f"/api/work-orders/{wo_id}", headers=auth)
    current_status = r.json()["status"]
    # already dispatched from earlier step — go en_route
    if current_status == "dispatched":
        r = client.post(
            f"/api/work-orders/{wo_id}/advance",
            headers=auth,
            json={"target_status": "en_route"},
        )
        check("advance dispatched -> en_route", r.status_code == 200)

    r = client.get(f"/api/work-orders/{wo_id}/threads/shared/messages", headers=auth)
    msgs = r.json()
    check("shared has user msg + system_event", any(m["kind"] == "message" for m in msgs)
          and any(m["kind"] == "system_event" for m in msgs))

    # 13. Cancel work_order (cleanup) — also seals threads
    r = client.post(
        f"/api/work-orders/{wo_id}/cancel",
        headers=auth,
        json={"reason": "smoke test cleanup"},
    )
    check("cancel 200", r.status_code == 200)
    check("status=cancelled", r.json()["status"] == "cancelled")

    # 14. Threads should be sealed now, messages immutable
    r = client.get(f"/api/work-orders/{wo_id}/threads", headers=auth)
    threads = r.json()
    check("both threads sealed after cancel", all(t.get("sealed_at") for t in threads))

    r = client.post(
        f"/api/work-orders/{wo_id}/threads/shared/messages",
        headers=auth,
        json={"text": "try after seal"},
    )
    check("post to sealed thread rejected (409)", r.status_code == 409)

    # 12. Audit trail: verify rich entries exist for this work_order
    # We need direct DB access for this; connect via host mongo (127.0.0.1:6110)
    # If running inside api container, mongo host is 'mongo'.
    try:
        import pymongo
        mongo_url = os.environ.get("MONGO_URL", "mongodb://mongo:27017")
        mc = pymongo.MongoClient(mongo_url, serverSelectionTimeoutMS=2000)
        col = mc["insiteiq"]["audit_log"]
        rich = list(
            col.find({"entity_refs.id": wo_id, "source": "domain"}).sort("ts", 1)
        )
        check("audit_log rich >= 5 entries", len(rich) >= 5, f"count={len(rich)}")
        actions = [e["action"] for e in rich]
        check(
            "audit_log has intake + 3 advance + cancel actions",
            any(a == "work_order.intake" for a in actions)
            and any(a.startswith("work_order.advance.") for a in actions)
            and any(a == "work_order.cancel" for a in actions),
            f"actions={actions}",
        )
    except Exception as e:
        check("audit_log query", False, f"mongo unreachable: {e}")

    # Summary
    print()
    if failures:
        print(f"\033[31m{len(failures)} FAILED:\033[0m")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\033[32mAll smoke checks passed.\033[0m")
    return 0


if __name__ == "__main__":
    sys.exit(main())
