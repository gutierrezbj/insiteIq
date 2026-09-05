"""
InsiteIQ Modo 2 — Informe del proyecto (avance / cierre de rollout)

assemble_project_report(db, project) -> dict (no persiste · foto del estado actual)
render_project_html(report) -> str   (español · A4 apaisado · listo para PDF)
render_project_csv(report)  -> str

Fuentes: work_orders del project + sites + asset_events "installed" + assets + users + orgs.
Horas en la zona horaria del sitio (la que lee el cliente), no en UTC.
"""
import csv
import html as _html
import io
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from bson import ObjectId

STATUS_ES = {
    "intake": "Solicitud", "triage": "Triage", "pre_flight": "Preparación", "dispatched": "Asignada",
    "en_route": "En camino", "on_site": "En sitio", "resolved": "Resuelta", "closed": "Instalada",
    "cancelled": "Cancelada",
}
PROJECT_STATUS_ES = {"draft": "Borrador", "active": "Activo", "on_hold": "En pausa", "closed": "Cerrado", "cancelled": "Cancelado"}
ON_TIME_TOLERANCE_MIN = 15


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _e(v: Any) -> str:
    return "" if v is None else _html.escape(str(v), quote=True)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _minutes(a: datetime | None, b: datetime | None) -> int | None:
    a, b = _aware(a), _aware(b)
    if a is None or b is None:
        return None
    return int(round((b - a).total_seconds() / 60))


