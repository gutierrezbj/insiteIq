"""
InsiteIQ — load_demo_environment.py (2026-06-08)

Ambiente DEMO autocontenido para calibración / estrés end-to-end con el
equipo (Andros + Agustín). Convive con la data REAL (Fervimax/TOUS) sin
pisarla. Reversible: cleanup_demo_environment.py borra solo lo demo.

Decisión del owner 2026-06-08: "tener todas las sesiones de demo habilitadas
para logarse con diferentes usuarios y ver la evolución de los tickets ·
cliente ficticio · hacer el end-to-end para ir sacando cosas".

Crea:
  1. Cliente ficticio "Aurora Retail (DEMO)" · org partner=client
  2. Service Agreement Silver
  3. 4 tiendas demo (Madrid · Barcelona · Valencia · Sevilla)
  4. 7 usuarios DEMO dedicados (pwd seed · SIN rotación · one-click siempre OK):
       demo-admin · demo-coord · demo-finance · demo-cliente ·
       demo-tech · demo-tech-ext · demo-pruebas (doble membership)
  5. 1 WO en intake (DEMO-AURORA-001) lista para recorrer el ciclo completo
  6. 1 briefing assembled

Por qué usuarios DEMO dedicados y no las cuentas reales del equipo:
  - Los chips one-click necesitan pwd CONOCIDA + must_change_password=False.
  - Las cuentas reales rotan pwd (seguridad) → romperían los chips.
  - Prefijo "(Demo)" en el nombre → imposible confundir sandbox con real
    en cockpit / audit_log / reportes.

Uso (desde VPS):
  ssh root@72.62.41.234 'cd /opt/apps/insiteiq && git pull && \\
    docker compose exec -T api python -m scripts.load_demo_environment'

Idempotente · re-ejecutable sin duplicar.
"""
import asyncio
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db
from app.core.security import hash_password
from app.models.service_agreement import SHIELD_DEFAULTS


SEED_PWD = "InsiteIQ2026!"

# ─── Cliente ficticio ────────────────────────────────────────────────
ORG_LEGAL = "Aurora Retail (DEMO)"
ORG_DISPLAY = "Aurora Retail"

SA_CONTRACT_REF = "DEMO-AURORA-SILVER-2026"
SA_TITLE = "Aurora Retail · Break&Fix tiendas · Silver"
SA_SHIELD = "silver"

# ─── 7 usuarios demo (uno por chip del login) ────────────────────────
# Todos: pwd InsiteIQ2026! · must_change_password=False · entran directo.
DEMO_USERS = [
    {
        "email": "demo-admin@systemrapid.com", "full_name": "(Demo) Admin SRS",
        "display_name": "Demo Admin", "role_title": "Owner · full access",
        "tz": "Europe/Madrid", "tz_label": "Madrid", "country": "ES",
        "employment_type": "plantilla",
        "memberships": [{"space": "srs_coordinators", "role": "owner", "authority_level": "owner", "organization_id": None, "active": True}],
    },
    {
        "email": "demo-coord@systemrapid.com", "full_name": "(Demo) Coord Ops",
        "display_name": "Demo Coord", "role_title": "Coordinador de operaciones",
        "tz": "Europe/Madrid", "tz_label": "Madrid", "country": "ES",
        "employment_type": "plantilla",
        "memberships": [{"space": "srs_coordinators", "role": "ops_coordinator", "authority_level": "mid_manager", "organization_id": None, "active": True}],
    },
    {
        "email": "demo-finance@systemrapid.com", "full_name": "(Demo) Finanzas",
        "display_name": "Demo Finanzas", "role_title": "Finance",
        "tz": "Europe/Madrid", "tz_label": "Madrid", "country": "ES",
        "employment_type": "plantilla",
        "memberships": [{"space": "srs_coordinators", "role": "finance", "authority_level": "mid_manager", "organization_id": None, "active": True}],
    },
    {
        "email": "demo-cliente@systemrapid.com", "full_name": "(Demo) Cliente Aurora",
        "display_name": "Demo Cliente", "role_title": "Coordinador cliente · Aurora Retail",
        "tz": "Europe/Madrid", "tz_label": "Madrid", "country": "ES",
        "employment_type": "external_sub",
        # organization_id se rellena en runtime (Aurora org)
        "memberships": [{"space": "client_coordinator", "role": "client_coordinator", "authority_level": "mid_manager", "organization_id": "__AURORA__", "active": True}],
    },
    {
        "email": "demo-tech@systemrapid.com", "full_name": "(Demo) Tech Plantilla",
        "display_name": "Demo Tech", "role_title": "Field technician",
        "tz": "Europe/Madrid", "tz_label": "Madrid", "country": "ES",
        "employment_type": "plantilla",
        "memberships": [{"space": "tech_field", "role": "tech_senior", "authority_level": "mid_manager", "organization_id": None, "active": True}],
    },
    {
        "email": "demo-tech-ext@systemrapid.com", "full_name": "(Demo) Tech Externo",
        "display_name": "Demo Tech Ext", "role_title": "Field technician · sub",
        "tz": "Europe/Madrid", "tz_label": "Madrid", "country": "ES",
        "employment_type": "external_sub",
        "memberships": [{"space": "tech_field", "role": "tech_external_sub", "authority_level": "contractor", "organization_id": None, "active": True}],
    },
    {
        "email": "demo-pruebas@systemrapid.com", "full_name": "(Demo) Pruebas",
        "display_name": "Demo Pruebas", "role_title": "Doble SRS + campo",
        "tz": "Europe/Madrid", "tz_label": "Madrid", "country": "ES",
        "employment_type": "plantilla",
        "memberships": [
            {"space": "srs_coordinators", "role": "demo_user", "authority_level": "mid_manager", "organization_id": None, "active": True},
            {"space": "tech_field", "role": "demo_tech", "authority_level": "mid_manager", "organization_id": None, "active": True},
        ],
    },
]

