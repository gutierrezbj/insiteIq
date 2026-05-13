"""
InsiteIQ — promote_to_admin.py (Iter 2.63g · 2026-05-10)

Promueve users a authority_level='director' en su membership SRS para
que pueden ejercer Admin write ops (create/edit/delete users/orgs/sites,
reset passwords, edit agreements/projects cuando se sumen).

Backend _is_admin() check requiere authority_level ∈ {'owner', 'director'}
en la membership 'srs_coordinators'. Antes de este iter solo Juan
(authority='owner') y Adriana ('director') podían write. Tras esto:
Agustin + Andros también.

Idempotente: si el user ya tiene authority='owner' o 'director', lo
preserva (no degrada · 'owner' > 'director').

Audit: cada cambio se persiste en audit_log con action='user.promote'
y context_snapshot mostrando el cambio de authority.

Uso:
    docker compose exec api python -m scripts.promote_to_admin
"""
import asyncio
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db


# Emails a promocionar a 'director' en su SRS membership.
# Sort: orden visible en logs (alfa por full_name).
TO_PROMOTE: list[str] = [
    "agustinc@systemrapid.com",  # Agustin Rivera (Senior Consultant)
    "androsb@systemrapid.com",   # Andros Briceño (Project Manager)
]

TARGET_AUTHORITY = "director"
HIGHER_AUTHORITIES = {"owner", "director"}  # no degradar si ya es alguno


async def promote() -> None:
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print("\n" + "=" * 64)
    print("InsiteIQ — Promote to Admin · SRS members → director authority")
    print("=" * 64)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    for email in TO_PROMOTE:
        user = await db.users.find_one({"email": email.lower()})
        if not user:
            print(f"  ⊘ skip · {email} · NO existe en mongo")
            continue

        memberships = user.get("space_memberships", [])
        srs_idx = None
        for i, m in enumerate(memberships):
            if m.get("space") == "srs_coordinators" and m.get("active", True):
                srs_idx = i
                break

        if srs_idx is None:
            print(f"  ⊘ skip · {email} · NO tiene membership srs_coordinators activa")
            continue

        current_authority = memberships[srs_idx].get("authority_level", "mid_manager")

        if current_authority in HIGHER_AUTHORITIES:
            print(
                f"  ✓ keep · {email} · ya es '{current_authority}' "
                f"(≥ director · no degradamos)"
            )
            continue

        # Promote
        new_memberships = [dict(m) for m in memberships]
        new_memberships[srs_idx]["authority_level"] = TARGET_AUTHORITY
        now = datetime.now(timezone.utc)

        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "space_memberships": new_memberships,
                    "updated_at": now,
                }
            },
        )

        # Audit
        await db.audit_log.insert_one({
            "tenant_id": user.get("tenant_id"),
            "actor_user_id": None,  # script · no human actor
            "action": "user.promote",
            "entity_refs": [{
                "collection": "users",
                "id": str(user["_id"]),
                "label": user.get("full_name"),
            }],
            "context_snapshot": {
                "from_authority": current_authority,
                "to_authority": TARGET_AUTHORITY,
                "membership_space": "srs_coordinators",
                "source": "scripts.promote_to_admin",
            },
            "ts": now,
            "method": "SCRIPT",
            "path": "/scripts/promote_to_admin",
        })

        print(
            f"  ↑ promote · {email} · '{current_authority}' → '{TARGET_AUTHORITY}'"
        )

    print()
    print("=" * 64)
    print("✅ Promote done · idempotente · safe para re-correr")
    print()
    print("Effect: estos users ahora pueden:")
    print("  · POST/PATCH /api/users     · crear y editar usuarios")
    print("  · POST/users/{id}/reset-password · resetear pwds del equipo")
    print("  · POST/PATCH /api/organizations · gestionar orgs")
    print("  · POST/PATCH /api/sites     · gestionar sites")
    print("  · Usar /srs/admin completo (Users + Organizations tabs)")
    print("  · Ver Audit log (tab Audit)")


async def main():
    try:
        await promote()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
