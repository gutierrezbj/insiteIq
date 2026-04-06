from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.database import get_db
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token


async def authenticate_user(email: str, password: str) -> dict:
    db = get_db()
    user = await db.users.find_one({"email": email, "is_active": True})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}},
    )

    uid = str(user["_id"])
    return {
        "access_token": create_access_token(uid, user["role"]),
        "refresh_token": create_refresh_token(uid),
        "token_type": "bearer",
    }


async def create_user(data: dict) -> dict:
    db = get_db()
    existing = await db.users.find_one({"email": data["email"]})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    now = datetime.now(timezone.utc)
    doc = {
        "email": data["email"],
        "name": data["name"],
        "role": data["role"],
        "password_hash": hash_password(data["password"]),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "last_login": None,
    }
    result = await db.users.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def update_user(user_id: str, data: dict) -> dict:
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    result["id"] = str(result.pop("_id"))
    result.pop("password_hash", None)
    return result


async def list_users() -> list[dict]:
    db = get_db()
    users = []
    async for u in db.users.find({}, {"password_hash": 0}):
        u["id"] = str(u.pop("_id"))
        users.append(u)
    return users
