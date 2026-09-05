"""
InsiteIQ — close_admin_arcos_panama.py

Administración cierra su parte del rollout Arcos Dorados Panamá con data real:
  1. Alarmas Solutions pasa a vendor_labor (el seed la dejó como "vendor", tipo inválido)
  2. Coste absorbido por instalación cerrada: labor $300 (tarifa Alarmas / Agustín)
  3. Pre-factura a Claro CES · PA-1000066 · instalaciones cerradas de Panamá (OTC del SA)
  4. Pre-factura a Claro CES · PA-1000055 · FM-19566 Aruba
  5. Suscripción MRC · sitios instalados × monthly_fee del SA (60 meses por sitio según SOW)
  6. P&L de la pre-factura Panamá (3 márgenes)

Usa las MISMAS funciones de las rutas (invoices / recurring / cost-snapshot),
actuando como el owner (juang@) · todo queda en audit_log.
DRY-RUN por defecto · ADMIN_EXECUTE=1 para escribir.

Uso (desde VPS):
    docker compose exec -T api python -m scripts.close_admin_arcos_panama
    docker compose exec -T -e ADMIN_EXECUTE=1 api python -m scripts.close_admin_arcos_panama
"""
import asyncio
import os
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.dependencies import CurrentUser
from app.database import close_db, connect_db, get_db
from app.routes.invoices import GenerateBody, generate_invoice, invoice_pnl
from app.routes.recurring_billing import CreateBody as SubscriptionBody, create_subscription
from app.routes.work_orders import CostSnapshotBody, set_cost_snapshot

ACTOR_EMAIL = "juang@systemrapid.io"
PROJECT_CODE = "ARCOS-CLARO-SDWAN-OFFNET"
SA_REF = "04MSP-V1.1"
VENDOR_LEGAL_NAME = "Alarmas Solutions"
VENDOR_COST_PER_VISIT = 300.0
ARUBA_REF = "FM-19566"
PO_PANAMA = "PA-1000066"
PO_CARIBBEAN = "PA-1000055"


def _utc(y, m, d, hh=0, mm=0, ss=0):
    return datetime(y, m, d, hh, mm, ss, tzinfo=timezone.utc)


