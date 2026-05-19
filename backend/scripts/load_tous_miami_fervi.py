"""
InsiteIQ — load_tous_miami_fervi.py (2026-05-19 · v2 con WhatsApp drama)

Caso real Fervimax → SRS · DOS tiendas TOUS en Florida.

Reconstrucción desde:
  - Cadena de emails Andrés Tyminskiy (Fervi PM)
  - WhatsApp group "Fervi-TOUS" (35 fotos · 1 audio · 262 mensajes)
  - Cabezazos del owner JuanCho con los roles reales

Roles correctos:
  - Andres Tyminskiy (Fervi)  → coordinador de la actividad del LADO FERVI
                                 (cliente Tier-1 · NO user InsiteIQ)
  - Andros + Luis (SRS)       → coordinadores SRS (uno por WO en este test)
  - Oscar Iturria             → técnico de TOUS desde MX (NO coord · contacto técnico
                                 del cliente final · onsite_contact del Site)
  - Iduber Fercho             → tech de campo asignado (3er intento)

Histórico previo (techs que NO resolvieron · va en briefing):
  - 5 may  · Jose Avendano       → Pembroke · red desconfigurada
  - 12 may · Carlos Marin Telxius → Dadeland · no encontró cable internet AT&T

DOS sites + DOS WOs (idempotente por reference):
  1. FERVI-TOUS-PMB-001 → Pembroke Pines (mañana miércoles ~11am Miami)
  2. FERVI-TOUS-DDM-001 → Dadeland Mall (jueves · hora TBD)

Uso (desde VPS):
    ssh root@72.62.41.234 'cd /opt/apps/insiteiq && git pull && \\
      docker compose exec -T api python -m scripts.load_tous_miami_fervi'
"""
import asyncio
from datetime import datetime, timedelta, timezone

from app.database import close_db, connect_db, get_db
from app.core.security import hash_password
from app.models.service_agreement import SHIELD_DEFAULTS


# ─── Tech (común a las dos WOs) ──────────────────────────────────────
TECH_EMAIL = "iduberf@systemrapid.com"
TECH_FULL_NAME = "Iduber Fercho"
TECH_DISPLAY = "Iduber F"
TECH_PWD_SEED = "InsiteIQ2026!"
TECH_TZ = "America/New_York"
TECH_TZ_LABEL = "Miami"

# ─── Service Agreement ───────────────────────────────────────────────
SA_CONTRACT_REF = "FERVI-SRS-BF-2026"
SA_TITLE = "Fervimax · Break&Fix on-demand · Bronze"
SA_SHIELD = "bronze"

# ─── Fervi PM (en notes, NO user) ────────────────────────────────────
FERVI_PM_NAME = "Andres Tyminskiy"
FERVI_PM_EMAIL = "atyminskiy@fervimax.com"
FERVI_PM_PHONE = "+34 722 82 88 46"

# ─── TOUS técnico cliente final (en notes + onsite_contact) ──────────
TOUS_TECH_NAME = "Oscar Iturria"
TOUS_TECH_PHONE = "+52 5568092374"

# ─── Sites · DOS ──────────────────────────────────────────────────────
SITE_PEMBROKE = {
    "code": "TOUS-PEMBROKE-FL",
    "name": "TOUS Pembroke Pines",
    "address": "11401 Pines Blvd #442, Pembroke Pines, FL 33026",
    "city": "Pembroke Pines",
    "country": "US",
    "timezone": "America/New_York",
    "lat": 26.0089,
    "lng": -80.2962,
    "store_contact_name": "Rodrigues Fernanda",
    "store_contact_phone": "+1 954-904-4050",
    "store_alt_phone": "+1 754-299-2662",
    "tech_support_contact": "Jesús Garmón · 919340208",
}

SITE_DADELAND = {
    "code": "TOUS-DADELAND-MIA",
    "name": "TOUS Dadeland Mall Miami",
    "address": "7535 SW 88th St Suite 1950, Miami, FL 33156",
    "city": "Miami",
    "country": "US",
    "timezone": "America/New_York",
    "lat": 25.6855,
    "lng": -80.3158,
    "store_contact_name": None,
    "store_contact_phone": None,
    "store_alt_phone": None,
    "tech_support_contact": None,
}

