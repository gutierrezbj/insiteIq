"""
InsiteIQ — cleanup_demo_environment.py (2026-06-08)

Borra SOLO el ambiente DEMO (Aurora Retail + usuarios demo-* + su WO +
sites + SA + briefings). Deja la data REAL (Fervimax/TOUS) y las cuentas
reales del equipo INTACTAS. audit_log NO se toca (principio #7).

Reverso de load_demo_environment.py · para cuando terminen de calibrar.

USO:
  # DRY RUN (default · cuenta · no borra)
  docker compose exec -T api python -m scripts.cleanup_demo_environment

  # EXECUTE
  docker compose exec -T -e DEMO_CLEANUP_EXECUTE=1 api python -m scripts.cleanup_demo_environment
"""
import asyncio
import os
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db


DEMO_USER_EMAILS = [
    "demo-admin@systemrapid.com", "demo-coord@systemrapid.com",
    "demo-finance@systemrapid.com", "demo-cliente@systemrapid.com",
    "demo-tech@systemrapid.com", "demo-tech-ext@systemrapid.com",
    "demo-pruebas@systemrapid.com",
]
ORG_LEGAL = "Aurora Retail (DEMO)"
SA_CONTRACT_REF = "DEMO-AURORA-SILVER-2026"
WO_REFERENCE = "DEMO-AURORA-001"
SITE_CODES = ["AURORA-MAD-GV", "AURORA-BCN-DIA", "AURORA-VLC-COL", "AURORA-SEV-NER"]


async def main():
    EXECUTE = os.environ.get("DEMO_CLEANUP_EXECUTE") == "1"
    await connect_db()
    db = get_db()
    assert db is not None

    print()
    print("=" * 64)
    print("⚠️ EXECUTE · borra ambiente demo" if EXECUTE else "📋 DRY-RUN · solo cuenta")
    print("=" * 64)
    now = datetime.now(timezone.utc)

    tenant = await db.tenants.find_one({"code": "SRS"}) or await db.tenants.find_one({})
    tenant_id = str(tenant["_id"])

    # Org Aurora + su WO (para borrar dependientes por org/wo)
    org = await db.organizations.find_one({"legal_name": ORG_LEGAL})
    org_id = str(org["_id"]) if org else None
    wo = await db.work_orders.find_one({"reference": WO_REFERENCE})
    wo_id = str(wo["_id"]) if wo else None

    plan = []
    plan.append(("copilot_briefings", {"work_order_id": wo_id} if wo_id else {"_id": None}))
    plan.append(("work_orders", {"reference": WO_REFERENCE}))
    plan.append(("service_agreements", {"contract_ref": SA_CONTRACT_REF}))
    plan.append(("sites", {"code": {"$in": SITE_CODES}}))
    plan.append(("users", {"email": {"$in": DEMO_USER_EMAILS}}))
    if org_id:
        plan.append(("organizations", {"legal_name": ORG_LEGAL}))

    total = 0
    for col, filt in plan:
        n = await db[col].count_documents(filt)
        total += n
        print(f"  {col}: {n} docs · {filt}")

    print(f"\nTOTAL a borrar: {total}")
    print("NO se toca: audit_log · tenant · data real (Fervimax/TOUS) · cuentas reales")

    if not EXECUTE:
        print("\nDRY-RUN · nada borrado. Para ejecutar:")
        print("  docker compose exec -T -e DEMO_CLEANUP_EXECUTE=1 api python -m scripts.cleanup_demo_environment")
        return

    print("\n⚠️ Borrando en 3s... (Ctrl+C aborta)")
    await asyncio.sleep(3)
    deleted = 0
    for col, filt in plan:
        if filt.get("_id") is None and "_id" in filt:
            continue
        r = await db[col].delete_many(filt)
        deleted += r.deleted_count
        print(f"  ↓ {col}: {r.deleted_count}")
    print(f"\n✅ {deleted} docs demo borrados · data real intacta")


async def runner():
    try:
        await main()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(runner())
