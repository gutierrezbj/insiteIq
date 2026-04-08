"""AI routes — email intake, report generation, usage stats."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app.database import get_db
from app.dependencies import get_current_user
from app.services import ai_reporter, email_intake

router = APIRouter()


# ── Email intake ───────────────────────────────────────

@router.post("/intake/email")
async def intake_email(
    payload: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Recibe email crudo (manual paste o webhook) y lo parsea con LLM."""
    raw = payload.get("body") or payload.get("raw")
    if not raw:
        raise HTTPException(400, "body or raw required")
    return await email_intake.ingest_email(
        raw_text=raw,
        subject=payload.get("subject", ""),
        sender=payload.get("sender", ""),
        message_id=payload.get("message_id"),
        thread_id=payload.get("thread_id"),
        source=payload.get("source", "manual"),
    )


@router.get("/intake/queue")
async def intake_queue(
    status: str = Query("needs_review"),
    user: dict = Depends(get_current_user),
):
    """Cola de emails pendientes de revisión humana."""
    db = get_db()
    docs = await db["email_messages"].find({"status": status}).sort("created_at", -1).to_list(100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return {"data": docs, "total": len(docs)}


# ── Report generation ──────────────────────────────────

@router.post("/reports/{intervention_id}/generate")
async def generate_report(
    intervention_id: str,
    premium: bool = Query(False),
    user: dict = Depends(get_current_user),
):
    try:
        report = await ai_reporter.generate_report(intervention_id, premium=premium)
        return {"intervention_id": intervention_id, "premium": premium, "report": report}
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/reports/{intervention_id}")
async def get_reports(
    intervention_id: str,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    docs = await db["intervention_reports"].find(
        {"intervention_id": intervention_id}
    ).sort("created_at", -1).to_list(20)
    for d in docs:
        d["id"] = str(d.pop("_id"))
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return {"data": docs}


# ── Usage / billing ────────────────────────────────────

@router.get("/usage/summary")
async def usage_summary(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user),
):
    """Agregado de coste y volumen por cliente / tier en los últimos N días."""
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)

    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": {"client": "$client", "tier": "$tier", "task": "$task"},
            "calls": {"$sum": 1},
            "tokens_in": {"$sum": "$tokens_in"},
            "tokens_out": {"$sum": "$tokens_out"},
            "errors": {"$sum": {"$cond": [{"$eq": ["$status", "error"]}, 1, 0]}},
        }},
        {"$sort": {"calls": -1}},
    ]
    rows = await db["ai_usage"].aggregate(pipeline).to_list(500)

    totals = {
        "calls": sum(r["calls"] for r in rows),
        "tokens_in": sum(r["tokens_in"] for r in rows),
        "tokens_out": sum(r["tokens_out"] for r in rows),
        "errors": sum(r["errors"] for r in rows),
    }
    return {"days": days, "totals": totals, "breakdown": rows}
