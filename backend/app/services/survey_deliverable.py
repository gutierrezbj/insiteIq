"""
InsiteIQ Modo 5 — Entregable por sitio (auto-deliverable · parte estructural).

assemble_site_deliverable(db, wo) -> dict   (plantilla + respuestas de la captura + contexto)
render_site_deliverable_html(report, photo_uris) -> str   (español · A4 · fotos incrustadas)

La narrativa (resumen ejecutivo, hallazgos, recomendaciones, conclusión) sale de
lo que escribió el técnico / coordinador en los campos de la plantilla. Sin LLM.
"""
import html as _html
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from bson import ObjectId

from app.services.survey import playbook_progress, template_for_work_order


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _e(v: Any) -> str:
    return "" if v is None else _html.escape(str(v), quote=True)


def _aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _fmt(dt, tzname: str | None) -> str:
    dt = _aware(dt)
    if not dt:
        return "—"
    try:
        tz = ZoneInfo(tzname or "UTC")
    except Exception:
        tz = ZoneInfo("UTC")
    return dt.astimezone(tz).strftime("%Y-%m-%d %H:%M")


async def _name(db, user_id):
    if not user_id or not ObjectId.is_valid(user_id):
        return None
    u = await db.users.find_one({"_id": ObjectId(user_id)}, {"full_name": 1, "email": 1})
    return (u.get("full_name") or u.get("email")) if u else None


async def _org(db, org_id):
    if not org_id or not ObjectId.is_valid(org_id):
        return None
    return await db.organizations.find_one({"_id": ObjectId(org_id)})


def _photos_of(value) -> list[dict]:
    if not value:
        return []
    items = value if isinstance(value, list) else [value]
    out = []
    for p in items:
        if isinstance(p, dict):
            url = str(p.get("url") or "")
            out.append({
                "upload_id": p.get("upload_id") or (url.rstrip("/").rsplit("/", 1)[-1] if url else None),
                "url": url,
                "label": p.get("label"),
            })
    return out


async def assemble_site_deliverable(db, wo: dict) -> dict | None:
    template = await template_for_work_order(db, wo)
    if not template:
        return None
    wo_id = str(wo["_id"])
    tenant_id = wo["tenant_id"]
    capture = await db.tech_captures.find_one(
        {"work_order_id": wo_id, "tenant_id": tenant_id, "status": "submitted"}
    )
    responses = (capture or {}).get("template_responses") or {}
    project = await db.projects.find_one({"_id": ObjectId(wo["project_id"])}) if ObjectId.is_valid(wo.get("project_id") or "") else None
    site = await db.sites.find_one({"_id": ObjectId(wo["site_id"])}) if ObjectId.is_valid(wo.get("site_id") or "") else None
    client = await _org(db, (project or {}).get("client_organization_id") or wo.get("organization_id"))
    end_client = await _org(db, (project or {}).get("end_client_organization_id"))

    co_brand = None
    for tier in (project or {}).get("delivery_chain") or []:
        org = await _org(db, tier.get("organization_id"))
        rels = (org or {}).get("partner_relationships") or []
        if any(r.get("type") == "joint_venture_partner" and r.get("status") == "active" for r in rels):
            co_brand = f"SystemRapid & {org.get('display_name') or org.get('legal_name')} JV"
            break

    ts = wo.get("status_timestamps") or {}
    tzname = (site or {}).get("timezone") or "UTC"
    sections = []
    all_photos: list[dict] = []
    for sec in template.get("sections") or []:
        items = []
        for f in sec.get("fields") or []:
            val = responses.get(f.get("key"))
            photos = _photos_of(val) if f.get("type") in ("photo", "photos") else []
            all_photos.extend(photos)
            items.append({
                "key": f.get("key"), "label": f.get("label"), "type": f.get("type"), "unit": f.get("unit"),
                "required": bool(f.get("required")), "value": None if photos else val, "photos": photos,
            })
        sections.append({
            "key": sec.get("key"), "title": sec.get("title"), "type": sec.get("type"),
            "description": sec.get("description"), "items": items,
        })

    header = {
        "reference": wo.get("reference"),
        "title": wo.get("title"),
        "status": wo.get("status"),
        "project_code": (project or {}).get("code"),
        "project_title": (project or {}).get("title"),
        "po_number": (project or {}).get("po_number"),
        "template_name": template.get("name"),
        "template_version": template.get("version"),
        "client_name": (client or {}).get("display_name") or (client or {}).get("legal_name"),
        "end_client_name": (end_client or {}).get("display_name") or (end_client or {}).get("legal_name"),
        "co_brand": co_brand,
        "site_code": (site or {}).get("code"),
        "site_name": (site or {}).get("name"),
        "site_address": (site or {}).get("address"),
        "site_city": (site or {}).get("city"),
        "site_country": (site or {}).get("country"),
        "site_timezone": tzname,
        "visit_at": ts.get("on_site") or ts.get("resolved") or wo.get("scheduled_at"),
        "tech_name": await _name(db, wo.get("assigned_tech_user_id")),
        "coordinator_name": await _name(db, wo.get("srs_coordinator_user_id")),
        "capture_submitted_at": (capture or {}).get("submitted_at"),
        "lcon_name": responses.get("lcon_name"),
        "executive_summary": responses.get("executive_summary"),
        "site_rating": responses.get("site_rating"),
        "ready_for_install": responses.get("ready_for_install"),
    }
    return {
        "generated_at": _now(),
        "header": header,
        "sections": sections,
        "progress": playbook_progress(template, responses),
        "photos": all_photos,
        "generic_capture": {
            "what_found": (capture or {}).get("what_found"),
            "what_did": (capture or {}).get("what_did"),
        } if capture else None,
    }


