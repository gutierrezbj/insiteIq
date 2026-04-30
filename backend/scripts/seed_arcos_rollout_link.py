#!/usr/bin/env python3
"""
seed_arcos_rollout_link.py — Link WOs al project + placeholder WOs.

Idempotente: re-runnable sin duplicar.

Resuelve: dashboard `/api/projects/{id}/dashboard` devolvía 0 WOs porque
las 4 WOs Arcos cargadas (FM-19566, FM-20413, PAM-P28-INSTALL,
PAM-P08-INSTALL) no tenían `project_id` linkeado al project
ARCOS-CLARO-SDWAN-OFFNET.

Acciones:
1. Linkea las 4 WOs Arcos existentes al project_id correcto.
2. Crea placeholder WOs (status=intake, scheduled_at=null) para los 85
   sites Panamá Phase II sin actividad, reflejando que el rollout SOW
   tiene 89 sites identificados pero sólo 2 ejecutados todavía. Honest
   dogfooding: data refleja el estado real, no inventa nada.
3. Linkea las 12 sites Caribbean Phase I al project (similar tratamiento
   pendiente, se hace en próxima iteración).

Sin esto, el cuadro de mando del rollout muestra 0/0 y no responde
"¿cómo coño va el rollout?".

Usage:
    docker compose exec api python -m scripts.seed_arcos_rollout_link
"""
from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add project root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import connect_db, get_db  # noqa: E402

PROJECT_CODE = "ARCOS-CLARO-SDWAN-OFFNET"
SERVICE_AGREEMENT_REF = "04MSP-V1.1"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def main():
    await connect_db()
    db = get_db()

    # Tenant
    tenant = await db.tenants.find_one({})
    tenant_id = str(tenant["_id"])
    print(f"Tenant: {tenant_id}")

    # Project + agreement
    project = await db.projects.find_one({"code": PROJECT_CODE, "tenant_id": tenant_id})
    if not project:
        print(f"ERROR: project {PROJECT_CODE} not found. Run seed_arcos_claro first.")
        sys.exit(1)
    project_id = str(project["_id"])
    print(f"Project: {project_id} ({PROJECT_CODE})")

    sa = await db.service_agreements.find_one(
        {"contract_ref": SERVICE_AGREEMENT_REF, "tenant_id": tenant_id}
    )
    sa_id = str(sa["_id"])

    # Client org (CES)
    ces = await db.organizations.find_one(
        {"legal_name": "Claro Enterprise Solutions LLC", "tenant_id": tenant_id}
    )
    ces_id = str(ces["_id"])

    # End-client org (Arcos) for sites filter
    arcos = await db.organizations.find_one(
        {"legal_name": "Arcos Dorados Holdings Inc - Multilatinas ROW", "tenant_id": tenant_id}
    )
    arcos_id = str(arcos["_id"])

    # ---- 1. Link existing 4 WOs Arcos to project_id ----
    print("\n=== 1. Linking 4 WOs Arcos al project_id ===")
    refs_to_link = ["FM-19566", "FM-20413", "PAM-P28-INSTALL", "PAM-P08-INSTALL"]
    for ref in refs_to_link:
        wo = await db.work_orders.find_one({"reference": ref, "tenant_id": tenant_id})
        if not wo:
            print(f"  SKIP: {ref} not found")
            continue
        if wo.get("project_id") == project_id:
            print(f"  ALREADY LINKED: {ref}")
            continue
        await db.work_orders.update_one(
            {"_id": wo["_id"]},
            {"$set": {"project_id": project_id, "updated_at": now_utc()}},
        )
        print(f"  LINKED: {ref} → {project_id}")

    # ---- 2. Create placeholder WOs for Panamá sites without activity ----
    print("\n=== 2. Placeholder WOs para sites Panamá Phase II sin actividad ===")
    # Sites Panamá Phase II = 89 sites con code starting "PAN-" loaded by seed_arcos_claro
    # Excluding the 4 McDonald's sites (code starts "MCD-PA")
    pa_sites = await db.sites.find(
        {
            "tenant_id": tenant_id,
            "country": "PA",
            "code": {"$regex": "^PAN-"},
            "organization_id": arcos_id,
        }
    ).to_list(None)
    print(f"  Found {len(pa_sites)} sites PAN-* under Arcos")

    # WOs already existing for these sites (PAM-P28-INSTALL on PAN-P28, etc.)
    existing_wo_sites = await db.work_orders.distinct(
        "site_id",
        {"tenant_id": tenant_id, "project_id": project_id},
    )
    existing_set = {str(s) for s in existing_wo_sites}
    print(f"  Sites con WO existente: {len(existing_set)}")

    placeholder_count = 0
    for site in pa_sites:
        site_id = str(site["_id"])
        if site_id in existing_set:
            continue  # ya tiene WO
        # Build placeholder WO
        ref = f"{site['code']}-PENDING"
        existing_wo = await db.work_orders.find_one(
            {"reference": ref, "tenant_id": tenant_id}
        )
        if existing_wo:
            # Update if missing project_id
            if existing_wo.get("project_id") != project_id:
                await db.work_orders.update_one(
                    {"_id": existing_wo["_id"]},
                    {"$set": {"project_id": project_id, "updated_at": now_utc()}},
                )
            continue

        # Create placeholder WO
        wo_doc = {
            "tenant_id": tenant_id,
            "organization_id": ces_id,
            "site_id": site_id,
            "service_agreement_id": sa_id,
            "project_id": project_id,
            "reference": ref,
            "title": f"{site['name']} — Pendiente agendar instalación SDWAN",
            "description": (
                f"Site identificado en el SOW V1.1 PA-1000066 Phase II Panamá. "
                f"Pendiente: asignar tech, agendar fecha, ejecutar instalación SDWAN "
                f"(Cisco Meraki MX67/MX68 según tipo). Sin actividad registrada todavía."
            ),
            "severity": "normal",
            "status": "intake",
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
            "ball_in_court": {"side": "srs", "since": now_utc()},
            "assigned_tech_user_id": None,
            "handshakes": [],
            "pre_flight_checklist": {},
            "after_hours": False,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await db.work_orders.insert_one(wo_doc)
        placeholder_count += 1

    print(f"  Placeholder WOs created: {placeholder_count}")

    # ---- 3. Quick verify dashboard ----
    print("\n=== 3. Dashboard project ahora ===")
    total_now = await db.work_orders.count_documents(
        {"tenant_id": tenant_id, "project_id": project_id}
    )
    by_status_pipeline = [
        {"$match": {"tenant_id": tenant_id, "project_id": project_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    buckets = {r["_id"]: r["count"] async for r in db.work_orders.aggregate(by_status_pipeline)}
    print(f"  Total WOs en project: {total_now}")
    for status, count in sorted(buckets.items(), key=lambda x: -x[1]):
        print(f"    {status}: {count}")

    print("\n=== DONE ===")
    print(f"Project {PROJECT_CODE} ({project_id}) ahora tiene {total_now} WOs linkeadas.")
    print(f"Dashboard endpoint /api/projects/{project_id}/dashboard ya devolverá números reales.")


if __name__ == "__main__":
    asyncio.run(main())
