"""
InsiteIQ — load_tous_miami_fervi.py (2026-05-19)

Caso real Fervimax → SRS · Visita TOUS Dadeland Mall Miami para swap de
switch (cliente compró + entregó el nuevo · tech quita el viejo y pone
el nuevo). Cadena de mails de Andrés Tyminskiy (Fervimax PM) reenviada
por el owner. Tech asignado: Iduber Montes.

Carga idempotente:
  1. Fervimax org · asegura partner_relationships incluye 'client'
  2. Service Agreement Bronze Fervimax · crea si no existe
  3. Site TOUS Dadeland Mall Miami · crea si no existe
  4. User Iduber Montes (tech_field) · crea si no existe
  5. Work Order standalone (B&F) · crea si no existe (idempotente por reference)
  6. Briefing assembled · crea si no existe

Uso (desde VPS):
    ssh root@72.62.41.234 'cd /opt/apps/insiteiq && \\
      docker compose exec -T api python -m scripts.load_tous_miami_fervi'

Output: IDs/URLs imprimidos al final para uso por el equipo SRS.
"""
import asyncio
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db
from app.core.security import hash_password
from app.models.service_agreement import SHIELD_DEFAULTS


# ─── Constantes del caso ─────────────────────────────────────────────
WO_REFERENCE = "FERVI-TOUS-MIA-001"  # idempotente por esto
WO_TITLE = "Swap switch · TOUS Dadeland Mall Miami"

SITE_CODE = "TOUS-DADELAND-MIA"
SITE_NAME = "TOUS Dadeland Mall Miami"
SITE_ADDRESS = "7535 SW 88th St Suite 1950, Miami, FL 33156"
SITE_CITY = "Miami"
SITE_COUNTRY = "US"
SITE_TIMEZONE = "America/New_York"
SITE_LAT = 25.6855
SITE_LNG = -80.3158
ONSITE_CONTACT = {
    "name": "Oscar Iturria",
    "phone": "+52 5568092374",
    "email": None,
    "role": "remote_coordinator_mx",
}

TECH_EMAIL = "iduberm@systemrapid.com"
TECH_FULL_NAME = "Iduber Montes"
TECH_DISPLAY = "Iduber M"
TECH_PWD_SEED = "InsiteIQ2026!"
TECH_TZ = "America/New_York"
TECH_TZ_LABEL = "Miami"

SA_CONTRACT_REF = "FERVI-SRS-BF-2026"
SA_TITLE = "Fervimax · Break&Fix on-demand · Bronze"
SA_SHIELD = "bronze"

WO_DESCRIPTION = (
    "Cliente final TOUS pide swap de switch en su tienda de Dadeland Mall "
    "Miami. El switch nuevo ya fue comprado por el cliente y entregado en la "
    "tienda. Tarea del tech: quitar el switch viejo, instalar el nuevo, "
    "verificar conectividad, escanear ambos seriales (out + in) y foto antes/"
    "después.\n\n"
    "Coordinación: contactar PRIMERO con Oscar Iturria (+52 5568092374) que "
    "actúa como técnico/coordinador remoto desde México y tiene más info del "
    "trabajo. Andrés Tyminskiy (Fervimax PM, atyminskiy@fervimax.com) es el "
    "PM del cliente Tier-1, en copia.\n\n"
    "Histórico del caso: inicialmente Fervi pidió que SRS comprara el switch "
    "(fuera de scope DXC y SRS · denegado) · cliente lo compró por su cuenta "
    "y lo entregó en tienda · ahora solo se requiere visita del tech para el "
    "swap físico. Urgencia escalada por cliente: lunes/martes → mañana → HOY."
)

