"""
Webhook outbox drainer — POST JSON al url del cliente.

Si WEBHOOK_SIGNING_SECRET está configurado, agrega header
X-InsiteIQ-Signature con HMAC-SHA256 hex del body — el cliente
puede verificar autenticidad.

Backoff exponencial (2/4/8/16/32 min) hasta WORKER_MAX_ATTEMPTS.
"""
import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone

import httpx
from bson import ObjectId

from app.core.config import settings
from app.database import get_db

log = logging.getLogger("insiteiq.workers.webhook")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _json_default(obj):
    """Para serializar datetime/ObjectId al payload del webhook."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, ObjectId):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def _sign(body_bytes: bytes) -> str | None:
    secret = settings.WEBHOOK_SIGNING_SECRET
    if not secret:
        return None
    return hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()


async def _post_webhook(url: str, payload: dict, message_id: str) -> tuple[bool, str | None, int | None]:
    """POST JSON al url. Devuelve (ok, error, status_code)."""
    body_bytes = json.dumps(payload, default=_json_default).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "InsiteIQ-Webhook/1.0",
        "X-InsiteIQ-Message-Id": message_id,
    }
    sig = _sign(body_bytes)
    if sig:
        headers["X-InsiteIQ-Signature"] = f"sha256={sig}"

    try:
        timeout = httpx.Timeout(settings.WEBHOOK_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            resp = await client.post(url, content=body_bytes, headers=headers)
        if 200 <= resp.status_code < 300:
            return True, None, resp.status_code
        return (
            False,
            f"HTTP {resp.status_code}: {resp.text[:200]}",
            resp.status_code,
        )
    except httpx.TimeoutException as exc:
        return False, f"timeout: {exc}", None
    except httpx.RequestError as exc:
        return False, f"request_error: {exc}", None
    except Exception as exc:
        return False, f"unexpected: {exc}", None


async def _bump_delivery_log(
    db, outbox_doc: dict, new_status: str, attempts: int, http_code: int | None
) -> None:
    report_id = outbox_doc.get("report_id")
    if not report_id:
        return
    try:
        rid = ObjectId(report_id)
    except Exception:
        return
    update = {
        "deliveries.$.status": new_status,
        "deliveries.$.attempts": attempts,
        "deliveries.$.last_attempt_at": _now(),
        "updated_at": _now(),
    }
    if http_code is not None:
        update["deliveries.$.http_status"] = http_code

    await db.intervention_reports.update_one(
        {
            "_id": rid,
            "deliveries.channel": "webhook",
            "deliveries.target": outbox_doc.get("url"),
        },
        {"$set": update},
    )


async def _drain_once() -> int:
    db = get_db()
    now = _now()

    cursor = (
        db.webhook_outbox.find(
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

        claim = await db.webhook_outbox.update_one(
            {"_id": outbox_id, "status": prev_status},
            {"$set": {"status": "sending", "last_attempt_at": _now()}},
        )
        if claim.modified_count == 0:
            continue

        ok, error, http_code = await _post_webhook(
            url=doc["url"],
            payload=doc.get("payload", {}),
            message_id=str(outbox_id),
        )

        attempts = doc.get("attempts", 0) + 1
        if ok:
            await db.webhook_outbox.update_one(
                {"_id": outbox_id},
                {
                    "$set": {
                        "status": "delivered",
                        "delivered_at": _now(),
                        "attempts": attempts,
                        "last_error": None,
                        "last_http_status": http_code,
                    }
                },
            )
            await _bump_delivery_log(db, doc, "delivered", attempts, http_code)
            log.info(
                "Webhook outbox %s delivered to %s (HTTP %s)",
                outbox_id, doc.get("url"), http_code,
            )
        else:
            failed = attempts >= settings.WORKER_MAX_ATTEMPTS
            backoff_min = 2 ** attempts
            next_attempt = _now() + timedelta(minutes=backoff_min)
            new_status = "failed" if failed else "retrying"
            await db.webhook_outbox.update_one(
                {"_id": outbox_id},
                {
                    "$set": {
                        "status": new_status,
                        "attempts": attempts,
                        "last_error": (error or "")[:500],
                        "last_http_status": http_code,
                        "next_attempt_at": next_attempt,
                    }
                },
            )
            await _bump_delivery_log(db, doc, new_status, attempts, http_code)
            log.warning(
                "Webhook outbox %s attempt %d failed: %s (next=%s)",
                outbox_id, attempts, error, next_attempt.isoformat(),
            )
        processed += 1
    return processed


async def webhook_worker_loop() -> None:
    interval = settings.WORKER_POLL_INTERVAL_SECONDS
    log.info(
        "Webhook worker started · poll=%ds · batch=%d · timeout=%ds · signing=%s",
        interval,
        settings.WORKER_BATCH_SIZE,
        settings.WEBHOOK_TIMEOUT_SECONDS,
        "ON" if settings.WEBHOOK_SIGNING_SECRET else "OFF",
    )
    while True:
        try:
            await _drain_once()
        except asyncio.CancelledError:
            log.info("Webhook worker cancelled — exiting loop")
            raise
        except Exception:
            log.exception("Webhook worker tick failed (continuando loop)")
        await asyncio.sleep(interval)
