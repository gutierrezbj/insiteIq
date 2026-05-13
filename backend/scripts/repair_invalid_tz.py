"""
InsiteIQ — repair_invalid_tz.py (Iter 2.63f · 2026-05-10)

Repara users con tz IANA inválido en mongo (ej. 'America/Miami' que no
existe · IANA correcto es 'America/New_York'). Intenta resolver con
ZoneInfo · si falla, restaura al valor canónico del migration script
si el user está en CANONICAL_PROFILES, o setea null si no.

Síntoma del bug que causa: TechsListPage crashea con pantallazo negro
porque Intl.DateTimeFormat({ timeZone: 'America/Miami' }) tira RangeError
en el render del map · y crashea toda la pestaña.

Frontend Iter 2.63f también agrega try/catch defensivo en getTechTimeInfo
para que aunque vuelva a entrar un tz malo, la UI degrade silenciosamente.

Uso:
    docker compose exec api python -m scripts.repair_invalid_tz
"""
import asyncio
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.database import close_db, connect_db, get_db


# Reusable del migration script principal · valores canónicos correctos
CANONICAL_TZ_BY_EMAIL: dict[str, str] = {
    "juang@systemrapid.io":      "Europe/Madrid",
    "sajid@systemrapid.com":     "Europe/London",
    "adrianab@systemrapid.com":  "Europe/Madrid",
    "androsb@systemrapid.com":   "America/Montevideo",
    "luiss@systemrapid.com":     "America/Lima",
    "agustinc@systemrapid.com":  "America/New_York",
    "hugoq@systemrapid.com":     "Europe/Madrid",
    "yunush@systemrapid.com":    "Europe/London",
    "arlindoo@systemrapid.com":  "America/New_York",
}


def is_valid_tz(tz: str | None) -> bool:
    if not tz:
        return True  # null/empty es válido (campo opcional)
    try:
        ZoneInfo(tz)
        return True
    except (ZoneInfoNotFoundError, Exception):
        return False


async def repair() -> None:
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print("\n" + "=" * 64)
    print("InsiteIQ — Repair · users con tz IANA inválido en mongo")
    print("=" * 64)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    cursor = db.users.find({"tz": {"$ne": None, "$exists": True}})
    all_users = await cursor.to_list(length=500)

    if not all_users:
        print("⚠ No hay users con tz en mongo · nada que reparar")
        return

    print(f"Users con tz: {len(all_users)}")
    print()

    repaired = 0
    cleared = 0
    skipped_valid = 0

    for user in all_users:
        email = (user.get("email") or "").lower()
        current_tz = user.get("tz")

        if is_valid_tz(current_tz):
            skipped_valid += 1
            print(f"  ✓ valid · {email} · tz={current_tz}")
            continue

        # tz inválido · 2 estrategias
        canonical = CANONICAL_TZ_BY_EMAIL.get(email)
        if canonical:
            new_tz = canonical
            new_label_hint = "(canonical)"
            repaired += 1
        else:
            new_tz = None
            new_label_hint = "(cleared · user no canónico)"
            cleared += 1

        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "tz": new_tz,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        print(
            f"  ↻ repair · {email} · '{current_tz}' (inválido) → "
            f"'{new_tz or 'null'}' {new_label_hint}"
        )

    print()
    print("=" * 64)
    print(f"Resultado:")
    print(f"  ✓ Valid skipped:   {skipped_valid} users")
    print(f"  ↻ Repaired:        {repaired} users (canonical)")
    print(f"  ↻ Cleared (null):  {cleared} users (sin canonical)")
    print("=" * 64)
    print()
    print("✅ Repair done · idempotente · safe para re-correr")


async def main():
    try:
        await repair()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