BRIEFING_NOTES = (
    "VISITA TOUS DADELAND MALL MIAMI · SWAP SWITCH\n\n"
    "PASO 1 · LLAMAR a Oscar Iturria (+52 5568092374) ANTES de salir. Es el "
    "técnico de México que coordina con cliente · sabe exactamente qué pide "
    "el cliente, dónde está el switch y a qué hora pueden recibirte.\n\n"
    "PASO 2 · Confirmar hora con Oscar. Programar entrada a la tienda dentro "
    "del horario que Oscar te diga.\n\n"
    "PASO 3 · Llegar a Dadeland Mall · 7535 SW 88th St Suite 1950 · Miami "
    "FL 33156. Tap-to-Maps en la PWA te abre la ubicación.\n\n"
    "PASO 4 · El switch NUEVO ya está en la tienda (cliente lo compró y lo "
    "dejó allí). Identifícalo. Anota marca/modelo/serial.\n\n"
    "PASO 5 · Foto del switch VIEJO en su lugar (antes de tocar nada).\n\n"
    "PASO 6 · Swap: documentar cable a cable cómo estaba conectado el viejo "
    "(foto del back panel ayuda mucho) · desconectar · sacar · poner el "
    "nuevo · reconectar idéntico.\n\n"
    "PASO 7 · Verificar que la tienda tiene conectividad. Si hay POS / "
    "caja / WiFi cliente · que todo levante.\n\n"
    "PASO 8 · Escanear AMBOS seriales en la PWA: el del switch viejo (OUT) "
    "y el del nuevo (IN). Es lo que cierra el asset event.\n\n"
    "PASO 9 · Foto del switch NUEVO instalado + foto del switch VIEJO retirado "
    "(separado, no en el rack).\n\n"
    "PASO 10 · Submit del capture en la PWA. Reportar a Andros (SRS coord) si "
    "algo no cuadra antes de salir del sitio.\n\n"
    "NOTAS:\n"
    "- Cliente TOUS no estuvo en la decisión técnica · Oscar tiene el "
    "  contexto completo · pregúntale TODO lo que necesites antes de la "
    "  visita.\n"
    "- Si la tienda no te deja entrar o el switch nuevo no está · NO hagas "
    "  swap parcial · llama a Andros y deja el caso en standby."
)


async def ensure_org_fervimax_has_client_rel(db, tenant_id, juan_id, now):
    """Fervimax ya existe (joint_venture_partner). Agregamos 'client' si falta."""
    org = await db.organizations.find_one({"legal_name": "Fervimax"})
    if not org:
        org = await db.organizations.find_one({"name": "Fervimax"})
    if not org:
        print("⚠ Fervimax NO encontrado · abortando carga")
        return None

    org_id_str = str(org["_id"])
    rels = org.get("partner_relationships", []) or []
    has_client = any(r.get("type") == "client" and r.get("status") == "active" for r in rels)

    if has_client:
        print(f"✓ Fervimax ya tiene rol 'client' · id={org_id_str}")
    else:
        rels.append({
            "type": "client",
            "started_at": now,
            "status": "active",
            "terms": {"scope": "B&F on-demand global · iniciado por caso TOUS Miami"},
        })
        await db.organizations.update_one(
            {"_id": org["_id"]},
            {"$set": {
                "partner_relationships": rels,
                "updated_at": now,
                "updated_by": juan_id,
            }},
        )
        print(f"↑ Fervimax · agregado rol 'client' · id={org_id_str}")
    return org_id_str


