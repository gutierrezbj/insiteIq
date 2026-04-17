"""
InsiteIQ v1 Modo 1 — Intervention Report assembler + renderers

assemble_intervention_report(db, wo) -> InterventionReport document (persisted)
render_html(report, scope="srs"|"client") -> str
render_csv(report, scope)                 -> str

The assembler pulls from: work_orders, sites, organizations, users,
service_agreements, tech_captures, ticket_threads/messages, audit_log.
The renderers are PURE functions of the assembled report — zero DB reads.

HTML is rendered via f-strings (no Jinja dep — KISS). A future PDF worker
runs the HTML through wkhtmltopdf or similar.
CSV uses stdlib `csv` module writing to StringIO.
"""
import csv
import io
from datetime import datetime, timezone
from typing import Any, Literal

from bson import ObjectId

Scope = Literal["srs", "client"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _minutes_between(a: datetime | None, b: datetime | None) -> int | None:
    if a is None or b is None:
        return None
    return int((b - a).total_seconds() // 60)


async def _lookup_user_name(db, user_id: str | None) -> str | None:
    if not user_id:
        return None
    try:
        doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"full_name": 1, "email": 1})
    except Exception:
        doc = None
    if not doc:
        return None
    return doc.get("full_name") or doc.get("email")


async def _lookup_org_name(db, org_id: str | None) -> str | None:
    if not org_id:
        return None
    try:
        doc = await db.organizations.find_one({"_id": ObjectId(org_id)}, {"display_name": 1, "legal_name": 1})
    except Exception:
        doc = None
    if not doc:
        return None
    return doc.get("display_name") or doc.get("legal_name")


async def _lookup_site(db, site_id: str | None) -> dict | None:
    if not site_id:
        return None
    try:
        return await db.sites.find_one({"_id": ObjectId(site_id)})
    except Exception:
        return None