DELIVERABLE_CSS = """
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111;
         max-width: 880px; margin: 2rem auto; padding: 0 1.5rem; }
  .cover { border-left: 4px solid #D97706; padding: .6rem 1rem; margin-bottom: 1.4rem; }
  .cover h1 { margin: 0 0 .3rem; font-size: 1.7rem; }
  .cover .sub { color: #555; }
  .brand { font-size: .8rem; text-transform: uppercase; letter-spacing: .12em; color: #777; margin-bottom: .4rem; }
  h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .1em; color: #555; margin: 1.4rem 0 .5rem; border-bottom: 1px solid #eee; padding-bottom: .2rem; }
  table { width: 100%; border-collapse: collapse; margin-bottom: .8rem; font-size: .92rem; }
  th, td { border: 1px solid #ddd; padding: .35rem .6rem; text-align: left; vertical-align: top; }
  th { background: #f5f3ee; font-weight: 600; width: 38%; }
  .muted { color: #777; font-size: .85rem; }
  .missing { color: #B45309; }
  .summary { background: #faf8f3; border-left: 3px solid #D97706; padding: .7rem 1rem; margin: .8rem 0 1rem; white-space: pre-wrap; }
  .narr { white-space: pre-wrap; margin: .3rem 0 .8rem; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: .6rem; margin: .4rem 0 1rem; }
  .grid figure { margin: 0; }
  .grid img { width: 100%; height: auto; border: 1px solid #ddd; }
  figcaption { font-size: .78rem; color: #666; margin-top: .2rem; }
  .stars { color: #D97706; letter-spacing: .1em; }
  .badge { display: inline-block; padding: .15rem .5rem; border-radius: 3px; background: #eee; font-size: .8rem; }
  .ok { background: #dff5e1; } .warn { background: #fdecc8; }
  footer { margin-top: 2rem; font-size: .78rem; color: #999; border-top: 1px solid #eee; padding-top: .8rem; }
  @page { size: A4; margin: 16mm 14mm; }
  @media print {
    body { max-width: none; margin: 0; padding: 0; color: #000; }
    h2 { break-after: avoid; }
    table, figure, tr { break-inside: avoid; }
    .cover { break-after: page; }
  }
"""


def _fmt_value(item: dict) -> str:
    v = item.get("value")
    t = item.get("type")
    if v is None or v == "" or v == []:
        return '<span class="muted">—</span>'
    if t == "boolean":
        return "Sí" if v else "No"
    if t == "rating":
        try:
            n = max(0, min(5, int(v)))
        except (TypeError, ValueError):
            return _e(v)
        return f'<span class="stars">{"★" * n}{"☆" * (5 - n)}</span> {n}/5'
    txt = _e(v)
    if t == "textarea":
        return f'<div class="narr">{txt}</div>'
    if item.get("unit"):
        txt += f" {_e(item['unit'])}"
    return txt


def _photo_grid(photos: list[dict], photo_uris: dict[str, str], caption: str) -> str:
    if not photos:
        return ""
    figs = []
    for i, p in enumerate(photos, start=1):
        src = photo_uris.get(p.get("upload_id") or "") or p.get("url") or ""
        cap = p.get("label") or f"{caption} · {i}"
        figs.append(f'<figure><img src="{_e(src)}" alt="{_e(cap)}"><figcaption>{_e(cap)}</figcaption></figure>')
    return f'<div class="grid">{"".join(figs)}</div>'


