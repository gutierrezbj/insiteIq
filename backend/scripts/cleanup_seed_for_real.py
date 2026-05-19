"""
InsiteIQ — cleanup_seed_for_real.py (2026-05-19)

Cleanup TOTAL de fake/seed data tras decisión del owner 2026-05-19:
"vamos a darle duro a esto · solo deja real".

Lo que se BORRA:
  - organizations · todas EXCEPTO Fervimax
  - sites · todos EXCEPTO los TOUS recién cargados
  - service_agreements · todos EXCEPTO el de Fervimax
  - work_orders · todos EXCEPTO las 2 WOs TOUS recién cargadas
  - projects + cluster_groups + equipment_plan_entries · todo
  - copilot_briefings · todos EXCEPTO las 2 de las WOs TOUS
  - tech_captures · todos
  - intervention_reports · todos
  - budget_approval_requests · todos
  - operational_alerts · todos
  - ticket_threads + ticket_messages · todos
  - assets + asset_events · todos
  - vendor_invoices + invoices + recurring_billing · todos
  - skill_passports · todos (vuelven a crearse con data real cuando aplique)
  - project_notes · todos
  - users · TODOS los que NO sean SRS plantilla real + Iduber + Andres

Lo que se PRESERVA:
  - tenant SRS
  - 9 users SRS plantilla reales:
      juang@systemrapid.io  · sajid@systemrapid.com  · adrianab@systemrapid.com
      androsb@systemrapid.com  · luiss@systemrapid.com  · yunush@systemrapid.com
      agustinc@systemrapid.com  · arlindoo@systemrapid.com  · hugoq@systemrapid.com
  - 2 users caso TOUS:
      iduberm@systemrapid.com  · atyminskiy@fervimax.com
  - Fervimax org + sus 2 sites TOUS + 2 WOs + SA + briefings
  - audit_log · INMUTABLE por principio cross-cutting #7

audit_log NO se toca · queda con referencias a entities borradas (esto
es histórico legítimo · principio "nuestro corazón guarda todo").

USO:
  # DRY RUN (default · solo cuenta · no borra)
  docker compose exec -T api python -m scripts.cleanup_seed_for_real

  # EXECUTE (borra de verdad)
  docker compose exec -T api -e CLEANUP_EXECUTE=1 python -m scripts.cleanup_seed_for_real

El script imprime el plan + counts antes de borrar. Si EXECUTE no está
seteado, termina sin tocar nada.
"""
import asyncio
import os
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db


# ─── Whitelist · usuarios SRS plantilla reales + caso TOUS ─────────
PRESERVE_USER_EMAILS = {
    # SRS plantilla
    "juang@systemrapid.io",
    "juang@systemrapid.com",  # por si está con .com en seed
    "sajid@systemrapid.com",
    "adrianab@systemrapid.com",
    "androsb@systemrapid.com",
    "luiss@systemrapid.com",
    "yunush@systemrapid.com",
    "agustinc@systemrapid.com",
    "arlindoo@systemrapid.com",  # external_sub PERO real (Claro US)
    "hugoq@systemrapid.com",
    # Caso TOUS
    "iduberm@systemrapid.com",
    "atyminskiy@fervimax.com",
}


