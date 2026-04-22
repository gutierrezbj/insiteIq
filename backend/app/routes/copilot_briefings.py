"""
InsiteIQ v1 Modo 1 — Copilot Briefing routes (Domain 10.5)

Endpoints (nested under /api/work-orders/{wo_id}/briefing):
  POST   /api/work-orders/{wo_id}/briefing/assemble      — generate/refresh (SRS)
  GET    /api/work-orders/{wo_id}/briefing               — get active briefing
  POST   /api/work-orders/{wo_id}/briefing/acknowledge   — assigned tech confirms read

Guard hook (used by work_orders.advance):
  - On target='en_route': require briefing.status == 'acknowledged'
    AND acknowledged_by == assigned_tech_user_id
    OR body.emergency=true (logged in audit)

Assembly (Fase 1 minimal):
  Pulls what's available today: site fields + historial work_orders mismo site.
  Site Bible + Device Bible completos llegan en Fase 5 — la FUNCION assemble
  ya deja hueco estructural para ellos.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.services.ai_provider import (
    BRIEFING_SYSTEM_PROMPT,
    build_briefing_user_prompt,
    get_ai_provider,
)

router = APIRouter(prefix="/work-orders/{wo_id}/briefing", tags=["copilot_briefings"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _load_wo(db, wo_id: str, user: CurrentUser) -> dict:
    """Load work_order with scope enforcement (mirror of work_orders.py)."""
    try:
        oid = ObjectId(wo_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid work_order id")

    q: dict[str, Any] = {"_id": oid, "tenant_id": user.tenant_id}
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if m and m.get("organization_id"):
                q["organization_id"] = m["organization_id"]
            else:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")
        elif user.has_space("tech_field"):
            q["assigned_tech_user_id"] = user.user_id
        else:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")

    wo = await db.work_orders.find_one(q)
    if not wo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")
    return wo


STOPWORDS = {
    "the", "a", "an", "of", "for", "in", "on", "at", "to", "and", "or",
    "with", "de", "la", "el", "los", "las", "un", "una", "en", "del",
    "y", "o", "con", "para", "por", "se", "es", "no", "si", "al",
    "wo", "ticket", "incident", "incidencia", "soporte", "sistema",
}


def _tokens(text: str | None) -> set[str]:
    """Naive keyword tokenizer: lowercase, alphanumeric >=4 chars, minus stopwords."""
    if not text:
        return set()
    out = set()
    cur = []
    for ch in text.lower():
        if ch.isalnum():
            cur.append(ch)
        else:
            if cur:
                w = "".join(cur)
                if len(w) >= 4 and w not in STOPWORDS:
                    out.add(w)
            cur = []
    if cur:
        w = "".join(cur)
        if len(w) >= 4 and w not in STOPWORDS:
            out.add(w)
    return out


def _snippet(text: str | None, max_chars: int = 160) -> str | None:
    if not text:
        return None
    t = text.strip().replace("\n", " ")
    if len(t) <= max_chars:
        return t
    return t[: max_chars - 1] + "…"


async def _capture_snippets_for_wo(db, wo_id: str) -> dict:
    """Return {what_found_snippet, what_did_snippet, time_on_site_minutes} from active capture."""
    cap = await db.tech_captures.find_one(
        {"work_order_id": wo_id, "status": "submitted"}
    )
    if not cap:
        return {}
    return {
        "what_found_snippet": _snippet(cap.get("what_found")),
        "what_did_snippet": _snippet(cap.get("what_did")),
        "time_on_site_minutes": cap.get("time_on_site_minutes"),
    }


async def _assemble_sections(db, wo: dict) -> dict:
    """
    Y-a assembly (AI Learning Engine · Fase 1 sin LLM):
      - site_bible_summary   (same as before)
      - history              enriquecido con capture snippets + time_on_site
      - similar_cross_site   top-5 WOs del mismo cliente en OTROS sites, con
                             keyword overlap con title+description
      - site_metrics         wo_count_90d / avg_resolution_minutes /
                             repeat_rate_30d / after_hours_pct
      - device_bible         empty (Fase 5)
      - parts_estimate       empty (Fase 5)
    """
    sections: dict[str, Any] = {
        "site_bible_summary": {},
        "device_bible": [],
        "history": [],
        "similar_cross_site": [],
        "site_metrics": {},
        "parts_estimate": [],
    }

    tenant_id = wo["tenant_id"]
    site_id = wo.get("site_id")
    org_id = wo.get("organization_id")

    # ---- Site Bible summary
    try:
        site = await db.sites.find_one(
            {"_id": ObjectId(site_id), "tenant_id": tenant_id}
        )
    except Exception:
        site = None
    if site:
        sections["site_bible_summary"] = {
            "site_name": site.get("name"),
            "address": site.get("address"),
            "country": site.get("country"),
            "city": site.get("city"),
            "timezone": site.get("timezone"),
            "onsite_contact": site.get("onsite_contact"),
            "access_notes": site.get("access_notes"),
            "has_physical_resident": site.get("has_physical_resident", False),
            "known_issues": [],
            "confidence": "draft",
        }

    # ---- History same site · enriquecido con capture
    history_cursor = (
        db.work_orders.find({
            "tenant_id": tenant_id,
            "site_id": site_id,
            "_id": {"$ne": wo["_id"]},
            "status": {"$in": ["closed", "resolved"]},
        })
        .sort("updated_at", -1)
        .limit(3)
    )
    async for h in history_cursor:
        cap = await _capture_snippets_for_wo(db, str(h["_id"]))
        sections["history"].append({
            "work_order_id": str(h["_id"]),
            "reference": h.get("reference"),
            "title": h.get("title"),
            "status": h.get("status"),
            "closed_at": h.get("closed_at"),
            "severity": h.get("severity"),
            "after_hours": h.get("after_hours", False),
            **cap,
        })

    # ---- Similar cross-site (mismo cliente, otros sites, keyword overlap)
    target_tokens = _tokens(
        (wo.get("title") or "") + " " + (wo.get("description") or "")
    )
    if target_tokens and org_id:
        # Pull candidates — limit to same org, different site, closed/resolved
        candidates = await db.work_orders.find(
            {
                "tenant_id": tenant_id,
                "organization_id": org_id,
                "site_id": {"$ne": site_id},
                "_id": {"$ne": wo["_id"]},
                "status": {"$in": ["closed", "resolved"]},
            },
            {
                "reference": 1, "title": 1, "description": 1, "site_id": 1,
                "status": 1, "closed_at": 1, "severity": 1,
            },
        ).sort("updated_at", -1).limit(200).to_list(200)

        scored: list[tuple[int, set, dict]] = []
        for c in candidates:
            c_tokens = _tokens(
                (c.get("title") or "") + " " + (c.get("description") or "")
            )
            overlap = target_tokens & c_tokens
            if overlap:
                scored.append((len(overlap), overlap, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:5]

        # Resolve site names batch
        site_ids = {c[2].get("site_id") for c in top if c[2].get("site_id")}
        sites_map: dict[str, str] = {}
        if site_ids:
            async for s in db.sites.find(
                {"_id": {"$in": [ObjectId(i) for i in site_ids]}},
                {"name": 1},
            ):
                sites_map[str(s["_id"])] = s.get("name")

        for score, overlap, c in top:
            cap = await _capture_snippets_for_wo(db, str(c["_id"]))
            sections["similar_cross_site"].append({
                "work_order_id": str(c["_id"]),
                "reference": c.get("reference"),
                "title": c.get("title"),
                "site_id": c.get("site_id"),
                "site_name": sites_map.get(c.get("site_id")),
                "status": c.get("status"),
                "closed_at": c.get("closed_at"),
                "severity": c.get("severity"),
                "match_score": score,
                "matched_terms": sorted(overlap)[:6],
                **cap,
            })

    # ---- Site metrics (90d window)
    now = datetime.now(timezone.utc)
    cutoff_90d = now - timedelta(days=90)
    cutoff_30d = now - timedelta(days=30)

    site_wos = await db.work_orders.find(
        {
            "tenant_id": tenant_id,
            "site_id": site_id,
            "_id": {"$ne": wo["_id"]},
            "created_at": {"$gte": cutoff_90d},
        },
        {"status": 1, "created_at": 1, "closed_at": 1, "after_hours": 1},
    ).to_list(1000)

    wo_count_90d = len(site_wos)
    closed_with_time = [
        w for w in site_wos
        if w.get("status") == "closed" and w.get("closed_at") and w.get("created_at")
    ]
    if closed_with_time:
        deltas = [
            (w["closed_at"] - w["created_at"]).total_seconds() / 60.0
            for w in closed_with_time
        ]
        avg_resolution_minutes = round(sum(deltas) / len(deltas), 1)
    else:
        avg_resolution_minutes = None

    after_hours_count = sum(1 for w in site_wos if w.get("after_hours"))
    after_hours_pct = (
        round(after_hours_count / wo_count_90d * 100, 1) if wo_count_90d else 0.0
    )

    # Repeat rate: WOs en los ultimos 30d en este site
    repeat_30d = sum(
        1 for w in site_wos
        if w.get("created_at") and w["created_at"] >= cutoff_30d
    )

    sections["site_metrics"] = {
        "window_days": 90,
        "wo_count_90d": wo_count_90d,
        "avg_resolution_minutes": avg_resolution_minutes,
        "repeat_count_30d": repeat_30d,
        "after_hours_pct": after_hours_pct,
        "computed_at": now,
    }

    return sections


@router.post("/assemble", status_code=status.HTTP_200_OK)
async def assemble_briefing(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    """SRS coordinator assembles (or refreshes) the briefing."""
    if not user.has_space("srs_coordinators"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only SRS coordinators can assemble briefings"
        )

    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    # If an active briefing exists, supersede it
    prev = await db.copilot_briefings.find_one(
        {"work_order_id": wo_id, "status": {"$in": ["assembled", "acknowledged"]}}
    )
    supersedes_id = None
    if prev:
        supersedes_id = str(prev["_id"])
        await db.copilot_briefings.update_one(
            {"_id": prev["_id"]},
            {"$set": {"status": "superseded", "updated_at": _now()}},
        )

    sections = await _assemble_sections(db, wo)

    # AI enrichment (Y-c Fase 1) · disabled si no hay provider configurado
    ai = get_ai_provider()
    ai_summary_text = ""
    ai_model = None
    ai_tokens_in = None
    ai_tokens_out = None
    ai_error = None
    if ai.enabled:
        user_prompt = build_briefing_user_prompt(wo, sections)
        resp = await ai.generate(BRIEFING_SYSTEM_PROMPT, user_prompt)
        ai_summary_text = resp.text
        ai_model = resp.model
        ai_tokens_in = resp.tokens_input
        ai_tokens_out = resp.tokens_output
        ai_error = resp.error

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "work_order_id": wo_id,
        "assembled_at": now,
        "assembled_by": user.user_id,
        "site_bible_summary": sections["site_bible_summary"],
        "device_bible": sections["device_bible"],
        "history": sections["history"],
        "similar_cross_site": sections.get("similar_cross_site", []),
        "site_metrics": sections.get("site_metrics", {}),
        "parts_estimate": sections["parts_estimate"],
        "coordinator_notes": None,
        "ai_summary": ai_summary_text or None,
        "ai_summary_model": ai_model,
        "ai_summary_tokens_in": ai_tokens_in,
        "ai_summary_tokens_out": ai_tokens_out,
        "ai_summary_error": ai_error,
        "ai_summary_generated_at": now if ai.enabled else None,
        "status": "assembled",
        "acknowledged_at": None,
        "acknowledged_by": None,
        "supersedes_id": supersedes_id,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    result = await db.copilot_briefings.insert_one(doc)
    doc["_id"] = result.inserted_id

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="copilot_briefing.assemble",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "copilot_briefings", "id": str(result.inserted_id)},
        ],
        context_snapshot={
            "supersedes_id": supersedes_id,
            "history_count": len(sections["history"]),
            "similar_count": len(sections.get("similar_cross_site", [])),
            "site_wo_count_90d": sections.get("site_metrics", {}).get("wo_count_90d"),
            "ai_provider": ai.name,
            "ai_tokens_in": ai_tokens_in,
            "ai_tokens_out": ai_tokens_out,
            "ai_generated": bool(ai_summary_text),
        },
    )

    return _serialize(doc)


@router.get("")
async def get_briefing(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    """Active briefing. Visible to SRS coord + assigned tech. Returns {exists:false} if none."""
    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    # Tech must be the assigned tech
    if user.has_space("tech_field") and not user.has_space("srs_coordinators"):
        if wo.get("assigned_tech_user_id") != user.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your work order")

    # Clients don't see the briefing (internal coord material)
    if user.has_space("client_coordinator") and not (
        user.has_space("srs_coordinators") or user.has_space("tech_field")
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Briefings are internal")

    doc = await db.copilot_briefings.find_one(
        {
            "work_order_id": wo_id,
            "tenant_id": user.tenant_id,
            "status": {"$in": ["assembled", "acknowledged"]},
        }
    )
    if not doc:
        return {"exists": False, "work_order_id": wo_id}
    return {"exists": True, **_serialize(doc)}


class CoordinatorNotesBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coordinator_notes: str | None = None


@router.patch("")
async def patch_briefing(
    wo_id: str,
    body: CoordinatorNotesBody,
    user: CurrentUser = Depends(get_current_user),
):
    """SRS enriches the assembled briefing with coordinator_notes before ack."""
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS can edit briefing")
    db = get_db()
    wo = await _load_wo(db, wo_id, user)
    doc = await db.copilot_briefings.find_one(
        {
            "work_order_id": wo_id,
            "tenant_id": user.tenant_id,
            "status": {"$in": ["assembled", "acknowledged"]},
        }
    )
    if not doc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No active briefing — assemble first",
        )

    now = _now()
    await db.copilot_briefings.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "coordinator_notes": body.coordinator_notes,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )
    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="copilot_briefing.patch_notes",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "copilot_briefings", "id": str(doc["_id"])},
        ],
        context_snapshot={
            "has_notes": body.coordinator_notes is not None,
            "length": len(body.coordinator_notes or ""),
        },
    )

    refreshed = await db.copilot_briefings.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


@router.post("/acknowledge")
async def acknowledge_briefing(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    """
    The assigned tech confirms they read the briefing. Required for
    advance dispatched -> en_route.
    """
    db = get_db()
    wo = await _load_wo(db, wo_id, user)

    if wo.get("assigned_tech_user_id") != user.user_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the assigned tech can acknowledge"
        )

    doc = await db.copilot_briefings.find_one({
        "work_order_id": wo_id,
        "tenant_id": user.tenant_id,
        "status": "assembled",
    })
    if not doc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No assembled briefing to acknowledge — ask SRS to assemble first",
        )

    now = _now()
    await db.copilot_briefings.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "acknowledged",
                "acknowledged_at": now,
                "acknowledged_by": user.user_id,
                "updated_at": now,
                "updated_by": user.user_id,
            }
        },
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="copilot_briefing.acknowledge",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "copilot_briefings", "id": str(doc["_id"])},
        ],
        context_snapshot={},
    )

    refreshed = await db.copilot_briefings.find_one({"_id": doc["_id"]})
    return _serialize(refreshed)


# ---------------- Helper used by work_orders.advance guard ----------------

async def briefing_acknowledged_by(db, wo: dict, user_id: str) -> bool:
    """True iff there is an acknowledged briefing for this WO, signed by `user_id`."""
    doc = await db.copilot_briefings.find_one({
        "work_order_id": str(wo["_id"]),
        "tenant_id": wo["tenant_id"],
        "status": "acknowledged",
        "acknowledged_by": user_id,
    })
    return doc is not None
