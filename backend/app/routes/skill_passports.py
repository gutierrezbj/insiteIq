"""
InsiteIQ v1 Modo 1 — Skill Passport + Tech Rating routes (Decision #4)

Endpoints:
  GET    /api/techs/me/passport               — own passport (auto-created if missing)
  GET    /api/techs/{user_id}/passport        — any tech (SRS only)
  PATCH  /api/techs/{user_id}/passport        — SRS updates certs/skills/bio
  POST   /api/work-orders/{wo_id}/rate-tech   — add rating + recompute passport
  GET    /api/work-orders/{wo_id}/ratings     — ratings for this WO (SRS + tech self)

Recompute:
  On rating add -> recompute jobs_completed + rating_avg + level.
  jobs_completed = count(work_orders where assigned_tech_user_id=user_id
                         AND status IN ('resolved','closed')).
  rating_avg    = avg(tech_ratings.score) over all ratings for this tech.
  level         = compute_level(jobs_completed, rating_avg).
"""
from datetime import datetime, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.audit_log import write_audit_event
from app.models.skill_passport import (
    Certification,
    QualityMark,
    Skill,
    compute_level,
)

router = APIRouter(tags=["skill_passports"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------------- Helpers ----------------

async def _get_or_create_passport(db, tenant_id: str, user: dict) -> dict:
    user_id = str(user["_id"])
    existing = await db.skill_passports.find_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )
    if existing:
        return existing

    now = _now()
    doc = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "employment_type": user.get("employment_type", "plantilla"),
        "level": "bronze",
        "jobs_completed": 0,
        "rating_avg": 0.0,
        "rating_count": 0,
        "certifications": [],
        "skills": [],
        "languages": [],
        "countries_covered": [],
        "quality_marks": [],
        "bio": None,
        "last_active_at": None,
        "created_at": now,
        "updated_at": now,
        "created_by": None,
        "updated_by": None,
    }
    result = await db.skill_passports.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def _recompute_passport(db, tenant_id: str, user_id: str) -> dict | None:
    """Recompute jobs_completed + rating_avg + level. Returns the refreshed doc."""
    jobs_completed = await db.work_orders.count_documents({
        "tenant_id": tenant_id,
        "assigned_tech_user_id": user_id,
        "status": {"$in": ["resolved", "closed"]},
    })

    ratings = await db.tech_ratings.find(
        {"tenant_id": tenant_id, "rated_user_id": user_id}
    ).to_list(None)
    rating_count = len(ratings)
    rating_avg = (
        round(sum(float(r.get("score", 0)) for r in ratings) / rating_count, 2)
        if rating_count
        else 0.0
    )

    level = compute_level(jobs_completed, rating_avg)

    await db.skill_passports.update_one(
        {"tenant_id": tenant_id, "user_id": user_id},
        {
            "$set": {
                "jobs_completed": jobs_completed,
                "rating_avg": rating_avg,
                "rating_count": rating_count,
                "level": level,
                "last_active_at": _now(),
                "updated_at": _now(),
            }
        },
        upsert=False,  # passport must exist
    )
    return await db.skill_passports.find_one(
        {"tenant_id": tenant_id, "user_id": user_id}
    )


# ---------------- Endpoints ----------------

@router.get("/techs/me/passport")
async def get_my_passport(user: CurrentUser = Depends(get_current_user)):
    if not user.has_space("tech_field") and not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only techs/SRS have passports")

    db = get_db()
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user.user_id)})
    except Exception:
        user_doc = None
    if not user_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    passport = await _get_or_create_passport(db, user.tenant_id, user_doc)
    return _serialize(passport)


@router.get("/techs/{user_id}/passport")
async def get_passport(user_id: str, user: CurrentUser = Depends(get_current_user)):
    if not user.has_space("srs_coordinators"):
        # Techs can only GET their own via /me
        if user.user_id != user_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Only SRS coord can view other techs' passports",
            )
    db = get_db()
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user_doc = None
    if not user_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    passport = await _get_or_create_passport(db, user.tenant_id, user_doc)
    return _serialize(passport)


class PassportPatchBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    certifications: list[Certification] | None = None
    skills: list[Skill] | None = None
    languages: list[str] | None = None
    countries_covered: list[str] | None = None
    quality_marks: list[QualityMark] | None = None
    bio: str | None = None


