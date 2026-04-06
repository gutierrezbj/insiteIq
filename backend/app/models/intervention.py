from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.site import GeoPoint


class SLA(BaseModel):
    response_minutes: int = 240
    resolution_minutes: int = 480
    started_at: Optional[str] = None
    deadline_at: Optional[datetime] = None
    breached: bool = False


class TimelineEvent(BaseModel):
    event: str = ""
    status: str = ""
    timestamp: datetime
    actor: str = ""
    location: Optional[GeoPoint] = None
    note: str = ""


class ProofPhoto(BaseModel):
    url: str
    description: str = ""
    timestamp: Optional[datetime] = None
    location: Optional[GeoPoint] = None


class ProofOfWork(BaseModel):
    arrival_photo: Optional[ProofPhoto] = None
    work_photos: list[ProofPhoto] = Field(default_factory=list)
    completion_photo: Optional[ProofPhoto] = None
    client_signature: Optional[str] = None
    technician_notes: str = ""


class Resolution(BaseModel):
    problem_found: str = ""
    solution_applied: str = ""
    category: str = Field(default="other", pattern="^(network|hardware|software|cabling|power|other)$")
    parts_used: list[dict] = Field(default_factory=list)
    duration_minutes: int = 0
    first_time_fix: bool = False


class InterventionRating(BaseModel):
    score: int = Field(ge=1, le=5)
    comment: str = ""
    rated_by: str = ""
    rated_at: Optional[datetime] = None


class PreFlight(BaseModel):
    tools_confirmed: bool = False
    parts_confirmed: bool = False
    site_bible_read: bool = False
    confirmed_at: Optional[datetime] = None


class InterventionBase(BaseModel):
    site_id: str
    type: str = Field(default="reactive", pattern="^(reactive|preventive|install|audit)$")
    priority: str = Field(default="normal", pattern="^(low|normal|high|emergency)$")
    description: str = ""
    scheduled_at: Optional[datetime] = None


class InterventionCreate(InterventionBase):
    technician_id: Optional[str] = None
    sla: SLA = Field(default_factory=SLA)


class InterventionUpdate(BaseModel):
    status: Optional[str] = Field(
        default=None,
        pattern="^(created|assigned|accepted|en_route|on_site|in_progress|completed|cancelled|failed)$",
    )
    technician_id: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = Field(default=None, pattern="^(low|normal|high|emergency)$")
    scheduled_at: Optional[datetime] = None


class InterventionInDB(InterventionBase):
    id: str
    reference: str
    technician_id: Optional[str] = None
    assigned_by: str = ""
    site_name: str = ""
    technician_name: str = ""
    client: str = ""
    status: str = "created"
    sla: SLA = Field(default_factory=SLA)
    pre_flight: Optional[PreFlight] = None
    timeline: list[TimelineEvent] = Field(default_factory=list)
    proof_of_work: Optional[ProofOfWork] = None
    resolution: Optional[Resolution] = None
    rating: Optional[InterventionRating] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"extra": "ignore"}


class InterventionResponse(BaseModel):
    data: InterventionInDB
    message: str = ""


class InterventionListResponse(BaseModel):
    data: list[InterventionInDB]
    total: int
    page: int = 1
    per_page: int = 20
