"""
Seed SRS team members — real team distribution for OPS map overlay.
"""

import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:6110"
DB_NAME = "insiteiq"

TEAM_MEMBERS = [
    {
        "name": "Juan Gutierrez",
        "role": "lead",
        "email": "juang@systemrapid.com",
        "country": "France",
        "city": "Paris",
        "timezone": "Europe/Paris",
        "utc_offset": 2,
        "shift_start": 8,
        "shift_end": 22,
        "location": {"type": "Point", "coordinates": [2.3522, 48.8566]},
        "covers_regions": ["Global"],
        "current_status": "available",
        "is_active": True,
    },
    {
        "name": "Sajid Hafesjee",
        "role": "owner",
        "email": "sajid@systemrapid.com",
        "country": "Saudi Arabia",
        "city": "Jeddah",
        "timezone": "Asia/Riyadh",
        "utc_offset": 3,
        "shift_start": 7,
        "shift_end": 23,
        "location": {"type": "Point", "coordinates": [39.1925, 21.4858]},
        "covers_regions": ["Global"],
        "current_status": "available",
        "is_active": True,
    },
    {
        "name": "Andros Briceno",
        "role": "coordinator",
        "email": "androsb@systemrapid.com",
        "country": "Uruguay",
        "city": "Montevideo",
        "timezone": "America/Montevideo",
        "utc_offset": -3,
        "shift_start": 7,
        "shift_end": 19,
        "location": {"type": "Point", "coordinates": [-56.1645, -34.9011]},
        "covers_regions": ["LATAM", "Europe"],
        "current_status": "available",
        "is_active": True,
    },
    {
        "name": "Luis Sanchez",
        "role": "coordinator",
        "email": "luis@systemrapid.com",
        "country": "Peru",
        "city": "Lima",
        "timezone": "America/Lima",
        "utc_offset": -5,
        "shift_start": 7,
        "shift_end": 18,
        "location": {"type": "Point", "coordinates": [-77.0428, -12.0464]},
        "covers_regions": ["Spain", "Telefonica"],
        "current_status": "available",
        "is_active": True,
    },
    {
        "name": "Agustin Rivera",
        "role": "pm",
        "email": "agustin@systemrapid.com",
        "country": "Panama",
        "city": "Panama City",
        "timezone": "America/Panama",
        "utc_offset": -5,
        "shift_start": 6,
        "shift_end": 20,
        "location": {"type": "Point", "coordinates": [-79.5167, 8.9824]},
        "covers_regions": ["Central America", "Arcos Dorados"],
        "current_status": "on_mission",
        "is_active": True,
    },
    {
        "name": "Arlindo Ochoa",
        "role": "field_engineer",
        "email": "arlindoo@systemrapid.com",
        "country": "United States",
        "city": "Orlando, FL",
        "timezone": "America/New_York",
        "utc_offset": -4,
        "shift_start": 7,
        "shift_end": 19,
        "location": {"type": "Point", "coordinates": [-81.3792, 28.5383]},
        "covers_regions": ["US East", "US Southeast"],
        "current_status": "available",
        "is_active": True,
    },
    {
        "name": "Carlos Marin",
        "role": "field_engineer",
        "email": "carlosm@systemrapid.com",
        "country": "United States",
        "city": "Miami, FL",
        "timezone": "America/New_York",
        "utc_offset": -4,
        "shift_start": 7,
        "shift_end": 18,
        "location": {"type": "Point", "coordinates": [-80.1918, 25.7617]},
        "covers_regions": ["US Southeast", "Claro US"],
        "current_status": "on_mission",
        "is_active": True,
    },
    {
        "name": "Yunus Hafesjee",
        "role": "pm",
        "email": "yunus@systemrapid.com",
        "country": "United Kingdom",
        "city": "London",
        "timezone": "Europe/London",
        "utc_offset": 1,
        "shift_start": 8,
        "shift_end": 18,
        "location": {"type": "Point", "coordinates": [-0.1276, 51.5074]},
        "covers_regions": ["Europe", "Middle East", "Global Projects"],
        "current_status": "available",
        "is_active": True,
    },
    {
        "name": "Adriana Garcia",
        "role": "coordinator",
        "email": "adriana@systemrapid.com",
        "country": "Colombia",
        "city": "Bogota",
        "timezone": "America/Bogota",
        "utc_offset": -5,
        "shift_start": 7,
        "shift_end": 17,
        "location": {"type": "Point", "coordinates": [-74.0721, 4.7110]},
        "covers_regions": ["LATAM", "Colombia"],
        "current_status": "available",
        "is_active": True,
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    for member in TEAM_MEMBERS:
        member["created_at"] = datetime.now(timezone.utc)
        member["updated_at"] = datetime.now(timezone.utc)

        existing = await db.team_members.find_one({"email": member["email"]})
        if existing:
            await db.team_members.update_one(
                {"email": member["email"]},
                {"$set": {k: v for k, v in member.items() if k != "created_at"}},
            )
            print(f"  Updated: {member['name']} ({member['city']}, {member['country']})")
        else:
            await db.team_members.insert_one(member)
            print(f"  Created: {member['name']} ({member['city']}, {member['country']})")

    # Create geospatial index
    await db.team_members.create_index([("location", "2dsphere")])
    await db.team_members.create_index("email", unique=True)

    count = await db.team_members.count_documents({})
    print(f"\nTotal team members: {count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
