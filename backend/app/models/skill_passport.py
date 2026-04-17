"""
InsiteIQ v1 Modo 1 — SkillPassport + TechRating (Decision #4, Blueprint Fase 1)

CV vivo del tech que SOBREVIVE la rotacion. Aplica a TODO tech:
plantilla (Agustin) + external_sub (Arlindo). El perfil persiste aunque
el sub rote entre proveedores. Embrion del marketplace SRS futuro.

Levels (ascending):
  bronze    (entry) — cualquiera al crearse su passport
  silver    jobs_completed >= 10  AND rating_avg >= 4.0
  gold      jobs_completed >= 50  AND rating_avg >= 4.5
  platinum  jobs_completed >= 150 AND rating_avg >= 4.7

Level recomputa on rating add / on job close. No hay degradacion mid-flight
(un tech Gold no vuelve a Silver por una mala racha — pero ratings frescos
siempre pesan en promedio).

Ratings viven en coleccion separada tech_ratings:
  1 rating por (work_order_id, rated_user_id) — unique.
  rated_by puede ser srs_coordinator o client_coordinator. Score 1-5 +
  dimensiones (quality, punctuality, communication, professionalism).
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

PassportLevel = Literal["bronze", "silver", "gold", "platinum"]
SkillTier = Literal["basic", "intermediate", "advanced"]


# ---------------- Level thresholds ----------------

LEVEL_THRESHOLDS: list[tuple[PassportLevel, int, float]] = [
    # level, min_jobs, min_rating (ascending — last matching wins)
    ("bronze",    0,   0.0),
    ("silver",    10,  4.0),
    ("gold",      50,  4.5),
    ("platinum",  150, 4.7),
]


def compute_level(jobs_completed: int, rating_avg: float) -> PassportLevel:
    highest: PassportLevel = "bronze"
    for level, min_j, min_r in LEVEL_THRESHOLDS:
        if jobs_completed >= min_j and rating_avg >= min_r:
            highest = level
    return highest


# ---------------- Sub-models ----------------

class Certification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    issuer: str | None = None
    issued_at: datetime | None = None
    expires_at: datetime | None = None
    credential_id: str | None = None
    verified_by_user_id: str | None = None


class Skill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    tier: SkillTier = "basic"
    endorsed_count: int = 0


class QualityMark(BaseModel):
    model_config = ConfigDict(extra="ignore")
    key: str  # "on_time_percentage" | "first_time_fix_pct" | ...
    value: float
    unit: str | None = None  # "%" | "h" | ...
    computed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------- Main entities ----------------

class SkillPassport(BaseMongoModel):
    user_id: str = Field(..., description="1 passport per user (unique)")
    employment_type: str = "plantilla"  # denormalized snapshot

    level: PassportLevel = "bronze"
    jobs_completed: int = 0
    rating_avg: float = 0.0
    rating_count: int = 0

    certifications: list[Certification] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)       # ISO codes
    countries_covered: list[str] = Field(default_factory=list)  # ISO-3166 alpha-2
    quality_marks: list[QualityMark] = Field(default_factory=list)

    bio: str | None = None
    last_active_at: datetime | None = None


class TechRating(BaseMongoModel):
    work_order_id: str
    rated_user_id: str   # tech being rated
    rated_by_user_id: str
    rated_by_role: Literal["srs_coordinator", "client_coordinator"] = "srs_coordinator"

    score: float = Field(..., ge=1, le=5, description="Overall score 1-5")
    dimensions: dict = Field(default_factory=dict)
    # dimensions shape (all optional, floats 1-5):
    #   quality, punctuality, communication, professionalism, cleanliness

    notes: str | None = None