# ─── 4 tiendas demo ──────────────────────────────────────────────────
DEMO_SITES = [
    {"code": "AURORA-MAD-GV",  "name": "Aurora · Madrid Gran Vía",   "city": "Madrid",    "address": "Gran Vía 28, 28013 Madrid",          "lat": 40.4203, "lng": -3.7058},
    {"code": "AURORA-BCN-DIA", "name": "Aurora · Barcelona Diagonal", "city": "Barcelona", "address": "Av. Diagonal 484, 08006 Barcelona",   "lat": 41.3917, "lng": 2.1649},
    {"code": "AURORA-VLC-COL", "name": "Aurora · Valencia Colón",     "city": "Valencia",  "address": "Carrer de Colón 27, 46004 Valencia",  "lat": 39.4699, "lng": -0.3763},
    {"code": "AURORA-SEV-NER", "name": "Aurora · Sevilla Nervión",    "city": "Sevilla",   "address": "Av. Luis de Morales 3, 41018 Sevilla","lat": 37.3772, "lng": -5.9869},
]

# ─── WO end-to-end (recorrer ciclo completo) ─────────────────────────
WO_REFERENCE = "DEMO-AURORA-001"
WO_TITLE = "POS caído + impresora tickets · tienda Gran Vía"
WO_DESCRIPTION = (
    "CASO DEMO end-to-end para calibración con el equipo.\n\n"
    "Síntoma reportado por la tienda: el TPV principal de caja 1 no levanta "
    "y la impresora de tickets no responde. Posible problema de red o de "
    "alimentación PoE del switch.\n\n"
    "Objetivo del recorrido (sacar cosas en cada paso):\n"
    " 1. Coord: triage → asignar tech → pre-flight → despachar\n"
    " 2. Tech: leer briefing → ack → salí → llegué → capturar evidencia → resolver\n"
    " 3. Coord: validar y cerrar\n"
    " 4. Finanzas: ver pre-invoice generada\n"
    " 5. Cliente: ver el ticket scoped + reporte final\n\n"
    "Es ficticio. Cliente Aurora Retail (DEMO). Usar para estresar el flujo "
    "completo y anotar fricciones."
)
WO_BRIEFING = (
    "TIENDA: Aurora · Madrid Gran Vía · Gran Vía 28\n"
    "HORA: a coordinar con la tienda (horario comercial 10:00-21:00)\n\n"
    "SÍNTOMA: TPV caja 1 no levanta + impresora tickets sin respuesta.\n\n"
    "PASOS SUGERIDOS:\n"
    " 1. Verificar alimentación del switch (PoE) y estado de puertos.\n"
    " 2. Probar cable de red del TPV en otro puerto.\n"
    " 3. Si el switch da problemas de PoE, documentar modelo + serial.\n"
    " 4. Validar que TPV + impresora + datafono levantan.\n"
    " 5. Foto antes/después · capture submit.\n\n"
    "Contacto en tienda: encargado/a de turno (preguntar en caja).\n\n"
    "NOTA: caso DEMO para calibración · no es intervención real."
)