async def ensure_service_agreement(db, tenant_id, org_id, juan_id, now):
    """SA Bronze para Fervi (idempotente por contract_ref)."""
    existing = await db.service_agreements.find_one({
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "contract_ref": SA_CONTRACT_REF,
    })
    if existing:
        sa_id = str(existing["_id"])
        print(f"✓ Service Agreement ya existe · id={sa_id} · shield={existing.get('shield_level')}")
        return sa_id

    sla_defaults = SHIELD_DEFAULTS[SA_SHIELD]
    doc = {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "contract_ref": SA_CONTRACT_REF,
        "title": SA_TITLE,
        "shield_level": SA_SHIELD,
        "sla_spec": sla_defaults,
        "parts_approval_threshold_usd": 200.0,
        "rate_card": None,
        "srs_entity_id": None,
        "currency": "USD",
        "active": True,
        "starts_at": now.isoformat(),
        "ends_at": None,
        "notes": "Creado por scripts/load_tous_miami_fervi para arrancar caso TOUS Miami · ajustar terms con Adriana.",
        "created_at": now,
        "updated_at": now,
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    result = await db.service_agreements.insert_one(doc)
    sa_id = str(result.inserted_id)
    print(f"↑ Service Agreement creado · id={sa_id} · shield=bronze")
    return sa_id


async def ensure_site(db, tenant_id, org_id, juan_id, now):
    """TOUS Dadeland Mall Miami (idempotente por code o address)."""
    existing = await db.sites.find_one({
        "tenant_id": tenant_id,
        "$or": [
            {"code": SITE_CODE},
            {"address": SITE_ADDRESS},
        ],
    })
    if existing:
        site_id = str(existing["_id"])
        print(f"✓ Site ya existe · id={site_id} · {existing.get('name')}")
        return site_id

    doc = {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "code": SITE_CODE,
        "name": SITE_NAME,
        "country": SITE_COUNTRY,
        "city": SITE_CITY,
        "address": SITE_ADDRESS,
        "timezone": SITE_TIMEZONE,
        "lat": SITE_LAT,
        "lng": SITE_LNG,
        "geofence_radius_m": None,
        "site_type": "retail",
        "onsite_contact": ONSITE_CONTACT,
        "has_physical_resident": False,
        "default_noc_operator_user_id": None,
        "access_notes": "Tienda TOUS en planta del centro comercial Dadeland Mall. Coordinador remoto desde México (Oscar Iturria · +52 5568092374). El switch nuevo ya está físicamente en la tienda.",
        "status": "active",
        "notes": "Caso entrada via Fervimax · cliente final TOUS · histórico en thread con Andrés Tyminskiy.",
        "created_at": now,
        "updated_at": now,
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    result = await db.sites.insert_one(doc)
    site_id = str(result.inserted_id)
    print(f"↑ Site creado · id={site_id} · {SITE_NAME}")
    return site_id


async def ensure_user_iduber(db, tenant_id, juan_id, now):
    """Iduber Montes tech_field (idempotente por email)."""
    existing = await db.users.find_one({"email": TECH_EMAIL})
    if existing:
        user_id = str(existing["_id"])
        print(f"✓ User Iduber ya existe · id={user_id}")
        return user_id

    memberships = [
        {
            "space": "tech_field",
            "role": "tech_external_sub",
            "authority_level": "contractor",
            "organization_id": None,
            "active": True,
        },
    ]
    doc = {
        "tenant_id": tenant_id,
        "email": TECH_EMAIL,
        "full_name": TECH_FULL_NAME,
        "phone": None,
        "country": "US",
        "hashed_password": hash_password(TECH_PWD_SEED),
        "is_active": True,
        "employment_type": "external_sub",
        "email_provisioned_by_srs": True,  # email SRS por contrato cliente
        "space_memberships": memberships,
        "must_change_password": True,  # primer login rota pwd
        "password_changed_at": None,
        "notes": "Tech externo Miami · creado para caso TOUS Dadeland Mall · cadena Fervimax. Email SRS provisionado por contrato.",
        "tz": TECH_TZ,
        "tz_label": TECH_TZ_LABEL,
        "role_title": "Field Technician",
        "display_name": TECH_DISPLAY,
        "work_start": 9,
        "work_end": 18,
        "last_login_at": None,
        "created_at": now,
        "updated_at": now,
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    result = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)
    print(f"↑ User Iduber creado · id={user_id} · pwd seed='{TECH_PWD_SEED}' · must_rotate=True")
    return user_id


async def ensure_work_order(db, tenant_id, org_id, site_id, sa_id, tech_id, andros_id, juan_id, now):
    """WO standalone (idempotente por reference)."""
    existing = await db.work_orders.find_one({
        "tenant_id": tenant_id,
        "reference": WO_REFERENCE,
    })
    if existing:
        wo_id = str(existing["_id"])
        print(f"✓ WO ya existe · id={wo_id} · ref={WO_REFERENCE} · status={existing.get('status')}")
        return wo_id

    sla_snapshot = SHIELD_DEFAULTS["bronze"]
    ball = {
        "side": "srs",  # intake → SRS triaging
        "actor_user_id": andros_id,
        "since": now,
        "reason": "Caso entrante de Fervimax · pending triage por Andros",
    }
    doc = {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "site_id": site_id,
        "service_agreement_id": sa_id,
        "reference": WO_REFERENCE,
        "project_id": None,
        "cluster_group_id": None,
        "title": WO_TITLE,
        "description": WO_DESCRIPTION,
        "severity": "high",  # cliente apretando
        "status": "intake",
        "ball_in_court": ball,
        "assigned_tech_user_id": tech_id,
        "srs_coordinator_user_id": andros_id,
        "noc_operator_user_id": None,
        "onsite_resident_user_id": None,
        "shield_level": "bronze",
        "sla_snapshot": sla_snapshot,
        "deadline_receive_at": None,
        "deadline_resolve_at": None,
        "scheduled_at": None,  # Andros lo agenda tras llamar a Oscar
        "status_timestamps": {"intake": now},  # Iter 2.63j
        "eta_ack": None,
        "handshakes": [],
        "pre_flight_checklist": {},
        "billing_line_id": None,
        "cost_snapshot": None,
        "after_hours": False,
        "closed_at": None,
        "cancelled_at": None,
        "cancel_reason": None,
        "created_at": now,
        "updated_at": now,
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    result = await db.work_orders.insert_one(doc)
    wo_id = str(result.inserted_id)
    print(f"↑ WO creado · id={wo_id} · ref={WO_REFERENCE} · status=intake · tech=Iduber")
    return wo_id


async def ensure_briefing(db, tenant_id, wo_id, site_id, andros_id, now):
    """Briefing assembled (idempotente por work_order_id)."""
    existing = await db.copilot_briefings.find_one({
        "tenant_id": tenant_id,
        "work_order_id": wo_id,
    })
    if existing:
        br_id = str(existing["_id"])
        print(f"✓ Briefing ya existe · id={br_id} · status={existing.get('status')}")
        return br_id

    doc = {
        "tenant_id": tenant_id,
        "work_order_id": wo_id,
        "assembled_at": now,
        "assembled_by": andros_id,
        "site_bible_summary": {
            "site_name": SITE_NAME,
            "address": SITE_ADDRESS,
            "country": SITE_COUNTRY,
            "city": SITE_CITY,
            "timezone": SITE_TIMEZONE,
            "onsite_contact": ONSITE_CONTACT,
            "access_notes": "Tienda en planta de Dadeland Mall · coordinar acceso con Oscar (remoto MX).",
            "has_physical_resident": False,
            "parking_notes": None,
            "security_requirements": None,
            "known_issues": [],
            "confidence": "draft",
        },
        "device_bible": [],
        "history": [],
        "parts_estimate": [],
        "coordinator_notes": BRIEFING_NOTES,
        "status": "assembled",
        "acknowledged_at": None,
        "acknowledged_by": None,
        "supersedes_id": None,
        "created_at": now,
        "updated_at": now,
        "created_by": andros_id,
        "updated_by": andros_id,
    }
    result = await db.copilot_briefings.insert_one(doc)
    br_id = str(result.inserted_id)
    print(f"↑ Briefing creado · id={br_id} · status=assembled · pending ack del tech")
    return br_id


async def main():
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print()
    print("=" * 70)
    print("InsiteIQ — Caso TOUS Dadeland Mall Miami · Fervimax → SRS")
    print("=" * 70)
    now = datetime.now(timezone.utc)
    print(f"Timestamp: {now.isoformat()}")
    print()

    # 1) Tenant SRS
    tenant = await db.tenants.find_one({"code": "SRS"})
    if not tenant:
        tenant = await db.tenants.find_one({})
    if not tenant:
        print("⚠ No tenant en mongo · abortando")
        return
    tenant_id = str(tenant["_id"])
    print(f"Tenant: {tenant.get('code', '(unknown)')} · {tenant_id}")

    # 2) Juan (creator) + Andros (coordinator)
    juan = await db.users.find_one({"email": "juang@systemrapid.io"}) or \
           await db.users.find_one({"email": "juang@systemrapid.com"})
    andros = await db.users.find_one({"email": "androsb@systemrapid.com"})

    if not juan:
        print("⚠ Juan user NO encontrado en mongo · abortando")
        return
    if not andros:
        print("⚠ Andros user NO encontrado · usando Juan como coordinator fallback")
        andros = juan

    juan_id = str(juan["_id"])
    andros_id = str(andros["_id"])
    print(f"Creator (Juan):    {juan_id}")
    print(f"Coordinator (Andros): {andros_id}")
    print()

    # 3) Fervimax org · ensure client relationship
    print("── Fervimax organization ─────────────────────────")
    org_id = await ensure_org_fervimax_has_client_rel(db, tenant_id, juan_id, now)
    if not org_id:
        return

    # 4) Service Agreement Bronze
    print()
    print("── Service Agreement ─────────────────────────────")
    sa_id = await ensure_service_agreement(db, tenant_id, org_id, juan_id, now)

    # 5) Site TOUS
    print()
    print("── Site TOUS Dadeland Mall ───────────────────────")
    site_id = await ensure_site(db, tenant_id, org_id, juan_id, now)

    # 6) Iduber Montes tech user
    print()
    print("── Iduber Montes (tech) ──────────────────────────")
    tech_id = await ensure_user_iduber(db, tenant_id, juan_id, now)

    # 7) Work Order
    print()
    print("── Work Order ────────────────────────────────────")
    wo_id = await ensure_work_order(
        db, tenant_id, org_id, site_id, sa_id, tech_id, andros_id, juan_id, now
    )

    # 8) Briefing
    print()
    print("── Copilot Briefing ──────────────────────────────")
    br_id = await ensure_briefing(db, tenant_id, wo_id, site_id, andros_id, now)

    # ─── Resumen final ──────────────────────────────────────
    print()
    print("=" * 70)
    print("✅ CARGA COMPLETADA · IDs/URLs para el equipo")
    print("=" * 70)
    print(f"Organization Fervimax:  {org_id}")
    print(f"Service Agreement:      {sa_id} (Bronze)")
    print(f"Site TOUS Miami:        {site_id}")
    print(f"User Iduber Montes:     {tech_id}")
    print(f"  email: {TECH_EMAIL}")
    print(f"  pwd seed: {TECH_PWD_SEED} (rota en primer login)")
    print(f"Work Order:             {wo_id}")
    print(f"  reference: {WO_REFERENCE}")
    print(f"  status: intake (Andros lo triage → llama a Oscar → agenda)")
    print(f"Briefing:               {br_id}")
    print(f"  status: assembled (Iduber lo ack antes de en_route)")
    print()
    print("URLs:")
    print(f"  SRS Ops:     https://insiteiq.systemrapid.io/srs/ops/{wo_id}")
    print(f"  Tech PWA:    https://insiteiq.systemrapid.io/tech/ops/{wo_id}")
    print(f"  Site Detail: https://insiteiq.systemrapid.io/srs/sites/{site_id}")
    print()
    print("Próximos pasos del equipo:")
    print("  1. Andros (cuenta androsb@systemrapid.com) abre /srs/ops/<wo_id>")
    print("     · llama a Oscar +52 5568092374 desde la PWA · agenda visita")
    print("     · setea scheduled_at via 'Programar' · WO pasa a triage")
    print("  2. Iduber (cuenta iduberm@systemrapid.com) recibe el WO en su PWA")
    print("     · /tech/ops/<wo_id> · lee briefing · ack · arranca flow")
    print("  3. Smoke test del Iter 2.63j:")
    print("     · status_timestamps debe crecer en cada advance")
    print("     · cuando Iduber llegue → badge drift llegada en header")
    print("     · cuando cierre → badge tiempo on-site")
    print("=" * 70)
    print()


async def runner():
    try:
        await main()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(runner())