# ─── Work Orders · DOS ────────────────────────────────────────────────
# scheduled_at calculado en runtime relativo a "mañana" para que el
# script se pueda re-ejecutar y deje fechas siempre coherentes.

WO_PEMBROKE = {
    "reference": "FERVI-TOUS-PMB-001",
    "title": "TOUS Pembroke Pines · revisar conectividad + impresora Zebra (3er intento)",
    "severity": "high",
    "status": "dispatched",  # Iduber confirmó que va mañana
    "schedule_offset_days": 1,    # mañana
    "schedule_local_hour": 11,    # 11am Miami
    "coordinator_email": "luiss@systemrapid.com",  # Luis lleva esta
    "description": (
        "Tienda TOUS Pembroke Pines · 3er intento de resolución de problemas de conectividad.\n\n"
        "Histórico previo:\n"
        " · 5 may 2026 · tech Jose Avendano · NO resolvió. Diagnosis: red desconfigurada "
        "tras la visita · impresora Zebra detecta papel pero no imprime. Faltó tech de "
        "red de soporte remoto que pudiera reconfigurar.\n"
        " · 12 may 2026 · grupo planeaba volver pero se reasignó a Dadeland por petición "
        "DXC (cacao de coordinación según Andres Tyminskiy).\n\n"
        "Trabajo esperado mañana:\n"
        " 1. Llegar a la tienda ~11am Miami time (cliente confirmado · si llegas antes "
        "    puede estar cerrada).\n"
        " 2. Contactar a Rodrigues Fernanda (tel: +1 954-904-4050 · alt: +1 754-299-2662).\n"
        " 3. Soporte técnico remoto disponible: Jesús Garmón · 919340208.\n"
        " 4. Diagnóstico de red completo · probar switch desconectando puerto a puerto "
        "    para localizar el fallo.\n"
        " 5. Validar funcionamiento Zebra + POS + WiFi cliente.\n"
        " 6. Documentar TODO en capture · foto antes y después · scan equipos si swap.\n\n"
        "Coordinación lado Fervimax: Andres Tyminskiy <atyminskiy@fervimax.com>.\n"
        "Coordinación lado SRS: Luis Sánchez (Lima · CET-friendly) + Andros (backup)."
    ),
    "briefing_notes": (
        "TIENDA: TOUS Pembroke Pines · 11401 Pines Blvd #442 · FL 33026\n"
        "HORA: 11:00 a.m hora Miami (cliente recomienda no antes · cerrado en visita anterior)\n\n"
        "ESTE ES EL TERCER INTENTO en esta tienda. Lee bien:\n\n"
        "INTENTO 1 (5 mayo · Jose Avendano):\n"
        "  · Llegó, hizo lo que pudo, NO resolvió.\n"
        "  · Andres Tyminskiy (Fervi) regañó al supplier porque 'otra vez estábamos sin "
        "    técnico de red'.\n"
        "  · La impresora Zebra quedó funcionando pero la red sigue mal configurada.\n\n"
        "TU MISIÓN (Iduber · 3er intento):\n"
        "  1. LLAMAR antes de salir a Rodrigues Fernanda (+1 954-904-4050) o el alt +1 754-299-2662.\n"
        "     · El alt está cortado/desconectado según Carlos en la visita anterior. Empieza por el primero.\n"
        "  2. SOPORTE DE RED REMOTO: Jesús Garmón (919340208) tiene el contexto técnico.\n"
        "  3. EN LA TIENDA: probar puerto a puerto del switch para localizar el fallo de "
        "     conectividad. La instrucción original era 'desconectar todos los equipos de red "
        "     y reconectarlos uno a uno'.\n"
        "  4. Si necesitas SWAP de SW (24 puertos PoE) consulta primero a Luis/Andros "
        "     (coordinación SRS) y Andres (coordinación Fervi).\n"
        "  5. Foto antes/después · scan seriales si hay swap · capture submit.\n\n"
        "REGLA: si la tienda no te abre · estás 30+ min sin progreso · o necesitas swap "
        "no presupuestado · LLAMA a Luis o Andros antes de salir del sitio."
    ),
}

