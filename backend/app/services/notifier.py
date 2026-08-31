"""
InsiteIQ — Notifier service (Sprint Afinar · 2026-08-31)

Punto único para emitir notificaciones in-app (+ email opcional vía
email_outbox existente). Los routers llaman a los helpers de alto nivel
(notify_wo_event · notify_briefing_* · notify_thread_message) DESPUÉS de
su mutación principal, siempre dentro de try/except fire-and-forget:
una notificación fallida JAMÁS bloquea la operación que la disparó.

Resolución de destinatarios:
  - coord del WO        → wo.srs_coordinator_user_id
  - tech del WO         → wo.assigned_tech_user_id
  - finance             → users SRS con role "finance" en membership activa
  - client coords (org) → users client_coordinator con organization_id
"""
import logging
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger("insiteiq.notifier")


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Core insert ─────────────────────────────────────────────────────

async def notify(
    db,
    *,
    tenant_id: str,
    user_ids: list[str],
    event_type: str,
    entity_id: str,
    title: str,
    body: str | None = None,
    entity_type: str = "work_order",
    ball_to_me: bool = False,
    cta_url: str | None = None,
    actor_user_id: str | None = None,
) -> int:
    """Inserta 1 notificación por destinatario. Excluye al actor (nadie se
    notifica a sí mismo de lo que acaba de hacer). Devuelve nº insertadas."""
    now = _now()
    docs = []
    seen: set[str] = set()
    for uid in user_ids:
        if not uid or uid == actor_user_id or uid in seen:
            continue
        seen.add(uid)
        docs.append({
            "tenant_id": tenant_id,
            "user_id": uid,
            "event_type": event_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "title": title,
            "body": body,
            "ball_to_me": ball_to_me,
            "cta_url": cta_url,
            "read_at": None,
            "actor_user_id": actor_user_id,
            "created_at": now,
            "updated_at": now,
        })
    if not docs:
        return 0
    await db.notifications.insert_many(docs)
    return len(docs)


async def enqueue_email(
    db,
    *,
    tenant_id: str,
    to_user_ids: list[str],
    subject: str,
    title: str,
    body: str | None,
    cta_url: str | None,
) -> int:
    """Encola email simple por destinatario en email_outbox (worker drena).
    Sin SMTP_HOST configurado quedan en queued (NoOp) — infraestructura lista."""
    if not to_user_ids:
        return 0
    emails: list[str] = []
    async for u in db.users.find(
        {"_id": {"$in": [_oid(x) for x in to_user_ids if _oid(x)]}},
        {"email": 1},
    ):
        if u.get("email"):
            emails.append(u["email"])
    if not emails:
        return 0

    link = f"https://insiteiq.systemrapid.io{cta_url}" if cta_url else "https://insiteiq.systemrapid.io"
    body_html = (
        f"<div style='font-family:sans-serif;max-width:520px'>"
        f"<h2 style='color:#0A1628;margin:0 0 8px'>{title}</h2>"
        f"<p style='color:#3D4A66;line-height:1.5'>{body or ''}</p>"
        f"<p style='margin-top:16px'><a href='{link}' "
        f"style='background:#0A1628;color:#fff;padding:10px 18px;"
        f"text-decoration:none;border-radius:6px;font-weight:700'>Abrir en InsiteIQ</a></p>"
        f"</div>"
    )
    now = _now()
    n = 0
    for to in emails:
        await db.email_outbox.insert_one({
            "tenant_id": tenant_id,
            "work_order_id": None,
            "report_id": None,  # worker tolera None (early-return del delivery log)
            "to": to,
            "cc": [],
            "subject": subject,
            "body_html": body_html,
            "enqueued_at": now,
            "status": "queued",
            "attempts": 0,
            "last_error": None,
            "requested_by": "notifier",
        })
        n += 1
    return n


def _oid(value: str):
    from bson import ObjectId
    try:
        return ObjectId(value)
    except Exception:
        return None


# ─── Destinatarios ───────────────────────────────────────────────────

async def finance_user_ids(db, tenant_id: str) -> list[str]:
    ids = []
    async for u in db.users.find(
        {
            "tenant_id": tenant_id,
            "is_active": True,
            "space_memberships": {
                "$elemMatch": {"space": "srs_coordinators", "role": "finance", "active": True}
            },
        },
        {"_id": 1},
    ):
        ids.append(str(u["_id"]))
    return ids


async def client_coord_ids(db, tenant_id: str, organization_id: str) -> list[str]:
    ids = []
    async for u in db.users.find(
        {
            "tenant_id": tenant_id,
            "is_active": True,
            "space_memberships": {
                "$elemMatch": {
                    "space": "client_coordinator",
                    "organization_id": organization_id,
                    "active": True,
                }
            },
        },
        {"_id": 1},
    ):
        ids.append(str(u["_id"]))
    return ids


