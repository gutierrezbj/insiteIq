#!/usr/bin/env python3
"""
seed_arcos_claro.py — Carga proyecto real Claro CES + Arcos Dorados.

Idempotente: re-ejecutable sin duplicar (upsert por keys naturales).

Fuentes de verdad (canon):
- memory/claro_arcos_sow_v11.md  ← análisis SOW V1.1 + PA-1000055 + PA-1000066
- /Users/juanguti/.../Claro/Panama/DOCS/PANAMA 89 Sites Summary.xlsx
- /Users/juanguti/.../Claro/Panama/DOCS/AD Panamá Listado completo.xlsx
- /Users/juanguti/.../Claro/Panama/DOCS/PA-1000055_2.pdf (Caribbean)
- /Users/juanguti/.../Claro/Panama/DOCS/PA-1000066.pdf (Panamá Wave 2)
- /Users/juanguti/.../Claro/Islas del Caribe/STATEMENT OF WORK V1.1 signed 20-Mar-25.pdf

Crea:
- 4 organizations: CES (client), Arcos Dorados (end_client), Fervimax (JV), Alarmas Solutions (vendor)
- 1 service_agreement V1.1 ref 04MSP (covers Caribbean + Panamá)
- 1 project "Arcos Dorados SDWAN Off-Net LATAM"
- 12 sites Caribbean Phase I (Aruba 3 + Curaçao 5 + T&T 4)
- 89 sites Panamá Phase II (parsed del xlsx Summary)
- 2 work_orders demo:
    · FM 19566 (Aruba) — caso scope rewrite Adrian↔Andros
    · FM 20413 (PAN-P22K1 Centro de Postre) — caso live operativo HOY
- threads shared con messages reales del email chain

Usage:
    docker compose exec api python -m scripts.seed_arcos_claro [--dry-run]

Tenant: usa el primero existente (debería ser SRS).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Add project root to path so we can import app.*
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import connect_db, get_db  # noqa: E402

# ---- Constants ----
DOCS_DIR = Path("/Users/juanguti/Library/CloudStorage/OneDrive-Personal/02.SR docs/Claro/Panama/DOCS")
XLSX_SUMMARY = DOCS_DIR / "PANAMA 89 Sites - Summary System Rapid Fiedl Tech Inst+Support.xlsx"

CES_LEGAL_NAME = "Claro Enterprise Solutions LLC"
ARCOS_LEGAL_NAME = "Arcos Dorados Holdings Inc - Multilatinas ROW"
FERVIMAX_LEGAL_NAME = "Fervimax"
ALARMAS_LEGAL_NAME = "Alarmas Solutions"

PROJECT_CODE = "ARCOS-CLARO-SDWAN-OFFNET"
SERVICE_AGREEMENT_REF = "04MSP-V1.1"

# ---- Caribbean Phase I sites (from SOW + PA-1000055 notes) ----
CARIBBEAN_SITES = [
    # (code, name, country, city, lat, lng)
    ("ARC-AW-001", "ARUBA HIGH RISE",   "AW", "Aruba",     None, None),
    ("ARC-AW-002", "ARUBA STA.CRUZ",    "AW", "Santa Cruz", None, None),
    ("ARC-AW-003", "SEROE BLANCO",      "AW", "Aruba",     None, None),
    ("ARC-CW-001", "PUNDA",             "CW", "Willemstad", None, None),
    ("ARC-CW-002", "SALINJA II",        "CW", "Willemstad", None, None),
    ("ARC-CW-003", "SALINJA",           "CW", "Willemstad", None, None),
    ("ARC-CW-004", "SANTA ROSAWEG",     "CW", "Willemstad", None, None),
    ("ARC-CW-005", "SANTA MARIA",       "CW", "Willemstad", None, None),
    ("ARC-TT-001", "CIPRIANI",          "TT", "Port of Spain", None, None),
    ("ARC-TT-002", "DUMFRIES ROAD",     "TT", "Port of Spain", None, None),
    ("ARC-TT-003", "GRAND BAZAAR",      "TT", "Port of Spain", None, None),
    ("ARC-TT-004", "GULF CITY MALL",    "TT", "San Fernando",  None, None),
]

# ---- Demo WOs ----
WO_DEMO = [
    {
        "reference": "FM-19566",
        "site_code": "ARC-AW-001",  # placeholder Aruba site (real NSR K34-GO00001AW...)
        "title": "ARU-IRAUSQUIN Blvd-CDP — Equipment installation",
        "description": (
            "Customer Contact: Juan Sebastian Montoya Acevedo (+57 3137419206). "
            "Service Date Mon Dec 15 2025, 03:00 PM local. NSR K34-GO00001AW-AW1463F-NP. "
            "Initial dispute (vendor cost EUR rejected, must be USD per SOW). "
            "Resolved: Adrian confirmed in-scope per SOW Section A page 2 + Section F page 5."
        ),
        "severity": "high",
        "status": "completed",  # already resolved en historial
        "ball_side": "client",
        "deadline_resolve_at": datetime(2025, 12, 15, 21, 0, tzinfo=timezone.utc),
        "scheduled_at": datetime(2025, 12, 15, 19, 0, tzinfo=timezone.utc),  # 3PM Aruba = 7PM UTC
        "tech_email": None,  # initially Endson Juneword (external, not in users); ended unassigned
        "threads_shared": [
            {
                "from_name": "Adrian Alvarado (CES)",
                "from_email": "Adrian.Alvarado@usclaro.com",
                "created_at": datetime(2025, 12, 9, 18, 22, tzinfo=timezone.utc),
                "text": "Request your support to attend the following activity: FM 19566 ARCOS DORADOS Aruba ARU-IRAUSQUIN Blvd-CDP, Mon Dec 15 3:00 PM. Tools: Laptop+adapter, Cisco console, AnyDesk. Conference: WhatsApp group SystemRapid-CES.",
            },
            {
                "from_name": "Andros Briceño (SRS)",
                "from_email": "androsb@systemrapid.com",
                "created_at": datetime(2025, 12, 12, 14, 24, tzinfo=timezone.utc),
                "text": "Thank you for sharing the SOW details. After review, this activity is not included within the current SOW. We can support and proceed with installation. We will apply the same installation rate as Gruma-Mission Foods project: 800 EUR (McDonald's project uses 500 EUR + 1700 support component, but since this is not a Claro device that does not apply). Tech: Endson Juneword (Passport NW7h2HBL6). Bills against PO indicated, one-time outside SOW.",
            },
            {
                "from_name": "Adrian Alvarado (CES)",
                "from_email": "Adrian.Alvarado@usclaro.com",
                "created_at": datetime(2025, 12, 12, 15, 23, tzinfo=timezone.utc),
                "text": "We can't accept this cost for this project, please don't dispatch the technician. Will review internally to include this site in scope of Arcos Dorados Project.",
            },
            {
                "from_name": "Adrian Alvarado (CES)",
                "from_email": "Adrian.Alvarado@usclaro.com",
                "created_at": datetime(2025, 12, 15, 12, 0, tzinfo=timezone.utc),
                "text": "Reviewed internally. This site SHOULD be included in current SoW per Section A SCOPE OF SERVICES (page 2): VENDOR dispatch FE on behalf of CES to end customer location in CES Off-Net countries throughout LATAM for Cisco Meraki + related equipment. AND Section F SERVICE DELIVERY LOCATION (page 5): all CES Off-Net countries within LATAM region, initial includes Aruba. Also: prices in USD per SOW, can't accept EUR.",
            },
        ],
        "threads_internal": [
            {
                "from_name": "Andros Briceño",
                "from_email": "androsb@systemrapid.com",
                "created_at": datetime(2025, 12, 12, 14, 0, tzinfo=timezone.utc),
                "text": "Adrian no quiere pagar 800 EUR como Gruma. Va a revisar y decirnos. Mientras parar dispatch a Endson.",
            },
            {
                "from_name": "Juan Gutierrez",
                "from_email": "juang@systemrapid.com",
                "created_at": datetime(2025, 12, 15, 13, 0, tzinfo=timezone.utc),
                "text": "Lo metieron en scope SOW, pricing USD del SOW aplica. Anti-Pellerano play: defensive email guardado. Confirmar billing T&M next month.",
            },
        ],
    },
    {
        "reference": "FM-20413",
        "site_code": "PAN-P22K1",  # PAN-P22K1-Centro de Postre
        "title": "PAN-P22K1 Centro de Postre — Equipment installation MX68 + MR36",
        "description": (
            "Customer Contact: José Zúñiga & Leonel Loaiza (+507 69100304). "
            "Service Date Mon Apr 13 2026, 5:00 AM local. "
            "NSR: K34-GO00335PA-PA1507F-NP, K34-GO00334PA-PA1507F-NP. "
            "Equipment: MX68 (Q2KY-S5NZ-KWDL), MR36 (Q3KB-AMLJ-8Y8V). "
            "Tools: Laptop+adapter, Cisco console, AnyDesk, Ladder for AP installation."
        ),
        "severity": "medium",
        "status": "in_progress",  # programado para HOY
        "ball_side": "tech",
        "deadline_resolve_at": datetime(2026, 4, 13, 17, 0, tzinfo=timezone.utc),
        "scheduled_at": datetime(2026, 4, 13, 10, 0, tzinfo=timezone.utc),  # 5AM Panamá = 10AM UTC
        "tech_email": "agustinc@systemrapid.com",
        "threads_shared": [
            {
                "from_name": "Adrian Alvarado (CES)",
                "from_email": "Adrian.Alvarado@usclaro.com",
                "created_at": datetime(2026, 4, 13, 19, 35, tzinfo=timezone.utc),
                "text": "Formal request to install PAN-P22K1-Centro de Postre. PA-1000066. Mon Apr 13 5:00 AM. Customer Contact: José Zúñiga & Leonel Loaiza +507 69100304. Equipment MX68 Q2KY-S5NZ-KWDL + MR36 Q3KB-AMLJ-8Y8V. Tools: Laptop+adapter+Cisco console+AnyDesk+Ladder. Address: Super Xtra de Pan de Azucar, Centro Comercial Oriental, San Miguelito, Panama.",
            },
        ],
        "threads_internal": [],
    },
]


# ---- Helpers ----

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_lat_lng(addr: str | None) -> tuple[float | None, float | None]:
    if not addr:
        return None, None
    m = re.search(r"Lat[: ]+([\-\d\.]+)[, ]+Long[: ]+([\-\d\.]+)", addr, re.I)
    if not m:
        return None, None
    return float(m.group(1)), float(m.group(2))


def derive_site_code(name: str) -> str:
    """
    Best-effort derivation of stable code from site name.
    "PAN-P22K1-Centro de Postre" → "PAN-P22K1"
    "PANAMA  P07 PLAZA LA MITRA Restaurante" → "PAN-P07"
    "ARCOS DORADOS PANAMA MARBELLA 101" → "PAN-MARBELLA-101"
    """
    name = name.strip()
    # Pattern PAN-P##K# or PAN-P##
    m = re.match(r"(PAN[A-Z]*[-\s]+)?(P\d+(?:K\d+)?)", name, re.I)
    if m:
        return f"PAN-{m.group(2).upper()}"
    # Fallback: slugify
    slug = re.sub(r"[^A-Z0-9]+", "-", name.upper()).strip("-")
    return f"PAN-{slug[:30]}"


async def parse_panama_sites_from_xlsx() -> list[dict]:
    """Read 89 sites from pre-parsed JSON next to this script.

    El JSON fue generado con openpyxl fuera del container (donde está instalado)
    para evitar dependency en runtime del API container.
    """
    import json
    json_path = Path(__file__).parent / "_panama_sites.json"
    if not json_path.exists():
        print(f"ERROR: {json_path} not found. Re-run xlsx pre-parser.")
        sys.exit(1)
    with json_path.open() as f:
        return json.load(f)


# ---- Mongo upserts ----

async def upsert_org(db, *, legal_name: str, doc: dict) -> str:
    existing = await db.organizations.find_one({"legal_name": legal_name, "tenant_id": doc["tenant_id"]})
    if existing:
        await db.organizations.update_one(
            {"_id": existing["_id"]},
            {"$set": {**doc, "updated_at": now_utc()}},
        )
        print(f"  org UPDATE: {legal_name} ({existing['_id']})")
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    res = await db.organizations.insert_one(doc)
    print(f"  org INSERT: {legal_name} ({res.inserted_id})")
    return str(res.inserted_id)


async def upsert_site(db, *, tenant_id: str, code: str, doc: dict) -> str:
    key = {"code": code, "tenant_id": tenant_id, "organization_id": doc["organization_id"]}
    existing = await db.sites.find_one(key)
    if existing:
        await db.sites.update_one({"_id": existing["_id"]}, {"$set": {**doc, "updated_at": now_utc()}})
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    res = await db.sites.insert_one(doc)
    return str(res.inserted_id)


async def upsert_service_agreement(db, *, contract_ref: str, doc: dict) -> str:
    key = {"contract_ref": contract_ref, "tenant_id": doc["tenant_id"]}
    existing = await db.service_agreements.find_one(key)
    if existing:
        await db.service_agreements.update_one({"_id": existing["_id"]}, {"$set": {**doc, "updated_at": now_utc()}})
        print(f"  agreement UPDATE: {contract_ref} ({existing['_id']})")
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    res = await db.service_agreements.insert_one(doc)
    print(f"  agreement INSERT: {contract_ref} ({res.inserted_id})")
    return str(res.inserted_id)


async def upsert_project(db, *, code: str, doc: dict) -> str:
    key = {"code": code, "tenant_id": doc["tenant_id"]}
    existing = await db.projects.find_one(key)
    if existing:
        await db.projects.update_one({"_id": existing["_id"]}, {"$set": {**doc, "updated_at": now_utc()}})
        print(f"  project UPDATE: {code} ({existing['_id']})")
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    res = await db.projects.insert_one(doc)
    print(f"  project INSERT: {code} ({res.inserted_id})")
    return str(res.inserted_id)


async def upsert_work_order(db, *, reference: str, doc: dict) -> str:
    key = {"reference": reference, "tenant_id": doc["tenant_id"]}
    existing = await db.work_orders.find_one(key)
    if existing:
        await db.work_orders.update_one({"_id": existing["_id"]}, {"$set": {**doc, "updated_at": now_utc()}})
        print(f"  WO UPDATE: {reference} ({existing['_id']})")
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    res = await db.work_orders.insert_one(doc)
    print(f"  WO INSERT: {reference} ({res.inserted_id})")
    return str(res.inserted_id)


async def replace_thread_messages(db, *, work_order_id: str, kind: str, messages: list[dict], tenant_id: str):
    """Replace all messages of a given kind for a WO. Idempotent."""
    # Delete existing messages of this kind for this WO
    await db.ticket_messages.delete_many({"work_order_id": work_order_id, "kind": kind})
    if not messages:
        return
    # Insert new
    docs = []
    for m in messages:
        docs.append({
            "work_order_id": work_order_id,
            "kind": kind,
            "tenant_id": tenant_id,
            "from_name": m.get("from_name"),
            "from_email": m.get("from_email"),
            "text": m.get("text"),
            "body": m.get("text"),  # alias
            "created_at": m.get("created_at", now_utc()),
        })
    await db.ticket_messages.insert_many(docs)
    print(f"    +{len(docs)} messages ({kind})")


# ---- Main ----

async def main(dry_run: bool = False):
    await connect_db()
    db = get_db()

    # Pick first tenant (assume SRS)
    tenant = await db.tenants.find_one({})
    if not tenant:
        print("ERROR: no tenants in db. Run seed_foundation first.")
        sys.exit(1)
    tenant_id = str(tenant["_id"])
    print(f"Tenant: {tenant.get('name', tenant_id)} ({tenant_id})")

    if dry_run:
        print("\n*** DRY RUN — no writes ***\n")
        return

    # ---- 1. Organizations ----
    print("\n=== 1. Organizations ===")

    ces_id = await upsert_org(db, legal_name=CES_LEGAL_NAME, doc={
        "tenant_id": tenant_id,
        "legal_name": CES_LEGAL_NAME,
        "display_name": "Claro CES",
        "country": "US",
        "jurisdiction": "FL",
        "tax_ids": {"federal_us": "76-0532710"},
        "partner_relationships": [
            {"type": "client", "started_at": datetime(2025, 1, 30, tzinfo=timezone.utc), "status": "active",
             "contract_ref": SERVICE_AGREEMENT_REF, "terms": {}},
            {"type": "prime_contractor", "started_at": datetime(2025, 1, 30, tzinfo=timezone.utc), "status": "active",
             "contract_ref": SERVICE_AGREEMENT_REF, "terms": {}},
        ],
        "notes": "3350 SW 148th Avenue Suite 400, Miramar FL 33027. AP: accounts.payable@usclaro.com. Purchaser: Cely Castellanos. Same Miramar of Modo 4 Pellerano.",
    })

    arcos_id = await upsert_org(db, legal_name=ARCOS_LEGAL_NAME, doc={
        "tenant_id": tenant_id,
        "legal_name": ARCOS_LEGAL_NAME,
        "display_name": "Arcos Dorados",
        "country": "PA",
        "partner_relationships": [
            {"type": "end_client_metadata", "started_at": datetime(2025, 1, 30, tzinfo=timezone.utc),
             "status": "active", "terms": {}},
        ],
        "notes": "End-client (Arcos Dorados Holdings Inc - Multilatinas ROW). Operador McDonald's LATAM. Project Manager Claro: Oscar Wolf.",
    })

    fervimax_id = await upsert_org(db, legal_name=FERVIMAX_LEGAL_NAME, doc={
        "tenant_id": tenant_id,
        "legal_name": FERVIMAX_LEGAL_NAME,
        "display_name": "Fervimax",
        "country": "PA",
        "partner_relationships": [
            {"type": "joint_venture_partner", "started_at": datetime(2025, 1, 30, tzinfo=timezone.utc),
             "status": "active", "terms": {"jv_for": "SDWAN Off-Net LATAM"}},
        ],
        "notes": "JV partner SystemRapid for Arcos Dorados SDWAN project. Channel partner fee % pendiente confirmar Adriana.",
    })

    alarmas_id = await upsert_org(db, legal_name=ALARMAS_LEGAL_NAME, doc={
        "tenant_id": tenant_id,
        "legal_name": ALARMAS_LEGAL_NAME,
        "display_name": "Alarmas Solutions",
        "country": "PA",
        "tax_ids": {"ruc_pa": "E-8-118050 DV83"},
        "bank_accounts": [
            {"currency": "USD", "bank_name": "Community Federal Savings Bank",
             "account": "8311953616", "routing": "026073150", "swift": "CMFGUS33",
             "address": "89-16 Jamaica Ave, Woodhaven, NY 11421, USA"},
            {"currency": "EUR", "bank_name": "Wise", "iban": "BE18 9671 7902 3465", "swift": "TRWIBEB1XXX",
             "address": "Rue du Trone 100, 3rd floor, Brussels, 1050, Belgium"},
        ],
        "partner_relationships": [
            {"type": "vendor", "started_at": datetime(2025, 5, 1, tzinfo=timezone.utc),
             "status": "active", "terms": {"owner_email": "agustinc@systemrapid.com",
                                            "default_intervention_cost_usd": 300}},
        ],
        "notes": "Vendor entity de Agustin Rivera (double-hat: empleado SR + dueño Alarmas). Factura semanal a SR-US Miami billing por WOs Arcos Panamá. ~$300/intervención.",
    })

    # ---- 2. Service Agreement V1.1 ----
    print("\n=== 2. Service Agreement V1.1 ===")

    sa_id = await upsert_service_agreement(db, contract_ref=SERVICE_AGREEMENT_REF, doc={
        "tenant_id": tenant_id,
        "organization_id": ces_id,
        "contract_ref": SERVICE_AGREEMENT_REF,
        "title": "SD WAN Project Implementation - Off Net Locations LATAM (Arcos Dorados)",
        "shield_level": "gold",  # 24x7 onsite per SOW
        "sla_spec": {
            "receive_minutes": 4320,  # 72hr advance request per SOW Annex A
            "resolve_minutes": 480,   # 4-8hr arrival window per SOW Section C
            "photos_required": "all",
            "escalation_role": "project_manager",
            "escalation_minutes": 240,
            "coverage_247": True,
            "dedicated_coordinator": True,
        },
        "rate_card": {
            "base_price_per_wo": 500.0,  # OTC installation per site
            "hourly_rate": 70.0,         # Panamá / Aruba / Curaçao / T&T base
            "monthly_fee": 28.33,        # MRC per site
            "after_hours_multiplier": 1.30,  # +30% after-hours per SOW E.6
            "parts_pass_through": True,
            "travel_included": True,
            "notes": (
                "Hourly rates by country: $70 (PA, AW, CW, TT, USVI), $65 (VE), "
                "$50 (GF, GP, MQ). Multipliers: After Hours +30%, Weekends +50%, Holidays +75%. "
                "Bills 30-min increments. 60-month term per site. TCV $2,200/site over 60m."
            ),
        },
        "currency": "USD",  # SOW exige USD, no EUR (caso FM 19566)
        "starts_at": "2025-01-30",
        "ends_at": "2030-04-30",
        "active": True,
        "notes": (
            "SOW V1.1 firmado 30-Jan-2025 por Sajid Hafesjee (RTD SR) + Cori Reitman (CFO/GC CES). "
            "Cubre 2 PAs vivos: PA-1000055 Caribbean (Aruba/Curaçao/T&T 12 sites $28,797.60) y "
            "PA-1000066 Panamá Wave 2 (89 sites $195,800). 9 países Off-Net autorizados incluyendo "
            "Venezuela ($65/hr) — target Phase III Jose Garcia. JV con Fervimax."
        ),
    })

    # ---- 3. Project parent ----
    print("\n=== 3. Project ===")

    project_id = await upsert_project(db, code=PROJECT_CODE, doc={
        "tenant_id": tenant_id,
        "type": "rollout",
        "delivery_pattern": "multi_phase",
        "code": PROJECT_CODE,
        "title": "Arcos Dorados SDWAN Off-Net LATAM",
        "description": (
            "Implementación SDWAN (Cisco Meraki MX67/MX68/MS120/MS125/MR44/MR36H) en restaurantes "
            "y centros de postre Arcos Dorados across LATAM Off-Net. Phase I Caribbean (12 sites: "
            "Aruba 3 + Curaçao 5 + T&T 4). Phase II Panamá Wave 2 (89 sites). Phase III Venezuela "
            "(autorizado en SOW pendiente activar con Jose Garcia). Joint Venture Fervimax."
        ),
        "client_organization_id": ces_id,
        "service_agreement_id": sa_id,
        "po_number": "PA-1000055 + PA-1000066",
        "end_client_organization_id": arcos_id,
        "delivery_chain": [
            {"tier_index": 0, "organization_id": arcos_id, "role": "end_client_metadata",
             "notes": "Arcos Dorados Holdings Multilatinas ROW (operador McDonald's LATAM)"},
            {"tier_index": 1, "organization_id": ces_id, "role": "client",
             "notes": "Claro Enterprise Solutions LLC (factura SRS via PA-1000055/PA-1000066)"},
            {"tier_index": 2, "organization_id": fervimax_id, "role": "channel_partner",
             "notes": "Fervimax JV partner"},
        ],
        "total_sites_target": 12 + 89,  # Phase I + Phase II
        "playbook_template": "SDWAN-install-v1",
        "status": "active",
    })

    # ---- 4. Caribbean Phase I sites ----
    print(f"\n=== 4. Sites Caribbean Phase I ({len(CARIBBEAN_SITES)}) ===")
    car_count = 0
    for code, name, country, city, lat, lng in CARIBBEAN_SITES:
        await upsert_site(db, tenant_id=tenant_id, code=code, doc={
            "tenant_id": tenant_id,
            "organization_id": arcos_id,  # site belongs to Arcos as end_client
            "code": code,
            "name": name,
            "country": country,
            "city": city,
            "lat": lat,
            "lng": lng,
            "site_type": "retail",
            "status": "active",
            "notes": f"Phase I Caribbean — PA-1000055. {name}",
        })
        car_count += 1
    print(f"  → {car_count} Caribbean sites upserted")

    # ---- 5. Panamá Phase II sites (parsed xlsx) ----
    print("\n=== 5. Sites Panamá Phase II (from xlsx) ===")
    pan_sites = await parse_panama_sites_from_xlsx()
    print(f"  Parsed {len(pan_sites)} Panamá sites from xlsx")
    pan_count = 0
    site_code_to_id: dict[str, str] = {}
    for s in pan_sites:
        site_id = await upsert_site(db, tenant_id=tenant_id, code=s["code"], doc={
            "tenant_id": tenant_id,
            "organization_id": arcos_id,
            "code": s["code"],
            "name": s["name"],
            "country": "PA",
            "city": s.get("city") or "Panamá",
            "address": s.get("address"),
            "lat": s.get("lat"),
            "lng": s.get("lng"),
            "site_type": s.get("site_type") or "retail",
            "status": "active",
            "notes": f"Phase II Panamá — PA-1000066. Order/FM ID Claro: {s.get('order_id_fm')}. OTC ${s.get('otc_usd')} + MRC60m ${s.get('mrc60_usd')}.",
        })
        site_code_to_id[s["code"]] = site_id
        pan_count += 1
    print(f"  → {pan_count} Panamá sites upserted")

    # ---- 6. Map Caribbean codes to ids for WO ----
    car_code_to_id: dict[str, str] = {}
    for code, *_ in CARIBBEAN_SITES:
        existing = await db.sites.find_one({"code": code, "tenant_id": tenant_id})
        if existing:
            car_code_to_id[code] = str(existing["_id"])

    # ---- 7. Demo Work Orders + threads ----
    print("\n=== 7. Demo WOs + threads ===")
    # Resolve tech user_ids by email
    user_emails = {wo["tech_email"] for wo in WO_DEMO if wo.get("tech_email")}
    user_id_by_email: dict[str, str] = {}
    for email in user_emails:
        u = await db.users.find_one({"email": email})
        if u:
            user_id_by_email[email] = str(u["_id"])

    for wo_data in WO_DEMO:
        site_id = site_code_to_id.get(wo_data["site_code"]) or car_code_to_id.get(wo_data["site_code"])
        if not site_id:
            print(f"  WARN: site {wo_data['site_code']} not found, skipping WO {wo_data['reference']}")
            continue
        tech_id = user_id_by_email.get(wo_data["tech_email"]) if wo_data.get("tech_email") else None

        wo_doc = {
            "tenant_id": tenant_id,
            "organization_id": ces_id,  # client facturador
            "site_id": site_id,
            "service_agreement_id": sa_id,
            "reference": wo_data["reference"],
            "title": wo_data["title"],
            "description": wo_data["description"],
            "severity": wo_data["severity"],
            "status": wo_data["status"],
            "shield_level": "gold",
            "sla_snapshot": {
                "receive_minutes": 4320,
                "resolve_minutes": 480,
                "photos_required": "all",
                "escalation_role": "project_manager",
                "escalation_minutes": 240,
                "coverage_247": True,
                "dedicated_coordinator": True,
            },
            "ball_in_court": {
                "side": wo_data["ball_side"],
                "since": wo_data.get("scheduled_at") or now_utc(),
            },
            "deadline_resolve_at": wo_data.get("deadline_resolve_at"),
            "assigned_tech_user_id": tech_id,
            "handshakes": [],
            "pre_flight_checklist": {},
            "after_hours": False,
        }
        wo_id = await upsert_work_order(db, reference=wo_data["reference"], doc=wo_doc)

        # Replace threads (idempotent)
        await replace_thread_messages(db, work_order_id=wo_id, kind="shared",
                                       messages=wo_data.get("threads_shared", []),
                                       tenant_id=tenant_id)
        await replace_thread_messages(db, work_order_id=wo_id, kind="internal",
                                       messages=wo_data.get("threads_internal", []),
                                       tenant_id=tenant_id)

    print("\n=== DONE ===")
    print(f"Tenant: {tenant_id}")
    print(f"Project: {project_id}  (code: {PROJECT_CODE})")
    print(f"Service Agreement: {sa_id}  (ref: {SERVICE_AGREEMENT_REF})")
    print(f"Caribbean sites: {car_count}")
    print(f"Panamá sites: {pan_count}")
    print(f"Demo WOs: {len(WO_DEMO)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
