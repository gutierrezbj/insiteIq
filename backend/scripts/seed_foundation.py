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
from app.database import close_db, connect_db, ensure_indexes, get_db
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

    # SRS team — 9 plantilla/external users from real SRS directory
    users = [
        _user(
            tenant_id, pwd,
            email="juang@systemrapid.io",
            full_name="Juan Gutierrez",
            country="ES",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "lead", "owner")],
        ),
        _user(
            tenant_id, pwd,
            email="sajid@systemrapid.com",
            full_name="Sajid",
            country="GB",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "owner_readonly", "owner")],
        ),
        _user(
            tenant_id, pwd,
            email="adrianab@systemrapid.com",
            full_name="Adriana Bracho",
            country="VE",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "finance", "director")],
        ),
        _user(
            tenant_id, pwd,
            email="androsb@systemrapid.com",
            full_name="Andros Briceño",
            country="VE",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "ops_coordinator", "mid_manager")],
        ),
        _user(
            tenant_id, pwd,
            email="luiss@systemrapid.com",
            full_name="Luis Sánchez",
            country="PE",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "field_consultant", "mid_manager")],
        ),
        _user(
            tenant_id, pwd,
            email="agustinc@systemrapid.com",
            full_name="Agustin Rivera",
            country="ES",
            employment="plantilla",
            memberships=[
                _m("srs_coordinators", "tech_senior", "mid_manager"),
                _m("tech_field", "tech_senior", "mid_manager"),
            ],
        ),
        _user(
            tenant_id, pwd,
            email="hugoq@systemrapid.com",
            full_name="Hugo M Rodriguez",
            country=None,
            employment="plantilla",
            memberships=[_m("tech_field", "tech_dc", "mid_manager")],
        ),
        _user(
            tenant_id, pwd,
            email="yunush@systemrapid.com",
            full_name="Yunus Hafesjee",
            country="GB",
            employment="plantilla",
            memberships=[_m("srs_coordinators", "account_lead", "mid_manager")],
        ),
        _user(
            tenant_id, pwd,
            email="arlindoo@systemrapid.com",
            full_name="Arlindo Ochoa",
            country="US",
            employment="external_sub",
            email_provisioned=True,
            memberships=[_m("tech_field", "tech_contractor", "contractor")],
        ),
        # Sample client-side contact (Fractalia external, NOT part of 9 SRS users)
        _user(
            tenant_id, pwd,
            email="rackel.rocha@fractaliasystems.es",
            full_name="Rackel Rocha",
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
    juan_id = user_ids["juang@systemrapid.io"]
    andros_id = user_ids["androsb@systemrapid.com"]
    arlindo_id = user_ids["arlindoo@systemrapid.com"]
    agustin_id = user_ids["agustinc@systemrapid.com"]
    yunus_h_id = user_ids["yunush@systemrapid.com"]

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

    # ------------------------------------------------------------------
    # Demo depth — extra realistic data so dashboards feel alive
    # Populated end-of-seed so it doesn't distract from core structure.
    # ------------------------------------------------------------------

    fractalia_sa_id = ag_ids["FRAC-TEL-2026-2029"]  # SRS-US intl Fractalia agreement
    claro_us_sa_id = ag_ids["CLARO-US-2026-AUDIT"]
    dxc_uk_sa_id = ag_ids["DXC-UK-2026-DCMIGRATION"]

    # --- More sites from real Fractalia footprint (Inditex + CH + Duty Free) ---
    more_sites = [
        _site_doc(tenant_id, juan_id, fractalia_id, "ZARA-ES-GV01",
                  "ZARA Gran Vía Madrid", "ES", "Madrid",
                  "Calle Gran Vía 32, 28013 Madrid", "Europe/Madrid"),
        _site_doc(tenant_id, juan_id, fractalia_id, "ZARA-ES-BCN01",
                  "ZARA Passeig de Gràcia Barcelona", "ES", "Barcelona",
                  "Passeig de Gràcia 16, 08007 Barcelona", "Europe/Madrid"),
        _site_doc(tenant_id, juan_id, fractalia_id, "ZARA-AR-BA01",
                  "ZARA Galerías Pacífico Buenos Aires", "AR", "Buenos Aires",
                  "Av. Córdoba 550, CABA", "America/Argentina/Buenos_Aires"),
        _site_doc(tenant_id, juan_id, fractalia_id, "ZARA-MX-POL01",
                  "ZARA Antara Polanco CDMX", "MX", "Ciudad de México",
                  "Av. Ejército Nacional 843, Granada, Miguel Hidalgo",
                  "America/Mexico_City"),
        _site_doc(tenant_id, juan_id, fractalia_id, "CH-ES-SER01",
                  "Carolina Herrera Flagship Serrano", "ES", "Madrid",
                  "Calle de Serrano 16, 28001 Madrid", "Europe/Madrid"),
        _site_doc(tenant_id, juan_id, fractalia_id, "CH-US-NY01",
                  "Carolina Herrera Madison Avenue", "US", "New York",
                  "772 Madison Ave, New York, NY 10065", "America/New_York"),
        _site_doc(tenant_id, juan_id, fractalia_id, "DF-ES-MAD-T4",
                  "Duty Free Madrid T4", "ES", "Madrid",
                  "Aeropuerto Adolfo Suárez Madrid-Barajas T4", "Europe/Madrid"),
        _site_doc(tenant_id, juan_id, fractalia_id, "DF-HK-HKG01",
                  "Duty Free Hong Kong International", "HK", "Hong Kong",
                  "Hong Kong International Airport, Chek Lap Kok", "Asia/Hong_Kong"),
    ]
    more_sites_ins = await db.sites.insert_many(more_sites)
    extra_site_ids = {
        s["code"]: str(i) for s, i in zip(more_sites, more_sites_ins.inserted_ids)
    }

    # --- More work_orders across stages / shield levels / techs / clients ---
    # Spread realistic activity to populate dashboards + ball-in-court aging.
    more_wos: list[dict] = []

    # Fractalia bronze_plus (international retail) — 5 across stages
    more_wos.append(_wo_doc(
        tenant_id, fractalia_id, extra_site_ids["ZARA-ES-GV01"], fractalia_sa_id,
        "FRAC-CS-0000120",
        "Pantalla LED cabinet muerto — ZARA Gran Vía",
        severity="high",
        status="triage",
        ball_side="srs", ball_actor=juan_id,
        assigned_tech=None, coord=juan_id,
        shield="bronze_plus",
        age_hours=4,
    ))
    more_wos.append(_wo_doc(
        tenant_id, fractalia_id, extra_site_ids["ZARA-AR-BA01"], fractalia_sa_id,
        "FRAC-CS-0000121",
        "Amplificador rack audio reemplazo — ZARA BA Galerías",
        severity="normal",
        status="pre_flight",
        ball_side="srs", ball_actor=andros_id,
        assigned_tech=arlindo_id, coord=andros_id,
        shield="bronze_plus",
        age_hours=8,
        preflight={"kit_verified": True, "parts_ready": False, "all_green": False},
    ))
    more_wos.append(_wo_doc(
        tenant_id, fractalia_id, extra_site_ids["ZARA-ES-BCN01"], fractalia_sa_id,
        "FRAC-CS-0000122",
        "Hilo musical no emite — ZARA Passeig de Gràcia",
        severity="normal",
        status="on_site",
        ball_side="tech", ball_actor=agustin_id,
        assigned_tech=agustin_id, coord=juan_id,
        shield="bronze_plus",
        age_hours=3,
        handshakes_kinds=[("check_in", 41.392, 2.162, "Arrived Passeig de Gràcia")],
    ))
    more_wos.append(_wo_doc(
        tenant_id, fractalia_id, extra_site_ids["CH-ES-SER01"], fractalia_sa_id,
        "FRAC-CS-0000108",
        "Matriz audio Carolina Herrera Serrano — reemplazo preventivo",
        severity="low",
        status="closed",
        ball_side="srs", ball_actor=juan_id,
        assigned_tech=agustin_id, coord=juan_id,
        shield="bronze_plus",
        age_hours=48,
        closed_hours_ago=12,
        handshakes_kinds=[
            ("check_in", 40.425, -3.689, "Onsite CH Serrano"),
            ("resolution", 40.425, -3.689, "Matrix replaced, audio tested"),
            ("closure", None, None, "NOC Telefónica sign-off"),
        ],
        preflight={"kit_verified": True, "parts_ready": True, "all_green": True},
    ))
    more_wos.append(_wo_doc(
        tenant_id, fractalia_id, extra_site_ids["DF-ES-MAD-T4"], fractalia_sa_id,
        "FRAC-CS-0000105",
        "Pantalla LED flagship Duty Free MAD T4 — modulo sustitucion",
        severity="high",
        status="resolved",
        ball_side="client", ball_actor=None,
        assigned_tech=agustin_id, coord=juan_id,
        shield="bronze_plus",
        age_hours=28,
        handshakes_kinds=[
            ("check_in", 40.471, -3.574, "Onsite MAD T4"),
            ("resolution", 40.471, -3.574, "LED module replaced, imagen verde"),
        ],
        preflight={"kit_verified": True, "parts_ready": True, "all_green": True},
    ))

    # Claro US silver (Miramar audit) — 2
    more_wos.append(_wo_doc(
        tenant_id, claro_us_id, site_ids["CLARO-US-MIRAMAR"], claro_us_sa_id,
        "CLARO-WO-2026-0055",
        "Revisit inventory Miramar — bloque B estanteria 12-18",
        severity="normal",
        status="dispatched",
        ball_side="tech", ball_actor=arlindo_id,
        assigned_tech=arlindo_id, coord=juan_id,
        shield="silver",
        age_hours=16,
        preflight={"kit_verified": True, "parts_ready": True, "all_green": True},
    ))
    more_wos.append(_wo_doc(
        tenant_id, claro_us_id, site_ids["CLARO-US-MIRAMAR"], claro_us_sa_id,
        "CLARO-WO-2026-0041",
        "Scope correction — reconcile 500 items muestra",
        severity="normal",
        status="closed",
        ball_side="srs", ball_actor=juan_id,
        assigned_tech=arlindo_id, coord=juan_id,
        shield="silver",
        age_hours=120,
        closed_hours_ago=20,
        handshakes_kinds=[
            ("check_in", 25.985, -80.233, "Onsite Miramar warehouse"),
            ("resolution", 25.985, -80.233, "500 items reconciled, 12 discrepancies documented"),
            ("closure", None, None, "Arturo Pellerano sign-off via email"),
        ],
        preflight={"kit_verified": True, "parts_ready": True, "all_green": True},
    ))

    # DXC UK gold — 1 en en_route, para mostrar Shield gold en dashboard
    more_wos.append(_wo_doc(
        tenant_id, org_ids["DXC UK"], extra_site_ids["CH-US-NY01"], dxc_uk_sa_id,
        "DXC-UK-WO-2026-0007",
        "Emergency LED flagship CH Madison NY",
        severity="critical",
        status="en_route",
        ball_side="tech", ball_actor=agustin_id,
        assigned_tech=agustin_id, coord=yunus_h_id,
        shield="gold",
        age_hours=2,
        preflight={"kit_verified": True, "parts_ready": True, "all_green": True},
    ))

    await db.work_orders.insert_many(more_wos)
    # Map references for ratings + budget approvals
    more_wo_refs = {
        wo["reference"]: wo for wo in await db.work_orders.find(
            {"tenant_id": tenant_id, "reference": {"$in": [w["reference"] for w in more_wos]}}
        ).to_list(None)
    }

    # --- Tech ratings (show skill_passport + recompute working) ---
    # Agustin gets rated on his 3 closed/resolved WOs: CH Serrano (closed),
    # DF MAD T4 (resolved), and his seed FRAC-CS-0000099 (resolved).
    ratings_data = [
        # Agustin on Carolina Herrera Serrano (closed) — flawless
        {
            "wo_ref": "FRAC-CS-0000108", "tech_id": agustin_id, "by": juan_id,
            "score": 5.0,
            "dims": {"quality": 5, "punctuality": 5, "communication": 5, "professionalism": 5},
            "notes": "Trabajo impecable en flagship. Cliente satisfecho.",
        },
        # Agustin on Duty Free MAD T4 (resolved)
        {
            "wo_ref": "FRAC-CS-0000105", "tech_id": agustin_id, "by": juan_id,
            "score": 4.5,
            "dims": {"quality": 5, "punctuality": 4, "communication": 4, "professionalism": 5},
            "notes": "Excelente ejecucion. Leve demora intake por duty free badge.",
        },
        # Agustin on original seed closed WO (FRAC-CS-0000099 — ZARA Talcahuano resolved)
        {
            "wo_ref": "FRAC-CS-0000099", "tech_id": agustin_id, "by": juan_id,
            "score": 5.0,
            "dims": {"quality": 5, "punctuality": 5, "communication": 5, "professionalism": 5},
            "notes": "Cerrado clean, NOC approved same day.",
        },
        # Arlindo on Miramar CLARO-WO-2026-0041 (closed) — first ever rating
        {
            "wo_ref": "CLARO-WO-2026-0041", "tech_id": arlindo_id, "by": juan_id,
            "score": 4.0,
            "dims": {"quality": 4, "punctuality": 4, "communication": 4, "professionalism": 4},
            "notes": "Primer engagement completo. Ejecucion solida.",
        },
    ]
    rating_docs = []
    for r in ratings_data:
        wo = more_wo_refs.get(r["wo_ref"])
        if wo is None:
            # Fallback: fetch from main work_orders collection (covers seed WOs)
            wo = await db.work_orders.find_one(
                {"tenant_id": tenant_id, "reference": r["wo_ref"]}
            )
        if wo is None:
            continue
        rating_docs.append({
            "tenant_id": tenant_id,
            "work_order_id": str(wo["_id"]),
            "rated_user_id": r["tech_id"],
            "rated_by_user_id": r["by"],
            "rated_by_role": "srs_coordinator",
            "score": float(r["score"]),
            "dimensions": r["dims"],
            "notes": r["notes"],
            "created_at": _now(),
            "updated_at": _now(),
            "created_by": r["by"],
            "updated_by": r["by"],
        })
    if rating_docs:
        await db.tech_ratings.insert_many(rating_docs)

    # --- Seed skill_passports for rated techs (compute aggregates inline) ---
    # Agustin: 3 ratings avg ~4.83. Arlindo: 1 rating avg 4.0.
    passport_docs = []
    for user_id, ratings in [
        (agustin_id, [r for r in rating_docs if r["rated_user_id"] == agustin_id]),
        (arlindo_id, [r for r in rating_docs if r["rated_user_id"] == arlindo_id]),
    ]:
        if not ratings:
            continue
        avg = round(sum(r["score"] for r in ratings) / len(ratings), 2)
        # Count closed/resolved WOs assigned to this tech
        jobs_done = await db.work_orders.count_documents({
            "tenant_id": tenant_id,
            "assigned_tech_user_id": user_id,
            "status": {"$in": ["resolved", "closed"]},
        })
        # Level threshold check
        level = "bronze"
        if jobs_done >= 10 and avg >= 4.0:
            level = "silver"
        if jobs_done >= 50 and avg >= 4.5:
            level = "gold"
        if jobs_done >= 150 and avg >= 4.7:
            level = "platinum"
        # Basic certifications + countries for demo polish
        certs = []
        countries = []
        skills = []
        bio = None
        if user_id == agustin_id:
            certs = [
                {"name": "CCNA", "issuer": "Cisco", "issued_at": None, "expires_at": None,
                 "credential_id": None, "verified_by_user_id": juan_id},
                {"name": "Audinate Dante Level 2", "issuer": "Audinate",
                 "issued_at": None, "expires_at": None,
                 "credential_id": None, "verified_by_user_id": juan_id},
            ]
            skills = [
                {"name": "Audio systems (Crown, Biamp)", "tier": "advanced", "endorsed_count": 8},
                {"name": "Network install + config", "tier": "advanced", "endorsed_count": 6},
                {"name": "LED displays (Samsung, Unilumin)", "tier": "intermediate", "endorsed_count": 4},
            ]
            countries = ["ES", "PT", "MX", "AR", "CL", "US"]
            bio = "Top tech plantilla SRS — audio + network retail international."
        elif user_id == arlindo_id:
            certs = [
                {"name": "BICSI Installer 2", "issuer": "BICSI",
                 "issued_at": None, "expires_at": None,
                 "credential_id": None, "verified_by_user_id": juan_id},
            ]
            skills = [
                {"name": "Warehouse inventory / audit", "tier": "intermediate", "endorsed_count": 2},
                {"name": "Data center cabling", "tier": "intermediate", "endorsed_count": 3},
            ]
            countries = ["US"]
            bio = "External contractor. Claro US contract (email provisioned)."

        passport_docs.append({
            "tenant_id": tenant_id,
            "user_id": user_id,
            "employment_type": "plantilla" if user_id == agustin_id else "external_sub",
            "level": level,
            "jobs_completed": jobs_done,
            "rating_avg": avg,
            "rating_count": len(ratings),
            "certifications": certs,
            "skills": skills,
            "languages": ["es", "en"] if user_id == agustin_id else ["en"],
            "countries_covered": countries,
            "quality_marks": [],
            "bio": bio,
            "last_active_at": _now(),
            "created_at": _now(),
            "updated_at": _now(),
            "created_by": juan_id,
            "updated_by": juan_id,
        })
    if passport_docs:
        await db.skill_passports.insert_many(passport_docs)

    # --- Budget Approval Requests (parts threshold demo) ---
    # 1 below threshold auto-approved (Fractalia agreement threshold 150 USD)
    # 1 above threshold sent_to_client awaiting response
    # For each we need WO refs.
    wo_bcn = more_wo_refs.get("FRAC-CS-0000122")  # ZARA BCN on_site
    wo_mad_gv = more_wo_refs.get("FRAC-CS-0000120")  # ZARA GV triage
    budget_docs = []
    if wo_bcn:
        # Below threshold: 2 audio cables = $80
        budget_docs.append({
            "tenant_id": tenant_id,
            "work_order_id": str(wo_bcn["_id"]),
            "service_agreement_id": fractalia_sa_id,
            "parts": [
                {"name": "Audio cable XLR 10m", "quantity": 2,
                 "unit_price_usd": 40, "total_price_usd": 80, "vendor": None,
                 "part_number": "XLR-10M", "lead_time_days": None, "notes": None},
            ],
            "total_amount_usd": 80.0,
            "currency_native": "EUR",
            "total_amount_native": 73.0,
            "threshold_applied_usd": 150.0,
            "below_threshold": True,
            "auto_purchased": False,
            "auto_purchased_at": None,
            "auto_purchase_reason": None,
            "status": "approved",
            "ball_in_court": {
                "side": "srs", "actor_user_id": juan_id,
                "since": _now() - timedelta(hours=1),
                "reason": "auto-approved (below threshold)",
            },
            "exchanges": [],
            "expires_at": None,
            "supersedes_id": None,
            "resolved_at": _now() - timedelta(hours=1),
            "resolved_by": juan_id,
            "created_at": _now() - timedelta(hours=1),
            "updated_at": _now() - timedelta(hours=1),
            "created_by": juan_id,
            "updated_by": juan_id,
        })
    if wo_mad_gv:
        # Above threshold: LED module $850 → sent_to_client awaiting
        budget_docs.append({
            "tenant_id": tenant_id,
            "work_order_id": str(wo_mad_gv["_id"]),
            "service_agreement_id": fractalia_sa_id,
            "parts": [
                {"name": "Unilumin UpadIII LED module P2.5", "quantity": 1,
                 "unit_price_usd": 850, "total_price_usd": 850,
                 "vendor": "Unilumin official reseller EU",
                 "part_number": "UPIII-P2.5-R", "lead_time_days": 5, "notes": None},
            ],
            "total_amount_usd": 850.0,
            "currency_native": "EUR",
            "total_amount_native": 780.0,
            "threshold_applied_usd": 150.0,
            "below_threshold": False,
            "auto_purchased": False,
            "auto_purchased_at": None,
            "auto_purchase_reason": None,
            "status": "sent_to_client",
            "ball_in_court": {
                "side": "client", "actor_user_id": None,
                "since": _now() - timedelta(hours=3),
                "reason": "awaiting Rackel/Fractalia approval",
            },
            "exchanges": [
                {
                    "ts": _now() - timedelta(hours=3),
                    "actor_user_id": juan_id,
                    "kind": "quote_sent",
                    "notes": "Cotizacion enviada. Lead time 5 dias.",
                    "ball_side_after": "client",
                },
            ],
            "expires_at": None,
            "supersedes_id": None,
            "resolved_at": None,
            "resolved_by": None,
            "created_at": _now() - timedelta(hours=3),
            "updated_at": _now() - timedelta(hours=3),
            "created_by": juan_id,
            "updated_by": juan_id,
        })
    if budget_docs:
        await db.budget_approval_requests.insert_many(budget_docs)

    # Track counts for print summary
    demo_counts = {
        "extra_sites": len(more_sites),
        "extra_wos": len(more_wos),
        "ratings": len(rating_docs),
        "passports": len(passport_docs),
        "budgets": len(budget_docs),
    }

    # --- Re-ensure indexes (drops above removed the index definitions) ---
    await ensure_indexes()

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
    print(f"  Sites: {len(sites) + len(arcos_sites) + demo_counts['extra_sites']} "
          f"({len(arcos_sites)} Arcos + {demo_counts['extra_sites']} Fractalia flagships)")
    print(f"  Service agreements: {len(agreements) + 1}")
    print(f"  Work orders: {len(work_orders) + len(arcos_wos) + demo_counts['extra_wos']} total "
          f"({len(arcos_wos)} Arcos rollout + {demo_counts['extra_wos']} demo-depth multi-stage)")
    print(f"  Projects: 1 (Arcos Dorados Panama rollout)")
    print(f"  Cluster groups: 1 (Wave 1 Panama City activated)")
    print(f"  Extra sites: {demo_counts['extra_sites']} Fractalia flagships (Inditex+CH+DutyFree)")
    print(f"  Tech ratings: {demo_counts['ratings']} (Agustin 3 + Arlindo 1)")
    print(f"  Skill passports: {demo_counts['passports']} (Agustin + Arlindo with computed aggregates)")
    print(f"  Budget approval requests: {demo_counts['budgets']} (1 below threshold auto + 1 above sent_to_client)")
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
          email_provisioned: bool = False,
          must_change_password: bool = True) -> dict:
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
        # Seed default password forces rotation on first login
        "must_change_password": must_change_password,
        "password_changed_at": None,
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


