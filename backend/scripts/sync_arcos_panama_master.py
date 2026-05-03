#!/usr/bin/env python3
"""
sync_arcos_panama_master.py — Conciliar rollout Arcos Panamá contra hoja
maestra de Agustín (Iter 2.12).

Fuente de verdad: `data/master_xlsx/McDonalds_Control_ Panama_25-04-26.xlsx`
hoja "Control" (1 row por device, agrupada por loc.code = site).

Lógica:
  1. Lee XLSX, agrupa rows por loc.code, deriva status del SITE:
     - All devices Completed → site_status = "completed"
     - All Cancelled → site_status = "cancelled"
     - Mixto → site_status = "completed" si hay ≥1 completed (fallback liberal,
       comentado en código)
     - All NA → "pending" (ignorar)
  2. Para cada site del XLSX, busca match en mongo (project Arcos):
     - Por loc.code embebido en site.code (ej. "P02" → site.code contiene "-P02-")
     - Por keyword especial (loc=0 → "CENTRO-DE-DATOS", loc=100 → "100")
  3. Para cada match, propone update del WO correspondiente:
     - status mongo current → status XLSX-derived
     - Si site no matchea, lista como warning
  4. DRY-RUN obligatorio por default. Solo aplica con --apply.

Usage:
    docker compose exec api python -m scripts.sync_arcos_panama_master           # dry-run preview
    docker compose exec api python -m scripts.sync_arcos_panama_master --apply   # ejecuta cambios
    docker compose exec api python -m scripts.sync_arcos_panama_master --project-code OTRO  # otro project

Idempotente: re-correr no duplica nada (es UPDATE de status, no INSERT).
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import openpyxl

# Add project root to path so we can import app.*
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import connect_db, get_db  # noqa: E402

# ---- Constants ----
DEFAULT_XLSX = Path("/app/data/master_xlsx/McDonalds_Control_ Panama_25-04-26.xlsx")
DEFAULT_PROJECT_CODE = "ARCOS-CLARO-SDWAN-OFFNET"

# XLSX status → InsiteIQ WO status mapping
STATUS_MAP = {
    "Completed": "completed",
    "Cancelled": "cancelled",
    "NA": None,           # skip
    None: None,
    "": None,
}


def derive_site_status(device_rows: list[dict]) -> tuple[str | None, str]:
    """Given all device rows for a site, derive the site-level status.
    Returns (status, reason)."""
    statuses = [STATUS_MAP.get(r.get("device_status")) for r in device_rows]
    statuses = [s for s in statuses if s is not None]
    if not statuses:
        return None, "all NA/blank"
    if all(s == "completed" for s in statuses):
        return "completed", f"{len(statuses)} devices completed"
    if all(s == "cancelled" for s in statuses):
        return "cancelled", f"{len(statuses)} devices cancelled"
    # mixed → fallback liberal: si hay ≥1 completed, marcar completed
    completed_n = sum(1 for s in statuses if s == "completed")
    cancelled_n = sum(1 for s in statuses if s == "cancelled")
    if completed_n > 0:
        return "completed", f"mixto: {completed_n} completed + {cancelled_n} cancelled (fallback liberal)"
    return "cancelled", f"mixto: {completed_n} completed + {cancelled_n} cancelled"


def loc_to_site_match_keys(loc) -> list[str]:
    """Devolver lista de strings que el site.code debería contener para match.
    XLSX loc → InsiteIQ site.code keywords."""
    if loc is None:
        return []
    s = str(loc).strip()
    if not s or s.upper() == "NA":
        return []
    if s == "0":
        return ["CENTRO-DE-DATOS"]
    if s == "100":
        return ["100"]
    # Patrón P## o P##K? — match exacto con guiones alrededor
    if re.match(r"^P\d+K?\d*$", s.upper()):
        keys = [f"-{s.upper()}-", f"PAN-{s.upper()}"]
        # Para locs P10X tipo P106, P112 (3+ digits sin K), también probar sin la P
        # porque InsiteIQ los codifica como PAN-PAN-106-RESTAURANTE / PAN-112-RESTAURANTE
        m = re.match(r"^P(\d{3,})$", s.upper())
        if m:
            keys.append(f"-{m.group(1)}-")
        return keys
    # Otros casos
    return [s.upper()]


def site_matches_loc(site: dict, loc_keys: list[str]) -> bool:
    code = (site.get("code") or "").upper()
    return any(k.upper() in code for k in loc_keys)


def read_xlsx_grouped(xlsx_path: Path) -> dict[str, list[dict]]:
    """Read Control sheet and group device rows by loc.code."""
    wb = openpyxl.load_workbook(str(xlsx_path), data_only=True, read_only=True)
    ws = wb["Control"]
    by_loc: dict[str, list[dict]] = defaultdict(list)
    for row in ws.iter_rows(min_row=4, values_only=True):
        if not row or not any(row):
            continue
        loc = row[13]  # column N = Loc. Code
        if loc is None:
            continue
        device = {
            "device_type": row[0],
            "serial": row[1],
            "reference": row[2],
            "planned_date": row[3],
            "device_status": row[11],
            "address": row[12],
            "loc": loc,
            "notes": row[14],
        }
        by_loc[str(loc)].append(device)
    return dict(by_loc)


async def fetch_project_state(project_code: str) -> tuple[dict, list[dict], list[dict]]:
    """Returns (project, work_orders, sites) for the project."""
    db = get_db()
    project = await db.projects.find_one({"code": project_code})
    if not project:
        raise RuntimeError(f"Project {project_code!r} not found")
    project_id = str(project["_id"])
    wos = await db.work_orders.find({"project_id": project_id}).to_list(length=500)
    site_ids = list({w.get("site_id") for w in wos if w.get("site_id")})
    from bson import ObjectId
    site_obj_ids = [ObjectId(s) for s in site_ids]
    sites = await db.sites.find({"_id": {"$in": site_obj_ids}}).to_list(length=500)
    # Add string id for ease
    for s in sites:
        s["id"] = str(s["_id"])
    return project, wos, sites


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", type=str, default=str(DEFAULT_XLSX))
    parser.add_argument("--project-code", type=str, default=DEFAULT_PROJECT_CODE)
    parser.add_argument("--apply", action="store_true", help="Apply changes (default: dry-run)")
    args = parser.parse_args()

    print(f"[sync] xlsx={args.xlsx}")
    print(f"[sync] project={args.project_code}")
    print(f"[sync] mode={'APPLY' if args.apply else 'DRY-RUN'}")
    print()

    xlsx_path = Path(args.xlsx)
    if not xlsx_path.exists():
        print(f"[error] XLSX not found: {xlsx_path}")
        return 2

    # Read XLSX
    print("[1/4] Reading XLSX...")
    by_loc = read_xlsx_grouped(xlsx_path)
    print(f"      {len(by_loc)} unique locations · {sum(len(v) for v in by_loc.values())} device rows")

    # Connect mongo + load project state
    print("[2/4] Loading project state from mongo...")
    await connect_db()
    project, wos, sites = await fetch_project_state(args.project_code)
    project_id = str(project["_id"])
    sites_by_id = {s["id"]: s for s in sites}
    wos_by_site = {w.get("site_id"): w for w in wos}
    print(f"      project_id={project_id} · {len(wos)} WOs · {len(sites)} sites")
    print()

    # Match XLSX loc → InsiteIQ site/wo
    print("[3/4] Matching XLSX rows to InsiteIQ WOs...")
    db = get_db()
    actions = []  # list of {wo_id, current_status, new_status, site_code, loc, reason, devices_count}
    unmatched_locs = []
    matched_count = 0

    for loc, device_rows in sorted(by_loc.items()):
        loc_keys = loc_to_site_match_keys(loc)
        if not loc_keys:
            unmatched_locs.append({"loc": loc, "reason": "loc empty/NA", "devices": len(device_rows)})
            continue
        # Find sites in project that match
        matched_sites = [s for s in sites if site_matches_loc(s, loc_keys)]
        if not matched_sites:
            unmatched_locs.append({"loc": loc, "reason": f"no site matches keys {loc_keys}", "devices": len(device_rows)})
            continue
        if len(matched_sites) > 1:
            # Try to disambiguate using K-suffix priority
            # If loc has K-suffix (P22K1), prefer site with exact -K1
            # If loc has NO K-suffix (P22), prefer site WITHOUT K (just -P22-Restaurante)
            print(f"      [warn] loc={loc!r} matches {len(matched_sites)} sites: {[s['code'] for s in matched_sites]}")
        site = matched_sites[0]
        wo = wos_by_site.get(site["id"])
        if not wo:
            unmatched_locs.append({"loc": loc, "reason": f"site {site['code']} has no WO in project", "devices": len(device_rows)})
            continue

        new_status, reason = derive_site_status(device_rows)
        if new_status is None:
            continue  # all NA, skip
        current_status = wo.get("status")
        if current_status == new_status:
            continue  # already aligned, no action
        actions.append({
            "wo_id": str(wo["_id"]),
            "wo_reference": wo.get("reference"),
            "site_code": site["code"],
            "site_name": site.get("name"),
            "loc": loc,
            "current_status": current_status,
            "new_status": new_status,
            "reason": reason,
            "devices_count": len(device_rows),
        })
        matched_count += 1

    print(f"      {matched_count} sites matched and need update")
    print(f"      {len(unmatched_locs)} XLSX locs unmatched")
    print()

    # Report
    print("[4/4] Plan / Actions:")
    print()
    print("=" * 100)
    print(f"{'LOC':6}  {'CURRENT':12} → {'NEW':12}  {'SITE CODE':40}  {'REASON':30}")
    print("=" * 100)
    for a in actions[:80]:
        print(f"{a['loc']:6}  {a['current_status']:12} → {a['new_status']:12}  {a['site_code'][:40]:40}  {a['reason'][:30]:30}")
    if len(actions) > 80:
        print(f"... and {len(actions) - 80} more")
    print("=" * 100)
    print()

    # Summary by transition
    transitions = defaultdict(int)
    for a in actions:
        transitions[(a["current_status"], a["new_status"])] += 1
    print("[summary] Transitions:")
    for (cur, new), n in sorted(transitions.items(), key=lambda x: -x[1]):
        print(f"  {cur:12} → {new:12}  ×  {n}")
    print()

    if unmatched_locs:
        print(f"[summary] Unmatched XLSX locs ({len(unmatched_locs)}):")
        for u in unmatched_locs[:20]:
            print(f"  loc={u['loc']!r:8}  devices={u['devices']:3}  reason={u['reason']}")
        if len(unmatched_locs) > 20:
            print(f"  ... and {len(unmatched_locs) - 20} more")
        print()

    if not args.apply:
        print("=" * 100)
        print("[DRY-RUN] No changes applied. Re-run with --apply to execute.")
        print("=" * 100)
        return 0

    # APPLY
    print("[APPLY] Updating WO statuses...")
    from bson import ObjectId
    now = datetime.now(timezone.utc)
    applied = 0
    errors = []
    for a in actions:
        try:
            update = {
                "status": a["new_status"],
                "updated_at": now,
            }
            if a["new_status"] == "cancelled":
                update["cancelled_at"] = now
                update["cancel_reason"] = f"Sync from Agustin master XLSX 2026-04-25 · {a['reason']}"
            elif a["new_status"] == "completed":
                update["closed_at"] = now  # treat completed as terminal-positive end
            await db.work_orders.update_one(
                {"_id": ObjectId(a["wo_id"])},
                {"$set": update},
            )
            applied += 1
        except Exception as e:
            errors.append({"wo_id": a["wo_id"], "loc": a["loc"], "error": str(e)})

    print(f"[APPLY] {applied} WOs updated · {len(errors)} errors")
    if errors:
        for e in errors[:10]:
            print(f"  loc={e['loc']!r}  wo_id={e['wo_id']}  err={e['error']}")
    print()
    print("[done] Re-correr endpoint /api/projects/{id}/dashboard para ver counts actualizados.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()) or 0)