async def assemble_intervention_report(db, wo: dict, actor_user_id: str | None = None) -> dict:
    """
    Build the full report document for a work_order. If an active report exists,
    mark it superseded and bump the version. Returns the new doc (inserted).
    """
    now = _now()
    wo_id = str(wo["_id"])
    tenant_id = wo["tenant_id"]

    # ---- Supersede previous ----
    prev = await db.intervention_reports.find_one(
        {"work_order_id": wo_id, "tenant_id": tenant_id, "status": {"$in": ["draft", "final"]}}
    )
    version = 1
    supersedes_id = None
    if prev:
        supersedes_id = str(prev["_id"])
        version = (prev.get("version") or 1) + 1
        await db.intervention_reports.update_one(
            {"_id": prev["_id"]},
            {"$set": {"status": "superseded", "updated_at": now}},
        )

    # ---- Lookups ----
    tech_name = await _lookup_user_name(db, wo.get("assigned_tech_user_id"))
    coord_name = await _lookup_user_name(db, wo.get("srs_coordinator_user_id"))
    client_name = await _lookup_org_name(db, wo.get("organization_id"))
    site_doc = await _lookup_site(db, wo.get("site_id"))

    header = {
        "work_order_reference": wo.get("reference", ""),
        "title": wo.get("title", ""),
        "severity": wo.get("severity", "normal"),
        "shield_level": wo.get("shield_level", ""),
        "client_name": client_name,
        "site_name": site_doc.get("name") if site_doc else None,
        "site_country": site_doc.get("country") if site_doc else None,
        "site_city": site_doc.get("city") if site_doc else None,
        "tech_name": tech_name,
        "srs_coordinator_name": coord_name,
        "opened_at": wo.get("created_at"),
        "closed_at": wo.get("closed_at") or wo.get("cancelled_at"),
    }

    # ---- Timeline from audit_log (domain source) ----
    audit_entries = await db.audit_log.find(
        {"entity_refs.id": wo_id, "source": "domain"}
    ).sort("ts", 1).to_list(500)

    timeline: list[dict] = []
    for e in audit_entries:
        action = e.get("action", "")
        ts = e.get("ts")
        ctx = e.get("context_snapshot") or {}
        actor_name = await _lookup_user_name(db, e.get("actor_user_id"))
        evt = {
            "ts": ts,
            "kind": "event",
            "label": action,
            "actor_name": actor_name,
            "from_status": ctx.get("from_status"),
            "to_status": ctx.get("to_status"),
            "ball_side": (ctx.get("ball_change") or {}).get("new_side")
                         if isinstance(ctx.get("ball_change"), dict) else None,
        }
        if action.startswith("work_order.advance."):
            evt["kind"] = "advance"
        elif action == "work_order.intake":
            evt["kind"] = "intake"
        elif action == "work_order.cancel":
            evt["kind"] = "cancel"
        elif action.startswith("copilot_briefing."):
            evt["kind"] = "briefing"
        elif action == "tech_capture.submit":
            evt["kind"] = "capture"
        elif action.startswith("ticket_thread."):
            evt["kind"] = "thread"
        timeline.append(evt)

    # Add handshake rows too (have geofence)
    for hs in wo.get("handshakes") or []:
        actor_name = await _lookup_user_name(db, hs.get("actor_user_id"))
        timeline.append({
            "ts": hs.get("ts"),
            "kind": "handshake",
            "label": f"handshake.{hs.get('kind')}",
            "actor_name": actor_name,
            "from_status": None,
            "to_status": None,
            "ball_side": None,
        })
    timeline.sort(key=lambda e: e["ts"] or now)

    # ---- SLA compliance ----
    first_advance = next(
        (e for e in audit_entries if e.get("action") == "work_order.advance.triage"),
        None,
    )
    resolve_evt = next(
        (e for e in audit_entries if e.get("action") == "work_order.advance.resolved"),
        None,
    )
    first_action_at = first_advance.get("ts") if first_advance else None
    resolution_at = resolve_evt.get("ts") if resolve_evt else wo.get("closed_at")

    sla = {
        "receive_deadline": wo.get("deadline_receive_at"),
        "resolve_deadline": wo.get("deadline_resolve_at"),
        "first_action_at": first_action_at,
        "resolution_at": resolution_at,
        "received_within_sla": (
            first_action_at is not None
            and wo.get("deadline_receive_at") is not None
            and first_action_at <= wo["deadline_receive_at"]
        ),
        "resolved_within_sla": (
            resolution_at is not None
            and wo.get("deadline_resolve_at") is not None
            and resolution_at <= wo["deadline_resolve_at"]
        ),
        "receive_margin_minutes": _minutes_between(first_action_at, wo.get("deadline_receive_at")),
        "resolve_margin_minutes": _minutes_between(resolution_at, wo.get("deadline_resolve_at")),
    }

    # ---- Ball-in-court timeline (derived from audit_log ball_change + current) ----
    ball_spans: list[dict] = []
    current_side = None
    current_since = wo.get("created_at")
    for e in audit_entries:
        ctx = e.get("context_snapshot") or {}
        ball_change = ctx.get("ball_change")
        if isinstance(ball_change, dict) and ball_change.get("new_side"):
            new_side = ball_change["new_side"]
            ts = e.get("ts")
            if current_side is not None:
                ball_spans.append({
                    "side": current_side,
                    "since": current_since,
                    "until": ts,
                    "duration_minutes": _minutes_between(current_since, ts),
                })
            current_side = new_side
            current_since = ts
    # Close out final span
    final_until = wo.get("closed_at") or wo.get("cancelled_at") or now
    if current_side is not None:
        ball_spans.append({
            "side": current_side,
            "since": current_since,
            "until": final_until,
            "duration_minutes": _minutes_between(current_since, final_until),
        })

    # ---- Tech Capture summary ----
    capture_doc = await db.tech_captures.find_one(
        {"work_order_id": wo_id, "tenant_id": tenant_id, "status": "submitted"}
    )
    capture = {
        "what_found": None,
        "what_did": None,
        "anything_new_about_site": None,
        "devices_touched": [],
        "time_on_site_minutes": None,
        "photos_count": 0,
        "follow_up_needed": False,
    }
    if capture_doc:
        capture.update({
            "what_found": capture_doc.get("what_found"),
            "what_did": capture_doc.get("what_did"),
            "anything_new_about_site": capture_doc.get("anything_new_about_site"),
            "devices_touched": capture_doc.get("devices_touched") or [],
            "time_on_site_minutes": capture_doc.get("time_on_site_minutes"),
            "photos_count": len(capture_doc.get("photos") or []),
            "follow_up_needed": bool(capture_doc.get("follow_up_needed")),
        })

    # ---- Threads summary ----
    shared_thread = await db.ticket_threads.find_one(
        {"work_order_id": wo_id, "tenant_id": tenant_id, "kind": "shared"}
    )
    internal_thread = await db.ticket_threads.find_one(
        {"work_order_id": wo_id, "tenant_id": tenant_id, "kind": "internal"}
    )
    shared_count = 0
    internal_count = 0
    if shared_thread:
        shared_count = await db.ticket_messages.count_documents(
            {"thread_id": str(shared_thread["_id"])}
        )
    if internal_thread:
        internal_count = await db.ticket_messages.count_documents(
            {"thread_id": str(internal_thread["_id"])}
        )
    threads = {
        "shared_message_count": shared_count,
        "internal_message_count": internal_count,
    }

    # ---- Insert report ----
    doc: dict[str, Any] = {
        "tenant_id": tenant_id,
        "work_order_id": wo_id,
        "version": version,
        "status": "final",
        "generated_at": now,
        "generated_by": actor_user_id,
        "supersedes_id": supersedes_id,
        "header": header,
        "timeline": timeline,
        "sla": sla,
        "ball_timeline": ball_spans,
        "capture": capture,
        "threads": threads,
        "deliveries": [
            {
                "channel": "portal",
                "target": f"/api/work-orders/{wo_id}/report",
                "enqueued_at": now,
                "status": "delivered",
                "attempts": 1,
                "requested_by": actor_user_id,
            }
        ],
        "html_rendered": None,
        "csv_rendered": None,
        "created_at": now,
        "updated_at": now,
        "created_by": actor_user_id,
        "updated_by": actor_user_id,
    }
    # Render + cache HTML and CSV views immediately
    doc["html_rendered"] = render_html(doc, scope="srs")
    doc["csv_rendered"] = render_csv(doc, scope="srs")

    result = await db.intervention_reports.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


