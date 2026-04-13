"""
Seed client portal users.
Run: docker exec insiteiq-api python -m scripts.seed_client_users
"""
import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGO_URI = "mongodb://mongo:27017"
DB_NAME = "insiteiq"

CLIENT_USERS = [
    {
        "email": "ops@telefonica.com",
        "name": "Telefonica Operations",
        "role": "client",
        "organization": "Telefonica",
        "password": "client123",
    },
]


async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc)

    for u in CLIENT_USERS:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            # Update existing to add organization + role
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"role": u["role"], "organization": u["organization"]}},
            )
            print(f"  Updated: {u['email']} -> role={u['role']}, org={u['organization']}")
        else:
            doc = {
                "email": u["email"],
                "name": u["name"],
                "role": u["role"],
                "organization": u["organization"],
                "hashed_password": pwd.hash(u["password"]),
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            await db.users.insert_one(doc)
            print(f"  Created: {u['email']} (org: {u['organization']})")

    print("\nClient users seeded.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