async def _actor_name(db, user_id: str | None) -> str:
    if not user_id:
        return "Alguien"
    oid = _oid(user_id)
    if not oid:
        return "Alguien"
    u = await db.users.find_one({"_id": oid}, {"display_name": 1, "full_name": 1})
    if not u:
        return "Alguien"
    return u.get("display_name") or u.get("full_name") or "Alguien"


# ─── Helpers de alto nivel (los que llaman los routers) ─────────────

async def notify_wo_advance(db, wo: dict, *, target: str, actor_user_id: str) -> None:
    """Dispara notifs según el status alcanzado. Fire-and-forget interno."""
    try:
        tenant_id = wo["tenant_id"]
        wo_id = str(wo["_id"])
        ref = wo.get("reference") or wo_id[-8:].upper()
        title_wo = wo.get("title") or ref
        coord = wo.get("srs_coordinator_user_id")
        tech = wo.get("assigned_tech_user_id")
        org_id = wo.get("organization_id")
        actor = await _actor_name(db, actor_user_id)
        srs_url = f"/srs/ops/{wo_id}"
        client_url = f"/client/ops/{wo_id}"

        if target == "en_route":
            await notify(
                db, tenant_id=tenant_id, user_ids=[coord],
                event_type="wo_en_route", entity_id=wo_id,
                title=f"{actor} salió hacia el sitio",
                body=f"{ref} · {title_wo}",
                cta_url=srs_url, actor_user_id=actor_user_id,
            )

        elif target == "on_site":
            await notify(
                db, tenant_id=tenant_id, user_ids=[coord],
                event_type="wo_on_site", entity_id=wo_id,
                title=f"{actor} llegó al sitio",
                body=f"{ref} · {title_wo}",
                cta_url=srs_url, actor_user_id=actor_user_id,
            )

        elif target == "resolved":
            # Coord: te toca cerrar (ball_to_me) + email
            await notify(
                db, tenant_id=tenant_id, user_ids=[coord],
                event_type="wo_resolved", entity_id=wo_id,
                title=f"{actor} terminó la intervención",
                body=f"{ref} · {title_wo} · pendiente tu cierre",
                ball_to_me=True, cta_url=srs_url, actor_user_id=actor_user_id,
            )
            await enqueue_email(
                db, tenant_id=tenant_id, to_user_ids=[coord] if coord else [],
                subject=f"[InsiteIQ] {ref} resuelta · pendiente tu cierre",
                title=f"{actor} terminó la intervención",
                body=f"{ref} · {title_wo}. El trabajo está hecho · falta tu cierre para facturar.",
                cta_url=srs_url,
            )
            # Cliente: su ticket quedó resuelto
            if org_id:
                ccoords = await client_coord_ids(db, tenant_id, org_id)
                await notify(
                    db, tenant_id=tenant_id, user_ids=ccoords,
                    event_type="wo_resolved", entity_id=wo_id,
                    title="Intervención resuelta",
                    body=f"{ref} · {title_wo} · pendiente validación final",
                    cta_url=client_url, actor_user_id=actor_user_id,
                )

        elif target == "closed":
            # Tech: tu trabajo quedó cerrado
            await notify(
                db, tenant_id=tenant_id, user_ids=[tech],
                event_type="wo_closed", entity_id=wo_id,
                title="Intervención cerrada",
                body=f"{ref} · {title_wo} · cierre confirmado",
                cta_url=f"/tech/ops/{wo_id}", actor_user_id=actor_user_id,
            )
            # Finance: lista para facturar (ball_to_me) + email
            fin = await finance_user_ids(db, tenant_id)
            await notify(
                db, tenant_id=tenant_id, user_ids=fin,
                event_type="wo_closed", entity_id=wo_id,
                title="WO cerrada · lista para facturar",
                body=f"{ref} · {title_wo}",
                ball_to_me=True, cta_url="/srs/finance", actor_user_id=actor_user_id,
            )
            await enqueue_email(
                db, tenant_id=tenant_id, to_user_ids=fin,
                subject=f"[InsiteIQ] {ref} cerrada · lista para facturar",
                title="WO cerrada · lista para facturar",
                body=f"{ref} · {title_wo}.",
                cta_url="/srs/finance",
            )
            # Cliente: cerrada + reporte disponible
            if org_id:
                ccoords = await client_coord_ids(db, tenant_id, org_id)
                await notify(
                    db, tenant_id=tenant_id, user_ids=ccoords,
                    event_type="wo_closed", entity_id=wo_id,
                    title="Intervención cerrada · reporte disponible",
                    body=f"{ref} · {title_wo}",
                    cta_url=f"{client_url}/report", actor_user_id=actor_user_id,
                )

        elif target == "cancelled":
            await notify(
                db, tenant_id=tenant_id, user_ids=[coord, tech],
                event_type="wo_cancelled", entity_id=wo_id,
                title="Intervención cancelada",
                body=f"{ref} · {title_wo}",
                cta_url=srs_url, actor_user_id=actor_user_id,
            )
    except Exception:
        log.exception("notify_wo_advance failed (never blocks the advance)")


