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
JUAN_EMAIL = "juang@systemrapid.io"
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

    # Login Agustin (doubles as SRS + tech_field) — used for briefing ack later
    r = client.post(
        "/api/auth/login",
        json={"email": "agustinc@systemrapid.com", "password": JUAN_PWD},
    )
    check("login Agustin 200", r.status_code == 200)
    agustin = r.json()
    agustin_auth = {"Authorization": f"Bearer {agustin['access_token']}"}
    agustin_id = agustin["user"]["id"]

    ref = f"SMOKE-{int(time.time())}"
    r = client.post("/api/work-orders", headers=auth, json={
        "organization_id": frac["organization_id"],
        "site_id": site["id"],
        "service_agreement_id": frac["id"],
        "reference": ref,
        "title": "Smoke test work order",
        "severity": "normal",
        "assigned_tech_user_id": agustin_id,
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

    # 11. Copilot Briefing (Domain 10.5) — assemble, guard on en_route, acknowledge
    r = client.post(f"/api/work-orders/{wo_id}/briefing/assemble", headers=auth)
    check("briefing assemble 200", r.status_code == 200)
    check("briefing status=assembled", r.json()["status"] == "assembled")
    check("site_bible_summary has site_name",
          r.json()["site_bible_summary"].get("site_name") is not None)

    # Guard: dispatched -> en_route without acknowledgment blocked
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=auth,
        json={"target_status": "en_route"},
    )
    check("en_route blocked without brief ack (400)", r.status_code == 400)

    # SRS cannot acknowledge (only assigned tech)
    r = client.post(f"/api/work-orders/{wo_id}/briefing/acknowledge", headers=auth)
    check("SRS cannot ack (403)", r.status_code == 403)

    # Agustin (assigned tech) acknowledges
    r = client.post(
        f"/api/work-orders/{wo_id}/briefing/acknowledge", headers=agustin_auth
    )
    check("tech ack 200", r.status_code == 200, f"status={r.status_code}")
    check("briefing status=acknowledged", r.json()["status"] == "acknowledged")
    check("acknowledged_by == tech", r.json()["acknowledged_by"] == agustin_id)

    # Now en_route should succeed (advance as Agustin who has tech_field)
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=agustin_auth,
        json={"target_status": "en_route"},
    )
    check("en_route after ack 200", r.status_code == 200, f"status={r.status_code}")
    check("status=en_route", r.json()["status"] == "en_route")

    # Thread messages BEFORE closing (post after close is tested separately)
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

    r = client.get(f"/api/work-orders/{wo_id}/threads/shared/messages", headers=auth)
    msgs = r.json()
    check("shared has user msg + system_event",
          any(m["kind"] == "message" for m in msgs)
          and any(m["kind"] == "system_event" for m in msgs))

    # Tech arrives on site (en_route -> on_site)
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=agustin_auth,
        json={"target_status": "on_site", "handshake": "check_in",
              "lat": -36.72, "lng": -73.11, "notes": "Arrived onsite (smoke)"},
    )
    check("on_site 200", r.status_code == 200)
    check("status=on_site", r.json()["status"] == "on_site")
    check("handshake check_in recorded", len(r.json()["handshakes"]) >= 1)

    # Tech PWA Capture (Domain 10.4) — ritual post-intervencion
    # Guard: on_site -> resolved blocked without capture
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=agustin_auth,
        json={"target_status": "resolved"},
    )
    check("resolved blocked without capture (400)", r.status_code == 400)

    # SRS cannot submit capture (only assigned tech)
    r = client.post(
        f"/api/work-orders/{wo_id}/capture/submit",
        headers=auth,
        json={
            "what_found": "test",
            "what_did": "test",
        },
    )
    check("SRS cannot submit capture (403)", r.status_code == 403)

    # Content guard: empty fields rejected
    r = client.post(
        f"/api/work-orders/{wo_id}/capture/submit",
        headers=agustin_auth,
        json={"what_found": "", "what_did": ""},
    )
    check("empty capture rejected (400)", r.status_code == 400)

    # Tech submits proper capture
    r = client.post(
        f"/api/work-orders/{wo_id}/capture/submit",
        headers=agustin_auth,
        json={
            "what_found": "Amplificador audio muerto, LEDs rojos intermitentes.",
            "what_did": "Reemplazo amplificador. Prueba audio OK en las 4 zonas.",
            "anything_new_about_site": "Nuevo gerente de tienda desde enero (Mariana). Contacto actualizado.",
            "devices_touched": [{
                "device_type": "Crown CDi amplifier",
                "category": "audio",
                "known_failure": False,
                "resolution_action": "replaced",
            }],
            "time_on_site_minutes": 75,
            "follow_up_needed": False,
        },
    )
    check("tech submits capture 201", r.status_code == 201, f"status={r.status_code}")
    check("capture status=submitted", r.json()["status"] == "submitted")
    check("capture submitted_by == tech", r.json()["submitted_by"] == agustin_id)

    # Now on_site -> resolved should succeed
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=agustin_auth,
        json={"target_status": "resolved", "handshake": "resolution",
              "notes": "Intervention complete"},
    )
    check("resolved after capture 200", r.status_code == 200, f"status={r.status_code}")
    check("status=resolved", r.json()["status"] == "resolved")
    check("ball=client on resolved", r.json()["ball_in_court"]["side"] == "client")

    # SRS closes the work_order (resolved -> closed)
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=auth,
        json={"target_status": "closed", "handshake": "closure",
              "notes": "NOC Operator sign-off (smoke)"},
    )
    check("closed 200", r.status_code == 200)
    check("status=closed", r.json()["status"] == "closed")
    check("closed_at populated", r.json().get("closed_at") is not None)

    # 12. Threads should be sealed now (closed triggers seal), messages immutable
    r = client.get(f"/api/work-orders/{wo_id}/threads", headers=auth)
    threads = r.json()
    check("both threads sealed after close", all(t.get("sealed_at") for t in threads))

    r = client.post(
        f"/api/work-orders/{wo_id}/threads/shared/messages",
        headers=auth,
        json={"text": "try after seal"},
    )
    check("post to sealed thread rejected (409)", r.status_code == 409)

    # 14. Terminal state: cannot advance further
    r = client.post(
        f"/api/work-orders/{wo_id}/advance",
        headers=auth,
        json={"target_status": "resolved"},
    )
    check("terminal closed refuses advance (400)", r.status_code == 400)

    # 15. Emit channels (Principle #1) — auto-assembled at close
    r = client.get(f"/api/work-orders/{wo_id}/report", headers=auth)
    check("report JSON 200", r.status_code == 200, f"status={r.status_code}")
    report = r.json()
    check("report version=1", report.get("version") == 1)
    check("report status=final", report.get("status") == "final")
    check("report header has reference", report.get("header", {}).get("work_order_reference"))
    check("report timeline non-empty", len(report.get("timeline", [])) > 0)
    check("report ball_timeline non-empty", len(report.get("ball_timeline", [])) > 0)
    check("report capture.what_found set", report.get("capture", {}).get("what_found") is not None)

    # SLA computed
    sla = report.get("sla", {})
    check("report sla.received_within_sla set",
          sla.get("received_within_sla") is not None)
    check("report sla.resolved_within_sla set",
          sla.get("resolved_within_sla") is not None)

    # HTML channel
    r = client.get(f"/api/work-orders/{wo_id}/report.html", headers=auth)
    check("report HTML 200", r.status_code == 200)
    check("HTML content-type", "text/html" in r.headers.get("content-type", ""))
    check("HTML contains reference", ref in r.text)
    check("HTML contains SLA section", "SLA Compliance" in r.text)

    # CSV channel
    r = client.get(f"/api/work-orders/{wo_id}/report.csv", headers=auth)
    check("report CSV 200", r.status_code == 200)
    check("CSV content-type", "text/csv" in r.headers.get("content-type", ""))
    check("CSV contains reference", ref in r.text)
    check("CSV has Content-Disposition",
          "attachment" in r.headers.get("content-disposition", ""))

    # Email dispatch
    r = client.post(
        f"/api/work-orders/{wo_id}/report/dispatch/email",
        headers=auth,
        json={"to": "rackel.rocha@fractaliasystems.es"},
    )
    check("email dispatch queued", r.status_code == 200 and r.json().get("queued") is True)
    check("email outbox_id returned", r.json().get("outbox_id") is not None)

    # Webhook dispatch
    r = client.post(
        f"/api/work-orders/{wo_id}/report/dispatch/webhook",
        headers=auth,
        json={"url": "https://fractalia.example/hooks/insiteiq"},
    )
    check("webhook dispatch queued", r.status_code == 200 and r.json().get("queued") is True)

    # Deliveries list should now include portal + email + webhook
    r = client.get(f"/api/work-orders/{wo_id}/report", headers=auth)
    deliveries = r.json().get("deliveries", [])
    channels = {d["channel"] for d in deliveries}
    check("deliveries has portal + email + webhook",
          {"portal", "email", "webhook"}.issubset(channels), f"channels={channels}")

    # Regenerate supersedes + bumps version
    r = client.post(f"/api/work-orders/{wo_id}/report/regenerate", headers=auth)
    check("regenerate 200", r.status_code == 200)
    check("version bumped to 2", r.json().get("version") == 2)

    # 16. Budget Approval Requests (Decision #5 — parts threshold + ball-in-court)
    # First we need a non-closed WO. Create one fresh (re-use intake flow).
    ref2 = f"SMOKE-PARTS-{int(time.time())}"
    r = client.post("/api/work-orders", headers=auth, json={
        "organization_id": frac["organization_id"],
        "site_id": site["id"],
        "service_agreement_id": frac["id"],
        "reference": ref2,
        "title": "Parts threshold test",
    })
    check("intake parts-test WO 201", r.status_code == 201)
    wo2_id = r.json()["id"]

    # Below threshold (Fractalia agreement threshold=150 USD; we use 100)
    r = client.post(
        f"/api/work-orders/{wo2_id}/parts",
        headers=auth,
        json={"parts": [{"name": "Audio cable 5m", "unit_price_usd": 50, "quantity": 2, "total_price_usd": 100}]},
    )
    check("parts request below threshold 201", r.status_code == 201)
    req_below = r.json()
    check("below_threshold flag true", req_below["below_threshold"] is True)
    check("status=approved (auto)", req_below["status"] == "approved")
    check("ball=srs after auto-approve", req_below["ball_in_court"]["side"] == "srs")

    # Above threshold
    r = client.post(
        f"/api/work-orders/{wo2_id}/parts",
        headers=auth,
        json={"parts": [
            {"name": "Crown CDi amplifier", "unit_price_usd": 850, "quantity": 1, "total_price_usd": 850}
        ]},
    )
    check("parts request above threshold 201", r.status_code == 201)
    req_above = r.json()
    req_above_id = req_above["id"]
    check("below_threshold flag false", req_above["below_threshold"] is False)
    check("status=draft (awaiting send)", req_above["status"] == "draft")

    # Send to client -> ball moves to client
    r = client.post(f"/api/parts/{req_above_id}/send-to-client", headers=auth)
    check("send-to-client 200", r.status_code == 200)
    check("status=sent_to_client", r.json()["status"] == "sent_to_client")
    check("ball=client after send", r.json()["ball_in_court"]["side"] == "client")
    check("exchange logged quote_sent",
          any(e["kind"] == "quote_sent" for e in r.json()["exchanges"]))

    # Client approves (SRS acts on behalf — Rackel user would work too if in smoke)
    r = client.post(
        f"/api/parts/{req_above_id}/client-approve",
        headers=auth,
        json={"notes": "approved by Rackel via email"},
    )
    check("client-approve 200", r.status_code == 200)
    check("status=approved", r.json()["status"] == "approved")
    check("ball=srs after decision", r.json()["ball_in_court"]["side"] == "srs")
    check("resolved_at set", r.json().get("resolved_at") is not None)

    # Auto-purchase flag (SRS bought urgently anyway)
    r = client.post(
        f"/api/parts/{req_above_id}/auto-purchase",
        headers=auth,
        json={"reason": "shipped before client reply — operational urgency"},
    )
    check("auto-purchase 200", r.status_code == 200)
    check("auto_purchased=true", r.json()["auto_purchased"] is True)

    # List parts requests for WO
    r = client.get(f"/api/work-orders/{wo2_id}/parts", headers=auth)
    check("list parts for WO", r.status_code == 200 and len(r.json()) == 2)

    # 17. Skill Passport (Decision #4) — using the resolved/closed WO with Agustin
    # The first WO (wo_id) was closed with Agustin as assigned tech.
    r = client.get("/api/techs/me/passport", headers=agustin_auth)
    check("tech gets own passport 200", r.status_code == 200)
    passport = r.json()
    # Baseline: seed may have pre-rated Agustin, so just record the starting counts
    baseline_rating_count = passport.get("rating_count", 0)
    baseline_rating_avg = passport.get("rating_avg", 0.0)
    check("passport level in valid set",
          passport["level"] in ("bronze", "silver", "gold", "platinum"))

    # SRS views same passport via /{id}
    r = client.get(f"/api/techs/{agustin_id}/passport", headers=auth)
    check("SRS views tech passport 200", r.status_code == 200)

    # Tech cannot view another tech's passport
    # (we don't have another tech user set up beyond Arlindo — try Arlindo)
    r = client.post("/api/auth/login", json={"email": "arlindoo@systemrapid.com", "password": JUAN_PWD})
    arlindo_auth = {"Authorization": f"Bearer {r.json()['access_token']}"}
    r = client.get(f"/api/techs/{agustin_id}/passport", headers=arlindo_auth)
    check("tech cannot view other tech passport (403)", r.status_code == 403)

    # Patch passport: SRS adds certifications + countries + skills
    r = client.patch(
        f"/api/techs/{agustin_id}/passport",
        headers=auth,
        json={
            "certifications": [{"name": "CCNA", "issuer": "Cisco"}],
            "skills": [{"name": "Audio systems", "tier": "advanced", "endorsed_count": 5}],
            "languages": ["es", "en"],
            "countries_covered": ["ES", "PT", "CL", "MX"],
            "bio": "Top tech plantilla SRS — audio + network",
        },
    )
    check("patch passport 200", r.status_code == 200)
    check("patch stored certs", len(r.json()["certifications"]) == 1)
    check("patch stored countries", len(r.json()["countries_covered"]) == 4)

    # Rate the tech on the closed WO (wo_id)
    r = client.post(
        f"/api/work-orders/{wo_id}/rate-tech",
        headers=auth,
        json={
            "score": 5.0,
            "dimensions": {
                "quality": 5, "punctuality": 5,
                "communication": 5, "professionalism": 5,
            },
            "notes": "Flawless execution (smoke)",
        },
    )
    check("rate-tech 201", r.status_code == 201, f"status={r.status_code}")
    rated = r.json()
    check("rating score=5", rated["rating"]["score"] == 5.0)
    check(
        "passport rating_count incremented by 1",
        rated["passport"]["rating_count"] == baseline_rating_count + 1,
        f"was={baseline_rating_count} now={rated['passport']['rating_count']}",
    )
    new_avg = rated["passport"]["rating_avg"]
    check(
        "passport rating_avg recomputed reasonably (>=4.0, <=5.0)",
        4.0 <= new_avg <= 5.0,
        f"avg={new_avg}",
    )

    # Duplicate rating should 409 (unique index)
    r = client.post(
        f"/api/work-orders/{wo_id}/rate-tech",
        headers=auth,
        json={"score": 4.0},
    )
    check("duplicate rating 409", r.status_code == 409)

    # List ratings on WO (exactly 1 — the one we just added on this specific smoke WO)
    r = client.get(f"/api/work-orders/{wo_id}/ratings", headers=auth)
    check("list ratings on smoke WO (1 expected)",
          r.status_code == 200 and len(r.json()) == 1)

    # 18. Modo 2 Rollout — projects, clusters, bulk upload, dashboard
    # Verify seed has Arcos project
    r = client.get("/api/projects", headers=auth)
    check("list projects 200", r.status_code == 200)
    arcos = next((p for p in r.json() if p["code"] == "ARCOS-PA-SDWAN-2026"), None)
    check("seed has Arcos rollout", arcos is not None)

    if arcos:
        r = client.get(f"/api/projects/{arcos['id']}/dashboard", headers=auth)
        check("arcos dashboard 200", r.status_code == 200)
        dash = r.json()
        check("dashboard KPIs present", "kpis" in dash and "progress_pct" in dash["kpis"])
        check("dashboard WO buckets present",
              "by_status" in dash["work_orders"])
        check("dashboard 3 arcos WOs", dash["work_orders"]["total"] == 3)
        check("dashboard cluster W1 listed",
              any(c["code"] == "W1-PANAMA-CITY" for c in dash["clusters"]))

    # Create a fresh rollout project end-to-end
    r = client.get("/api/service-agreements", headers=auth)
    claro_us_ag = next(a for a in r.json() if a["contract_ref"] == "CLARO-US-2026-AUDIT")

    proj_code = f"SMOKE-ROLLOUT-{int(time.time())}"
    r = client.post("/api/projects", headers=auth, json={
        "type": "rollout",
        "delivery_pattern": "rollout",
        "code": proj_code,
        "title": "Smoke test rollout",
        "client_organization_id": claro_us_ag["organization_id"],
        "service_agreement_id": claro_us_ag["id"],
        "total_sites_target": 5,
    })
    check("create project 201", r.status_code == 201, f"status={r.status_code}")
    new_proj_id = r.json()["id"]
    check("project status=draft", r.json()["status"] == "draft")

    # Patch to active
    r = client.patch(f"/api/projects/{new_proj_id}", headers=auth, json={"status": "active"})
    check("patch project status 200", r.status_code == 200)
    check("project active", r.json()["status"] == "active")

    # Bulk upload 3 sites
    r = client.post(f"/api/projects/{new_proj_id}/bulk-upload", headers=auth, json={
        "source": "clipboard_paste",
        "sites": [
            {"code": f"SMK-{int(time.time())}-01", "name": "Smoke Site 1", "country": "US"},
            {"code": f"SMK-{int(time.time())}-02", "name": "Smoke Site 2", "country": "US"},
            {"code": f"SMK-{int(time.time())}-03", "name": "Smoke Site 3", "country": "US"},
        ],
    })
    check("bulk upload 201", r.status_code == 201, f"status={r.status_code}")
    check("bulk upload sites_created=3", r.json()["sites_created"] == 3)
    check("bulk upload status=applied", r.json()["status"] == "applied")
    check("bulk upload changelog has 3 entries", len(r.json()["changelog"]) == 3)

    r = client.get(f"/api/projects/{new_proj_id}/bulk-uploads", headers=auth)
    check("list bulk uploads", r.status_code == 200 and len(r.json()) == 1)

    # CSV bulk_upload with mixed ES/EN aliased headers
    ts_suffix = int(time.time()) + 1
    csv_content = (
        "Codigo,Store Name,Pais,Ciudad,Timezone\n"
        f"SMK-CSV-{ts_suffix}-A,ZARA Test ES,ES,Madrid,Europe/Madrid\n"
        f"SMK-CSV-{ts_suffix}-B,CH Test US,US,New York,America/New_York\n"
    )
    r = client.post(f"/api/projects/{new_proj_id}/bulk-upload", headers=auth, json={
        "source": "clipboard_paste",
        "csv_content": csv_content,
    })
    check("CSV bulk upload 201", r.status_code == 201, f"status={r.status_code}")
    csv_event = r.json()
    check("CSV sites_created=2", csv_event["sites_created"] == 2)
    check("CSV parsing_notes present", len(csv_event.get("parsing_notes", [])) > 0)

    # CSV with wrong columns should 400
    r = client.post(f"/api/projects/{new_proj_id}/bulk-upload", headers=auth, json={
        "source": "clipboard_paste",
        "csv_content": "xxx,yyy\n1,2\n",
    })
    check("CSV malformed rejected 400", r.status_code == 400)

    # 19. Equipment reconciliation (Modo 2 Decision #4)
    # Get the 3 smoke sites we just created via CSV upload for scanning.
    r = client.get(
        f"/api/sites?country=US", headers=auth
    )
    smoke_site = next((s for s in r.json()
                       if s["code"].startswith(f"SMK-CSV-{ts_suffix}")), None)
    # Fallback: any US site from the earlier non-CSV upload
    if smoke_site is None:
        r2 = client.get(f"/api/sites", headers=auth)
        smoke_site = r2.json()[0]

    # Upload plan entries for the new project — reuse new_proj_id
    r = client.post(
        f"/api/projects/{new_proj_id}/equipment-plan",
        headers=auth,
        json={
            "source": "portal_upload",
            "entries": [
                {
                    "site_id": smoke_site["id"],
                    "serial_number": f"SN-SMOKE-{ts_suffix}-001",
                    "make": "Cisco", "model": "C9300-24T", "category": "network",
                },
                {
                    "site_id": smoke_site["id"],
                    "serial_number": f"SN-SMOKE-{ts_suffix}-002",
                    "make": "Samsung", "model": "QM55R", "category": "display",
                },
                {
                    "site_id": smoke_site["id"],
                    "serial_number": f"SN-SMOKE-{ts_suffix}-003",
                    "make": "Cisco", "model": "AP-9130", "category": "network",
                },
            ],
        },
    )
    check("equipment plan upload 201", r.status_code == 201)
    check("plan inserted 3", r.json()["inserted"] == 3)

    r = client.get(f"/api/projects/{new_proj_id}/equipment-plan", headers=auth)
    check("list plan 3 entries", r.status_code == 200 and len(r.json()) == 3)

    # Scan 2 of 3 at the site (1 match + 1 substitution setup)
    # Serial 001 matches exactly
    r = client.post(
        f"/api/sites/{smoke_site['id']}/equipment/scan",
        headers=auth,
        json={
            "serial_number": f"SN-SMOKE-{ts_suffix}-001",
            "make": "Cisco", "model": "C9300-24T", "category": "network",
        },
    )
    check("scan match 201", r.status_code == 201)
    check("scan event installed", r.json()["event_type"] == "installed")

    # Serial 099 — not in plan → will be sin_plan
    r = client.post(
        f"/api/sites/{smoke_site['id']}/equipment/scan",
        headers=auth,
        json={
            "serial_number": f"SN-SMOKE-{ts_suffix}-099",
            "make": "Unexpected", "model": "X-100", "category": "other",
        },
    )
    check("scan sin_plan 201", r.status_code == 201)

    # Run reconcile
    r = client.post(f"/api/projects/{new_proj_id}/reconcile", headers=auth)
    check("reconcile 200", r.status_code == 200)
    recon = r.json()
    check("reconcile returned counts dict",
          isinstance(recon.get("counts"), dict)
          and all(k in recon["counts"]
                  for k in ("match", "substituted", "missing", "sin_plan", "conflicto")))
    # With 3 planned + 2 scanned (1 match, 1 sin_plan): expect 1 match, 2 missing, 1 sin_plan
    check("reconcile counts reasonable (match>=1, missing>=1, sin_plan>=1)",
          recon["counts"]["match"] >= 1
          and recon["counts"]["missing"] >= 1
          and recon["counts"]["sin_plan"] >= 1)

    # Get reconciliation report
    r = client.get(f"/api/projects/{new_proj_id}/reconciliation", headers=auth)
    check("get reconciliation 200", r.status_code == 200)
    report = r.json()
    check("report has plan_entries", len(report["plan_entries"]) == 3)
    check("report entries have resolved status (not all planned)",
          any(e["status"] != "planned" for e in report["plan_entries"]))

    # Create + activate a cluster
    r = client.post(f"/api/projects/{new_proj_id}/clusters", headers=auth, json={
        "code": "SMK-W1",
        "title": "Smoke wave 1",
        "cluster_lead_user_id": agustin_id,
    })
    check("create cluster 201", r.status_code == 201)
    cluster_id = r.json()["id"]
    check("cluster initial status=proposed", r.json()["status"] == "proposed")

    r = client.post(
        f"/api/projects/{new_proj_id}/clusters/{cluster_id}/activate", headers=auth
    )
    check("activate cluster 200", r.status_code == 200)
    check("cluster status=activated", r.json()["status"] == "activated")
    check("cluster activated_by set", r.json().get("activated_by") is not None)

    # Activating twice rejected
    r = client.post(
        f"/api/projects/{new_proj_id}/clusters/{cluster_id}/activate", headers=auth
    )
    check("re-activate rejected 409", r.status_code == 409)

    # List clusters
    r = client.get(f"/api/projects/{new_proj_id}/clusters", headers=auth)
    check("list clusters", r.status_code == 200 and len(r.json()) == 1)

    # Project WOs list (should be empty — we haven't linked any)
    r = client.get(f"/api/projects/{new_proj_id}/work-orders", headers=auth)
    check("project WOs empty", r.status_code == 200 and len(r.json()) == 0)

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
            "audit_log has full happy-path actions",
            any(a == "work_order.intake" for a in actions)
            and any(a == "work_order.advance.closed" for a in actions)
            and any(a == "copilot_briefing.acknowledge" for a in actions)
            and any(a == "tech_capture.submit" for a in actions),
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