def _tz(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(name or "UTC")
    except Exception:
        return ZoneInfo("UTC")


def _fmt_date(dt: datetime | None, tz: ZoneInfo) -> str:
    dt = _aware(dt)
    return dt.astimezone(tz).strftime("%Y-%m-%d") if dt else "—"


def _fmt_time(dt: datetime | None, tz: ZoneInfo) -> str:
    dt = _aware(dt)
    return dt.astimezone(tz).strftime("%H:%M") if dt else "—"


def _fmt_dt(dt: datetime | None, tz: ZoneInfo) -> str:
    dt = _aware(dt)
    return dt.astimezone(tz).strftime("%Y-%m-%d %H:%M") if dt else "—"


def _fmt_minutes(m: int | None) -> str:
    if m is None:
        return "—"
    h, r = divmod(abs(m), 60)
    txt = f"{h}h {r:02d}m" if h else f"{r} min"
    return f"-{txt}" if m < 0 else txt


def _notes_from_description(desc: str | None) -> str:
    if not desc:
        return ""
    s = re.sub(r"^Equipos:.*?\.\s*", "", desc.strip(), count=1, flags=re.S)
    s = re.sub(r"\s*FM Claro:.*$", "", s, flags=re.S)
    return s.strip(" .|")


async def _names(db, ids: set[str]) -> dict[str, str]:
    oids = [ObjectId(x) for x in ids if x and ObjectId.is_valid(x)]
    if not oids:
        return {}
    out = {}
    async for u in db.users.find({"_id": {"$in": oids}}, {"full_name": 1, "email": 1}):
        out[str(u["_id"])] = u.get("full_name") or u.get("email")
    return out


async def _org_name(db, org_id: str | None) -> str | None:
    if not org_id or not ObjectId.is_valid(org_id):
        return None
    o = await db.organizations.find_one({"_id": ObjectId(org_id)}, {"display_name": 1, "legal_name": 1})
    return (o.get("display_name") or o.get("legal_name")) if o else None


async def assemble_project_report(db, project: dict) -> dict:
    tenant_id = project["tenant_id"]
    pid = str(project["_id"])
    now = _now()

    wos = await db.work_orders.find({"tenant_id": tenant_id, "project_id": pid}).to_list(5000)
    site_oids = [ObjectId(w["site_id"]) for w in wos if w.get("site_id") and ObjectId.is_valid(w["site_id"])]
    sites = {str(s["_id"]): s async for s in db.sites.find({"_id": {"$in": site_oids}})} if site_oids else {}

    wo_ids = [str(w["_id"]) for w in wos]
    events = await db.asset_events.find(
        {"tenant_id": tenant_id, "intervention_id": {"$in": wo_ids}, "event_type": "installed"}
    ).to_list(20000) if wo_ids else []
    asset_oids = [ObjectId(e["asset_id"]) for e in events if e.get("asset_id") and ObjectId.is_valid(e["asset_id"])]
    assets = {str(a["_id"]): a async for a in db.assets.find({"_id": {"$in": asset_oids}})} if asset_oids else {}
    devices_by_wo: dict[str, list[dict]] = {}
    for ev in events:
        a = assets.get(ev.get("asset_id")) or {}
        data = ev.get("data") or {}
        devices_by_wo.setdefault(ev["intervention_id"], []).append({
            "model": a.get("model") or data.get("model"),
            "serial": a.get("serial_number") or data.get("serial"),
            "make": a.get("make"),
        })

    user_ids = {project.get("srs_coordinator_user_id"), project.get("cluster_lead_user_id"), project.get("field_senior_user_id")}
    user_ids |= {w.get("assigned_tech_user_id") for w in wos}
    names = await _names(db, {x for x in user_ids if x})

    sa = None
    if project.get("service_agreement_id") and ObjectId.is_valid(project["service_agreement_id"]):
        sa = await db.service_agreements.find_one({"_id": ObjectId(project["service_agreement_id"])}, {"contract_ref": 1, "title": 1, "shield_level": 1})

    def sort_key(w):
        return _aware(w.get("scheduled_at") or w.get("created_at")) or now

    visits: list[dict] = []
    for w in sorted(wos, key=sort_key):
        site = sites.get(w.get("site_id")) or {}
        tzname = site.get("timezone") or "UTC"
        ts = w.get("status_timestamps") or {}
        handshakes = w.get("handshakes") or []
        scheduled = _aware(w.get("scheduled_at"))
        arrival = _aware(next((h.get("ts") for h in handshakes if h.get("kind") == "check_in"), None)
                         or ts.get("en_route") or ts.get("on_site"))
        start = _aware(ts.get("on_site") or arrival)
        end = _aware(ts.get("resolved") or w.get("closed_at"))
        deadline = _aware(w.get("deadline_resolve_at"))
        closed_at = _aware(w.get("closed_at"))
        status = w.get("status")
        visits.append({
            "work_order_id": str(w["_id"]),
            "reference": w.get("reference"),
            "site_code": site.get("code"),
            "site_name": site.get("name"),
            "address": site.get("address"),
            "timezone": tzname,
            "status": status,
            "scheduled_at": scheduled,
            "arrival_at": arrival if status == "closed" else None,
            "start_at": start if status == "closed" else None,
            "end_at": end if status == "closed" else None,
            "drift_minutes": _minutes(scheduled, arrival) if status == "closed" else None,
            "duration_minutes": _minutes(start, end) if status == "closed" else None,
            "within_sla": (closed_at <= deadline) if (status == "closed" and closed_at and deadline) else None,
            "tech_name": names.get(w.get("assigned_tech_user_id")),
            "devices": devices_by_wo.get(str(w["_id"]), []),
            "notes": (w.get("cancel_reason") if status == "cancelled" else _notes_from_description(w.get("description"))) or "",
        })

    closed = [v for v in visits if v["status"] == "closed"]
    cancelled = [v for v in visits if v["status"] == "cancelled"]
    open_v = [v for v in visits if v["status"] not in ("closed", "cancelled")]
    drifts = [v["drift_minutes"] for v in closed if v["drift_minutes"] is not None]
    durations = [v["duration_minutes"] for v in closed if v["duration_minutes"] is not None]
    sla_vals = [v["within_sla"] for v in closed if v["within_sla"] is not None]
    models = Counter((d.get("model") or "?") for v in closed for d in v["devices"])
    dates = [v["end_at"] or v["scheduled_at"] for v in closed if (v["end_at"] or v["scheduled_at"])]

    summary = {
        "visits_total": len(visits),
        "visits_closed": len(closed),
        "visits_cancelled": len(cancelled),
        "visits_open": len(open_v),
        "sites_visited": len({v["site_code"] for v in closed if v["site_code"]}),
        "target_sites": project.get("total_sites_target"),
        "devices_installed": sum(len(v["devices"]) for v in closed),
        "devices_by_model": dict(models.most_common()),
        "avg_duration_minutes": int(round(sum(durations) / len(durations))) if durations else None,
        "on_time_pct": round(100 * sum(1 for d in drifts if d <= ON_TIME_TOLERANCE_MIN) / len(drifts), 1) if drifts else None,
        "avg_drift_minutes": int(round(sum(drifts) / len(drifts))) if drifts else None,
        "sla_pct": round(100 * sum(1 for x in sla_vals if x) / len(sla_vals), 1) if sla_vals else None,
        "first_visit_at": min(dates) if dates else None,
        "last_visit_at": max(dates) if dates else None,
    }

    header = {
        "project_code": project.get("code"),
        "project_title": project.get("title"),
        "project_status": project.get("status"),
        "project_type": project.get("type"),
        "description": project.get("description"),
        "client_name": await _org_name(db, project.get("client_organization_id")),
        "end_client_name": await _org_name(db, project.get("end_client_organization_id")),
        "service_agreement_ref": sa.get("contract_ref") if sa else None,
        "service_agreement_title": sa.get("title") if sa else None,
        "po_number": project.get("po_number"),
        "coordinator_name": names.get(project.get("srs_coordinator_user_id")),
        "cluster_lead_name": names.get(project.get("cluster_lead_user_id")),
        "start_date": _aware(project.get("start_date")),
        "target_end_date": _aware(project.get("target_end_date")),
        "actual_end_date": _aware(project.get("actual_end_date")),
        "summary_notes": project.get("summary"),
        "report_timezone": next((v["timezone"] for v in visits if v["timezone"] != "UTC"), "UTC"),
    }
    return {"generated_at": now, "header": header, "summary": summary, "visits": visits}


PROJECT_CSS = """
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111;
         max-width: 1180px; margin: 1.5rem auto; padding: 0 1.5rem; font-size: 12px; }
  h1 { font-size: 1.5rem; border-left: 3px solid #D97706; padding-left: .8rem; margin: 1rem 0 .4rem; }
  h2 { font-size: .9rem; text-transform: uppercase; letter-spacing: .1em; color: #555; margin: 1.2rem 0 .5rem; }
  table { width: 100%; border-collapse: collapse; margin-bottom: .8rem; }
  th, td { border: 1px solid #ddd; padding: .3rem .45rem; text-align: left; vertical-align: top; }
  th { background: #f5f3ee; font-weight: 600; white-space: nowrap; }
  td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .muted { color: #777; font-size: .85em; }
  .kpis { display: flex; flex-wrap: wrap; gap: .6rem; margin: .6rem 0 1rem; }
  .kpi { border: 1px solid #ddd; padding: .5rem .8rem; min-width: 130px; }
  .kpi b { display: block; font-size: 1.3rem; }
  .kpi span { color: #666; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; }
  .ok { color: #0A6131; } .warn { color: #B45309; } .bad { color: #B91C1C; }
  .summary { background: #faf8f3; border-left: 3px solid #D97706; padding: .6rem .9rem; margin: .6rem 0 1rem; }
  .dev { font-family: ui-monospace, Menlo, monospace; font-size: .85em; white-space: nowrap; }
  footer { margin-top: 1.5rem; font-size: .78rem; color: #999; border-top: 1px solid #eee; padding-top: .6rem; }
  @page { size: A4 landscape; margin: 12mm 12mm; }
  @media print {
    body { max-width: none; margin: 0; padding: 0; color: #000; font-size: 10.5px; }
    h1, h2 { break-after: avoid; }
    tr, .kpi { break-inside: avoid; }
    thead { display: table-header-group; }
  }
"""


def _pct_class(v: float | None, good: float = 90, mid: float = 75) -> str:
    if v is None:
        return ""
    return "ok" if v >= good else ("warn" if v >= mid else "bad")


def render_project_html(report: dict) -> str:
    h = report.get("header") or {}
    s = report.get("summary") or {}
    visits = report.get("visits") or []
    tz = _tz(h.get("report_timezone"))
    tz_label = h.get("report_timezone") or "UTC"

    def drift_cell(v):
        d = v.get("drift_minutes")
        if d is None:
            return '<td class="num">—</td>'
        cls = "ok" if d <= ON_TIME_TOLERANCE_MIN else ("warn" if d <= 45 else "bad")
        sign = "+" if d > 0 else ""
        return f'<td class="num {cls}">{sign}{d} min</td>'

    def devices_cell(v):
        devs = v.get("devices") or []
        if not devs:
            return "—"
        return "<br>".join(f'<span class="dev">{_e(d.get("model") or "?")} · {_e(d.get("serial") or "s/n")}</span>' for d in devs)

    rows = []
    for i, v in enumerate(visits, start=1):
        vt = _tz(v.get("timezone"))
        status = v.get("status")
        st_cls = "ok" if status == "closed" else ("bad" if status == "cancelled" else "warn")
        rows.append(
            f"<tr><td class=\"num\">{i}</td>"
            f"<td>{_e(v.get('site_code') or '—')}</td>"
            f"<td>{_e(v.get('site_name') or '')}<div class=\"muted\">{_e(v.get('address') or '')}</div></td>"
            f"<td>{_fmt_date(v.get('scheduled_at'), vt)}</td>"
            f"<td class=\"num\">{_fmt_time(v.get('scheduled_at'), vt)}</td>"
            f"<td class=\"num\">{_fmt_time(v.get('arrival_at'), vt)}</td>"
            f"<td class=\"num\">{_fmt_time(v.get('end_at'), vt)}</td>"
            f"<td class=\"num\">{_fmt_minutes(v.get('duration_minutes'))}</td>"
            f"{drift_cell(v)}"
            f"<td class=\"{st_cls}\">{_e(STATUS_ES.get(status, status))}</td>"
            f"<td>{devices_cell(v)}</td>"
            f"<td>{_e(v.get('tech_name') or '—')}</td>"
            f"<td class=\"muted\">{_e(v.get('notes') or '')}</td></tr>"
        )

    models_txt = " · ".join(f"{_e(k)} ×{n}" for k, n in (s.get("devices_by_model") or {}).items()) or "—"
    cancelled = [v for v in visits if v.get("status") == "cancelled"]
    open_v = [v for v in visits if v.get("status") not in ("closed", "cancelled")]
    cancelled_rows = "".join(
        f"<tr><td>{_e(v.get('site_code') or '—')}</td><td>{_e(v.get('site_name') or '')}</td>"
        f"<td>{_fmt_date(v.get('scheduled_at'), _tz(v.get('timezone')))}</td><td>{_e(v.get('notes') or '—')}</td></tr>"
        for v in cancelled
    )
    open_rows = "".join(
        f"<tr><td>{_e(v.get('site_code') or '—')}</td><td>{_e(v.get('site_name') or '')}</td>"
        f"<td>{_fmt_date(v.get('scheduled_at'), _tz(v.get('timezone')))}</td><td>{_e(STATUS_ES.get(v.get('status'), v.get('status')))}</td></tr>"
        for v in open_v
    )
    title_kind = "Informe de cierre" if h.get("project_status") == "closed" else "Informe de avance"
    target = s.get("target_sites")
    target_txt = f" de {target} sitios objetivo" if target else ""
    summary_notes = f'<div class="summary"><strong>Resumen del cierre:</strong> {_e(h.get("summary_notes"))}</div>' if h.get("summary_notes") else ""
    period = f"{_fmt_date(s.get('first_visit_at'), tz)} → {_fmt_date(s.get('last_visit_at'), tz)}" if s.get("first_visit_at") else "—"

    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>InsiteIQ — {title_kind} {_e(h.get('project_code') or '')}</title>
<style>{PROJECT_CSS}</style>
</head>
<body>
<h1>{title_kind} · {_e(h.get('project_title') or h.get('project_code') or '')}</h1>
<p class="muted">Proyecto <strong>{_e(h.get('project_code') or '')}</strong>
 · Cliente {_e(h.get('client_name') or '—')}{(' · Cliente final ' + _e(h.get('end_client_name'))) if h.get('end_client_name') else ''}
 · Contrato {_e(h.get('service_agreement_ref') or '—')}{(' · PO ' + _e(h.get('po_number'))) if h.get('po_number') else ''}
 · Estado {_e(PROJECT_STATUS_ES.get(h.get('project_status'), h.get('project_status')))}
 · Horas en {_e(tz_label)}</p>
{summary_notes}
<table>
  <tr><th>Coordinador SRS</th><td>{_e(h.get('coordinator_name') or '—')}</td>
      <th>Líder de campo</th><td>{_e(h.get('cluster_lead_name') or '—')}</td>
      <th>Periodo de visitas</th><td>{period}</td>
      <th>Cierre</th><td>{_fmt_date(h.get('actual_end_date'), tz)}</td></tr>
</table>

<h2>Resumen</h2>
<div class="kpis">
  <div class="kpi"><b>{_e(s.get('visits_closed', 0))}</b><span>instalaciones{_e(target_txt)}</span></div>
  <div class="kpi"><b>{_e(s.get('sites_visited', 0))}</b><span>sitios visitados</span></div>
  <div class="kpi"><b>{_e(s.get('devices_installed', 0))}</b><span>equipos instalados</span></div>
  <div class="kpi"><b>{_e(s.get('visits_cancelled', 0))}</b><span>visitas canceladas</span></div>
  <div class="kpi"><b>{_e(s.get('visits_open', 0))}</b><span>pendientes</span></div>
  <div class="kpi"><b class="{_pct_class(s.get('on_time_pct'))}">{_e(s.get('on_time_pct')) + ' %' if s.get('on_time_pct') is not None else '—'}</b><span>llegadas puntuales (±{ON_TIME_TOLERANCE_MIN} min)</span></div>
  <div class="kpi"><b class="{_pct_class(s.get('sla_pct'))}">{_e(s.get('sla_pct')) + ' %' if s.get('sla_pct') is not None else '—'}</b><span>dentro de SLA</span></div>
  <div class="kpi"><b>{_fmt_minutes(s.get('avg_duration_minutes'))}</b><span>tiempo medio en sitio</span></div>
</div>
<p class="muted">Equipos por modelo: {models_txt}</p>

<h2>Visitas ({_e(len(visits))})</h2>
<table>
  <thead><tr><th class="num">#</th><th>Loc</th><th>Sitio</th><th>Fecha</th><th class="num">Progr.</th><th class="num">Llegada</th><th class="num">Fin</th><th class="num">Duración</th><th class="num">Desvío</th><th>Estado</th><th>Equipos</th><th>Técnico</th><th>Notas</th></tr></thead>
  <tbody>{''.join(rows) or '<tr><td colspan="13" class="muted">—</td></tr>'}</tbody>
</table>

{('<h2>Visitas canceladas (' + str(len(cancelled)) + ')</h2><table><thead><tr><th>Loc</th><th>Sitio</th><th>Fecha</th><th>Motivo</th></tr></thead><tbody>' + cancelled_rows + '</tbody></table>') if cancelled else ''}
{('<h2>Pendientes de cerrar (' + str(len(open_v)) + ')</h2><table><thead><tr><th>Loc</th><th>Sitio</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>' + open_rows + '</tbody></table>') if open_v else ''}

<footer>Generado por InsiteIQ · {_fmt_dt(report.get('generated_at'), tz)} {_e(tz_label)} · desvío = llegada − hora programada · duración = fin − inicio en sitio</footer>
</body>
</html>
"""


def render_project_csv(report: dict) -> str:
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["loc", "sitio", "direccion", "fecha", "programada", "llegada", "fin", "duracion_min", "desvio_min",
                "estado", "dentro_sla", "tecnico", "equipos", "notas", "referencia"])
    for v in report.get("visits") or []:
        tz = _tz(v.get("timezone"))
        w.writerow([
            v.get("site_code") or "", v.get("site_name") or "", v.get("address") or "",
            _fmt_date(v.get("scheduled_at"), tz), _fmt_time(v.get("scheduled_at"), tz),
            _fmt_time(v.get("arrival_at"), tz), _fmt_time(v.get("end_at"), tz),
            v.get("duration_minutes") if v.get("duration_minutes") is not None else "",
            v.get("drift_minutes") if v.get("drift_minutes") is not None else "",
            STATUS_ES.get(v.get("status"), v.get("status")),
            "" if v.get("within_sla") is None else ("si" if v.get("within_sla") else "no"),
            v.get("tech_name") or "",
            " | ".join(f"{d.get('model') or '?'} {d.get('serial') or ''}".strip() for d in (v.get("devices") or [])),
            v.get("notes") or "", v.get("reference") or "",
        ])
    return out.getvalue()