@router.patch("/techs/{user_id}/passport")
async def patch_passport(
    user_id: str,
    body: PassportPatchBody,
    user: CurrentUser = Depends(get_current_user),
):
    if not user.has_space("srs_coordinators"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only SRS coord can patch")
    db = get_db()

    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user_doc = None
    if not user_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    await _get_or_create_passport(db, user.tenant_id, user_doc)

    set_fields: dict[str, Any] = {"updated_at": _now(), "updated_by": user.user_id}
    if body.certifications is not None:
        set_fields["certifications"] = [c.model_dump() for c in body.certifications]
    if body.skills is not None:
        set_fields["skills"] = [s.model_dump() for s in body.skills]
    if body.languages is not None:
        set_fields["languages"] = body.languages
    if body.countries_covered is not None:
        set_fields["countries_covered"] = body.countries_covered
    if body.quality_marks is not None:
        set_fields["quality_marks"] = [q.model_dump() for q in body.quality_marks]
    if body.bio is not None:
        set_fields["bio"] = body.bio

    await db.skill_passports.update_one(
        {"tenant_id": user.tenant_id, "user_id": user_id},
        {"$set": set_fields},
    )

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="skill_passport.patch",
        entity_refs=[{"collection": "skill_passports", "id": user_id, "label": user_doc.get("full_name")}],
        context_snapshot={"fields": list(set_fields.keys())},
    )

    refreshed = await db.skill_passports.find_one(
        {"tenant_id": user.tenant_id, "user_id": user_id}
    )
    return _serialize(refreshed)


class RateTechBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    score: float = Field(..., ge=1, le=5)
    dimensions: dict = Field(default_factory=dict)
    notes: str | None = None
    rated_by_role: Literal["srs_coordinator", "client_coordinator"] = "srs_coordinator"


@router.post("/work-orders/{wo_id}/rate-tech", status_code=status.HTTP_201_CREATED)
async def rate_tech(
    wo_id: str,
    body: RateTechBody,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Rate the tech assigned to this work_order. WO must be resolved or closed.
    Unique (work_order_id, rated_user_id) — one rating per tech per WO.
    Triggers passport recompute.
    """
    db = get_db()
    try:
        oid = ObjectId(wo_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid work_order id")

    wo = await db.work_orders.find_one({"_id": oid, "tenant_id": user.tenant_id})
    if not wo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Work order not found")

    # Scope: SRS full; client_coord only for their org
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if not m or m.get("organization_id") != wo.get("organization_id"):
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your WO")
        else:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized")

    tech_id = wo.get("assigned_tech_user_id")
    if not tech_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "WO has no assigned tech")
    if wo.get("status") not in ("resolved", "closed"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Can only rate after work_order is resolved or closed",
        )

    now = _now()
    doc = {
        "tenant_id": user.tenant_id,
        "work_order_id": wo_id,
        "rated_user_id": tech_id,
        "rated_by_user_id": user.user_id,
        "rated_by_role": body.rated_by_role,
        "score": float(body.score),
        "dimensions": body.dimensions,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": user.user_id,
        "updated_by": user.user_id,
    }
    try:
        result = await db.tech_ratings.insert_one(doc)
    except Exception as e:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Rating already exists for this WO/tech: {e}",
        )
    doc["_id"] = result.inserted_id

    # Ensure passport exists then recompute
    tech_user = await db.users.find_one({"_id": ObjectId(tech_id)})
    if tech_user:
        await _get_or_create_passport(db, user.tenant_id, tech_user)
    refreshed_passport = await _recompute_passport(db, user.tenant_id, tech_id)

    await write_audit_event(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=user.user_id,
        action="tech_rating.add",
        entity_refs=[
            {"collection": "work_orders", "id": wo_id, "label": wo.get("reference")},
            {"collection": "tech_ratings", "id": str(result.inserted_id)},
            {"collection": "skill_passports", "id": tech_id},
        ],
        context_snapshot={
            "score": body.score,
            "rated_by_role": body.rated_by_role,
            "new_level": refreshed_passport.get("level") if refreshed_passport else None,
        },
    )

    return {
        "rating": _serialize(doc),
        "passport": _serialize(refreshed_passport) if refreshed_passport else None,
    }


@router.get("/work-orders/{wo_id}/ratings")
async def list_ratings(wo_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    # Scope enforcement via WO lookup
    try:
        oid = ObjectId(wo_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")
    q: dict[str, Any] = {"_id": oid, "tenant_id": user.tenant_id}
    if not user.has_space("srs_coordinators"):
        if user.has_space("client_coordinator"):
            m = user.membership_in("client_coordinator")
            if not m or not m.get("organization_id"):
                raise HTTPException(status.HTTP_404_NOT_FOUND, "WO not found")
            q["organization_id"] = m["organization_id"]
        elif user.has_space("tech_field"):
            q["assigned_tech_user_id"] = user.user_id
    wo = await db.work_orders.find_one(q)
    if not wo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "WO not found")

    ratings = await db.tech_ratings.find(
        {"work_order_id": wo_id, "tenant_id": user.tenant_id}
    ).to_list(50)
    return [_serialize(r) for r in ratings]