def _site_doc(tenant_id, creator_id, org_id, code, name, country, city, address, tz):
    """Shorthand builder for demo sites."""
    return {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "code": code,
        "name": name,
        "country": country,
        "city": city,
        "address": address,
        "timezone": tz,
        "has_physical_resident": False,
        "status": "active",
        "notes": None,
        "created_at": _now(),
        "updated_at": _now(),
        "created_by": creator_id,
        "updated_by": creator_id,
    }


def _wo_doc(
    tenant_id, org_id, site_id, sa_id, reference, title, *,
    severity="normal",
    status="intake",
    ball_side="srs",
    ball_actor=None,
    assigned_tech=None,
    coord=None,
    noc_operator=None,
    onsite_resident=None,
    shield="bronze",
    age_hours=0,
    closed_hours_ago=None,
    handshakes_kinds=None,
    preflight=None,
    description=None,
):
    """Shorthand builder for demo work_orders across stages."""
    from app.models.service_agreement import SHIELD_DEFAULTS
    sla = SHIELD_DEFAULTS[shield]
    created = _now() - timedelta(hours=age_hours)
    handshakes = []
    if handshakes_kinds:
        # Distribute handshakes evenly across the age_hours window
        for idx, (kind, lat, lng, notes) in enumerate(handshakes_kinds):
            hs_ts = created + timedelta(hours=max(1, age_hours - idx * 2))
            handshakes.append({
                "kind": kind,
                "ts": hs_ts,
                "actor_user_id": assigned_tech or coord,
                "notes": notes,
                "lat": lat,
                "lng": lng,
            })
    closed_at = _now() - timedelta(hours=closed_hours_ago) if closed_hours_ago is not None else None
    return {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "site_id": site_id,
        "service_agreement_id": sa_id,
        "reference": reference,
        "title": title,
        "description": description,
        "severity": severity,
        "status": status,
        "ball_in_court": {
            "side": ball_side,
            "actor_user_id": ball_actor,
            "since": created,
            "reason": f"{status}",
        },
        "assigned_tech_user_id": assigned_tech,
        "srs_coordinator_user_id": coord,
        "noc_operator_user_id": noc_operator,
        "onsite_resident_user_id": onsite_resident,
        "project_id": None,
        "cluster_group_id": None,
        "shield_level": shield,
        "sla_snapshot": sla,
        "deadline_receive_at": created + timedelta(minutes=sla["receive_minutes"]),
        "deadline_resolve_at": created + timedelta(minutes=sla["resolve_minutes"]),
        "closed_at": closed_at,
        "handshakes": handshakes,
        "pre_flight_checklist": preflight or {},
        "created_at": created,
        "updated_at": _now(),
        "created_by": coord,
        "updated_by": coord,
    }


if __name__ == "__main__":
    asyncio.run(seed())