def render_site_deliverable_html(report: dict, photo_uris: dict[str, str] | None = None) -> str:
    photo_uris = photo_uris or {}
    h = report.get("header") or {}
    prog = report.get("progress") or {}
    tz = h.get("site_timezone")
    location = ", ".join(x for x in [h.get("site_address"), h.get("site_city")] if x)
    if h.get("site_country"):
        location = f"{location} ({h['site_country']})" if location else h["site_country"]

    rating = h.get("site_rating")
    rating_html = ""
    if rating is not None:
        try:
            n = max(0, min(5, int(rating)))
            rating_html = f' · <span class="stars">{"★" * n}{"☆" * (5 - n)}</span>'
        except (TypeError, ValueError):
            rating_html = ""
    ready = h.get("ready_for_install")
    ready_html = ("" if ready is None else
                  (' · <span class="badge ok">Listo para instalación</span>' if ready else ' · <span class="badge warn">No listo para instalación</span>'))
    complete = prog.get("required_total", 0) and prog.get("required_done") == prog.get("required_total")
    status_badge = ('<span class="badge ok">Playbook completo</span>' if complete else
                    f'<span class="badge warn">Playbook {prog.get("required_done", 0)}/{prog.get("required_total", 0)} · borrador</span>')

    parts = []
    for sec in report.get("sections") or []:
        rows = []
        media_html = []
        for it in sec.get("items") or []:
            if it.get("photos"):
                media_html.append(f"<p><strong>{_e(it['label'])}</strong> <span class=\"muted\">({len(it['photos'])})</span></p>"
                                  + _photo_grid(it["photos"], photo_uris, it["label"]))
            elif it.get("type") == "photos" or it.get("type") == "photo":
                media_html.append(f"<p><strong>{_e(it['label'])}</strong> <span class=\"{'missing' if it.get('required') else 'muted'}\">— sin fotos</span></p>")
            elif it.get("type") == "textarea" and sec.get("type") == "narrative":
                rows.append(f"<p><strong>{_e(it['label'])}</strong></p>{_fmt_value(it)}")
            else:
                miss = ' class="missing"' if (it.get("required") and it.get("value") in (None, "", [])) else ""
                rows.append(f"<tr><th{miss}>{_e(it['label'])}</th><td>{_fmt_value(it)}</td></tr>")
        table_rows = [r for r in rows if r.startswith("<tr>")]
        narr_rows = [r for r in rows if not r.startswith("<tr>")]
        body = ""
        if narr_rows:
            body += "".join(narr_rows)
        if table_rows:
            body += f"<table>{''.join(table_rows)}</table>"
        body += "".join(media_html)
        desc = f'<p class="muted">{_e(sec.get("description"))}</p>' if sec.get("description") else ""
        parts.append(f"<h2>{_e(sec.get('title'))}</h2>{desc}{body or '<p class=\"muted\">—</p>'}")

    exec_summary = (f'<div class="summary"><strong>Resumen ejecutivo</strong><br>{_e(h.get("executive_summary"))}</div>'
                    if h.get("executive_summary") else "")
    brand = _e(h.get("co_brand") or "SystemRapid")

    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Site Survey · {_e(h.get('site_name') or h.get('reference') or '')}</title>
<style>{DELIVERABLE_CSS}</style>
</head>
<body>
<div class="cover">
  <div class="brand">{brand} · {_e(h.get('template_name') or 'Site Survey')} v{_e(h.get('template_version') or '')}</div>
  <h1>{_e(h.get('site_name') or h.get('title') or 'Site Survey')}</h1>
  <p class="sub">{_e(location)}</p>
  <p class="sub">Cliente {_e(h.get('client_name') or '—')}{(' · Cliente final ' + _e(h.get('end_client_name'))) if h.get('end_client_name') else ''}
   · Proyecto {_e(h.get('project_code') or '—')}{(' · PO ' + _e(h.get('po_number'))) if h.get('po_number') else ''}
   · Ref. {_e(h.get('reference') or '')}</p>
  <p class="sub">Visita {_fmt(h.get('visit_at'), tz)} ({_e(tz)}) · Técnico {_e(h.get('tech_name') or '—')} · Coordinador SRS {_e(h.get('coordinator_name') or '—')}{(' · LCON ' + _e(h.get('lcon_name'))) if h.get('lcon_name') else ''}</p>
  <p class="sub">{status_badge}{rating_html}{ready_html}</p>
  {exec_summary}
</div>
{''.join(parts)}
<footer>Generado por InsiteIQ · {_fmt(report.get('generated_at'), tz)} {_e(tz)} · plantilla {_e(h.get('template_name'))} v{_e(h.get('template_version'))}</footer>
</body>
</html>
"""
