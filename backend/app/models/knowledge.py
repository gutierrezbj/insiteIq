from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class KBBase(BaseModel):
    problem: str
    solution: str
    category: str = Field(default="other", pattern="^(network|networking|hardware|software|cabling|power|access|security|other)$")
    tags: list[str] = Field(default_factory=list)


class KBCreate(KBBase):
    site_id: str
    intervention_id: Optional[str] = None


class KBInDB(KBBase):
    id: str
    site_id: str
    site_name: str = ""
    intervention_id: Optional[str] = None
    helpful_count: int = 0
    created_by: str = ""
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"extra": "ignore"}


class KBResponse(BaseModel):
    data: KBInDB
    message: str = ""


class KBListResponse(BaseModel):
    data: list[KBInDB]
    total: int
