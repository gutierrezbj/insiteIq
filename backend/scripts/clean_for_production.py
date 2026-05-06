"""
InsiteIQ — clean_for_production.py

Limpia TODA la data operacional fake/seed del entorno de PROD.
Conserva intacto lo estructural: tenant, srs_entities, organizations, users.

Qué borra:
  - work_orders y satélites (threads, briefings, captures, reports, budgets, alerts)
  - sites + service_agreements
  - projects + clusters + bulk_upload_events
  - finance (rate_cards, invoices, subscriptions, vendor_invoices)
  - skill_passports + tech_ratings
  - assets + asset_events
  - audit_log (histórico del seed)
  - email_outbox + webhook_outbox

Qué preserva (NO toca):
  - tenants          → tenant SRS activo
  - srs_entities     → SR-UK, SR-US, SR-SA
  - organizations    → Fractalia, Claro, Arcos, etc.
  - users            → Juan, Andros, Adriana, Rackel, Agustín, etc. (con sus passwords actuales)

Uso:
    docker compose exec api python -m scripts.clean_for_production
"""
import asyncio
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db


OPERATIONAL_COLLECTIONS = [
    # Modo 1 — trabajo operativo
    "work_orders",
    "ticket_threads",
    "ticket_messages",
    "copilot_briefings",
    "tech_captures",
    "intervention_reports",
    "budget_approval_requests",
    "operational_alerts",
    # Modo 1 — sitios y contratos (datos reales se entran a mano)
    "sites",
    "service_agreements",
    # Modo 2 — rollouts
    "projects",
    "cluster_groups",
    "bulk_upload_events",
    "equipment_plan_entries",
    # Finance
    "rate_cards",
    "invoices",
    "recurring_subscriptions",
    "vendor_invoices",
    # Técnicos
    "skill_passports",
    "tech_ratings",
    # Assets
    "assets",
    "asset_events",
    # Outbox + audit
    "email_outbox",
    "webhook_outbox",
    "audit_log",
]

PRESERVED_COLLECTIONS = ["tenants", "srs_entities", "organizations", "users"]


async def clean():
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print("\n" + "=" * 60)
    print("InsiteIQ — Limpieza para producción")
    print("=" * 60)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    print("PRESERVANDO (sin tocar):")
    for col in PRESERVED_COLLECTIONS:
        count = await db[col].count_documents({})
        print(f"  ✓ {col}: {count} documentos — intacto")

    print()
    print("BORRANDO colecciones operacionales:")
    total_dropped = 0
    for col in OPERATIONAL_COLLECTIONS:
        count = await db[col].count_documents({})
        await db[col].drop()
        total_dropped += count
        status = f"{count} docs eliminados" if count > 0 else "ya estaba vacía"
        print(f"  ✗ {col}: {status}")

    print()
    print("=" * 60)
    print(f"LISTO. {total_dropped} documentos de demo eliminados.")
    print("La app arranca limpia — usuarios y orgs intactos.")
    print()
    print("Próximos pasos:")
    print("  1. Entrar como juang@systemrapid.io")
    print("  2. Crear los sitios reales (Admin → Sites)")
    print("  3. Abrir la primera WO real")
    print("=" * 60 + "\n")

    await close_db()


if __name__ == "__main__":
    asyncio.run(clean())
