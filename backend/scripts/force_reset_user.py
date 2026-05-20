"""
InsiteIQ — force_reset_user.py (2026-05-20)

Resetea la pwd de cualquier user (por email) a la seed 'InsiteIQ2026!'
y fuerza must_change_password=True para rotación al primer login.

Generalización de force_reset_juan.py · ahora sirve para Iduber, Andres,
o cualquier user futuro sin hardcodear emails.

Uso (desde VPS):
  ssh root@72.62.41.234 'cd /opt/apps/insiteiq && \\
    docker compose exec -T -e RESET_EMAIL=iduberm@systemrapid.com api python -m scripts.force_reset_user'

Idempotente · puede ejecutarse N veces sin efectos secundarios.
"""
import asyncio
import os
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db
from app.core.security import hash_password


SEED_PWD = "InsiteIQ2026!"


async def main():
    email = os.environ.get("RESET_EMAIL", "").strip().lower()
    if not email:
        print()
        print("⚠ RESET_EMAIL env var no seteado · abortando")
        print("  Uso: docker compose exec -T -e RESET_EMAIL=user@x.com api python -m scripts.force_reset_user")
        print()
        return

    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print()
    print("=" * 64)
    print(f"InsiteIQ — Force reset pwd · {email}")
    print("=" * 64)
    now = datetime.now(timezone.utc)
    print(f"Timestamp: {now.isoformat()}")

    user = await db.users.find_one({"email": email})
    if not user:
        print(f"⚠ User NO encontrado para email='{email}'")
        # Help: lista los emails existentes
        print("  Emails registrados en PROD:")
        async for u in db.users.find({}, {"email": 1, "full_name": 1}):
            print(f"   · {u.get('email')} · {u.get('full_name', '')}")
        return

    print(f"User encontrado: {user['email']} · id={user['_id']}")
    print(f"  full_name: {user.get('full_name')}")
    print(f"  must_change_password (antes): {user.get('must_change_password')}")

    result = await db.users.update_one(
        {"_id": user["_id"]},
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
        print(f"   email:    {user['email']}")
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
