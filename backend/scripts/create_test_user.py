"""
InsiteIQ — create_test_user.py (Iter 2.63i · 2026-05-10)

Crea cuenta de pruebas `pruebas@systemrapid.com` con DOBLE membership
(srs_coordinators + tech_field) para que el owner pueda curiosear las
dos vistas con un solo click en el demo chip.

Características:
  - Pwd seed `InsiteIQ2026!` con must_change_password=False (entra
    directo · es de curioseo, no de producción)
  - employment_type='plantilla'
  - authority_level='mid_manager' en SRS (puede ver todo, NO admin write)
  - tz/role/etc poblados para que aparezca limpio en cards
  - Asigna al user 1-2 WOs activas del seed Arcos para que tenga data
    al entrar a /tech/jobs

Idempotente: si el user ya existe, NO lo recrea · solo lo asegura
asignado a WOs activas.

Uso:
    docker compose exec api python -m scripts.create_test_user
"""
import asyncio
from datetime import datetime, timezone

from bson import ObjectId

from app.database import close_db, connect_db, get_db
from app.core.security import hash_password


TEST_EMAIL = "pruebas@systemrapid.com"
TEST_PWD = "InsiteIQ2026!"
TEST_FULL_NAME = "Pruebas Tech"


async def main():
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print("\n" + "=" * 64)
    print("InsiteIQ — Create test user · pruebas@systemrapid.com")
    print("=" * 64)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    # 1) Obtener tenant_id (asumimos un solo tenant activo)
    tenant = await db.tenants.find_one({"code": "SRS"})
    if not tenant:
        # Fallback · cualquier tenant
        tenant = await db.tenants.find_one({})
    if not tenant:
        print("⚠ No tenant en mongo · abortando")
        return
    tenant_id = str(tenant["_id"])
    print(f"Tenant: {tenant.get('code', '(unknown)')} · {tenant_id}")

    # 2) Check si ya existe el user
    existing = await db.users.find_one({"email": TEST_EMAIL})

    now = datetime.now(timezone.utc)
    memberships = [
        {
            "space": "srs_coordinators",
            "role": "demo_user",
            "authority_level": "mid_manager",
            "organization_id": None,
            "active": True,
        },
        {
            "space": "tech_field",
            "role": "demo_tech",
            "authority_level": "mid_manager",
            "organization_id": None,
            "active": True,
        },
    ]

    if existing:
        print(f"✓ User ya existe · id={existing['_id']} · forzando pwd seed + memberships limpias")
        await db.users.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "hashed_password": hash_password(TEST_PWD),
                    "must_change_password": False,
                    "password_changed_at": now,
                    "space_memberships": memberships,
                    "is_active": True,
                    "updated_at": now,
                }
            },
        )
        user_id = existing["_id"]
    else:
        doc = {
            "tenant_id": tenant_id,
            "email": TEST_EMAIL,
            "full_name": TEST_FULL_NAME,
            "phone": None,
            "country": "ES",
            "hashed_password": hash_password(TEST_PWD),
            "is_active": True,
            "employment_type": "plantilla",
            "email_provisioned_by_srs": False,
            "space_memberships": memberships,
            "must_change_password": False,  # entra directo · es de curioseo
            "password_changed_at": now,
            "notes": "Test account · double-membership · creada por scripts/create_test_user",
            # Cross-vista profile (aparece bien en cards)
            "tz": "Europe/Madrid",
            "tz_label": "Madrid",
            "role_title": "Tech de pruebas",
            "display_name": "Pruebas",
            "work_start": 9,
            "work_end": 18,
            "last_login_at": None,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.users.insert_one(doc)
        user_id = result.inserted_id
        print(f"↑ Created · id={user_id}")

    # 3) Asegurar que el user de pruebas tenga al menos 1 WO con site
    #    completo (lat/lng + onsite_contact) y en estado operativo
    #    (dispatched/en_route/on_site) para que pueda curiosear el flow
    #    mobile-first completo del Iter 2.63h.
    #
    #    Estrategia robusta · NO depende del seed estado actual:
    #      a) Busca WOs ya asignadas a pruebas@ (idempotente)
    #      b) Si no hay, busca WOs con site_id (cualquier status) que NO
    #         tengan tech asignado · ahí le asigna 1
    #      c) Si encontró una pero está en intake/triage/closed, la
    #         promueve a 'dispatched' para que el flow operativo cargue
    #
    #    Esto NO le roba WOs a Agustin/Arlindo · solo toca las que están
    #    sin asignar.
    user_id_str = str(user_id)
    target_count = 2  # queremos al menos 2 WOs visibles en Jobs

    # a) WOs ya asignadas
    already = await db.work_orders.find({
        "tenant_id": tenant_id,
        "assigned_tech_user_id": user_id_str,
    }).to_list(length=10)
    print(f"  · WOs ya asignadas al user: {len(already)}")

    need = max(0, target_count - len(already))
    if need > 0:
        # b) Candidatas sin asignar, con site_id (preferentemente con coords)
        unassigned = await db.work_orders.find({
            "tenant_id": tenant_id,
            "$or": [
                {"assigned_tech_user_id": None},
                {"assigned_tech_user_id": {"$exists": False}},
            ],
            "site_id": {"$exists": True, "$ne": None},
        }).limit(need * 2).to_list(length=need * 2)

        promoted = 0
        for wo in unassigned:
            if promoted >= need:
                break
            wo_status = wo.get("status")
            patch = {
                "assigned_tech_user_id": user_id_str,
                "updated_at": now,
            }
            # c) Si está en estado NO operativo, promovemos a dispatched
            if wo_status not in ("dispatched", "en_route", "on_site", "resolved"):
                patch["status"] = "dispatched"
                print(
                    f"  ↑ assign+promote · WO {wo.get('reference')} "
                    f"({wo_status} → dispatched) → pruebas user"
                )
            else:
                print(f"  ↑ assign · WO {wo.get('reference')} (status={wo_status}) → pruebas user")
            await db.work_orders.update_one({"_id": wo["_id"]}, {"$set": patch})
            promoted += 1

        if promoted < need:
            print(f"  ⚠ Solo encontró {promoted}/{need} WOs sin asignar para pruebas")

    # 4) Crear briefing pendiente de ack si no hay (para que pueda probar
    #    el flow "He leído y entendí"). Buscamos uno de los WOs asignados
    #    a este user con status en_route/on_site.
    cursor2 = db.work_orders.find({
        "tenant_id": tenant_id,
        "assigned_tech_user_id": user_id_str,
        "status": {"$in": ["dispatched", "en_route", "on_site"]},
    }).limit(1)
    wos_for_briefing = await cursor2.to_list(length=1)
    if wos_for_briefing:
        wo = wos_for_briefing[0]
        wo_id_str = str(wo["_id"])
        existing_briefing = await db.copilot_briefings.find_one({
            "work_order_id": wo_id_str,
            "tenant_id": tenant_id,
        })
        if not existing_briefing:
            briefing_doc = {
                "tenant_id": tenant_id,
                "work_order_id": wo_id_str,
                "site_id": wo.get("site_id"),
                "status": "assembled",
                "coordinator_notes": (
                    "Briefing de prueba para que cures este flow. Spare router "
                    "está en el closet con candado QR. Manager espera entre 9-10am · "
                    "si hay problema con acceso contactame por chat."
                ),
                "site_bible": {
                    "summary": "Local pequeño · 1 router Cisco Meraki MX67 · acceso desde recepción · cliente conoce el sistema.",
                },
                "assembled_at": now,
                "assembled_by_user_id": user_id_str,
                "created_at": now,
                "updated_at": now,
            }
            await db.copilot_briefings.insert_one(briefing_doc)
            print(f"  ↑ briefing pendiente ack · WO {wo.get('reference')}")
        else:
            print(f"  ✓ briefing ya existe para WO {wo.get('reference')}")

    print()
    print("=" * 64)
    print("✅ Test user listo · login con:")
    print(f"   Email: {TEST_EMAIL}")
    print(f"   Pwd:   {TEST_PWD}")
    print(f"   Entra DIRECTO (no fuerza rotación) · doble membership SRS + Tech")
    print("=" * 64)


async def runner():
    try:
        await main()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(runner())
