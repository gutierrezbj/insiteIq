"""
InsiteIQ — deactivate_user.py

Baja de un usuario en PROD sin borrar nada (audit_log inmutable · principio #7):
  - is_active=False + space_memberships[].active=False
  - WOs abiertas donde es coordinador SRS → se reasignan a REASSIGN_TO_EMAIL
  - Projects donde es coordinador / cluster lead / field senior → idem

DRY-RUN por defecto (lección #10). Solo escribe con DEACTIVATE_EXECUTE=1.

Uso (desde VPS):
    docker compose exec -T -e USER_EMAIL=luiss@systemrapid.com api python -m scripts.deactivate_user
    docker compose exec -T -e USER_EMAIL=luiss@systemrapid.com -e DEACTIVATE_EXECUTE=1 api python -m scripts.deactivate_user
Opcional: REASSIGN_TO_EMAIL (default androsb@systemrapid.com) · ACTOR_EMAIL (default juang@systemrapid.io)
"""
import asyncio
import os
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db
from app.middleware.audit_log import write_audit_event

OPEN_STATUSES = ["intake", "triage", "pre_flight", "dispatched", "en_route", "on_site", "resolved"]


async def main():
    email = (os.environ.get("USER_EMAIL") or "").strip().lower()
    reassign_email = (os.environ.get("REASSIGN_TO_EMAIL") or "androsb@systemrapid.com").strip().lower()
    actor_email = (os.environ.get("ACTOR_EMAIL") or "juang@systemrapid.io").strip().lower()
    execute = os.environ.get("DEACTIVATE_EXECUTE") == "1"
    if not email:
        print("Falta USER_EMAIL")
        return

    await connect_db()
    db = get_db()
    now = datetime.now(timezone.utc)

    user = await db.users.find_one({"email": email})
    if not user:
        print(f"User NO encontrado: {email}")
        return
    target = await db.users.find_one({"email": reassign_email})
    actor = await db.users.find_one({"email": actor_email})
    if not target or not actor:
        print(f"Falta user destino ({reassign_email}) o actor ({actor_email})")
        return
    uid, tid, aid = str(user["_id"]), str(target["_id"]), str(actor["_id"])
    tenant_id = user["tenant_id"]

    wos = await db.work_orders.find(
        {"tenant_id": tenant_id, "srs_coordinator_user_id": uid, "status": {"$in": OPEN_STATUSES}}
    ).to_list(500)
    projects = await db.projects.find({"tenant_id": tenant_id, "$or": [
        {"srs_coordinator_user_id": uid}, {"cluster_lead_user_id": uid}, {"field_senior_user_id": uid},
    ]}).to_list(200)

    print("=" * 64)
    print("EXECUTE" if execute else "DRY-RUN (DEACTIVATE_EXECUTE=1 para aplicar)")
    print("=" * 64)
    print(f"User: {user.get('full_name')} <{email}> · id={uid} · is_active={user.get('is_active')}")
    print(f"Reasignar a: {target.get('full_name')} <{reassign_email}> · id={tid}")
    print(f"WOs abiertas como coordinador: {len(wos)}")
    for w in wos:
        print(f"  · {w.get('reference')} · {w.get('status')}")
    print(f"Projects con rol: {len(projects)}")
    for p in projects:
        print(f"  · {p.get('code')} · {p.get('status')}")
    if not execute:
        await close_db()
        return

    memberships = [{**m, "active": False} for m in (user.get("space_memberships") or [])]
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "is_active": False, "space_memberships": memberships, "updated_at": now, "updated_by": aid,
    }})
    for w in wos:
        await db.work_orders.update_one({"_id": w["_id"]}, {"$set": {
            "srs_coordinator_user_id": tid, "updated_at": now, "updated_by": aid,
        }})
    for p in projects:
        upd = {"updated_at": now, "updated_by": aid}
        for f in ("srs_coordinator_user_id", "cluster_lead_user_id", "field_senior_user_id"):
            if p.get(f) == uid:
                upd[f] = tid
        await db.projects.update_one({"_id": p["_id"]}, {"$set": upd})

    await write_audit_event(
        db, tenant_id=tenant_id, actor_user_id=aid, action="user.deactivate",
        entity_refs=[{"collection": "users", "id": uid, "label": email}],
        context_snapshot={
            "via": "scripts.deactivate_user",
            "reassigned_to": tid,
            "work_orders": [w.get("reference") for w in wos],
            "projects": [p.get("code") for p in projects],
        },
    )
    print(f"OK · user desactivado · {len(wos)} WOs y {len(projects)} projects reasignados a {reassign_email}")
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
