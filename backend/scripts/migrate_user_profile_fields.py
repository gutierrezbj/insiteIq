"""
InsiteIQ — migrate_user_profile_fields.py (Iter 2.63c · 2026-05-10)

Pobla los fields nuevos del User model (tz, tz_label, role_title,
display_name, work_start, work_end) en los users existentes del tenant
SRS · idempotente · NO toca data operacional.

Estos campos se introdujeron en Iter 2.63c moviendo el TECH_REGISTRY
del frontend (lib/tz.js hardcoded) al backend (users collection). Los
users creados antes de esa migration tienen estos fields = null. Este
script los puebla con los valores correctos para los 9 SRS plantilla +
external_sub del equipo.

Idempotente: solo actualiza si el field está en null o ausente. Si tú
o el equipo ya pobló algo via Admin edit UI, NO lo sobrescribe.

Uso:
    docker compose exec api python -m scripts.migrate_user_profile_fields

Output muestra qué se actualizó / qué quedó intacto / qué users no
estaban en el directorio canónico (probablemente clients · se ignoran).
"""
import asyncio
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db


# Source of truth · matchea el TECH_REGISTRY que vivió en frontend/lib/tz.js
# Keys = email lowercase (más seguro que full_name para matching)
CANONICAL_PROFILES: dict[str, dict] = {
    "juang@systemrapid.io": {
        "tz": "Europe/Madrid", "tz_label": "Madrid",
        "role_title": "Founder & Lead", "display_name": "Juan G",
        "work_start": 8, "work_end": 20,
    },
    "sajid@systemrapid.com": {
        "tz": "Europe/London", "tz_label": "London",
        "role_title": "Co-owner (read-only)", "display_name": "Sajid",
        "work_start": 9, "work_end": 18,
    },
    "adrianab@systemrapid.com": {
        "tz": "Europe/Madrid", "tz_label": "Madrid",
        "role_title": "Accountant", "display_name": "Adriana B",
        "work_start": 8, "work_end": 18,
    },
    "androsb@systemrapid.com": {
        "tz": "America/Montevideo", "tz_label": "Montevideo",
        "role_title": "Project Manager", "display_name": "Andros B",
        "work_start": 8, "work_end": 18,
    },
    "luiss@systemrapid.com": {
        "tz": "America/Lima", "tz_label": "Lima",
        "role_title": "Field Consultant CET", "display_name": "Luis S",
        "work_start": 8, "work_end": 17,
    },
    "agustinc@systemrapid.com": {
        "tz": "America/New_York", "tz_label": "NY",
        "role_title": "Senior Consultant", "display_name": "Agustin R",
        "work_start": 9, "work_end": 18,
    },
    "hugoq@systemrapid.com": {
        "tz": "Europe/Madrid", "tz_label": "Madrid",
        "role_title": "Tech plantilla", "display_name": "Hugo R",
        "work_start": 8, "work_end": 19,
    },
    "yunush@systemrapid.com": {
        "tz": "Europe/London", "tz_label": "London",
        "role_title": "Account Lead London", "display_name": "Yunus H",
        "work_start": 9, "work_end": 18,
    },
    "arlindoo@systemrapid.com": {
        "tz": "America/New_York", "tz_label": "NY",
        "role_title": "Tech external sub", "display_name": "Arlindo O",
        "work_start": 9, "work_end": 18,
    },
}


PROFILE_FIELDS = ("tz", "tz_label", "role_title", "display_name", "work_start", "work_end")


async def migrate() -> None:
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print("\n" + "=" * 64)
    print("InsiteIQ — Migration · user profile fields (tz/role/display_name)")
    print("=" * 64)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    cursor = db.users.find({})
    all_users = await cursor.to_list(length=500)

    if not all_users:
        print("⚠ No hay users en mongo · ¿olvidaste correr el seed?")
        return

    print(f"Users encontrados en mongo: {len(all_users)}")
    print(f"Profiles canónicos en script: {len(CANONICAL_PROFILES)}")
    print()

    updated = 0
    skipped_complete = 0
    skipped_unknown = 0
    partial_updates: list[str] = []

    for user in all_users:
        email = (user.get("email") or "").lower()
        profile = CANONICAL_PROFILES.get(email)

        if not profile:
            # User no está en el directorio canónico (probablemente cliente · ignoramos)
            skipped_unknown += 1
            print(f"  ⊘ skip · {email or '(no email)'} · no está en CANONICAL_PROFILES")
            continue

        # Idempotente · solo actualizar fields que están en null / ausentes
        patch: dict = {}
        for field in PROFILE_FIELDS:
            current = user.get(field)
            if current is None:
                patch[field] = profile[field]

        if not patch:
            skipped_complete += 1
            print(f"  ✓ keep · {email} · ya tiene todos los fields poblados")
            continue

        # Update + audit field
        patch["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": user["_id"]}, {"$set": patch})

        fields_updated = list(patch.keys() - {"updated_at"})
        partial_updates.append(f"{email}: {','.join(fields_updated)}")
        updated += 1
        print(f"  ↑ patch · {email} · {len(fields_updated)} fields → {','.join(fields_updated)}")

    print()
    print("=" * 64)
    print(f"Resultado:")
    print(f"  ↑ Updated:           {updated} users")
    print(f"  ✓ Skipped (full):    {skipped_complete} users (ya tenían fields)")
    print(f"  ⊘ Skipped (unknown): {skipped_unknown} users (no canónicos · clients/etc)")
    print("=" * 64)

    if updated > 0:
        print("\nFields poblados:")
        for line in partial_updates:
            print(f"  · {line}")

    print()
    print("✅ Migration done · idempotente · safe para re-correr")


async def main():
    try:
        await migrate()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
