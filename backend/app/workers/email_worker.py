"""
Email outbox drainer — envía email_outbox via SMTP.

NoOp safe: si SMTP_HOST no está configurado, no envía pero tampoco
fallea — solo logea. Útil para dev local sin credenciales.

Backoff exponencial por intento: 2, 4, 8, 16, 32 minutos.
Tras WORKER_MAX_ATTEMPTS (5 default) marca status="failed".
"""
import asyncio
import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from bson import ObjectId

from app.core.config import settings
from app.database import get_db

log = logging.getLogger("insiteiq.workers.email")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _send_via_smtp_sync(
    to: str, cc: list[str], subject: str, body_html: str, message_id: str
) -> tuple[bool, str | None]:
    """Envía sincrónico — corre dentro de asyncio.to_thread()."""
    if not settings.SMTP_HOST:
        return False, "SMTP_HOST not configured"

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    if cc:
        msg["Cc"] = ", ".join(cc)
    msg["Subject"] = subject
    msg["Message-ID"] = f"<{message_id}@insiteiq>"
    msg.set_content(
        "This message contains an HTML report from InsiteIQ. "
        "Please view in an HTML-capable email client."
    )
    msg.add_alternative(body_html or "<p>(empty report body)</p>", subtype="html")

    recipients = [to] + (cc or [])
    try:
        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=20
            )
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=20
            )
        try:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg, to_addrs=recipients)
            return True, None
        finally:
            try:
                server.quit()
            except Exception:
                pass
    except Exception as exc:
        return False, str(exc)


async def _bump_delivery_log(db, outbox_doc: dict, new_status: str, attempts: int) -> None:
    """Actualiza el delivery item en intervention_reports.deliveries[].

    Match por (channel='email', target=to). Si hay múltiples deliveries al
    mismo to, MongoDB updatea solo el primer match — aceptable porque el
    flow normal es 1 dispatch = 1 delivery row.
    """
    report_id = outbox_doc.get("report_id")
    if not report_id:
        return
    try:
        rid = ObjectId(report_id)
    except Exception:
        return
    await db.intervention_reports.update_one(
        {
            "_id": rid,
            "deliveries.channel": "email",
            "deliveries.target": outbox_doc.get("to"),
        },
        {
            "$set": {
                "deliveries.$.status": new_status,
                "deliveries.$.attempts": attempts,
                "deliveries.$.last_attempt_at": _now(),
                "updated_at": _now(),
            }
        },
    )


async def _drain_once() -> int:
    """Drena un batch. Devuelve número de docs procesados.

    NoOp mode (SMTP_HOST no configurado): early return sin tocar docs.
    Los emails quedan en `queued` hasta que se configure SMTP — no
    consumen attempts ni cambian status.
    """
    if not settings.SMTP_HOST:
        return 0

    db = get_db()
    now = _now()

    cursor = (
        db.email_outbox.find(
            {
                "status": {"$in": ["queued", "retrying"]},
                "$or": [
                    {"next_attempt_at": {"$exists": False}},
                    {"next_attempt_at": {"$lte": now}},
                ],
                "attempts": {"$lt": settings.WORKER_MAX_ATTEMPTS},
            }
        )
        .sort("enqueued_at", 1)
        .limit(settings.WORKER_BATCH_SIZE)
    )
    docs = await cursor.to_list(length=settings.WORKER_BATCH_SIZE)
    if not docs:
        return 0

    processed = 0
    for doc in docs:
        outbox_id = doc["_id"]
        prev_status = doc["status"]

        # Atomic claim — solo procede si el status sigue siendo el mismo que vimos
        claim = await db.email_outbox.update_one(
            {"_id": outbox_id, "status": prev_status},
            {"$set": {"status": "sending", "last_attempt_at": _now()}},
        )
        if claim.modified_count == 0:
            continue  # otro worker se la llevó

        ok, error = await asyncio.to_thread(
            _send_via_smtp_sync,
            to=doc["to"],
            cc=doc.get("cc", []) or [],
            subject=doc["subject"],
            body_html=doc.get("body_html", ""),
            message_id=str(outbox_id),
        )

        attempts = doc.get("attempts", 0) + 1
        if ok:
            await db.email_outbox.update_one(
                {"_id": outbox_id},
                {
                    "$set": {
                        "status": "delivered",
                        "delivered_at": _now(),
                        "attempts": attempts,
                        "last_error": None,
                    }
                },
            )
            await _bump_delivery_log(db, doc, "delivered", attempts)
            log.info("Email outbox %s delivered to %s", outbox_id, doc.get("to"))
        else:
            failed = attempts >= settings.WORKER_MAX_ATTEMPTS
            backoff_min = 2 ** attempts  # 2, 4, 8, 16, 32 minutes
            next_attempt = _now() + timedelta(minutes=backoff_min)
            new_status = "failed" if failed else "retrying"
            await db.email_outbox.update_one(
                {"_id": outbox_id},
                {
                    "$set": {
                        "status": new_status,
                        "attempts": attempts,
                        "last_error": (error or "")[:500],
                        "next_attempt_at": next_attempt,
                    }
                },
            )
            await _bump_delivery_log(db, doc, new_status, attempts)
            log.warning(
                "Email outbox %s attempt %d failed: %s (next=%s)",
                outbox_id, attempts, error, next_attempt.isoformat(),
            )
        processed += 1
    return processed


async def email_worker_loop() -> None:
    """Background loop. Arranca en lifespan, corre hasta shutdown."""
    interval = settings.WORKER_POLL_INTERVAL_SECONDS
    smtp_label = settings.SMTP_HOST if settings.SMTP_HOST else "DISABLED (NoOp)"
    log.info(
        "Email worker started · poll=%ds · batch=%d · smtp=%s",
        interval, settings.WORKER_BATCH_SIZE, smtp_label,
    )
    while True:
        try:
            await _drain_once()
        except asyncio.CancelledError:
            log.info("Email worker cancelled — exiting loop")
            raise
        except Exception:
            log.exception("Email worker tick failed (continuando loop)")
        await asyncio.sleep(interval)