async def main():
    execute = os.environ.get("ADMIN_EXECUTE") == "1"
    await connect_db()
    db = get_db()

    actor = await db.users.find_one({"email": ACTOR_EMAIL})
    if not actor:
        print(f"Actor no encontrado: {ACTOR_EMAIL}")
        return
    user = CurrentUser(
        user_id=str(actor["_id"]),
        tenant_id=actor["tenant_id"],
        memberships=actor.get("space_memberships") or [],
    )
    tenant_id = user.tenant_id

    project = await db.projects.find_one({"tenant_id": tenant_id, "code": PROJECT_CODE})
    sa = await db.service_agreements.find_one({"tenant_id": tenant_id, "contract_ref": SA_REF})
    vendor = await db.organizations.find_one({"tenant_id": tenant_id, "legal_name": VENDOR_LEGAL_NAME})
    if not project or not sa or not vendor:
        print("Faltan project / SA / vendor · corre seed_arcos_claro primero")
        return
    project_id = str(project["_id"])
    ces_id = project["client_organization_id"]
    sa_id = str(sa["_id"])
    rc = sa.get("rate_card") or {}

    closed = await db.work_orders.find(
        {"tenant_id": tenant_id, "project_id": project_id, "status": "closed"}
    ).to_list(2000)
    panama = [w for w in closed if w.get("reference") != ARUBA_REF]
    aruba = [w for w in closed if w.get("reference") == ARUBA_REF]
    unbilled_panama = [w for w in panama if not w.get("billing_line_id")]
    unbilled_aruba = [w for w in aruba if not w.get("billing_line_id")]
    no_cost = [w for w in closed if (w.get("cost_snapshot") or {}).get("labor") is None]
    installed_sites = len({w.get("site_id") for w in panama if w.get("site_id")})
    mrc = round(installed_sites * float(rc.get("monthly_fee") or 0), 2)
    sub_title = f"Arcos Dorados Panamá · MRC SD-WAN · {installed_sites} sitios × ${rc.get('monthly_fee')}"
    existing_sub = await db.recurring_subscriptions.find_one({"tenant_id": tenant_id, "title": sub_title})
    vendor_rels = vendor.get("partner_relationships") or []
    vendor_fix_needed = not any(r.get("type") == "vendor_labor" for r in vendor_rels)

    print("=" * 66)
    print("EXECUTE" if execute else "DRY-RUN (ADMIN_EXECUTE=1 para aplicar)")
    print("=" * 66)
    print(f"Actor: {actor.get('full_name')} <{ACTOR_EMAIL}> · authority={user.authority_level_in('srs_coordinators')}")
    print(f"Project {PROJECT_CODE} · SA {SA_REF} · rate_card base={rc.get('base_price_per_wo')} monthly={rc.get('monthly_fee')} {sa.get('currency')}")
    print(f"1. Alarmas Solutions → vendor_labor: {'PENDIENTE' if vendor_fix_needed else 'ya está'}")
    print(f"2. cost_snapshot labor ${VENDOR_COST_PER_VISIT:.0f} en {len(no_cost)} instalaciones cerradas sin coste (total ${len(no_cost) * VENDOR_COST_PER_VISIT:,.2f})")
    print(f"3. Pre-factura Panamá {PO_PANAMA}: {len(unbilled_panama)} instalaciones × ${rc.get('base_price_per_wo')} = ${len(unbilled_panama) * float(rc.get('base_price_per_wo') or 0):,.2f}")
    print(f"4. Pre-factura Aruba {PO_CARIBBEAN}: {len(unbilled_aruba)} WO ({ARUBA_REF})")
    print(f"5. Suscripción MRC: {sub_title} = ${mrc:,.2f}/mes · {'ya existe' if existing_sub else 'PENDIENTE'} · primera corrida 2026-10-01")
    if not execute:
        await close_db()
        return

    # 1. vendor type
    if vendor_fix_needed:
        rels = [{**r, "type": "vendor_labor"} if r.get("type") == "vendor" else r for r in vendor_rels]
        await db.organizations.update_one({"_id": vendor["_id"]}, {"$set": {"partner_relationships": rels, "updated_at": datetime.now(timezone.utc)}})
        print("   ✓ Alarmas Solutions → vendor_labor")

    # 2. cost snapshot
    for w in no_cost:
        await set_cost_snapshot(
            str(w["_id"]),
            CostSnapshotBody(
                labor=VENDOR_COST_PER_VISIT,
                currency="USD",
                notes="Tarifa Alarmas Solutions (Agustín) · $300/intervención · pendiente factura real del vendor",
            ),
            user,
        )
    print(f"   ✓ cost_snapshot en {len(no_cost)} WOs")

    # 3 + 4. pre-facturas
    async def gen(wos, client_ref, start, end, notes):
        if not wos:
            print(f"   · {client_ref}: nada sin facturar")
            return None
        try:
            inv = await generate_invoice(GenerateBody(
                organization_id=ces_id,
                service_agreement_id=sa_id,
                period_start=start,
                period_end=end,
                client_ref=client_ref,
                notes=notes,
                work_order_ids=[str(w["_id"]) for w in wos],
            ), user)
        except HTTPException as e:
            print(f"   ✗ {client_ref}: {e.detail}")
            return None
        print(f"   ✓ {inv['invoice_number']} · {client_ref} · {inv['generated_from_wo_count']} WOs · total ${inv['total']:,.2f} {inv['currency']} · status {inv['status']}")
        return inv

    inv_pa = await gen(
        unbilled_panama, PO_PANAMA, _utc(2025, 10, 1), _utc(2026, 4, 30, 23, 59, 59),
        "Pre-factura generada desde las instalaciones cerradas del control real (25-abr-2026). "
        "Validar con Adriana: recargos after-hours / fin de semana (SOW E.6) no aplicados · MRC en suscripción aparte.",
    )
    await gen(
        unbilled_aruba, PO_CARIBBEAN, _utc(2025, 12, 1), _utc(2025, 12, 31, 23, 59, 59),
        "FM-19566 Aruba · en alcance según SOW Sección A/F (confirmado por Adrian Alvarado 15-dic-2025) · precio USD del SOW.",
    )

    # 5. MRC
    if not existing_sub and mrc > 0:
        sub = await create_subscription(SubscriptionBody(
            organization_id=ces_id,
            service_agreement_id=sa_id,
            title=sub_title,
            description="Cuota mensual por sitio instalado (SOW V1.1 · 60 meses por sitio desde su instalación). "
                        "Una sola suscripción agregada · ajustar importe cuando cambie el número de sitios.",
            category="monthly_fee",
            amount=mrc,
            currency="USD",
            cadence="monthly",
            next_run=_utc(2026, 10, 1),
            ends_at=None,
            due_in_days=30,
            notes="Creada por close_admin_arcos_panama · valida Adriana",
        ), user)
        print(f"   ✓ suscripción {sub['id']} · ${sub['amount']:,.2f}/mes · next_run {sub['next_run']}")

    # 6. P&L
    if inv_pa:
        pnl = await invoice_pnl(inv_pa["id"], user)
        flat = {k: v for k, v in pnl.items() if not isinstance(v, (list, dict))}
        nested = {k: v for k, v in pnl.items() if isinstance(v, dict)}
        print("   P&L Panamá:", flat)
        for k, v in nested.items():
            print(f"   P&L {k}:", v)

    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