async def main():
    EXECUTE = os.environ.get("CLEANUP_EXECUTE") == "1"

    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print()
    print("=" * 72)
    if EXECUTE:
        print("⚠️  CLEANUP EXECUTE MODE · ESTO VA A BORRAR DATOS EN PROD")
    else:
        print("📋 CLEANUP DRY-RUN MODE · solo cuenta · no borra nada")
        print("   Para ejecutar de verdad · re-run con env CLEANUP_EXECUTE=1")
    print("=" * 72)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    # ─── 1. Identificar lo que se preserva ──────────────────────────
    # Tenant
    tenant = await db.tenants.find_one({"code": "SRS"}) or await db.tenants.find_one({})
    if not tenant:
        print("⚠ No tenant en mongo · abortando")
        return
    tenant_id = str(tenant["_id"])
    print(f"Tenant preservado: {tenant.get('code')} · {tenant_id}")

    # Fervimax org · única org que se preserva
    fervi = await db.organizations.find_one({"legal_name": "Fervimax"}) \
        or await db.organizations.find_one({"name": "Fervimax"})
    if not fervi:
        print("⚠ Fervimax NO encontrado · abortando (no sabría qué preservar)")
        return
    fervi_id = str(fervi["_id"])
    print(f"Fervimax preservada: {fervi_id}")

    # Sites TOUS (preservados por código)
    tous_sites = await db.sites.find({
        "code": {"$in": ["TOUS-PEMBROKE-FL", "TOUS-DADELAND-MIA"]}
    }).to_list(length=10)
    tous_site_ids = [str(s["_id"]) for s in tous_sites]
    print(f"Sites TOUS preservados: {len(tous_site_ids)}")
    for s in tous_sites:
        print(f"  · {s.get('code')} → {s['_id']}")

    # SA Fervi (preservado por contract_ref)
    fervi_sa = await db.service_agreements.find_one({"contract_ref": "FERVI-SRS-BF-2026"})
    fervi_sa_id = str(fervi_sa["_id"]) if fervi_sa else None
    print(f"Service Agreement Fervi preservado: {fervi_sa_id}")

    # WOs TOUS (preservadas por reference)
    tous_wos = await db.work_orders.find({
        "reference": {"$in": ["FERVI-TOUS-PMB-001", "FERVI-TOUS-DDM-001"]}
    }).to_list(length=10)
    tous_wo_ids = [str(w["_id"]) for w in tous_wos]
    print(f"WOs TOUS preservadas: {len(tous_wo_ids)}")
    for w in tous_wos:
        print(f"  · {w.get('reference')} → {w['_id']}")

    # Briefings de las WOs TOUS (preservados)
    tous_briefings = await db.copilot_briefings.find({
        "work_order_id": {"$in": tous_wo_ids}
    }).to_list(length=10)
    tous_briefing_ids = [str(b["_id"]) for b in tous_briefings]
    print(f"Briefings TOUS preservados: {len(tous_briefing_ids)}")

    # Users preservados
    preserved_users = await db.users.find({
        "email": {"$in": list(PRESERVE_USER_EMAILS)}
    }).to_list(length=50)
    preserved_user_ids = [str(u["_id"]) for u in preserved_users]
    preserved_emails = set(u["email"] for u in preserved_users)
    print(f"Users preservados: {len(preserved_user_ids)}")
    for u in preserved_users:
        print(f"  · {u['email']}")

    print()
    print("=" * 72)
    print("PLAN DE BORRADO · counts (todo lo que NO está en whitelist)")
    print("=" * 72)

    # ─── 2. Contar lo que se borraría ──────────────────────────────
    plan = []

    # Collections que se vacían COMPLETAMENTE (modulo tenant si aplica)
    full_wipe_collections = [
        "tech_captures",
        "intervention_reports",
        "budget_approval_requests",
        "operational_alerts",
        "ticket_messages",
        "ticket_threads",
        "assets",
        "asset_events",
        "vendor_invoices",
        "invoices",
        "recurring_billing",
        "skill_passports",
        "project_notes",
        "projects",
        "cluster_groups",
        "equipment_plan_entries",
    ]
    for col in full_wipe_collections:
        count = await db[col].count_documents({})
        plan.append((col, count, {}))  # filtro vacío = borrar todo
        print(f"  {col}: {count} docs · borrar TODOS")

    # Collections con filtro selectivo
    wo_filter = {"_id": {"$nin": [w["_id"] for w in tous_wos]}}
    wo_count = await db.work_orders.count_documents(wo_filter)
    plan.append(("work_orders", wo_count, wo_filter))
    print(f"  work_orders: {wo_count} docs · borrar (preserva {len(tous_wo_ids)} TOUS)")

    site_filter = {"_id": {"$nin": [s["_id"] for s in tous_sites]}}
    site_count = await db.sites.count_documents(site_filter)
    plan.append(("sites", site_count, site_filter))
    print(f"  sites: {site_count} docs · borrar (preserva {len(tous_site_ids)} TOUS)")

    sa_filter = {"_id": {"$ne": fervi_sa["_id"]}} if fervi_sa else {}
    sa_count = await db.service_agreements.count_documents(sa_filter)
    plan.append(("service_agreements", sa_count, sa_filter))
    print(f"  service_agreements: {sa_count} docs · borrar (preserva FERVI-SRS-BF-2026)")

    org_filter = {"_id": {"$ne": fervi["_id"]}}
    org_count = await db.organizations.count_documents(org_filter)
    plan.append(("organizations", org_count, org_filter))
    print(f"  organizations: {org_count} docs · borrar (preserva Fervimax)")

    briefing_filter = {"_id": {"$nin": [b["_id"] for b in tous_briefings]}}
    briefing_count = await db.copilot_briefings.count_documents(briefing_filter)
    plan.append(("copilot_briefings", briefing_count, briefing_filter))
    print(f"  copilot_briefings: {briefing_count} docs · borrar (preserva {len(tous_briefing_ids)} TOUS)")

    user_filter = {"email": {"$nin": list(PRESERVE_USER_EMAILS)}}
    user_count = await db.users.count_documents(user_filter)
    plan.append(("users", user_count, user_filter))
    print(f"  users: {user_count} docs · borrar (preserva {len(preserved_emails)} reales)")

    # Listar usuarios a borrar para visibilidad
    to_delete_users = await db.users.find(user_filter, {"email": 1, "full_name": 1}).to_list(length=200)
    if to_delete_users:
        print()
        print("  Users a BORRAR (no están en whitelist):")
        for u in to_delete_users:
            print(f"    · {u.get('email', '(no email)')} · {u.get('full_name', '(no name)')}")

    total = sum(p[1] for p in plan)
    print()
    print(f"TOTAL docs a borrar: {total}")
    print()
    print("NO se toca:")
    print("  · tenants")
    print("  · audit_log_entries (principio #7 INMUTABLE · queda histórico)")
    print()

    # ─── 3. Ejecutar si EXECUTE ────────────────────────────────────
    if not EXECUTE:
        print("=" * 72)
        print("DRY RUN COMPLETO · no se borró nada.")
        print("Para ejecutar de verdad:")
        print("  docker compose exec -T -e CLEANUP_EXECUTE=1 api python -m scripts.cleanup_seed_for_real")
        print("=" * 72)
        return

    print("=" * 72)
    print("⚠️  EJECUTANDO BORRADO EN 3 SEGUNDOS... (Ctrl+C para abortar)")
    print("=" * 72)
    await asyncio.sleep(3)
    print()

    deleted_total = 0
    for col, count, filt in plan:
        if count == 0:
            continue
        result = await db[col].delete_many(filt)
        deleted_total += result.deleted_count
        print(f"  ↓ {col}: {result.deleted_count} borrados")

    print()
    print("=" * 72)
    print(f"✅ CLEANUP COMPLETADO · {deleted_total} docs borrados")
    print("=" * 72)
    print()
    print("Próximos pasos:")
    print("  1. Re-ejecutar load_tous_miami_fervi para asegurar caso TOUS limpio:")
    print("     docker compose exec -T api python -m scripts.load_tous_miami_fervi")
    print("  2. Ejecutar force_reset_juan para resetear tu pwd:")
    print("     docker compose exec -T api python -m scripts.force_reset_juan")
    print("  3. Login en https://insiteiq.systemrapid.io con juang@systemrapid.io · validar")
    print()


async def runner():
    try:
        await main()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(runner())
