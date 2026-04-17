"""
InsiteIQ v1 Foundation — Realistic seed

Populates:
  - tenant SRS
  - 4 srs_entities (SR-UK, SR-US, SR-SA active; SR-ES closed 2026-04-15)
  - organizations from real SRS team memory (Fractalia, Telefonica, Inditex, Claro US,
    Arcos Dorados, GRUMA, Fervimax, Bepensa, DXC UK, HQ Computacion...)
  - users: Juan, Sajid, Andros, Adriana, Luis, Agustin, Yunus, Arlindo + sample client contacts
  - seed audit_log entries documenting the seed itself

Idempotent: re-running drops collections and recreates fresh.
Default password for all seeded users: "InsiteIQ2026!"
Rotate in production via admin UI when that phase lands.

Run:
    docker compose exec api python -m scripts.seed_foundation
    # or locally
    cd backend && python -m scripts.seed_foundation
"""
import asyncio
from datetime import datetime, timedelta, timezone

from bson import ObjectId

from app.core.security import hash_password
from app.database import close_db, connect_db, get_db
from app.models.service_agreement import ServiceAgreement, SHIELD_DEFAULTS

DEFAULT_PASSWORD = "InsiteIQ2026!"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def seed():
    await connect_db()
    db = get_db()
    assert db is not None, "DB connection failed"

    print("Foundation seed — dropping Foundation collections...")
    for col in (
        "tenants",
        "srs_entities",
        "organizations",
        "users",
        "audit_log",
        "assets",
        "asset_events",
        "sites",
        "service_agreements",
        "work_orders",
        # Modo 1 satellites
        "ticket_threads",
        "ticket_messages",
        "copilot_briefings",
        "tech_captures",
        "intervention_reports",
        "email_outbox",
        "webhook_outbox",
        "budget_approval_requests",
        "skill_passports",
        "tech_ratings",
        # Modo 2
        "projects",
        "cluster_groups",
        "bulk_upload_events",
    ):
        await db[col].drop()

    # --- Tenant ---
    srs_tenant_id = ObjectId()
    await db.tenants.insert_one(
        {
            "_id": srs_tenant_id,
            "tenant_id": str(srs_tenant_id),  # self-reference for uniformity
            "code": "SRS",
            "name": "System Rapid Solutions",
            "status": "active",
            "tier": "internal",
            "notes": "v1 single-tenant. Ghost Tech multi-tenant is Fase 7+.",
            "created_at": _now(),
            "updated_at": _now(),
        }
    )
    tenant_id = str(srs_tenant_id)

    # --- SRS entities ---
    srs_entities = [
        {
            "code": "SR-UK",
            "legal_name": "System Rapid LTD",
            "country": "GB",
            "currency": "GBP",
            "tax_ids": {"vat": "GB-TBD"},
            "status": "active",
        },
        {
            "code": "SR-US",
            "legal_name": "System Rapid US Inc.",
            "country": "US",
            "currency": "USD",
            "tax_ids": {"ein": "US-TBD"},
            "status": "active",
        },
        {
            "code": "SR-SA",
            "legal_name": "System Rapid Saudi Arabia",
            "country": "SA",
            "currency": "SAR",
            "tax_ids": {},
            "status": "active",
            "notes": "Legal name pending Sajid confirmation.",
        },
        {
            "code": "SR-ES",
            "legal_name": "System Rapid Espana S.L.",
            "country": "ES",
            "currency": "EUR",
            "tax_ids": {"nif": "ES-CLOSED"},
            "status": "closed",
            "closed_at": "2026-04-15",
            "notes": "Cerrada 2026-04-15. Facturacion ES ahora via SR-UK IVA intracomunitario.",
        },
    ]
    for e in srs_entities:
        e.update({"tenant_id": tenant_id, "created_at": _now(), "updated_at": _now()})
    await db.srs_entities.insert_many(srs_entities)

    # --- Organizations (from real SRS operations memory) ---
    orgs = [
        _org(
            tenant_id,
            legal_name="Fractalia Systems S.L.",
            display_name="Fractalia",
            country="ES",
            partners=[
                {"type": "prime_contractor", "contract_ref": "FRAC-TEL-2026-2029"},
                {"type": "client"},
            ],
        ),
        _org(
            tenant_id,
            legal_name="Telefonica S.A.",
            display_name="Telefonica",
            country="ES",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="Industria de Diseno Textil S.A. (Inditex)",
            display_name="Inditex",
            country="ES",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="Carolina Herrera Ltd",
            display_name="Carolina Herrera",
            country="ES",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="Purificacion Garcia",
            display_name="Purificacion Garcia",
            country="ES",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="Duty Free Americas / Dufry (flagships)",
            display_name="Duty Free",
            country="INT",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="Claro US",
            display_name="Claro US",
            country="US",
            partners=[{"type": "client"}],
        ),
        _org(
            tenant_id,
            legal_name="Claro Panama",
            display_name="Claro Panama",
            country="PA",
            partners=[{"type": "client"}],
        ),
        _org(
            tenant_id,
            legal_name="Arcos Dorados Panama (McDonalds)",
            display_name="Arcos Dorados",
            country="PA",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="Grupo Industrial Maseca (GRUMA)",
            display_name="GRUMA",
            country="MX",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="Fervimax",
            display_name="Fervimax",
            country="MX",
            partners=[
                {
                    "type": "client",
                    "notes": "Client in GRUMA delivery chain",
                },
                {
                    "type": "channel_partner",
                    "commission_rule": {"base_pct": 10, "scope": "panama"},
                    "notes": "10% commission on Panama-originated deals",
                },
                {
                    "type": "joint_venture_partner",
                    "revenue_split_pct": 50,
                    "cost_split_pct": 50,
                    "notes": "JV for Bepensa Carolina survey deliverables",
                },
                {
                    "type": "vendor_labor",
                    "notes": "Local execution for GRUMA Mexico",
                },
            ],
        ),
        _org(
            tenant_id,
            legal_name="Bepensa",
            display_name="Bepensa",
            country="MX",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="DXC Technology UK",
            display_name="DXC UK",
            country="GB",
            partners=[{"type": "prime_contractor"}, {"type": "client"}],
        ),
        _org(
            tenant_id,
            legal_name="INETUM",
            display_name="INETUM",
            country="ES",
            partners=[{"type": "prime_contractor"}],
        ),
        _org(
            tenant_id,
            legal_name="Avangrid USA",
            display_name="Avangrid",
            country="US",
            partners=[{"type": "end_client_metadata"}],
        ),
        _org(
            tenant_id,
            legal_name="HQ Computacion SA de CV",
            display_name="HQ Computacion",
            country="MX",
            partners=[{"type": "vendor_labor"}],
            notes=(
                "Pain Evidence #001 — cobranza por WhatsApp personal. "
                "Primer vendor a mover a Vendor Payables Inbox."
            ),
        ),
    ]
    org_docs = await db.organizations.insert_many(orgs)
    org_ids = {o["display_name"]: str(i) for o, i in zip(orgs, org_docs.inserted_ids)}

    # --- Users (SRS core team + external subs + key client contacts) ---
    pwd = hash_password(DEFAULT_PASSWORD)

    users = [
        _user(
            tenant_id,
            pwd,
            email="juancho@systemrapid.com",
            full_name="Juan Gutierrez Blanco",
            country="ES",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "lead", "owner")],
        ),
        _user(
            tenant_id,
            pwd,
            email="sajid@systemrapid.com",
            full_name="Sajid (Owner read-only)",
            country="GB",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "owner_readonly", "owner")],
        ),
        _user(
            tenant_id,
            pwd,
            email="andros@systemrapid.com",
            full_name="Andros Briceno",
            country="VE",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "ops_coordinator", "mid_manager")],
        ),
        _user(
            tenant_id,
            pwd,
            email="adriana@systemrapid.com",
            full_name="Adriana (Finance)",
            country="VE",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "finance", "director")],
        ),
        _user(
            tenant_id,
            pwd,
            email="luis.sanchez@systemrapid.com",
            full_name="Luis Sanchez",
            country="PE",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "field_consultant", "mid_manager")],
        ),
        _user(
            tenant_id,
            pwd,
            email="agustin@systemrapid.com",
            full_name="Agustin (Top Tech)",
            country="ES",
            employment="plantilla",
            memberships=[
                _m("srs_coordinators", "tech_senior", "mid_manager"),
                _m("tech_field", "tech_senior", "mid_manager"),
            ],
        ),
        _user(
            tenant_id,
            pwd,
            email="yunus@systemrapid.com",
            full_name="Yunus (Account Lead London)",
            country="GB",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "account_lead", "mid_manager")],
        ),
        _user(
            tenant_id,
            pwd,
            email="arlindo@systemrapid.com",
            full_name="Arlindo (External Contractor, Claro US contract)",
            country="US",
            employment="external_sub",
            email_provisioned=True,
            memberships=[_m("tech_field", "tech_contractor", "contractor")],
        ),
        # Sample client-side contacts (will expand as real contracts land)
        _user(
            tenant_id,
            pwd,
            email="rackel.rocha@fractaliasystems.es",
            full_name="Rackel Rocha (Fractalia)",
            country="ES",
            employment="external_sub",
            memberships=[
                _m(
                    "client_coordinator",
                    "preventa",
                    "mid_manager",
                    organization_id=org_ids["Fractalia"],
                )
            ],
        ),
    ]
    user_result = await db.users.insert_many(users)
    # Map email -> inserted id for later references
    user_ids: dict[str, str] = {
        u["email"]: str(i) for u, i in zip(users, user_result.inserted_ids)
    }

    # --- Modo 1 seed: sites + service_agreements + work_orders ---
    fractalia_id = org_ids["Fractalia"]
    claro_us_id = org_ids["Claro US"]
    inditex_id = org_ids["Inditex"]

    # 3 sites (real cases from Pain Log)
    sites = [
        {
            "tenant_id": tenant_id,
            "organization_id": fractalia_id,
            "code": "ZARA-CL-TAL",
            "name": "ZARA Mall Plaza Trebol — Talcahuano",
            "country": "CL",
            "city": "Talcahuano",
            "address": "Mall Plaza Trebol, Talcahuano, Bio Bio",
            "timezone": "America/Santiago",
            "has_physical_resident": False,
            "status": "active",
            "notes": "Pain Evidence #002 — 29 dias / $100 / -400% margen. 5h22m de Santiago.",
            "created_at": _now(),
            "updated_at": _now(),
        },
        {
            "tenant_id": tenant_id,
            "organization_id": fractalia_id,
            "code": "INDITEX-MX-TEN",
            "name": "Inditex Tenancingo",
            "country": "MX",
            "city": "Tenancingo de Degollado",
            "address": "Manzana 008, Centro, 52400 Tenancingo, Mexico",
            "timezone": "America/Mexico_City",
            "has_physical_resident": False,
            "status": "active",
            "notes": "Pain Evidence #002 epilogo — recogida hilos musicales.",
            "created_at": _now(),
            "updated_at": _now(),
        },
        {
            "tenant_id": tenant_id,
            "organization_id": claro_us_id,
            "code": "CLARO-US-MIRAMAR",
            "name": "Claro US Warehouse Miramar",
            "country": "US",
            "city": "Miramar",
            "address": "Miramar, Florida",
            "timezone": "America/New_York",
            "has_physical_resident": True,
            "status": "active",
            "notes": "Pain Evidence #003 — audit inventory 21K vs 9K, Arturo Pellerano SOW dispute.",
            "created_at": _now(),
            "updated_at": _now(),
        },
    ]
    site_insert = await db.sites.insert_many(sites)
    site_ids = {s["code"]: str(i) for s, i in zip(sites, site_insert.inserted_ids)}

    # 3 service_agreements (Bronze_plus / Silver / Gold spread)
    agreements = [
        {
            "tenant_id": tenant_id,
            "organization_id": fractalia_id,
            "contract_ref": "FRAC-TEL-2026-2029",
            "title": "Fractalia-Telefonica Onsite Mant Intl 2026-2029",
            "shield_level": "bronze_plus",
            "sla_spec": SHIELD_DEFAULTS["bronze_plus"],
            "parts_approval_threshold_usd": 150.0,
            "currency": "EUR",
            "active": True,
            "starts_at": "2026-01-01",
            "ends_at": "2029-12-31",
            "notes": "Renovacion 4 anos. 78 paises. 6,630+ intervenciones/ano iniciales estimadas.",
            "created_at": _now(),
            "updated_at": _now(),
        },
        {
            "tenant_id": tenant_id,
            "organization_id": claro_us_id,
            "contract_ref": "CLARO-US-2026-AUDIT",
            "title": "Claro US Audit/Inventory Miramar",
            "shield_level": "silver",
            "sla_spec": SHIELD_DEFAULTS["silver"],
            "parts_approval_threshold_usd": 500.0,
            "currency": "USD",
            "active": True,
            "notes": "Engagement tipo Modo 4 Audit + operativa reactiva Modo 1.",
            "created_at": _now(),
            "updated_at": _now(),
        },
        {
            "tenant_id": tenant_id,
            "organization_id": org_ids["DXC UK"],
            "contract_ref": "DXC-UK-2026-DCMIGRATION",
            "title": "DXC UK DC Migration (sample Gold)",
            "shield_level": "gold",
            "sla_spec": SHIELD_DEFAULTS["gold"],
            "parts_approval_threshold_usd": 1000.0,
            "currency": "GBP",
            "active": True,
            "notes": "Sample Gold. Usado para demostrar 24x7 + client_copilot_readonly.",
            "created_at": _now(),
            "updated_at": _now(),
        },
    ]
    ag_insert = await db.service_agreements.insert_many(agreements)
    ag_ids = {a["contract_ref"]: str(i) for a, i in zip(agreements, ag_insert.inserted_ids)}

    # 3 work_orders in distinct stages (intake / en_route / resolved)
    juan_id = user_ids["juancho@systemrapid.com"]
    andros_id = user_ids["andros@systemrapid.com"]
    arlindo_id = user_ids["arlindo@systemrapid.com"]
    agustin_id = user_ids["agustin@systemrapid.com"]

    def sla_deadlines(level: str, now: datetime) -> tuple[datetime, datetime]:
        spec = SHIELD_DEFAULTS[level]
        return (
            now + timedelta(minutes=spec["receive_minutes"]),
            now + timedelta(minutes=spec["resolve_minutes"]),
        )

    now = _now()
    recv_bp, res_bp = sla_deadlines("bronze_plus", now)
    recv_si, res_si = sla_deadlines("silver", now)

    work_orders = [
        # 1. In intake (just received, not yet triaged)
        {
            "tenant_id": tenant_id,
            "organization_id": fractalia_id,
            "site_id": site_ids["INDITEX-MX-TEN"],
            "service_agreement_id": ag_ids["FRAC-TEL-2026-2029"],
            "reference": "FRAC-CS-0000101",
            "title": "Reemplazo hilo musical compacto — Inditex Tenancingo",
            "description": "Cliente reporta sin emision. Replacement audio thread rack.",
            "severity": "normal",
            "status": "intake",
            "ball_in_court": {
                "side": "srs",
                "actor_user_id": andros_id,
                "since": now,
                "reason": "intake received from Fractalia",
            },
            "assigned_tech_user_id": None,
            "srs_coordinator_user_id": andros_id,
            "noc_operator_user_id": None,
            "onsite_resident_user_id": None,
            "shield_level": "bronze_plus",
            "sla_snapshot": SHIELD_DEFAULTS["bronze_plus"],
            "deadline_receive_at": recv_bp,
            "deadline_resolve_at": res_bp,
            "handshakes": [],
            "pre_flight_checklist": {},
            "created_at": now,
            "updated_at": now,
            "created_by": andros_id,
            "updated_by": andros_id,
        },
        # 2. In en_route (tech moving to site)
        {
            "tenant_id": tenant_id,
            "organization_id": claro_us_id,
            "site_id": site_ids["CLARO-US-MIRAMAR"],
            "service_agreement_id": ag_ids["CLARO-US-2026-AUDIT"],
            "reference": "CLARO-WO-2026-0044",
            "title": "Inspeccion serial mismatch — Warehouse Miramar",
            "description": "Revisitar discrepancia 21K vs 9K records, muestra inicial 500 items.",
            "severity": "high",
            "status": "en_route",
            "ball_in_court": {
                "side": "tech",
                "actor_user_id": arlindo_id,
                "since": now - timedelta(hours=2),
                "reason": "tech en route to site",
            },
            "assigned_tech_user_id": arlindo_id,
            "srs_coordinator_user_id": juan_id,
            "noc_operator_user_id": None,
            "onsite_resident_user_id": None,
            "shield_level": "silver",
            "sla_snapshot": SHIELD_DEFAULTS["silver"],
            "deadline_receive_at": recv_si,
            "deadline_resolve_at": res_si,
            "handshakes": [],
            "pre_flight_checklist": {
                "kit_verified": True,
                "parts_ready": True,
                "site_bible_read": True,
                "all_green": True,
            },
            "created_at": now - timedelta(hours=6),
            "updated_at": now - timedelta(hours=2),
            "created_by": juan_id,
            "updated_by": arlindo_id,
        },
        # 3. Resolved, awaiting client sign-off (ball on client side)
        {
            "tenant_id": tenant_id,
            "organization_id": fractalia_id,
            "site_id": site_ids["ZARA-CL-TAL"],
            "service_agreement_id": ag_ids["FRAC-TEL-2026-2029"],
            "reference": "FRAC-CS-0000099",
            "title": "Reemplazo hilo musical — ZARA Talcahuano",
            "description": "Servicio completado onsite. Esperando sign-off NOC Operator.",
            "severity": "normal",
            "status": "resolved",
            "ball_in_court": {
                "side": "client",
                "actor_user_id": None,
                "since": now - timedelta(hours=1),
                "reason": "awaiting NOC Operator sign-off",
            },
            "assigned_tech_user_id": agustin_id,
            "srs_coordinator_user_id": juan_id,
            "noc_operator_user_id": None,
            "onsite_resident_user_id": None,
            "shield_level": "bronze_plus",
            "sla_snapshot": SHIELD_DEFAULTS["bronze_plus"],
            "deadline_receive_at": recv_bp,
            "deadline_resolve_at": res_bp,
            "handshakes": [
                {
                    "kind": "check_in",
                    "ts": now - timedelta(hours=4),
                    "actor_user_id": agustin_id,
                    "notes": "Onsite check-in, Mall Plaza Trebol",
                    "lat": -36.72,
                    "lng": -73.11,
                },
                {
                    "kind": "resolution",
                    "ts": now - timedelta(hours=1),
                    "actor_user_id": agustin_id,
                    "notes": "Hilo musical reemplazado, prueba de audio OK",
                    "lat": -36.72,
                    "lng": -73.11,
                },
            ],
            "pre_flight_checklist": {
                "kit_verified": True,
                "parts_ready": True,
                "site_bible_read": True,
                "all_green": True,
            },
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(hours=1),
            "created_by": juan_id,
            "updated_by": agustin_id,
        },
    ]
    await db.work_orders.insert_many(work_orders)

    # --- Modo 2 seed: Arcos Dorados Panama rollout ---
    # Add a Claro Panama agreement + Arcos Dorados rollout project + 3 sites + 3 WOs
    claro_pa_id = org_ids["Claro Panama"]
    arcos_id = org_ids["Arcos Dorados"]

    claro_pa_agreement = {
        "tenant_id": tenant_id,
        "organization_id": claro_pa_id,
        "contract_ref": "CLARO-PA-ARCOS-2026",
        "title": "Claro Panama — Arcos Dorados SDWAN rollout",
        "shield_level": "silver",
        "sla_spec": SHIELD_DEFAULTS["silver"],
        "parts_approval_threshold_usd": 300.0,
        "currency": "USD",
        "active": True,
        "notes": "Rollout SDWAN 95 McDonald's Panama — seed truncated to 3 sites for demo.",
        "created_at": _now(),
        "updated_at": _now(),
    }
    claro_pa_ag_insert = await db.service_agreements.insert_one(claro_pa_agreement)
    claro_pa_ag_id = str(claro_pa_ag_insert.inserted_id)

    arcos_sites = [
        {
            "tenant_id": tenant_id,
            "organization_id": claro_pa_id,
            "code": "MCD-PA-P01",
            "name": "McDonald's Costa del Este",
            "country": "PA",
            "city": "Panama City",
            "address": "Costa del Este, Panama",
            "timezone": "America/Panama",
            "has_physical_resident": False,
            "status": "active",
            "notes": "Arcos Dorados site 1 (of 95).",
            "created_at": _now(),
            "updated_at": _now(),
        },
        {
            "tenant_id": tenant_id,
            "organization_id": claro_pa_id,
            "code": "MCD-PA-P02",
            "name": "McDonald's Albrook Mall",
            "country": "PA",
            "city": "Panama City",
            "address": "Albrook Mall, Panama",
            "timezone": "America/Panama",
            "has_physical_resident": False,
            "status": "active",
            "notes": "Arcos Dorados site 2.",
            "created_at": _now(),
            "updated_at": _now(),
        },
        {
            "tenant_id": tenant_id,
            "organization_id": claro_pa_id,
            "code": "MCD-PA-P47",
            "name": "McDonald's David (historically lost P47)",
            "country": "PA",
            "city": "David, Chiriqui",
            "address": "David, Chiriqui",
            "timezone": "America/Panama",
            "has_physical_resident": False,
            "status": "active",
            "notes": "El P47 que se perdio en tabla Excel del historico — ahora trazado.",
            "created_at": _now(),
            "updated_at": _now(),
        },
    ]
    arcos_sites_insert = await db.sites.insert_many(arcos_sites)
    arcos_site_ids = [str(i) for i in arcos_sites_insert.inserted_ids]

    arcos_project = {
        "tenant_id": tenant_id,
        "type": "rollout",
        "delivery_pattern": "rollout",
        "code": "ARCOS-PA-SDWAN-2026",
        "title": "SDWAN McDonald's Panama — 95 sites rollout",
        "description": "Rollout SDWAN multi-site Claro/Arcos Dorados. Seed demo con 3 sites (real: 95). Caso referencia Decision Modo 2.",
        "client_organization_id": claro_pa_id,
        "service_agreement_id": claro_pa_ag_id,
        "srs_entity_id": None,
        "po_number": "PA-1000066",
        "end_client_organization_id": arcos_id,
        "delivery_chain": [
            {"tier_index": 0, "organization_id": arcos_id, "role": "end_client_metadata", "notes": "Arcos Dorados — no user access"},
            {"tier_index": 1, "organization_id": claro_pa_id, "role": "client", "notes": "Claro Panama contractual"},
        ],
        # cluster_lead = ROL: Agustin (Venezuela) lidera Panama remoto (Decision #2)
        "cluster_lead_user_id": agustin_id,
        "field_senior_user_id": None,
        "srs_coordinator_user_id": juan_id,
        "total_sites_target": 95,  # ambition even with 3 seeded
        "playbook_template": "sdwan-install-v1",
        "status": "active",
        "start_date": _now() - timedelta(days=45),
        "target_end_date": _now() + timedelta(days=135),
        "actual_end_date": None,
        "summary": "Rollout SDWAN regional. Caso antimodelo del historico (P47 perdido) ahora correctamente trazado.",
        "metadata": {"original_sites_count": 95, "demo_seeded": 3},
        "created_at": _now() - timedelta(days=45),
        "updated_at": _now(),
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    arcos_proj_insert = await db.projects.insert_one(arcos_project)
    arcos_proj_id = str(arcos_proj_insert.inserted_id)

    # One cluster for wave 1 (activated)
    cluster_w1 = {
        "tenant_id": tenant_id,
        "project_id": arcos_proj_id,
        "code": "W1-PANAMA-CITY",
        "title": "Wave 1 — Panama City metro area",
        "cluster_lead_user_id": agustin_id,
        "field_senior_user_id": None,
        "assigned_tech_user_id": agustin_id,
        "site_ids": arcos_site_ids[:2],  # P01 + P02
        "target_start_date": _now() - timedelta(days=14),
        "target_end_date": _now() + timedelta(days=30),
        "status": "activated",
        "activated_at": _now() - timedelta(days=14),
        "activated_by": juan_id,
        "completed_at": None,
        "created_at": _now() - timedelta(days=14),
        "updated_at": _now(),
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    cluster_w1_insert = await db.cluster_groups.insert_one(cluster_w1)
    cluster_w1_id = str(cluster_w1_insert.inserted_id)

    # Three rollout work_orders linked to the project + cluster
    arcos_wos = [
        {
            "tenant_id": tenant_id,
            "organization_id": claro_pa_id,
            "site_id": arcos_site_ids[0],
            "service_agreement_id": claro_pa_ag_id,
            "reference": "ARCOS-WO-2026-001",
            "title": "SDWAN install — McDonald's Costa del Este",
            "description": "Install SDWAN appliance + config network + test failover.",
            "severity": "normal",
            "status": "closed",
            "ball_in_court": {
                "side": "srs", "actor_user_id": juan_id,
                "since": _now() - timedelta(days=10), "reason": "closed",
            },
            "assigned_tech_user_id": agustin_id,
            "srs_coordinator_user_id": juan_id,
            "noc_operator_user_id": None,
            "onsite_resident_user_id": None,
            "project_id": arcos_proj_id,
            "cluster_group_id": cluster_w1_id,
            "shield_level": "silver",
            "sla_snapshot": SHIELD_DEFAULTS["silver"],
            "deadline_receive_at": _now() - timedelta(days=13, hours=22),
            "deadline_resolve_at": _now() - timedelta(days=11),
            "closed_at": _now() - timedelta(days=10),
            "handshakes": [],
            "pre_flight_checklist": {"all_green": True},
            "created_at": _now() - timedelta(days=14),
            "updated_at": _now() - timedelta(days=10),
            "created_by": juan_id,
            "updated_by": juan_id,
        },
        {
            "tenant_id": tenant_id,
            "organization_id": claro_pa_id,
            "site_id": arcos_site_ids[1],
            "service_agreement_id": claro_pa_ag_id,
            "reference": "ARCOS-WO-2026-002",
            "title": "SDWAN install — McDonald's Albrook",
            "description": "Install SDWAN appliance.",
            "severity": "normal",
            "status": "on_site",
            "ball_in_court": {
                "side": "tech", "actor_user_id": agustin_id,
                "since": _now() - timedelta(hours=3), "reason": "tech onsite working",
            },
            "assigned_tech_user_id": agustin_id,
            "srs_coordinator_user_id": juan_id,
            "noc_operator_user_id": None,
            "onsite_resident_user_id": None,
            "project_id": arcos_proj_id,
            "cluster_group_id": cluster_w1_id,
            "shield_level": "silver",
            "sla_snapshot": SHIELD_DEFAULTS["silver"],
            "deadline_receive_at": _now() - timedelta(days=2),
            "deadline_resolve_at": _now() + timedelta(days=1),
            "handshakes": [{
                "kind": "check_in",
                "ts": _now() - timedelta(hours=3),
                "actor_user_id": agustin_id,
                "notes": "Onsite Albrook Mall",
                "lat": 8.9714, "lng": -79.5540,
            }],
            "pre_flight_checklist": {"all_green": True},
            "created_at": _now() - timedelta(days=3),
            "updated_at": _now() - timedelta(hours=3),
            "created_by": juan_id,
            "updated_by": agustin_id,
        },
        # P47 — the one that used to get lost — now properly tracked as intake
        {
            "tenant_id": tenant_id,
            "organization_id": claro_pa_id,
            "site_id": arcos_site_ids[2],
            "service_agreement_id": claro_pa_ag_id,
            "reference": "ARCOS-WO-2026-047",
            "title": "SDWAN install — McDonald's David P47",
            "description": "Historical P47 — the one lost in Excel. Tracking correctly from intake.",
            "severity": "normal",
            "status": "intake",
            "ball_in_court": {
                "side": "srs", "actor_user_id": juan_id,
                "since": _now() - timedelta(hours=6), "reason": "intake pending triage",
            },
            "assigned_tech_user_id": None,
            "srs_coordinator_user_id": juan_id,
            "noc_operator_user_id": None,
            "onsite_resident_user_id": None,
            "project_id": arcos_proj_id,
            "cluster_group_id": None,  # not yet in a cluster wave
            "shield_level": "silver",
            "sla_snapshot": SHIELD_DEFAULTS["silver"],
            "deadline_receive_at": _now() + timedelta(hours=42),
            "deadline_resolve_at": _now() + timedelta(days=2),
            "handshakes": [],
            "pre_flight_checklist": {},
            "created_at": _now() - timedelta(hours=6),
            "updated_at": _now() - timedelta(hours=6),
            "created_by": juan_id,
            "updated_by": juan_id,
        },
    ]
    await db.work_orders.insert_many(arcos_wos)

    # --- Seed audit entry (forensic trace that the seed ran) ---
    await db.audit_log.insert_one(
        {
            "ts": _now(),
            "source": "seed",
            "tenant_id": tenant_id,
            "actor_user_id": None,
            "action": "foundation.seed.v1.1",
            "entity_refs": [],
            "context_snapshot": {
                "tenants_inserted": 1,
                "srs_entities_inserted": len(srs_entities),
                "organizations_inserted": len(orgs),
                "users_inserted": len(users),
                "sites_inserted": len(sites) + len(arcos_sites),
                "service_agreements_inserted": len(agreements) + 1,
                "work_orders_inserted": len(work_orders) + len(arcos_wos),
                "projects_inserted": 1,
                "cluster_groups_inserted": 1,
                "default_password": "[redacted — see seed script]",
                "blueprint_version": "v1.1",
            },
        }
    )

    print("Foundation seed complete.")
    print(f"  Tenant: SRS ({tenant_id})")
    print(f"  SRS entities: {len(srs_entities)} (SR-UK, SR-US, SR-SA active; SR-ES closed)")
    print(f"  Organizations: {len(orgs)}")
    print(f"  Users: {len(users)} (default password: '{DEFAULT_PASSWORD}')")
    print(f"  Sites: {len(sites) + len(arcos_sites)} ({len(arcos_sites)} Arcos)")
    print(f"  Service agreements: {len(agreements) + 1}")
    print(f"  Work orders: {len(work_orders) + len(arcos_wos)} ({len(arcos_wos)} Arcos rollout)")
    print(f"  Projects: 1 (Arcos Dorados Panama rollout)")
    print(f"  Cluster groups: 1 (Wave 1 Panama City activated)")
    print(f"  Audit entries: seed event recorded")

    await close_db()


# ---------------- helpers ----------------

def _org(tenant_id: str, *, legal_name: str, display_name: str, country: str,
         partners: list[dict], notes: str | None = None) -> dict:
    return {
        "tenant_id": tenant_id,
        "legal_name": legal_name,
        "display_name": display_name,
        "country": country,
        "partner_relationships": [
            {
                **p,
                "started_at": p.get("started_at") or _now(),
                "status": p.get("status", "active"),
                "terms": p.get("terms", {}),
            }
            for p in partners
        ],
        "status": "active",
        "notes": notes,
        "created_at": _now(),
        "updated_at": _now(),
    }


def _user(tenant_id: str, hashed_pwd: str, *, email: str, full_name: str,
          country: str, employment: str, memberships: list[dict],
          email_provisioned: bool = False) -> dict:
    return {
        "tenant_id": tenant_id,
        "email": email.lower(),
        "full_name": full_name,
        "country": country,
        "hashed_password": hashed_pwd,
        "is_active": True,
        "employment_type": employment,
        "email_provisioned_by_srs": email_provisioned,
        "space_memberships": memberships,
        "created_at": _now(),
        "updated_at": _now(),
    }


def _m(space: str, role: str, authority: str, organization_id: str | None = None) -> dict:
    return {
        "space": space,
        "role": role,
        "authority_level": authority,
        "organization_id": organization_id,
        "active": True,
    }


if __name__ == "__main__":
    asyncio.run(seed())
