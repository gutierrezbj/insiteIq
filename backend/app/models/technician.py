from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.site import GeoPoint


class Certification(BaseModel):
    name: str
    issuer: str = ""
    expires_at: Optional[datetime] = None


class TechRatingCategories(BaseModel):
    punctuality: float = 0.0
    resolution: float = 0.0
    communication: float = 0.0
    documentation: float = 0.0


class TechRating(BaseModel):
    average: float = 0.0
    count: int = 0
    categories: TechRatingCategories = Field(default_factory=TechRatingCategories)


class TechStats(BaseModel):
    total_jobs: int = 0
    first_time_fix_rate: float = 0.0
    avg_resolution_minutes: int = 0


class TechBase(BaseModel):
    name: str
    email: str
    phone: str = ""
    country: str = ""
    city: str = ""
    skills: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)


class TechCreate(TechBase):
    location: GeoPoint = Field(default_factory=GeoPoint)
    certifications: list[Certification] = Field(default_factory=list)


class TechUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    skills: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    location: Optional[GeoPoint] = None
    certifications: Optional[list[Certification]] = None
    availability: Optional[str] = Field(default=None, pattern="^(available|busy|offline)$")


class TechInDB(TechBase):
    id: str
    location: GeoPoint
    certifications: list[Certification] = Field(default_factory=list)
    availability: str = "available"
    shield_level: str = "bronze"
    rating: TechRating = Field(default_factory=TechRating)
    stats: TechStats = Field(default_factory=TechStats)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class TechResponse(BaseModel):
    data: TechInDB
    message: str = ""


class TechListResponse(BaseModel):
    data: list[TechInDB]
    total: int
    page: int = 1
    per_page: int = 20