# ---------------- Renderers ----------------

def scope_report(report: dict, scope: Scope) -> dict:
    """
    Client scope strips internal-only data (ball_timeline still ok — transparent
    by design; but internal_thread_count hidden).
    """
    if scope == "srs":
        return report
    r = {**report}
    threads = dict(r.get("threads") or {})
    threads["internal_message_count"] = 0
    r["threads"] = threads
    return r


def _fmt_dt(dt: datetime | None) -> str:
    if dt is None:
        return "—"
    if isinstance(dt, str):
        return dt
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def render_html(report: dict, scope: Scope = "srs") -> str:
    r = scope_report(report, scope)
    h = r.get("header") or {}
    sla = r.get("sla") or {}
    cap = r.get("capture") or {}
    th = r.get("threads") or {}
    ball = r.get("ball_timeline") or []
    timeline = r.get("timeline") or []

    ball_rows = "".join(
        f"<tr><td>{b['side']}</td><td>{_fmt_dt(b.get('since'))}</td>"
        f"<td>{_fmt_dt(b.get('until'))}</td><td>{b.get('duration_minutes') or '—'} min</td></tr>"
        for b in ball
    )

    tl_rows = "".join(
        f"<tr><td>{_fmt_dt(e.get('ts'))}</td><td>{e.get('kind')}</td>"
        f"<td>{e.get('label')}</td><td>{e.get('actor_name') or '—'}</td>"
        f"<td>{e.get('from_status') or ''} → {e.get('to_status') or ''}</td></tr>"
        for e in timeline
    )

    devices_rows = "".join(
        f"<tr><td>{d.get('device_type','')}</td><td>{d.get('category') or '—'}</td>"
        f"<td>{'yes' if d.get('known_failure') else 'no'}</td>"
        f"<td>{d.get('resolution_action') or '—'}</td></tr>"
        for d in (cap.get("devices_touched") or [])
    )

    sla_ok = (
        "✓"
        if (sla.get("received_within_sla") and sla.get("resolved_within_sla"))
        else "⚠"
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>InsiteIQ — Intervention Report {h.get('work_order_reference','')}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #111; max-width: 880px; margin: 2rem auto; padding: 0 1.5rem; }}
  h1, h2 {{ margin: 1.2rem 0 .5rem; }}
  h1 {{ font-size: 1.6rem; border-left: 3px solid #D97706; padding-left: .8rem; }}
  h2 {{ font-size: 1rem; text-transform: uppercase; letter-spacing: .1em;
        color: #555; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 1rem;
          font-size: .92rem; }}
  th, td {{ border: 1px solid #ddd; padding: .4rem .6rem; text-align: left;
           vertical-align: top; }}
  th {{ background: #f5f3ee; font-weight: 600; }}
  .muted {{ color: #777; font-size: .85rem; }}
  .badge {{ display: inline-block; padding: .15rem .5rem; border-radius: 3px;
          background: #eee; font-size: .8rem; }}
  .ok {{ background: #dff5e1; }}
  .warn {{ background: #fdecc8; }}
  footer {{ margin-top: 2rem; font-size: .78rem; color: #999;
          border-top: 1px solid #eee; padding-top: .8rem; }}
</style>
</head>
<body>
<h1>{h.get('title','') or 'Intervention Report'}</h1>
<p class="muted">Reference <strong>{h.get('work_order_reference','')}</strong>
 · {h.get('client_name') or ''} · {h.get('site_name') or ''},
 {h.get('site_city') or ''} {h.get('site_country') or ''}
 · <span class="badge">{h.get('shield_level','')}</span>
 · severity {h.get('severity','')}</p>

<h2>Metadata</h2>
<table>
  <tr><th>Opened</th><td>{_fmt_dt(h.get('opened_at'))}</td>
      <th>Closed</th><td>{_fmt_dt(h.get('closed_at'))}</td></tr>
  <tr><th>SRS Coordinator</th><td>{h.get('srs_coordinator_name') or '—'}</td>
      <th>Technician</th><td>{h.get('tech_name') or '—'}</td></tr>
</table>

<h2>SLA Compliance <span class="badge { 'ok' if sla_ok == '✓' else 'warn' }">{sla_ok}</span></h2>
<table>
  <tr><th>Receive deadline</th><td>{_fmt_dt(sla.get('receive_deadline'))}</td>
      <th>First action</th><td>{_fmt_dt(sla.get('first_action_at'))}</td>
      <th>Within SLA</th><td>{sla.get('received_within_sla')}</td></tr>
  <tr><th>Resolve deadline</th><td>{_fmt_dt(sla.get('resolve_deadline'))}</td>
      <th>Resolved at</th><td>{_fmt_dt(sla.get('resolution_at'))}</td>
      <th>Within SLA</th><td>{sla.get('resolved_within_sla')}</td></tr>
</table>

<h2>Ball-in-court timeline</h2>
<table>
  <tr><th>Side</th><th>Since</th><th>Until</th><th>Duration</th></tr>
  {ball_rows or '<tr><td colspan="4" class="muted">—</td></tr>'}
</table>

<h2>Event timeline</h2>
<table>
  <tr><th>Time</th><th>Kind</th><th>Action</th><th>Actor</th><th>Status change</th></tr>
  {tl_rows or '<tr><td colspan="5" class="muted">—</td></tr>'}
</table>

<h2>Intervention summary (tech capture)</h2>
<p><strong>Found:</strong> {cap.get('what_found') or '—'}</p>
<p><strong>Did:</strong> {cap.get('what_did') or '—'}</p>
<p><strong>Site notes:</strong> {cap.get('anything_new_about_site') or '—'}</p>
<p class="muted">Time on site: {cap.get('time_on_site_minutes') or '—'} min
 · Photos: {cap.get('photos_count', 0)}
 · Follow-up needed: {cap.get('follow_up_needed')}</p>

<h2>Devices touched</h2>
<table>
  <tr><th>Device</th><th>Category</th><th>Known failure</th><th>Action</th></tr>
  {devices_rows or '<tr><td colspan="4" class="muted">—</td></tr>'}
</table>

<h2>Communication</h2>
<p class="muted">Shared messages: {th.get('shared_message_count',0)}
{'· Internal coord messages: ' + str(th.get('internal_message_count', 0)) if scope == 'srs' and th.get('internal_message_count') else ''}
</p>

<footer>
  Generated by InsiteIQ v1 — report v{r.get('version', 1)} ·
  {_fmt_dt(r.get('generated_at'))}
</footer>
</body>
</html>
"""


def render_csv(report: dict, scope: Scope = "srs") -> str:
    r = scope_report(report, scope)
    h = r.get("header") or {}
    sla = r.get("sla") or {}
    cap = r.get("capture") or {}

    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["metric", "value"])
    w.writerow(["reference", h.get("work_order_reference")])
    w.writerow(["title", h.get("title")])
    w.writerow(["client", h.get("client_name")])
    w.writerow(["site", h.get("site_name")])
    w.writerow(["country", h.get("site_country")])
    w.writerow(["shield_level", h.get("shield_level")])
    w.writerow(["opened_at", _fmt_dt(h.get("opened_at"))])
    w.writerow(["closed_at", _fmt_dt(h.get("closed_at"))])
    w.writerow(["tech", h.get("tech_name")])
    w.writerow(["coordinator", h.get("srs_coordinator_name")])
    w.writerow(["sla_received_within", sla.get("received_within_sla")])
    w.writerow(["sla_resolved_within", sla.get("resolved_within_sla")])
    w.writerow(["sla_receive_margin_min", sla.get("receive_margin_minutes")])
    w.writerow(["sla_resolve_margin_min", sla.get("resolve_margin_minutes")])
    w.writerow(["capture_time_on_site_min", cap.get("time_on_site_minutes")])
    w.writerow(["capture_follow_up_needed", cap.get("follow_up_needed")])
    w.writerow(["capture_devices_count", len(cap.get("devices_touched") or [])])
    w.writerow(["capture_photos_count", cap.get("photos_count", 0)])
    w.writerow([])
    w.writerow(["timeline_event", "ts", "kind", "actor", "from", "to", "ball"])
    for e in r.get("timeline") or []:
        w.writerow([
            e.get("label"),
            _fmt_dt(e.get("ts")),
            e.get("kind"),
            e.get("actor_name") or "",
            e.get("from_status") or "",
            e.get("to_status") or "",
            e.get("ball_side") or "",
        ])
    w.writerow([])
    w.writerow(["ball_side", "since", "until", "duration_minutes"])
    for b in r.get("ball_timeline") or []:
        w.writerow([
            b.get("side"),
            _fmt_dt(b.get("since")),
            _fmt_dt(b.get("until")),
            b.get("duration_minutes") or "",
        ])
    return out.getvalue()
