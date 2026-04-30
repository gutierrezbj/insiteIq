#!/usr/bin/env python3
"""
seed_arcos_finance.py — Carga capa Admin/Finance real Claro CES + Arcos.

Idempotente: re-runnable sin duplicar (upsert por keys naturales).

Depende de seed_arcos_claro.py haber corrido primero (orgs + project +
service_agreement + sites + WOs base).

Carga (sin tocar backend, sin features nuevos, solo data):
- 2 WOs históricos sintéticos (PAM-P28-INSTALL + PAM-P08-INSTALL) que Agustin
  ejecutó realmente en feb-2026 según las facturas que él envió.
- 2 Upload records placeholder para PA-1000055.pdf + PA-1000066.pdf
  (metadata only · PDF físico se sube por UI cuando alguien lo arrastre).
- 2 vendor_invoices reales de Alarmas Solutions:
  · 00756 (20-feb-2026): PAM-P28 + PAM-P08, $300 cada, total $600
  · 00757 (27-feb-2026): semana 23-27 feb, sin detalle (PDF pendiente)
- Update FM-19566 con closed_at correspondiente (status:completed pero sin
  closed_at hoy).

Sobre el "rro de cojones" del owner:
Agustin es empleado SR (agustinc@systemrapid.com) Y dueño de Alarmas
Solutions Panamá (RUC E-8-118050 DV83). Factura como vendor a SR-US Miami
billing por las WOs Arcos Panamá que él mismo ejecuta. Esto valida en la
práctica el modelo three-way match del Sprint X-d/X-e.

Sobre la decisión de no automatizar facturación:
Adriana sigue Excel→Word→QuickBooks→email manual. El sistema NO genera
facturas todavía. Solo provee VISIBILIDAD de WOs ready-to-invoice y vendor
invoices pendientes. Automatización viene en sprint maduro posterior.

Usage:
    docker compose exec api python -m scripts.seed_arcos_finance
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import connect_db, get_db  # noqa: E402

# ---- Constants ----

ALARMAS_LEGAL_NAME = "Alarmas Solutions"
CES_LEGAL_NAME = "Claro Enterprise Solutions LLC"
ARCOS_LEGAL_NAME = "Arcos Dorados Holdings Inc - Multilatinas ROW"
SR_US_CODE = "SR-US"
SERVICE_AGREEMENT_REF = "04MSP-V1.1"
PROJECT_CODE = "ARCOS-CLARO-SDWAN-OFFNET"
AGUSTIN_EMAIL = "agustinc@systemrapid.com"

# WO histórico PAM-P28
PAM_P28_INSTALL = {
    "reference": "PAM-P28-INSTALL",
    "site_code": "PAN-P28",
    "title": "PAM-P28 Plaza Comercial Villa Lobos — Equipment installation",
    "description": (
        "Instalación de equipo SDWAN según SOW V1.1. "
        "Ejecutada por Agustin Rivera (Alarmas Solutions vendor)."
    ),
    "severity": "normal",
    "status": "closed",
    "ball_side": "client",  # billing-pendiente cliente
    "scheduled_at": datetime(2026, 2, 19, 13, 0, tzinfo=timezone.utc),  # 8 AM Panamá = 13 UTC
    "closed_at": datetime(2026, 2, 19, 22, 0, tzinfo=timezone.utc),  # 5 PM Panamá
    "created_at": datetime(2026, 2, 19, 12, 0, tzinfo=timezone.utc),
}

# WO histórico PAM-P08
PAM_P08_INSTALL = {
    "reference": "PAM-P08-INSTALL",
    "site_code": "PAN-P08",
    "title": "PAM-P08 Vía España, Hospital San Fernando — Equipment installation",
    "description": (
        "Instalación de equipo SDWAN según SOW V1.1. "
        "Ejecutada por Agustin Rivera (Alarmas Solutions vendor)."
    ),
    "severity": "normal",
    "status": "closed",
    "ball_side": "client",
    "scheduled_at": datetime(2026, 2, 20, 13, 0, tzinfo=timezone.utc),
    "closed_at": datetime(2026, 2, 20, 22, 0, tzinfo=timezone.utc),
    "created_at": datetime(2026, 2, 20, 12, 0, tzinfo=timezone.utc),
}

# Vendor invoice 00756 (visto en doc del owner 27-feb-2026)
VENDOR_INVOICE_00756 = {
    "vendor_invoice_number": "00756",
    "issued_at": datetime(2026, 2, 20, 0, 0, tzinfo=timezone.utc),
    "due_date": datetime(2026, 3, 22, 0, 0, tzinfo=timezone.utc),  # Net 30
    "currency": "USD",
    "subtotal": 600.0,
    "tax_amount": 0.0,
    "total": 600.0,
    "status": "received",
    "received_at": datetime(2026, 2, 27, 22, 13, tzinfo=timezone.utc),  # email Friday EOD
    "lines": [
        {
            "description": "Servicios de instalación proyecto Arcos Dorados — PAM-P28 Plaza Comercial Villa Lobos",
            "quantity": 1.0,
            "unit_price": 300.0,
            "subtotal": 300.0,
            "category": "service",
        },
        {
            "description": "Servicios de instalación proyecto Arcos Dorados — PAM-P08 Vía España (Hospital San Fernando)",
            "quantity": 1.0,
            "unit_price": 300.0,
            "subtotal": 300.0,
            "category": "service",
        },
    ],
    "notes": (
        "Factura semanal de Agustin (Alarmas Solutions) cubriendo instalaciones "
        "del 16-20 Feb 2026. Email From: agustinc@systemrapid.com To: Adriana "
        "Bracho · CC: Sajid + Juan G. PDF físico documentado en owner local "
        "filesystem. Adjuntar via UI uploads cuando se cargue."
    ),
}

# Vendor invoice 00757 (mencionada en mismo email, sin PDF visto todavía)
VENDOR_INVOICE_00757 = {
    "vendor_invoice_number": "00757",
    "issued_at": datetime(2026, 2, 27, 0, 0, tzinfo=timezone.utc),
    "due_date": datetime(2026, 3, 29, 0, 0, tzinfo=timezone.utc),
    "currency": "USD",
    "subtotal": 0.0,  # PDF original pendiente
    "tax_amount": 0.0,
    "total": 0.0,  # placeholder
    "status": "received",
    "received_at": datetime(2026, 2, 27, 22, 13, tzinfo=timezone.utc),
    "lines": [],
    "notes": (
        "Factura semanal de Agustin (Alarmas Solutions) cubriendo instalaciones "
        "del 23-27 Feb 2026. Email From: agustinc@systemrapid.com To: Adriana "
        "Bracho. PDF original PENDIENTE de cargar — total y desglose por sitio "
        "se completan cuando Adriana o Agustin pasen el PDF físico."
    ),
}

# Upload placeholders para PAs (PDF físico se sube por UI)
UPLOAD_PA_1000055 = {
    "original_filename": "PA-1000055_2.pdf",
    "size_bytes": 0,  # placeholder
    "mime_type": "application/pdf",
    "extension": "pdf",
    "storage_name": None,  # PENDING physical upload
    "kind": "file",
    "notes": (
        "Blanket Purchase Agreement Change Order PA-1000055. "
        "Cubre Phase I Caribbean (Aruba 3 + Curaçao 5 + T&T 4 sites). "
        "Subtotal $28,797.60 USD. Period 2025-05-01 → 2030-04-30. "
        "PDF físico en owner local: /Claro/Islas del Caribe/PA-1000055_2.pdf · "
        "subir via UI uploads cuando se cargue."
    ),
}

UPLOAD_PA_1000066 = {
    "original_filename": "PA-1000066.pdf",
    "size_bytes": 0,  # placeholder
    "mime_type": "application/pdf",
    "extension": "pdf",
    "storage_name": None,  # PENDING physical upload
    "kind": "file",
    "notes": (
        "Blanket Purchase Agreement PA-1000066. "
        "Cubre Phase II Panamá (89 sites Wave 2). "
        "Subtotal $195,800 USD. Period 2025-10-13 → 2030-10-12. "
        "PDF físico en owner local: /Claro/Panama/DOCS/PA-1000066.pdf · "
        "subir via UI uploads cuando se cargue."
    ),
}

# FM-19566 update (status:completed pero falta closed_at)
FM_19566_CLOSED_AT = datetime(2025, 12, 15, 21, 0, tzinfo=timezone.utc)  # 3 PM Aruba


# ---- Helpers ----

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def upsert_work_order(db, *, reference: str, doc: dict) -> str:
    key = {"reference": reference, "tenant_id": doc["tenant_id"]}
    existing = await db.work_orders.find_one(key)
    if existing:
        await db.work_orders.update_one(
            {"_id": existing["_id"]}, {"$set": {**doc, "updated_at": now_utc()}}
        )
        print(f"  WO UPDATE: {reference} ({existing['_id']})")
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    res = await db.work_orders.insert_one(doc)
    print(f"  WO INSERT: {reference} ({res.inserted_id})")
    return str(res.inserted_id)


async def upsert_vendor_invoice(db, *, vendor_invoice_number: str, vendor_organization_id: str, doc: dict) -> str:
    key = {
        "vendor_invoice_number": vendor_invoice_number,
        "vendor_organization_id": vendor_organization_id,
        "tenant_id": doc["tenant_id"],
    }
    existing = await db.vendor_invoices.find_one(key)
    if existing:
        await db.vendor_invoices.update_one(
            {"_id": existing["_id"]}, {"$set": {**doc, "updated_at": now_utc()}}
        )
        print(f"  VI UPDATE: {vendor_invoice_number} ({existing['_id']})")
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    res = await db.vendor_invoices.insert_one(doc)
    print(f"  VI INSERT: {vendor_invoice_number} ({res.inserted_id})")
    return str(res.inserted_id)


async def upsert_upload_placeholder(db, *, original_filename: str, doc: dict) -> str:
    key = {
        "original_filename": original_filename,
        "tenant_id": doc["tenant_id"],
        "storage_name": None,  # placeholders specifically have null storage_name
    }
    existing = await db.uploads.find_one(key)
    if existing:
        await db.uploads.update_one(
            {"_id": existing["_id"]}, {"$set": {**doc, "updated_at": now_utc()}}
        )
        print(f"  Upload UPDATE (placeholder): {original_filename} ({existing['_id']})")
        return str(existing["_id"])
    doc.setdefault("created_at", now_utc())
    doc.setdefault("updated_at", now_utc())
    doc.setdefault("uploaded_at", now_utc())
    res = await db.uploads.insert_one(doc)
    print(f"  Upload INSERT (placeholder): {original_filename} ({res.inserted_id})")
    return str(res.inserted_id)


# ---- Main ----

async def main():
    await connect_db()
    db = get_db()

    # Tenant
    tenant = await db.tenants.find_one({})
    if not tenant:
        print("ERROR: no tenants. Run seed_foundation first.")
        sys.exit(1)
    tenant_id = str(tenant["_id"])
    print(f"Tenant: {tenant.get('name', tenant_id)} ({tenant_id})")

    # Resolve IDs (require seed_arcos_claro.py to have run first)
    print("\n=== Resolving prerequisites ===")
    alarmas = await db.organizations.find_one({"legal_name": ALARMAS_LEGAL_NAME, "tenant_id": tenant_id})
    if not alarmas:
        print(f"ERROR: org '{ALARMAS_LEGAL_NAME}' not found. Run seed_arcos_claro first.")
        sys.exit(1)
    alarmas_id = str(alarmas["_id"])
    print(f"  Alarmas Solutions: {alarmas_id}")

    ces = await db.organizations.find_one({"legal_name": CES_LEGAL_NAME, "tenant_id": tenant_id})
    if not ces:
        print(f"ERROR: org '{CES_LEGAL_NAME}' not found.")
        sys.exit(1)
    ces_id = str(ces["_id"])
    print(f"  CES: {ces_id}")

    sa = await db.service_agreements.find_one({"contract_ref": SERVICE_AGREEMENT_REF, "tenant_id": tenant_id})
    if not sa:
        print(f"ERROR: service_agreement '{SERVICE_AGREEMENT_REF}' not found.")
        sys.exit(1)
    sa_id = str(sa["_id"])
    print(f"  ServiceAgreement: {sa_id}")

    sr_us = await db.srs_entities.find_one({"code": SR_US_CODE})
    if not sr_us:
        print(f"ERROR: srs_entity '{SR_US_CODE}' not found.")
        sys.exit(1)
    sr_us_id = str(sr_us["_id"])
    print(f"  SR-US: {sr_us_id}")

    agustin = await db.users.find_one({"email": AGUSTIN_EMAIL})
    if not agustin:
        print(f"ERROR: user {AGUSTIN_EMAIL} not found.")
        sys.exit(1)
    agustin_id = str(agustin["_id"])
    print(f"  Agustin: {agustin_id}")

    arcos = await db.organizations.find_one({"legal_name": ARCOS_LEGAL_NAME, "tenant_id": tenant_id})
    if not arcos:
        print(f"ERROR: org '{ARCOS_LEGAL_NAME}' not found.")
        sys.exit(1)
    arcos_id = str(arcos["_id"])

    # Sites PAM-P28 and PAM-P08
    site_pam_p28 = await db.sites.find_one({"code": "PAN-P28", "tenant_id": tenant_id})
    site_pam_p08 = await db.sites.find_one({"code": "PAN-P08", "tenant_id": tenant_id})
    if not site_pam_p28 or not site_pam_p08:
        print(f"ERROR: sites PAN-P28 or PAN-P08 not found. Run seed_arcos_claro first.")
        sys.exit(1)
    print(f"  Site PAN-P28: {site_pam_p28['_id']}")
    print(f"  Site PAN-P08: {site_pam_p08['_id']}")

    # ---- 1. WOs históricos ----
    print("\n=== 1. WOs históricos PAM-P28 + PAM-P08 ===")
    common_wo_fields = {
        "tenant_id": tenant_id,
        "organization_id": ces_id,  # client facturador
        "service_agreement_id": sa_id,
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
        "assigned_tech_user_id": agustin_id,
        "handshakes": [],
        "pre_flight_checklist": {},
        "after_hours": False,
    }
    pam_p28_wo = {
        **common_wo_fields,
        "site_id": str(site_pam_p28["_id"]),
        "reference": PAM_P28_INSTALL["reference"],
        "title": PAM_P28_INSTALL["title"],
        "description": PAM_P28_INSTALL["description"],
        "severity": PAM_P28_INSTALL["severity"],
        "status": PAM_P28_INSTALL["status"],
        "ball_in_court": {
            "side": PAM_P28_INSTALL["ball_side"],
            "since": PAM_P28_INSTALL["closed_at"],
        },
        "closed_at": PAM_P28_INSTALL["closed_at"],
        "created_at": PAM_P28_INSTALL["created_at"],
    }
    pam_p28_wo_id = await upsert_work_order(
        db, reference=PAM_P28_INSTALL["reference"], doc=pam_p28_wo
    )

    pam_p08_wo = {
        **common_wo_fields,
        "site_id": str(site_pam_p08["_id"]),
        "reference": PAM_P08_INSTALL["reference"],
        "title": PAM_P08_INSTALL["title"],
        "description": PAM_P08_INSTALL["description"],
        "severity": PAM_P08_INSTALL["severity"],
        "status": PAM_P08_INSTALL["status"],
        "ball_in_court": {
            "side": PAM_P08_INSTALL["ball_side"],
            "since": PAM_P08_INSTALL["closed_at"],
        },
        "closed_at": PAM_P08_INSTALL["closed_at"],
        "created_at": PAM_P08_INSTALL["created_at"],
    }
    pam_p08_wo_id = await upsert_work_order(
        db, reference=PAM_P08_INSTALL["reference"], doc=pam_p08_wo
    )

    # ---- 2. Update FM-19566 closed_at ----
    print("\n=== 2. FM-19566 closed_at update ===")
    fm_19566 = await db.work_orders.find_one({"reference": "FM-19566", "tenant_id": tenant_id})
    if fm_19566:
        update_fields = {"updated_at": now_utc()}
        if not fm_19566.get("closed_at"):
            update_fields["closed_at"] = FM_19566_CLOSED_AT
        await db.work_orders.update_one(
            {"_id": fm_19566["_id"]}, {"$set": update_fields}
        )
        print(f"  FM-19566 closed_at SET: {FM_19566_CLOSED_AT.isoformat()}")
    else:
        print(f"  FM-19566 not found · skip")

    # ---- 3. Upload placeholders (PA PDFs) ----
    print("\n=== 3. Upload placeholders PA PDFs ===")
    upload_doc_base = {
        "tenant_id": tenant_id,
        "uploaded_by": "system_seed",
        "created_by": "system_seed",
        "updated_by": "system_seed",
        "entity_refs": [
            {"collection": "service_agreements", "id": sa_id},
        ],
    }
    upload_pa_55_id = await upsert_upload_placeholder(
        db,
        original_filename=UPLOAD_PA_1000055["original_filename"],
        doc={**upload_doc_base, **UPLOAD_PA_1000055},
    )
    upload_pa_66_id = await upsert_upload_placeholder(
        db,
        original_filename=UPLOAD_PA_1000066["original_filename"],
        doc={**upload_doc_base, **UPLOAD_PA_1000066},
    )

    # ---- 4. Vendor invoices Agustin ----
    print("\n=== 4. Vendor invoices Alarmas Solutions ===")

    vi_00756_doc = {
        "tenant_id": tenant_id,
        "vendor_organization_id": alarmas_id,
        "srs_entity_id": sr_us_id,
        "service_agreement_id": sa_id,
        "linked_work_order_ids": [pam_p28_wo_id, pam_p08_wo_id],
        "linked_budget_approval_ids": [],
        "attachment_urls": [],  # PDF físico se sube via UI cuando aplique
        **VENDOR_INVOICE_00756,
    }
    await upsert_vendor_invoice(
        db,
        vendor_invoice_number=VENDOR_INVOICE_00756["vendor_invoice_number"],
        vendor_organization_id=alarmas_id,
        doc=vi_00756_doc,
    )

    vi_00757_doc = {
        "tenant_id": tenant_id,
        "vendor_organization_id": alarmas_id,
        "srs_entity_id": sr_us_id,
        "service_agreement_id": sa_id,
        "linked_work_order_ids": [],  # se completa cuando llegue PDF original
        "linked_budget_approval_ids": [],
        "attachment_urls": [],
        **VENDOR_INVOICE_00757,
    }
    await upsert_vendor_invoice(
        db,
        vendor_invoice_number=VENDOR_INVOICE_00757["vendor_invoice_number"],
        vendor_organization_id=alarmas_id,
        doc=vi_00757_doc,
    )

    # ---- DONE ----
    print("\n=== DONE ===")
    print(f"Tenant: {tenant_id}")
    print(f"WOs históricos: PAM-P28-INSTALL ({pam_p28_wo_id}), PAM-P08-INSTALL ({pam_p08_wo_id})")
    print(f"FM-19566 closed_at actualizado")
    print(f"Upload placeholders: PA-1000055 ({upload_pa_55_id}), PA-1000066 ({upload_pa_66_id})")
    print(f"Vendor invoices: 00756 ({alarmas_id} → SR-US, $600), 00757 (PDF pending)")
    print()
    print("Adriana ahora ve:")
    print(f"  · 2 WOs Panamá completadas listas para facturar a Claro CES (PA-1000066)")
    print(f"  · 2 vendor invoices de Alarmas pendientes de procesar (three-way match)")
    print(f"  · FM-19566 Aruba completada históricamente")
    print()
    print("Adriana sigue facturando manual fuera del sistema (Excel→Word→QB→email).")
    print("Pero ya NO necesita perseguir el Excel de Andros · lo ve en InsiteIQ.")


if __name__ == "__main__":
    asyncio.run(main())
