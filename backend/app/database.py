from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB]

    # Indexes
    await db.users.create_index("email", unique=True)
    await db.technicians.create_index([("location", "2dsphere")])
    await db.technicians.create_index("skills")
    await db.technicians.create_index("availability")
    await db.sites.create_index([("location", "2dsphere")])
    await db.sites.create_index("client")
    await db.sites.create_index([("name", "text"), ("client", "text")])
    await db.interventions.create_index("site_id")
    await db.interventions.create_index("technician_id")
    await db.interventions.create_index("status")
    await db.interventions.create_index("reference", unique=True)
    await db.knowledge_base.create_index("site_id")
    await db.knowledge_base.create_index([("problem", "text"), ("solution", "text")])


async def close_db():
    global client
    if client:
        client.close()


def get_db() -> AsyncIOMotorDatabase:
    return db
