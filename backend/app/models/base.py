"""
InsiteIQ v1 Foundation — Base Pydantic model for MongoDB documents.
Every domain entity extends BaseMongoModel.

Conventions:
- `id` mapped to `_id` string (ObjectId-as-string to keep JSON serialization clean)
- `tenant_id` carried on every document (multi-tenant prep for Ghost Tech)
- timestamps tracked by app code (audit_log is the source of truth, these are hints)
- `model_config.extra = "ignore"` for forward compat with schema evolution
"""
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


class BaseMongoModel(BaseModel):
    """All persisted documents share this envelope."""

    model_config = ConfigDict(
        extra="ignore",
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    id: str | None = Field(default=None, alias="_id")
    tenant_id: str
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    created_by: str | None = None
    updated_by: str | None = None

    def to_mongo(self) -> dict[str, Any]:
        """Serialize for MongoDB insertion. `id` -> `_id` only if set."""
        d = self.model_dump(by_alias=False, exclude_none=False)
        if d.get("id") is None:
            d.pop("id", None)
        else:
            d["_id"] = d.pop("id")
        return d