WO_DADELAND = {
    "reference": "FERVI-TOUS-DDM-001",
    "title": "TOUS Dadeland Mall · swap switch + verificar internet (2do intento)",
    "severity": "high",
    "status": "triage",  # hora aún pendiente · esperando confirmación con Oscar
    "schedule_offset_days": 2,    # jueves
    "schedule_local_hour": None,  # TBD con Oscar
    "coordinator_email": "androsb@systemrapid.com",  # Andros lleva esta
    "description": (
        "Tienda TOUS Dadeland Mall · swap de switch + diagnóstico de conectividad.\n\n"
        "Histórico previo:\n"
        " · 12 may 2026 · tech Carlos Marin Telxius (Telxius sub) · NO resolvió.\n"
        " · Diagnosis Carlos + Oscar Iturria: 'el modem de AT&T no está en el local · "
        "   viene de otro lado · hay que identificar el cable que llega con internet'.\n"
        " · Probaron apagar/encender switch · no devolvió internet.\n"
        " · Carlos recomendó: traer router · sacar todo · volver a conectar · cambiar SW.\n"
        " · Decisión escalada a DXC · pendiente confirmación.\n\n"
        "Trabajo esperado jueves:\n"
        " 1. Coordinar hora exacta con Oscar Iturria (+52 5568092374) · es el técnico de TOUS "
        "    que conoce el sistema desde México · él da las indicaciones.\n"
        " 2. Llegar al Dadeland Mall · pregunta en la tienda.\n"
        " 3. Identificar el cable que entra con internet (viene por una tubería · no está "
        "    en el local · es lo crítico).\n"
        " 4. Si confirmado por Oscar · swap de switch 24 puertos PoE no programable.\n"
        " 5. Probar cable a cable conectando al router para validar.\n"
        " 6. Documentar TODO · scan seriales del SW viejo y nuevo · capture submit.\n\n"
        "Coordinación lado Fervimax: Andres Tyminskiy <atyminskiy@fervimax.com>.\n"
        "Coordinación lado SRS: Andros (lead) + Luis (backup)."
    ),
    "briefing_notes": (
        "TIENDA: TOUS Dadeland Mall · 7535 SW 88th St Suite 1950 · Miami FL 33156\n"
        "HORA: jueves · hora TBD (Andros confirma con Oscar Iturria)\n\n"
        "ESTE ES EL SEGUNDO INTENTO en esta tienda. Lee bien:\n\n"
        "INTENTO 1 (12 mayo · Carlos Marin Telxius):\n"
        "  · Llegó · tienda abierta · diagnosis con Oscar (técnico TOUS remoto MX).\n"
        "  · Apagó/encendió el switch · NO devolvió internet.\n"
        "  · No pudo localizar el cable que da internet (el modem AT&T NO está en el local · "
        "    viene de otra parte vía tubería).\n"
        "  · Probó cable a cable conectando al router · NADA.\n"
        "  · Carlos dejó la recomendación: 'traer un router · sacar todo · volver a conectar · "
        "    cambiar SW'.\n"
        "  · Quote literal Carlos: 'Srs aquí tienen un cangrejo con toda la película de la "
        "    sirenita'. Léete eso varias veces antes de ir.\n"
        "  · Decisión final del intento: escalar a DXC. Pendiente.\n\n"
        "TU MISIÓN (Iduber · 2do intento):\n"
        "  1. ANTES de ir: LLAMAR a Oscar Iturria (+52 5568092374). Es el técnico de TOUS "
        "     desde MX · conoce el sistema · él te dice qué hacer cable a cable.\n"
        "  2. Confirmar hora con Oscar · él te dice cuándo abre la tienda y cuándo es buena hora.\n"
        "  3. EN LA TIENDA: foco en localizar el cable que trae internet (entra por una "
        "     tubería · no está físicamente en el local).\n"
        "  4. SWAP DE SWITCH: solo si Oscar lo confirma. SW 24 puertos PoE no programable.\n"
        "  5. Foto del switch viejo · foto del switch nuevo instalado · scan ambos seriales.\n"
        "  6. Validar conectividad final · todos los equipos arriba antes de salir.\n\n"
        "REGLA: NO hagas swap parcial. Si no puedes confirmar con Oscar antes o llegar a un "
        "diagnóstico claro · llama a Andros · no salgas del sitio sin reportar."
    ),
}