async def ensure_org(db, tenant_id, juan_id, now):
    existing = await db.organizations.find_one({"legal_name": ORG_LEGAL})
    if existing:
        org_id = str(existing["_id"])
        print(f"✓ Org Aurora ya existe · id={org_id}")
        return org_id
    doc = {
        "tenant_id": tenant_id,
        "legal_name": ORG_LEGAL,
        "display_name": ORG_DISPLAY,
        "country": "ES",
        "jurisdiction": "ES",
        "tax_ids": {},
        "bank_accounts": [],
        "partner_relationships": [{
            "type": "client",
            "started_at": now,
            "status": "active",
            "terms": {"scope": "Break&Fix tiendas · ambiente DEMO calibración"},
        }],
        "status": "active",
        "notes": "Cliente FICTICIO para calibración/estrés end-to-end. Borrable con cleanup_demo_environment.",
        "created_at": now, "updated_at": now, "created_by": juan_id, "updated_by": juan_id,
    }
    result = await db.organizations.insert_one(doc)
    org_id = str(result.inserted_id)
    print(f"↑ Org Aurora creada · id={org_id}")
    return org_id


async def ensure_sa(db, tenant_id, org_id, juan_id, now):
    existing = await db.service_agreements.find_one({"tenant_id": tenant_id, "contract_ref": SA_CONTRACT_REF})
    if existing:
        sa_id = str(existing["_id"])
        print(f"✓ SA Aurora ya existe · id={sa_id}")
        return sa_id
    doc = {
        "tenant_id": tenant_id, "organization_id": org_id,
        "contract_ref": SA_CONTRACT_REF, "title": SA_TITLE,
        "shield_level": SA_SHIELD, "sla_spec": SHIELD_DEFAULTS[SA_SHIELD],
        "parts_approval_threshold_usd": 200.0, "rate_card": None,
        "srs_entity_id": None, "currency": "EUR", "active": True,
        "starts_at": now.isoformat(), "ends_at": None,
        "notes": "DEMO · ajustar rate_card en calibración.",
        "created_at": now, "updated_at": now, "created_by": juan_id, "updated_by": juan_id,
    }
    result = await db.service_agreements.insert_one(doc)
    sa_id = str(result.inserted_id)
    print(f"↑ SA Aurora creada · id={sa_id} · Silver")
    return sa_id


async def ensure_sites(db, tenant_id, org_id, juan_id, now):
    site_ids = {}
    for spec in DEMO_SITES:
        existing = await db.sites.find_one({"tenant_id": tenant_id, "code": spec["code"]})
        if existing:
            site_ids[spec["code"]] = str(existing["_id"])
            print(f"✓ Site {spec['code']} ya existe")
            continue
        doc = {
            "tenant_id": tenant_id, "organization_id": org_id,
            "code": spec["code"], "name": spec["name"], "country": "ES",
            "city": spec["city"], "address": spec["address"], "timezone": "Europe/Madrid",
            "lat": spec["lat"], "lng": spec["lng"], "geofence_radius_m": None,
            "site_type": "retail",
            "onsite_contact": {"name": "Encargado/a de turno", "phone": None, "email": None, "role": "store_manager"},
            "has_physical_resident": False, "default_noc_operator_user_id": None,
            "access_notes": "Tienda Aurora Retail (DEMO). Acceso en horario comercial.",
            "status": "active", "notes": "Site FICTICIO demo.",
            "created_at": now, "updated_at": now, "created_by": juan_id, "updated_by": juan_id,
        }
        result = await db.sites.insert_one(doc)
        site_ids[spec["code"]] = str(result.inserted_id)
        print(f"↑ Site creado · {spec['code']} · {spec['name']}")
    return site_ids


