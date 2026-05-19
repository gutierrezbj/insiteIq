"""
InsiteIQ — force_reset_juan.py (2026-05-19)

Resetea la pwd de juang@systemrapid.io (owner) a la seed 'InsiteIQ2026!'
y fuerza must_change_password=True para que la rote en el primer login.

Uso (desde VPS):
  docker compose exec -T api python -m scripts.force_reset_juan

Idempotente · puede ejecutarse N veces.
"""
import asyncio
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db
from app.core.security import hash_password


JUAN_EMAILS = ["juang@systemrapid.io", "juang@systemrapid.com"]
SEED_PWD = "InsiteIQ2026!"


async def main():
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print()
    print("=" * 64)
    print("InsiteIQ — Force reset pwd · owner Juan")
    print("=" * 64)
    now = datetime.now(timezone.utc)
    print(f"Timestamp: {now.isoformat()}")

    # Buscar Juan por cualquiera de los emails posibles
    juan = None
    for email in JUAN_EMAILS:
        juan = await db.users.find_one({"email": email})
        if juan:
            break

    if not juan:
        print(f"⚠ Juan NO encontrado bajo ninguno de {JUAN_EMAILS}")
        return

    print(f"User encontrado: {juan['email']} · id={juan['_id']}")
    print(f"  full_name: {juan.get('full_name')}")
    print(f"  must_change_password (antes): {juan.get('must_change_password')}")

    result = await db.users.update_one(
        {"_id": juan["_id"]},
        {"$set": {
            "hashed_password": hash_password(SEED_PWD),
            "must_change_password": True,
            "password_changed_at": None,
            "updated_at": now,
        }},
    )

    print()
    if result.modified_count > 0:
        print("✅ Reset OK")
        print(f"   email:    {juan['email']}")
        print(f"   pwd seed: {SEED_PWD}")
        print(f"   must rotate al primer login (forzado)")
        print()
        print(f"Login: https://insiteiq.systemrapid.io/login")
    else:
        print("⚠ Nada se modificó (ya estaba igual)")


async def runner():
    try:
        await main()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(runner())