async def ensure_org_fervimax_has_client_rel(db, juan_id, now):
    """Fervimax ya existe (joint_venture_partner). Agregamos 'client'."""
    org = await db.organizations.find_one({"legal_name": "Fervimax"}) \
        or await db.organizations.find_one({"name": "Fervimax"})
    if not org:
        print("⚠ Fervimax NO encontrado · abortando")
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
            "terms": {"scope": "B&F on-demand global · iniciado por caso TOUS Pembroke+Dadeland"},
        })
        await db.organizations.update_one(
            {"_id": org["_id"]},
            {"$set": {"partner_relationships": rels, "updated_at": now, "updated_by": juan_id}},
        )
        print(f"↑ Fervimax · agregado rol 'client' · id={org_id_str}")
    return org_id_str


async def ensure_service_agreement(db, tenant_id, org_id, juan_id, now):
    existing = await db.service_agreements.find_one({
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "contract_ref": SA_CONTRACT_REF,
    })
    if existing:
        sa_id = str(existing["_id"])
        print(f"✓ Service Agreement ya existe · id={sa_id} · shield={existing.get('shield_level')}")
        return sa_id

    doc = {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "contract_ref": SA_CONTRACT_REF,
        "title": SA_TITLE,
        "shield_level": SA_SHIELD,
        "sla_spec": SHIELD_DEFAULTS[SA_SHIELD],
        "parts_approval_threshold_usd": 200.0,
        "rate_card": None,
        "srs_entity_id": None,
        "currency": "USD",
        "active": True,
        "starts_at": now.isoformat(),
        "ends_at": None,
        "notes": "Creado por script para arrancar casos TOUS · ajustar rate_card con Adriana cuando se acuerde.",
        "created_at": now,
        "updated_at": now,
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    result = await db.service_agreements.insert_one(doc)
    sa_id = str(result.inserted_id)
    print(f"↑ Service Agreement creado · id={sa_id} · shield=bronze")
    return sa_id


async def ensure_site(db, tenant_id, org_id, juan_id, now, site_spec):
    existing = await db.sites.find_one({
        "tenant_id": tenant_id,
        "$or": [{"code": site_spec["code"]}, {"address": site_spec["address"]}],
    })
    if existing:
        site_id = str(existing["_id"])
        print(f"✓ Site ya existe · id={site_id} · {existing.get('name')}")
        return site_id

    # onsite_contact = Oscar (técnico TOUS remoto MX · es el que tiene el contexto)
    # Información de tienda + tech support vive en access_notes para que el tech la vea.
    contact_lines = [
        f"TÉCNICO TOUS (remoto MX · sabe del sistema): {TOUS_TECH_NAME} · {TOUS_TECH_PHONE}",
    ]
    if site_spec.get("store_contact_name"):
        contact_lines.append(
            f"CONTACTO EN TIENDA: {site_spec['store_contact_name']} · {site_spec['store_contact_phone']}"
        )
    if site_spec.get("store_alt_phone"):
        contact_lines.append(f"  alt: {site_spec['store_alt_phone']}")
    if site_spec.get("tech_support_contact"):
        contact_lines.append(f"TECH SUPPORT REMOTO: {site_spec['tech_support_contact']}")
    contact_lines.append(
        f"COORD FERVIMAX: {FERVI_PM_NAME} · {FERVI_PM_EMAIL} · {FERVI_PM_PHONE}"
    )

    onsite_contact = {
        "name": TOUS_TECH_NAME,
        "phone": TOUS_TECH_PHONE,
        "email": None,
        "role": "client_remote_tech_mx",
    }

    doc = {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "code": site_spec["code"],
        "name": site_spec["name"],
        "country": site_spec["country"],
        "city": site_spec["city"],
        "address": site_spec["address"],
        "timezone": site_spec["timezone"],
        "lat": site_spec["lat"],
        "lng": site_spec["lng"],
        "geofence_radius_m": None,
        "site_type": "retail",
        "onsite_contact": onsite_contact,
        "has_physical_resident": False,
        "default_noc_operator_user_id": None,
        "access_notes": "\n".join(contact_lines),
        "status": "active",
        "notes": "Caso entrada via Fervimax · cliente final TOUS · histórico en WhatsApp group Fervi-TOUS.",
        "created_at": now,
        "updated_at": now,
        "created_by": juan_id,
        "updated_by": juan_id,
    }
    result = await db.sites.insert_one(doc)
    site_id = str(result.inserted_id)
    print(f"↑ Site creado · id={site_id} · {site_spec['name']}")
    return site_id


async def ensure_user_iduber(db, tenant_id, juan_id, now):
    existing = await db.users.find_one({"email": TECH_EMAIL})
    if existing:
        user_id = str(existing["_id"])
        print(f"✓ User Iduber ya existe · id={user_id}")
        return user_id

    memberships = [{
        "space": "tech_field",
        "role": "tech_external_sub",
        "authority_level": "contractor",
        "organization_id": None,
        "active": True,
    }]
    doc = {
        "tenant_id": tenant_id,
        "email": TECH_EMAIL,
        "full_name": TECH_FULL_NAME,
        "phone": None,
        "country": "US",
        "hashed_password": hash_password(TECH_PWD_SEED),
        "is_active": True,
        "employment_type": "external_sub",
        "email_provisioned_by_srs": True,
        "space_memberships": memberships,
        "must_change_password": True,
        "password_changed_at": None,
        "notes": "Tech externo Miami · caso recurrente TOUS Pembroke + Dadeland Mall.",
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


async def ensure_work_order(db, tenant_id, org_id, site_id, sa_id, tech_id, coord_id, juan_id, now, wo_spec):
    existing = await db.work_orders.find_one({"tenant_id": tenant_id, "reference": wo_spec["reference"]})
    if existing:
        wo_id = str(existing["_id"])
        print(f"✓ WO ya existe · id={wo_id} · ref={wo_spec['reference']} · status={existing.get('status')}")
        return wo_id

    # scheduled_at: si hay hora, lo computamos relativo a "mañana"
    scheduled = None
    if wo_spec.get("schedule_offset_days") is not None and wo_spec.get("schedule_local_hour") is not None:
        # America/New_York = UTC-4 (DST) o UTC-5. Approx UTC-4 en mayo.
        target_date = (now + timedelta(days=wo_spec["schedule_offset_days"])).date()
        scheduled = datetime(
            target_date.year, target_date.month, target_date.day,
            wo_spec["schedule_local_hour"] + 4,  # 11am Miami = 15:00 UTC en mayo
            0, 0, tzinfo=timezone.utc,
        )

    # Status timestamps · iter 2.63j · trackear cada status alcanzado
    status_timestamps = {"intake": now}
    if wo_spec["status"] in ("triage", "pre_flight", "dispatched", "en_route", "on_site", "resolved", "closed"):
        status_timestamps["triage"] = now
    if wo_spec["status"] in ("pre_flight", "dispatched", "en_route", "on_site", "resolved", "closed"):
        status_timestamps["pre_flight"] = now
    if wo_spec["status"] in ("dispatched", "en_route", "on_site", "resolved", "closed"):
        status_timestamps["dispatched"] = now

    # Ball por status
    ball_side = {
        "intake": "srs", "triage": "srs", "pre_flight": "srs",
        "dispatched": "tech", "en_route": "tech", "on_site": "tech",
        "resolved": "client", "closed": "srs", "cancelled": "srs",
    }[wo_spec["status"]]
    ball_actor = coord_id if ball_side == "srs" else (tech_id if ball_side == "tech" else None)
    ball = {
        "side": ball_side,
        "actor_user_id": ball_actor,
        "since": now,
        "reason": f"Status={wo_spec['status']} · setup inicial del caso",
    }

    doc = {
        "tenant_id": tenant_id,
        "organization_id": org_id,
        "site_id": site_id,
        "service_agreement_id": sa_id,
        "reference": wo_spec["reference"],
        "project_id": None,
        "cluster_group_id": None,
        "title": wo_spec["title"],
        "description": wo_spec["description"],
        "severity": wo_spec["severity"],
        "status": wo_spec["status"],
        "ball_in_court": ball,
        "assigned_tech_user_id": tech_id,
        "srs_coordinator_user_id": coord_id,
        "noc_operator_user_id": None,
        "onsite_resident_user_id": None,
        "shield_level": SA_SHIELD,
        "sla_snapshot": SHIELD_DEFAULTS[SA_SHIELD],
        "deadline_receive_at": None,
        "deadline_resolve_at": None,
        "scheduled_at": scheduled,
        "status_timestamps": status_timestamps,
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
    sched_str = scheduled.isoformat() if scheduled else "(TBD)"
    print(f"↑ WO creado · id={wo_id} · ref={wo_spec['reference']} · status={wo_spec['status']} · sched={sched_str}")
    return wo_id


async def ensure_briefing(db, tenant_id, wo_id, site_spec_dict, coord_id, now, briefing_notes):
    existing = await db.copilot_briefings.find_one({"tenant_id": tenant_id, "work_order_id": wo_id})
    if existing:
        br_id = str(existing["_id"])
        print(f"✓ Briefing ya existe · id={br_id} · status={existing.get('status')}")
        return br_id

    onsite_contact = {
        "name": TOUS_TECH_NAME,
        "phone": TOUS_TECH_PHONE,
        "email": None,
        "role": "client_remote_tech_mx",
    }
    doc = {
        "tenant_id": tenant_id,
        "work_order_id": wo_id,
        "assembled_at": now,
        "assembled_by": coord_id,
        "site_bible_summary": {
            "site_name": site_spec_dict["name"],
            "address": site_spec_dict["address"],
            "country": site_spec_dict["country"],
            "city": site_spec_dict["city"],
            "timezone": site_spec_dict["timezone"],
            "onsite_contact": onsite_contact,
            "access_notes": "Tienda retail en centro comercial · coordinar con técnico TOUS Oscar Iturria (remoto MX).",
            "has_physical_resident": False,
            "parking_notes": None,
            "security_requirements": None,
            "known_issues": [],
            "confidence": "draft",
        },
        "device_bible": [],
        "history": [],
        "parts_estimate": [],
        "coordinator_notes": briefing_notes,
        "status": "assembled",
        "acknowledged_at": None,
        "acknowledged_by": None,
        "supersedes_id": None,
        "created_at": now,
        "updated_at": now,
        "created_by": coord_id,
        "updated_by": coord_id,
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
    print("=" * 72)
    print("InsiteIQ — Casos TOUS Pembroke + Dadeland · Fervimax → SRS")
    print("=" * 72)
    now = datetime.now(timezone.utc)
    print(f"Timestamp: {now.isoformat()}")
    print()

    # Tenant SRS
    tenant = await db.tenants.find_one({"code": "SRS"}) or await db.tenants.find_one({})
    if not tenant:
        print("⚠ No tenant en mongo · abortando")
        return
    tenant_id = str(tenant["_id"])
    print(f"Tenant: {tenant.get('code', '(unknown)')} · {tenant_id}")

    # Juan + Coordinators
    juan = await db.users.find_one({"email": "juang@systemrapid.io"}) \
        or await db.users.find_one({"email": "juang@systemrapid.com"})
    andros = await db.users.find_one({"email": "androsb@systemrapid.com"})
    luis = await db.users.find_one({"email": "luiss@systemrapid.com"})
    if not juan:
        print("⚠ Juan user NO encontrado · abortando")
        return
    if not andros:
        print("⚠ Andros NO encontrado · usando Juan como fallback")
        andros = juan
    if not luis:
        print("⚠ Luis NO encontrado · usando Andros como fallback")
        luis = andros

    juan_id = str(juan["_id"])
    andros_id = str(andros["_id"])
    luis_id = str(luis["_id"])
    print(f"Creator (Juan):    {juan_id}")
    print(f"Coord Andros:      {andros_id}  → lleva Dadeland")
    print(f"Coord Luis:        {luis_id}  → lleva Pembroke")
    print()

    # Fervimax + SA
    print("── Fervimax organization ─────────────────────────")
    org_id = await ensure_org_fervimax_has_client_rel(db, juan_id, now)
    if not org_id:
        return

    print()
    print("── Service Agreement ─────────────────────────────")
    sa_id = await ensure_service_agreement(db, tenant_id, org_id, juan_id, now)

    # Sites
    print()
    print("── Site #1 · TOUS Pembroke Pines ─────────────────")
    site_pmb_id = await ensure_site(db, tenant_id, org_id, juan_id, now, SITE_PEMBROKE)
    print()
    print("── Site #2 · TOUS Dadeland Mall ──────────────────")
    site_ddm_id = await ensure_site(db, tenant_id, org_id, juan_id, now, SITE_DADELAND)

    # User
    print()
    print("── Iduber Fercho (tech) ──────────────────────────")
    tech_id = await ensure_user_iduber(db, tenant_id, juan_id, now)

    # WOs
    print()
    print("── WO #1 · Pembroke (Luis coord) ─────────────────")
    wo_pmb_id = await ensure_work_order(
        db, tenant_id, org_id, site_pmb_id, sa_id, tech_id, luis_id, juan_id, now, WO_PEMBROKE
    )
    print()
    print("── WO #2 · Dadeland (Andros coord) ───────────────")
    wo_ddm_id = await ensure_work_order(
        db, tenant_id, org_id, site_ddm_id, sa_id, tech_id, andros_id, juan_id, now, WO_DADELAND
    )

    # Briefings
    print()
    print("── Briefing #1 · Pembroke ────────────────────────")
    br_pmb_id = await ensure_briefing(db, tenant_id, wo_pmb_id, SITE_PEMBROKE, luis_id, now, WO_PEMBROKE["briefing_notes"])
    print()
    print("── Briefing #2 · Dadeland ────────────────────────")
    br_ddm_id = await ensure_briefing(db, tenant_id, wo_ddm_id, SITE_DADELAND, andros_id, now, WO_DADELAND["briefing_notes"])

    # ─── Resumen final ───────────────────────────────────────
    print()
    print("=" * 72)
    print("✅ CARGA COMPLETADA · IDs/URLs para el equipo")
    print("=" * 72)
    print(f"Fervimax org:     {org_id}")
    print(f"Service Agreement: {sa_id} (Bronze)")
    print(f"Iduber user:      {tech_id}")
    print(f"  email: {TECH_EMAIL} · pwd: {TECH_PWD_SEED} (rota al primer login)")
    print()
    print(f"#1 PEMBROKE · WO {wo_pmb_id} · Site {site_pmb_id} · Briefing {br_pmb_id}")
    print(f"   ref: FERVI-TOUS-PMB-001 · coord: Luis · MAÑANA ~11am Miami")
    print(f"   SRS:  https://insiteiq.systemrapid.io/srs/ops/{wo_pmb_id}")
    print(f"   Tech: https://insiteiq.systemrapid.io/tech/ops/{wo_pmb_id}")
    print()
    print(f"#2 DADELAND · WO {wo_ddm_id} · Site {site_ddm_id} · Briefing {br_ddm_id}")
    print(f"   ref: FERVI-TOUS-DDM-001 · coord: Andros · JUEVES (hora TBD con Oscar)")
    print(f"   SRS:  https://insiteiq.systemrapid.io/srs/ops/{wo_ddm_id}")
    print(f"   Tech: https://insiteiq.systemrapid.io/tech/ops/{wo_ddm_id}")
    print()
    print("Próximos pasos del equipo:")
    print("  · Luis abre Pembroke · llama a Rodrigues Fernanda + Jesús Garmón · valida hora")
    print("  · Andros abre Dadeland · llama a Oscar Iturria · cierra hora del jueves")
    print("  · Iduber recibe ambas WOs en su PWA · ack briefing por orden")
    print("  · Smoke test del Iter 2.63j a lo largo de la semana:")
    print("    1) status_timestamps debe crecer en cada advance")
    print("    2) badge drift llegada cuando Iduber haga check-in")
    print("    3) badge tiempo on-site al cerrar")
    print("    4) widget Horizonte Programación debe mostrar las 2 WOs")
    print("=" * 72)
    print()


async def runner():
    try:
        await main()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(runner())