async def ensure_users(db, tenant_id, org_id, juan_id, now):
    user_ids = {}
    for spec in DEMO_USERS:
        existing = await db.users.find_one({"email": spec["email"]})
        # resolver placeholder org del cliente demo
        memberships = []
        for m in spec["memberships"]:
            mm = dict(m)
            if mm.get("organization_id") == "__AURORA__":
                mm["organization_id"] = org_id
            memberships.append(mm)

        if existing:
            # asegurar pwd seed + sin rotación + memberships limpias (idempotente)
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "hashed_password": hash_password(SEED_PWD),
                    "must_change_password": False,
                    "password_changed_at": now,
                    "space_memberships": memberships,
                    "is_active": True,
                    "updated_at": now,
                }},
            )
            user_ids[spec["email"]] = str(existing["_id"])
            print(f"✓ User {spec['email']} actualizado (pwd seed · sin rotación)")
            continue

        doc = {
            "tenant_id": tenant_id, "email": spec["email"], "full_name": spec["full_name"],
            "phone": None, "country": spec["country"], "hashed_password": hash_password(SEED_PWD),
            "is_active": True, "employment_type": spec["employment_type"],
            "email_provisioned_by_srs": False, "space_memberships": memberships,
            "must_change_password": False, "password_changed_at": now,
            "notes": "Usuario DEMO dedicado · calibración. Borrable con cleanup_demo_environment.",
            "tz": spec["tz"], "tz_label": spec["tz_label"], "role_title": spec["role_title"],
            "display_name": spec["display_name"], "work_start": 9, "work_end": 18,
            "last_login_at": None, "created_at": now, "updated_at": now,
            "created_by": juan_id, "updated_by": juan_id,
        }
        result = await db.users.insert_one(doc)
        user_ids[spec["email"]] = str(result.inserted_id)
        print(f"↑ User creado · {spec['email']} · {spec['full_name']}")
    return user_ids


async def ensure_wo(db, tenant_id, org_id, site_id, sa_id, tech_id, coord_id, juan_id, now):
    existing = await db.work_orders.find_one({"tenant_id": tenant_id, "reference": WO_REFERENCE})
    if existing:
        wo_id = str(existing["_id"])
        print(f"✓ WO {WO_REFERENCE} ya existe · status={existing.get('status')}")
        return wo_id
    ball = {"side": "srs", "actor_user_id": coord_id, "since": now, "reason": "Caso demo · pending triage"}
    doc = {
        "tenant_id": tenant_id, "organization_id": org_id, "site_id": site_id,
        "service_agreement_id": sa_id, "reference": WO_REFERENCE,
        "project_id": None, "cluster_group_id": None,
        "title": WO_TITLE, "description": WO_DESCRIPTION, "severity": "high",
        "status": "intake", "ball_in_court": ball,
        "assigned_tech_user_id": tech_id, "srs_coordinator_user_id": coord_id,
        "noc_operator_user_id": None, "onsite_resident_user_id": None,
        "shield_level": SA_SHIELD, "sla_snapshot": SHIELD_DEFAULTS[SA_SHIELD],
        "deadline_receive_at": None, "deadline_resolve_at": None, "scheduled_at": None,
        "status_timestamps": {"intake": now}, "eta_ack": None, "handshakes": [],
        "pre_flight_checklist": {}, "billing_line_id": None, "cost_snapshot": None,
        "after_hours": False, "closed_at": None, "cancelled_at": None, "cancel_reason": None,
        "created_at": now, "updated_at": now, "created_by": juan_id, "updated_by": juan_id,
    }
    result = await db.work_orders.insert_one(doc)
    wo_id = str(result.inserted_id)
    print(f"↑ WO creado · {WO_REFERENCE} · status=intake · tech=(Demo) Tech")
    return wo_id


