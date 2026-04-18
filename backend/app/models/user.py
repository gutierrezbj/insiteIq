"""
InsiteIQ v1 Foundation — User with space_memberships
A user can belong to multiple spaces (Juan = srs_coordinators, Arlindo = tech_field).
employment_type differentiates SRS staff from external subcontractors.
email_provisioned_by_srs tracks when client contract requires SRS-domain email for externals.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.base import BaseMongoModel

Space = Literal["srs_coordinators", "client_coordinator", "tech_field"]
EmploymentType = Literal["plantilla", "external_sub"]
AuthorityLevel = Literal[
    "reports_only",      # read-only observer (e.g. Sajid in SRS space)
    "contractor",        # external executor, no management authority (tech_field external_sub)
    "approval_on_site",  # onsite client approver (LCON)
    "mid_manager",       # typical coordinator / SRS plantilla tech senior
    "director",          # senior client authority (Arturo Pellerano)
    "owner",             # top-level (Juan, Sajid read/write overrides)
]


class SpaceMembership(BaseModel):
    model_config = ConfigDict(extra="ignore")

    space: Space
    role: str  # free-text role label ("account_lead", "finance", "tech_senior", ...)
    authority_level: AuthorityLevel = "mid_manager"
    organization_id: str | None = None  # for client_coordinator / tech_field externals
    active: bool = True


class User(BaseMongoModel):
    email: EmailStr
    full_name: str
    phone: str | None = None
    country: str | None = None
    hashed_password: str | None = None  # None if SSO-only future
    is_active: bool = True

    employment_type: EmploymentType = "plantilla"
    email_provisioned_by_srs: bool = False  # true when client contract required it

    space_memberships: list[SpaceMembership] = Field(default_factory=list)

    # Password rotation (first-login flow). Seed sets this to True so the
    # default password "InsiteIQ2026!" is replaced by the user on first access.
    must_change_password: bool = False
    password_changed_at: datetime | None = None

    last_login_at: str | None = None
    notes: str | None = None

    def is_member_of(self, space: Space) -> bool:
        return any(m.space == space and m.active for m in self.space_memberships)