async def notify_briefing_assembled(db, wo: dict, *, actor_user_id: str) -> None:
    try:
        tech = wo.get("assigned_tech_user_id")
        if not tech:
            return
        tenant_id = wo["tenant_id"]
        wo_id = str(wo["_id"])
        ref = wo.get("reference") or wo_id[-8:].upper()
        await notify(
            db, tenant_id=tenant_id, user_ids=[tech],
            event_type="briefing_assembled", entity_id=wo_id,
            entity_type="briefing",
            title="Briefing nuevo · léelo y confirma",
            body=f"{ref} · {wo.get('title') or ''}",
            ball_to_me=True, cta_url=f"/tech/ops/{wo_id}",
            actor_user_id=actor_user_id,
        )
        await enqueue_email(
            db, tenant_id=tenant_id, to_user_ids=[tech],
            subject=f"[InsiteIQ] Briefing nuevo · {ref}",
            title="Tienes un briefing nuevo",
            body=f"{ref} · {wo.get('title') or ''}. Léelo y confirma antes de salir al sitio.",
            cta_url=f"/tech/ops/{wo_id}",
        )
    except Exception:
        log.exception("notify_briefing_assembled failed")


async def notify_briefing_acked(db, wo: dict, *, actor_user_id: str) -> None:
    try:
        coord = wo.get("srs_coordinator_user_id")
        if not coord:
            return
        tenant_id = wo["tenant_id"]
        wo_id = str(wo["_id"])
        ref = wo.get("reference") or wo_id[-8:].upper()
        actor = await _actor_name(db, actor_user_id)
        await notify(
            db, tenant_id=tenant_id, user_ids=[coord],
            event_type="briefing_acked", entity_id=wo_id,
            entity_type="briefing",
            title=f"{actor} confirmó el briefing",
            body=f"{ref} · listo para salir al sitio",
            cta_url=f"/srs/ops/{wo_id}", actor_user_id=actor_user_id,
        )
    except Exception:
        log.exception("notify_briefing_acked failed")


async def notify_capture_submitted(db, wo: dict, *, actor_user_id: str) -> None:
    try:
        coord = wo.get("srs_coordinator_user_id")
        if not coord:
            return
        tenant_id = wo["tenant_id"]
        wo_id = str(wo["_id"])
        ref = wo.get("reference") or wo_id[-8:].upper()
        actor = await _actor_name(db, actor_user_id)
        await notify(
            db, tenant_id=tenant_id, user_ids=[coord],
            event_type="capture_submitted", entity_id=wo_id,
            title=f"{actor} subió evidencia de campo",
            body=f"{ref} · qué encontró + qué hizo + fotos",
            cta_url=f"/srs/ops/{wo_id}", actor_user_id=actor_user_id,
        )
    except Exception:
        log.exception("notify_capture_submitted failed")


async def notify_thread_message(
    db, wo: dict, *, kind: str, preview: str, actor_user_id: str
) -> None:
    """Mensaje nuevo en thread → notifica a los participantes del WO
    (coord + tech · + client coords si el thread es shared) menos el autor."""
    try:
        tenant_id = wo["tenant_id"]
        wo_id = str(wo["_id"])
        ref = wo.get("reference") or wo_id[-8:].upper()
        actor = await _actor_name(db, actor_user_id)
        text = (preview or "").strip()
        if len(text) > 80:
            text = text[:77] + "…"
        title = f"{actor} escribió en {ref}"

        # Cada rol recibe SU url (un tech no puede abrir /srs/ops/*).
        # Thread internal = SRS-only: NI tech NI cliente reciben notif
        # (no pueden ver ese thread · notificarles filtraría su existencia).
        groups: list[tuple[list[str], str]] = [
            ([wo.get("srs_coordinator_user_id")], f"/srs/ops/{wo_id}"),
        ]
        if kind == "shared":
            groups.append(
                ([wo.get("assigned_tech_user_id")], f"/tech/ops/{wo_id}/threads")
            )
            if wo.get("organization_id"):
                ccoords = await client_coord_ids(db, tenant_id, wo["organization_id"])
                groups.append((ccoords, f"/client/ops/{wo_id}"))

        for user_ids, url in groups:
            await notify(
                db, tenant_id=tenant_id,
                user_ids=[r for r in user_ids if r],
                event_type="thread_message", entity_id=wo_id,
                entity_type="thread",
                title=title, body=text or None,
                cta_url=url, actor_user_id=actor_user_id,
            )
    except Exception:
        log.exception("notify_thread_message failed")
