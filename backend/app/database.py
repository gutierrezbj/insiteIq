"""
InsiteIQ v1 Foundation — MongoDB connection + index bootstrap
Clean, aligned to Blueprint v1.1 Foundation entities only.
Business-domain indexes come with their respective phases.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB]
    await _ensure_indexes()


async def _ensure_indexes() -> None:
    assert db is not None

    # --- Identity & Tenancy ---
    await db.tenants.create_index("code", unique=True)

    await db.srs_entities.create_index("code", unique=True)

    await db.organizations.create_index([("tenant_id", 1), ("legal_name", 1)])
    await db.organizations.create_index([("tenant_id", 1), ("partner_relationships.type", 1)])
    await db.organizations.create_index([("country", 1)])

    await db.users.create_index("email", unique=True)
    await db.users.create_index([("tenant_id", 1), ("is_active", 1)])
    await db.users.create_index([("space_memberships.space", 1)])

    # --- Domain 11 Asset ---
    await db.assets.create_index(
        [("organization_id", 1), ("serial_number", 1)], unique=True
    )
    await db.assets.create_index([("tenant_id", 1), ("status", 1)])
    await db.assets.create_index([("tenant_id", 1), ("lifecycle_stage", 1)])
    await db.assets.create_index([("current_site_id", 1)])

    await db.asset_events.create_index([("asset_id", 1), ("ts", -1)])
    await db.asset_events.create_index([("tenant_id", 1), ("event_type", 1)])
    await db.asset_events.create_index([("tenant_id", 1), ("visibility", 1)])

    # --- audit_log (append-only) ---
    # Compound index supports the dominant forensic query: tenant + time-range + actor/action.
    await db.audit_log.create_index([("tenant_id", 1), ("ts", -1)])
    await db.audit_log.create_index([("tenant_id", 1), ("actor_user_id", 1), ("ts", -1)])
    await db.audit_log.create_index([("tenant_id", 1), ("action", 1), ("ts", -1)])
    await db.audit_log.create_index([("tenant_id", 1), ("source", 1), ("ts", -1)])


async def close_db() -> None:
    global client
    if client is not None:
        client.close()


def get_db() -> AsyncIOMotorDatabase | None:
    return db
