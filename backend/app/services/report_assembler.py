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
import html as _html
import io
import re
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

    # ---- Resumen de cierre (notas del coordinador al cerrar · si no, del tech al resolver) ----
    summary = None
    async for e in db.audit_log.find(
        {"entity_refs.id": wo_id, "action": {"$in": ["work_order.advance.closed", "work_order.advance.resolved"]}}
    ).sort("ts", -1):
        note = (e.get("context_snapshot") or {}).get("notes")
        if note and str(note).strip():
            summary = str(note).strip()
            if e.get("action") == "work_order.advance.closed":
                break

    header = {
        "summary": summary,
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
        "photos": [],
        "follow_up_needed": False,
        "follow_up_notes": None,
    }
    if capture_doc:
        photos = []
        for ph in capture_doc.get("photos") or []:
            url = str(ph.get("url") or "")
            photos.append({
                "upload_id": url.rstrip("/").rsplit("/", 1)[-1] if url else None,
                "url": url,
                "label": ph.get("label"),
                "uploaded_at": ph.get("uploaded_at") or ph.get("added_at"),
            })
        capture.update({
            "what_found": capture_doc.get("what_found"),
            "what_did": capture_doc.get("what_did"),
            "anything_new_about_site": capture_doc.get("anything_new_about_site"),
            "devices_touched": capture_doc.get("devices_touched") or [],
            "time_on_site_minutes": capture_doc.get("time_on_site_minutes"),
            "photos_count": len(photos),
            "photos": photos,
            "follow_up_needed": bool(capture_doc.get("follow_up_needed")),
            "follow_up_notes": capture_doc.get("follow_up_notes"),
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


STATUS_ES = {
    "intake": "Solicitud", "triage": "Triage", "pre_flight": "Preparación", "dispatched": "Asignada",
    "en_route": "En camino", "on_site": "En sitio", "resolved": "Resuelta", "closed": "Cerrada",
    "cancelled": "Cancelada",
}
SIDE_ES = {"srs": "SRS", "tech": "Técnico", "client": "Cliente"}
KIND_ES = {
    "intake": "alta", "advance": "avance", "cancel": "cancelación", "briefing": "briefing",
    "capture": "captura", "thread": "mensaje", "handshake": "handshake", "event": "evento",
}
ACTION_ES = {
    "work_order.intake": "Alta de la solicitud",
    "work_order.cancel": "Cancelación",
    "work_order.assign": "Asignación / reprogramación",
    "copilot_briefing.assemble": "Briefing preparado",
    "copilot_briefing.acknowledge": "Briefing confirmado por el técnico",
    "tech_capture.submit": "Captura del técnico enviada",
    "handshake.check_in": "Llegada al sitio",
    "handshake.resolution": "Fin de la intervención",
    "handshake.closure": "Cierre",
}
SEVERITY_ES = {"low": "baja", "normal": "normal", "high": "alta", "critical": "crítica"}

REPORT_CSS = """
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         color: #111; max-width: 880px; margin: 2rem auto; padding: 0 1.5rem; }
  h1, h2 { margin: 1.2rem 0 .5rem; }
  h1 { font-size: 1.6rem; border-left: 3px solid #D97706; padding-left: .8rem; }
  h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .1em; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: .92rem; }
  th, td { border: 1px solid #ddd; padding: .4rem .6rem; text-align: left; vertical-align: top; }
  th { background: #f5f3ee; font-weight: 600; }
  ul { margin: .2rem 0 .8rem 1.2rem; padding: 0; }
  li { margin: .15rem 0; }
  .muted { color: #777; font-size: .85rem; }
  .badge { display: inline-block; padding: .15rem .5rem; border-radius: 3px; background: #eee; font-size: .8rem; }
  .ok { background: #dff5e1; }
  .warn { background: #fdecc8; }
  .summary { background: #faf8f3; border-left: 3px solid #D97706; padding: .6rem .9rem; margin: .8rem 0 1rem; }
  .photo { margin: .4rem 0 1.2rem; }
  .photo img { max-width: 100%; height: auto; border: 1px solid #ddd; }
  footer { margin-top: 2rem; font-size: .78rem; color: #999; border-top: 1px solid #eee; padding-top: .8rem; }
  @page { size: A4; margin: 18mm 16mm; }
  @media print {
    body { max-width: none; margin: 0; padding: 0; color: #000; }
    h1, h2 { break-after: avoid; }
    table, tr, .photo { break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
  }
"""


def _e(v: Any) -> str:
    if v is None:
        return ""
    return _html.escape(str(v), quote=True)


def _multiline(text: str | None) -> str:
    """Texto libre del técnico → párrafo o lista de viñetas si viene en varias líneas."""
    if not text or not str(text).strip():
        return '<p class="muted">—</p>'
    lines = [re.sub(r"^[\s\-•*·]+", "", ln).strip() for ln in str(text).splitlines()]
    lines = [ln for ln in lines if ln]
    if len(lines) <= 1:
        return f"<p>{_e(lines[0] if lines else text)}</p>"
    return "<ul>" + "".join(f"<li>{_e(ln)}</li>" for ln in lines) + "</ul>"


def _yes_no(v: Any) -> str:
    if v is None:
        return "n/a"
    return "Sí" if v else "No"


def _action_es(label: str | None) -> str:
    if not label:
        return "—"
    if label in ACTION_ES:
        return ACTION_ES[label]
    m = re.match(r"work_order\.advance\.(\w+)", label)
    if m:
        return f"Avance a {STATUS_ES.get(m.group(1), m.group(1))}"
    return label


def _status_change(e: dict) -> str:
    a, b = e.get("from_status"), e.get("to_status")
    if not a and not b:
        return "—"
    return f"{STATUS_ES.get(a, a or '—')} → {STATUS_ES.get(b, b or '—')}"


def render_html(report: dict, scope: Scope = "srs", photo_uris: dict[str, str] | None = None) -> str:
    """Informe de intervención · español · estructura del informe cliente (Pembroke 2026-05-20).

    photo_uris: {upload_id: data URI} para incrustar fotos (impresión / PDF).
    Sin él, las fotos apuntan a /api/uploads/{id} (requiere sesión).
    """
    r = scope_report(report, scope)
    h = r.get("header") or {}
    sla = r.get("sla") or {}
    cap = r.get("capture") or {}
    th = r.get("threads") or {}
    ball = r.get("ball_timeline") or []
    timeline = r.get("timeline") or []
    photo_uris = photo_uris or {}

    ball_rows = "".join(
        f"<tr><td>{_e(SIDE_ES.get(b.get('side'), b.get('side')))}</td><td>{_fmt_dt(b.get('since'))}</td>"
        f"<td>{_fmt_dt(b.get('until'))}</td><td>{_e(b.get('duration_minutes') if b.get('duration_minutes') is not None else '—')} min</td></tr>"
        for b in ball
    )
    tl_rows = "".join(
        f"<tr><td>{_fmt_dt(e.get('ts'))}</td><td>{_e(KIND_ES.get(e.get('kind'), e.get('kind')))}</td>"
        f"<td>{_e(_action_es(e.get('label')))}</td><td>{_e(e.get('actor_name') or '—')}</td>"
        f"<td>{_e(_status_change(e))}</td></tr>"
        for e in timeline
    )
    devices_rows = "".join(
        f"<tr><td>{_e(d.get('device_type', ''))}</td><td>{_e(d.get('category') or '—')}</td>"
        f"<td>{'Sí' if d.get('known_failure') else 'No'}{(' · ' + _e(d.get('failure_detail'))) if d.get('failure_detail') else ''}</td>"
        f"<td>{_e(d.get('resolution_action') or '—')}</td></tr>"
        for d in (cap.get("devices_touched") or [])
    )

    has_deadlines = bool(sla.get("receive_deadline") or sla.get("resolve_deadline"))
    sla_ok = has_deadlines and bool(sla.get("received_within_sla")) and bool(sla.get("resolved_within_sla"))
    sla_badge = ('<span class="badge ok">✓ cumplido</span>' if sla_ok
                 else ('<span class="badge warn">⚠ revisar</span>' if has_deadlines
                       else '<span class="badge">sin plazos configurados</span>'))
    recv_in = _yes_no(sla.get("received_within_sla")) if sla.get("receive_deadline") else "n/a"
    res_in = _yes_no(sla.get("resolved_within_sla")) if sla.get("resolve_deadline") else "n/a"

    summary_html = (f'<div class="summary"><strong>Resumen:</strong> {_e(h.get("summary"))}</div>'
                    if h.get("summary") else "")

    follow = "Sí" if cap.get("follow_up_needed") else "No"
    if cap.get("follow_up_needed") and cap.get("follow_up_notes"):
        follow += f" · {_e(cap.get('follow_up_notes'))}"
    time_on_site = cap.get("time_on_site_minutes")
    time_txt = f"{_e(time_on_site)} min" if time_on_site is not None else "—"

    photos = cap.get("photos") or []
    photos_html = ""
    if photos:
        items = []
        for i, ph in enumerate(photos, start=1):
            uid = ph.get("upload_id")
            src = photo_uris.get(uid) if uid else None
            if not src:
                src = ph.get("url") or ""
            caption = f"Foto {i}"
            if ph.get("label"):
                caption += f" · {_e(ph.get('label'))}"
            if ph.get("uploaded_at"):
                caption += f' <span class="muted">({_fmt_dt(ph.get("uploaded_at"))})</span>'
            items.append(f'<div class="photo"><p><strong>{caption}</strong></p><img src="{_e(src)}" alt="Foto {i}"></div>')
        tech = h.get("tech_name") or "el técnico"
        photos_html = (
            "<h2>Anexo · Evidencia fotográfica</h2>"
            f'<p class="muted">Tomadas en sitio por {_e(tech)} durante la intervención.</p>'
            + "".join(items)
        )

    internal_txt = ""
    if scope == "srs" and th.get("internal_message_count"):
        internal_txt = f" · Mensajes internos de coordinación: {_e(th.get('internal_message_count'))}"

    location = ", ".join(x for x in [h.get("site_name"), h.get("site_city")] if x)
    if h.get("site_country"):
        location = f"{location} {h.get('site_country')}".strip()

    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>InsiteIQ — Informe de intervención {_e(h.get('work_order_reference', ''))}</title>
<style>{REPORT_CSS}</style>
</head>
<body>
<h1>{_e(h.get('title') or 'Informe de intervención')}</h1>
<p class="muted">Referencia <strong>{_e(h.get('work_order_reference', ''))}</strong>
 · {_e(h.get('client_name') or '')} · {_e(location)}
 · <span class="badge">{_e((h.get('shield_level') or '').upper())}</span>
 · severidad {_e(SEVERITY_ES.get(h.get('severity'), h.get('severity') or ''))}</p>
{summary_html}
<h2>Datos de la intervención</h2>
<table>
  <tr><th>Abierta</th><td>{_fmt_dt(h.get('opened_at'))}</td>
      <th>Cerrada</th><td>{_fmt_dt(h.get('closed_at'))}</td></tr>
  <tr><th>Coordinador SRS</th><td>{_e(h.get('srs_coordinator_name') or '—')}</td>
      <th>Técnico</th><td>{_e(h.get('tech_name') or '—')}</td></tr>
</table>

<h2>Cumplimiento SLA {sla_badge}</h2>
<table>
  <tr><th>Plazo de respuesta</th><td>{_fmt_dt(sla.get('receive_deadline'))}</td>
      <th>Primera acción</th><td>{_fmt_dt(sla.get('first_action_at'))}</td>
      <th>Dentro de plazo</th><td>{recv_in}</td></tr>
  <tr><th>Plazo de resolución</th><td>{_fmt_dt(sla.get('resolve_deadline'))}</td>
      <th>Resuelta</th><td>{_fmt_dt(sla.get('resolution_at'))}</td>
      <th>Dentro de plazo</th><td>{res_in}</td></tr>
</table>

<h2>Quién tenía la pelota</h2>
<table>
  <tr><th>Lado</th><th>Desde</th><th>Hasta</th><th>Duración</th></tr>
  {ball_rows or '<tr><td colspan="4" class="muted">—</td></tr>'}
</table>

<h2>Cronología</h2>
<table>
  <tr><th>Hora (UTC)</th><th>Tipo</th><th>Acción</th><th>Actor</th><th>Cambio de estado</th></tr>
  {tl_rows or '<tr><td colspan="5" class="muted">—</td></tr>'}
</table>

<h2>Resumen del técnico</h2>
<p><strong>Qué encontramos al llegar</strong></p>
{_multiline(cap.get('what_found'))}
<p><strong>Qué hicimos</strong></p>
{_multiline(cap.get('what_did'))}
<p><strong>Notas del sitio · pendientes</strong></p>
{_multiline(cap.get('anything_new_about_site'))}
<p class="muted">Tiempo en sitio: {time_txt}
 · Fotos: {_e(cap.get('photos_count', 0))}
 · Requiere seguimiento: {follow}</p>

<h2>Equipos intervenidos</h2>
<table>
  <tr><th>Dispositivo</th><th>Categoría</th><th>Fallo conocido</th><th>Acción</th></tr>
  {devices_rows or '<tr><td colspan="4" class="muted">—</td></tr>'}
</table>

<h2>Comunicación</h2>
<p class="muted">Mensajes compartidos con el cliente: {_e(th.get('shared_message_count', 0))}{internal_txt}</p>
{photos_html}
<footer>
  Generado por InsiteIQ — informe v{_e(r.get('version', 1))} ·
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
