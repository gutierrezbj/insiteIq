from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SiteContact(BaseModel):
    name: str = ""
    phone: str = ""
    email: str = ""
    available_hours: str = ""


class SitePhoto(BaseModel):
    url: str
    type: str = Field(default="other", pattern="^(facade|rack_room|equipment|access|other)$")
    description: str = ""
    uploaded_at: datetime = None
    uploaded_by: str = ""


class SiteEquipment(BaseModel):
    type: str = ""
    brand: str = ""
    model: str = ""
    serial: str = ""
    location_in_site: str = ""
    notes: str = ""


class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: list[float] = Field(default_factory=lambda: [0.0, 0.0])


class SiteBase(BaseModel):
    name: str
    client: str
    address: str
    country: str = ""
    city: str = ""
    region: str = ""
    access_instructions: str = ""
    contact: SiteContact = Field(default_factory=SiteContact)
    tags: list[str] = Field(default_factory=list)


class SiteCreate(SiteBase):
    location: GeoPoint = Field(default_factory=GeoPoint)
    equipment: list[SiteEquipment] = Field(default_factory=list)
    quirks: list[str] = Field(default_factory=list)


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    client: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    access_instructions: Optional[str] = None
    contact: Optional[SiteContact] = None
    tags: Optional[list[str]] = None
    location: Optional[GeoPoint] = None
    equipment: Optional[list[SiteEquipment]] = None
    quirks: Optional[list[str]] = None


class SiteInDB(SiteBase):
    id: str
    location: GeoPoint
    photos: list[SitePhoto] = Field(default_factory=list)
    equipment: list[SiteEquipment] = Field(default_factory=list)
    quirks: list[str] = Field(default_factory=list)
    intervention_count: int = 0
    last_intervention_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SiteResponse(BaseModel):
    data: SiteInDB
    message: str = ""


class SiteListResponse(BaseModel):
    data: list[SiteInDB]
    total: int
    page: int = 1
    per_page: int = 20