async def ensure_briefing(db, tenant_id, wo_id, site_spec, coord_id, now):
    existing = await db.copilot_briefings.find_one({"tenant_id": tenant_id, "work_order_id": wo_id})
    if existing:
        print(f"✓ Briefing demo ya existe")
        return str(existing["_id"])
    doc = {
        "tenant_id": tenant_id, "work_order_id": wo_id,
        "assembled_at": now, "assembled_by": coord_id,
        "site_bible_summary": {
            "site_name": site_spec["name"], "address": site_spec["address"],
            "country": "ES", "city": site_spec["city"], "timezone": "Europe/Madrid",
            "onsite_contact": {"name": "Encargado/a de turno", "phone": None, "email": None, "role": "store_manager"},
            "access_notes": "Tienda Aurora (DEMO) · horario comercial.",
            "has_physical_resident": False, "parking_notes": None,
            "security_requirements": None, "known_issues": [], "confidence": "draft",
        },
        "device_bible": [], "history": [], "parts_estimate": [],
        "coordinator_notes": WO_BRIEFING, "status": "assembled",
        "acknowledged_at": None, "acknowledged_by": None, "supersedes_id": None,
        "created_at": now, "updated_at": now, "created_by": coord_id, "updated_by": coord_id,
    }
    result = await db.copilot_briefings.insert_one(doc)
    print(f"↑ Briefing demo creado · assembled · pending ack")
    return str(result.inserted_id)


async def main():
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print()
    print("=" * 70)
    print("InsiteIQ — Ambiente DEMO · Aurora Retail (cliente ficticio)")
    print("=" * 70)
    now = datetime.now(timezone.utc)
    print(f"Timestamp: {now.isoformat()}")
    print()

    tenant = await db.tenants.find_one({"code": "SRS"}) or await db.tenants.find_one({})
    if not tenant:
        print("⚠ No tenant · abortando"); return
    tenant_id = str(tenant["_id"])
    juan = await db.users.find_one({"email": "juang@systemrapid.io"}) or await db.users.find_one({"email": "juang@systemrapid.com"})
    juan_id = str(juan["_id"]) if juan else None

    print("── Cliente ficticio ──────────────────────────────")
    org_id = await ensure_org(db, tenant_id, juan_id, now)
    print()
    print("── Service Agreement ─────────────────────────────")
    sa_id = await ensure_sa(db, tenant_id, org_id, juan_id, now)
    print()
    print("── 4 tiendas demo ────────────────────────────────")
    site_ids = await ensure_sites(db, tenant_id, org_id, juan_id, now)
    print()
    print("── 7 usuarios demo ───────────────────────────────")
    user_ids = await ensure_users(db, tenant_id, org_id, juan_id, now)
    print()
    print("── WO end-to-end ─────────────────────────────────")
    wo_id = await ensure_wo(
        db, tenant_id, org_id, site_ids["AURORA-MAD-GV"], sa_id,
        user_ids["demo-tech@systemrapid.com"], user_ids["demo-coord@systemrapid.com"], juan_id, now,
    )
    print()
    print("── Briefing ──────────────────────────────────────")
    await ensure_briefing(db, tenant_id, wo_id, DEMO_SITES[0], user_ids["demo-coord@systemrapid.com"], now)

    print()
    print("=" * 70)
    print("✅ AMBIENTE DEMO LISTO")
    print("=" * 70)
    print(f"Cliente:  Aurora Retail (DEMO) · {org_id}")
    print(f"Tiendas:  4 (Madrid · Barcelona · Valencia · Sevilla)")
    print(f"WO:       {WO_REFERENCE} · intake · lista para recorrer end-to-end")
    print()
    print("7 chips one-click (pwd InsiteIQ2026! · sin rotación · entran directo):")
    for spec in DEMO_USERS:
        print(f"  · {spec['email']:34s} → {spec['full_name']}")
    print()
    print("Recorrido sugerido del end-to-end:")
    print("  1. (Demo) Coord  → cockpit → triage WO → pre-flight → despachar")
    print("  2. (Demo) Tech   → PWA → leer briefing → ack → salí → llegué → capturar → resolver")
    print("  3. (Demo) Coord  → cerrar WO")
    print("  4. (Demo) Finanzas → ver pre-invoice")
    print("  5. (Demo) Cliente  → ver ticket scoped + reporte")
    print()
    print("La data REAL (Fervimax/TOUS) queda intacta. Reversible con")
    print("cleanup_demo_environment.py cuando terminen de calibrar.")
    print("=" * 70)
    print()


async def runner():
    try:
        await main()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(runner())
