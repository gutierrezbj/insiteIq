"""
InsiteIQ v1 — Cockpit Demo Enrichment seed (Pasito Z-b).

Corre DESPUÉS de seed_foundation. Enriquece el tenant con:
  1. lat/lng/site_type en todos los sites existentes (lookup by code)
  2. ~35 sites genéricos adicionales (CLIENTE-A/B/C/D) spread por geografía
     con coords reales → mapa denso para cockpit
  3. WOs adicionales en estados activos (dispatched/in_progress/in_closeout)
     distribuidos por los sites nuevos
  4. ~18 operational_alerts cubriendo las 8 categorías del widget de oro

Run:
    docker compose exec api python -m scripts.seed_cockpit_demo
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone

from bson import ObjectId

from app.database import close_db, connect_db, get_db

random.seed(42)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------- coords for existing sites (by code) ----------------

EXISTING_COORDS = {
    # Pain Log sites
    "ZARA-CL-TAL": (-36.7280, -73.1180, "America/Santiago", "retail"),
    "INDITEX-MX-TEN": (18.9600, -99.5900, "America/Mexico_City", "retail"),
    "CLARO-US-MIRAMAR": (25.9870, -80.2320, "America/New_York", "warehouse"),
    # Arcos (rough coords — Panama stores)
    "ARC-P67": (8.9830, -79.5190, "America/Panama", "retail"),
    "ARC-P54": (8.9500, -79.5430, "America/Panama", "retail"),
    "ARC-P23": (8.9770, -79.5500, "America/Panama", "retail"),
    "ARC-P12": (9.3550, -79.9000, "America/Panama", "retail"),
    "ARC-P08": (8.3800, -82.4280, "America/Panama", "retail"),
}


# ---------------- generic demo sites (coords reales, nombres fake) ----------------
#
# Spread geográfico realista: Europa/LatAm/US/UK. Clientes llamados solo
# CLIENTE-A, CLIENTE-B, CLIENTE-C, CLIENTE-D → demo limpio para prospects.

GENERIC_SITES = [
    # CLIENTE-A · retail premium (Inditex-analog) — Europa + LatAm
    ("CLI-A", "retail", "Madrid Centro",        "ES", "Madrid",             "Europe/Madrid",          40.4168,  -3.7038),
    ("CLI-A", "retail", "Barcelona Diagonal",   "ES", "Barcelona",          "Europe/Madrid",          41.3851,   2.1734),
    ("CLI-A", "retail", "Valencia Saler",       "ES", "Valencia",           "Europe/Madrid",          39.4699,  -0.3763),
    ("CLI-A", "retail", "Sevilla Nervión",      "ES", "Sevilla",            "Europe/Madrid",          37.3891,  -5.9845),
    ("CLI-A", "retail", "Porto Shopping",       "PT", "Porto",              "Europe/Lisbon",          41.1579,  -8.6291),
    ("CLI-A", "retail", "Lisboa Colombo",       "PT", "Lisboa",             "Europe/Lisbon",          38.7223,  -9.1393),
    ("CLI-A", "retail", "Milano Duomo",         "IT", "Milano",             "Europe/Rome",            45.4642,   9.1900),
    ("CLI-A", "retail", "Roma Termini",         "IT", "Roma",               "Europe/Rome",            41.9028,  12.4964),
    ("CLI-A", "retail", "Paris Haussmann",      "FR", "Paris",              "Europe/Paris",           48.8566,   2.3522),
    ("CLI-A", "retail", "Santiago Costanera",   "CL", "Santiago",           "America/Santiago",      -33.4172, -70.6068),
    ("CLI-A", "retail", "Buenos Aires Palermo", "AR", "Buenos Aires",       "America/Argentina/Buenos_Aires", -34.5755, -58.4250),
    ("CLI-A", "retail", "Mexico CDMX Polanco",  "MX", "CDMX",               "America/Mexico_City",    19.4326, -99.1332),
    ("CLI-A", "retail", "Guadalajara Andares",  "MX", "Guadalajara",        "America/Mexico_City",    20.7099, -103.3910),
    # CLIENTE-B · telco DCs + warehouses (Claro/Telefonica-analog)
    ("CLI-B", "dc",        "DC Miami Doral",     "US", "Doral",             "America/New_York",       25.8197, -80.3553),
    ("CLI-B", "dc",        "DC São Paulo Aldeia","BR", "São Paulo",         "America/Sao_Paulo",     -23.5505, -46.6333),
    ("CLI-B", "dc",        "DC Bogotá Engativá", "CO", "Bogotá",            "America/Bogota",          4.7110, -74.0721),
    ("CLI-B", "warehouse", "Warehouse Lima",     "PE", "Lima",              "America/Lima",          -12.0464, -77.0428),
    ("CLI-B", "office",    "Oficina Quito",      "EC", "Quito",             "America/Guayaquil",      -0.1807, -78.4678),
    ("CLI-B", "office",    "Oficina Panamá",     "PA", "Ciudad de Panamá",  "America/Panama",          8.9824, -79.5199),
    ("CLI-B", "office",    "Oficina San José",   "CR", "San José",          "America/Costa_Rica",      9.9281, -84.0907),
    # CLIENTE-C · bancario sucursales (Fervi JV-analog)
    ("CLI-C", "branch",    "Sucursal Monterrey", "MX", "Monterrey",         "America/Monterrey",     25.6866, -100.3161),
    ("CLI-C", "branch",    "Sucursal Tijuana",   "MX", "Tijuana",           "America/Tijuana",       32.5149, -117.0382),
    ("CLI-C", "branch",    "Sucursal Mérida",    "MX", "Mérida",            "America/Merida",        20.9674,  -89.5926),
    ("CLI-C", "branch",    "Sucursal Cancún",    "MX", "Cancún",            "America/Cancun",        21.1619,  -86.8515),
    ("CLI-C", "branch",    "Sucursal Caracas",   "VE", "Caracas",           "America/Caracas",       10.4806,  -66.9036),
    ("CLI-C", "branch",    "Sucursal Maracaibo", "VE", "Maracaibo",         "America/Caracas",       10.6666,  -71.6124),
    # CLIENTE-D · logística (DXC-analog) · DCs Europa + UK
    ("CLI-D", "dc",        "DC Londres",         "GB", "London",            "Europe/London",         51.5074,   -0.1278),
    ("CLI-D", "dc",        "DC Manchester",      "GB", "Manchester",        "Europe/London",         53.4808,   -2.2426),
    ("CLI-D", "dc",        "DC Dublin",          "IE", "Dublin",            "Europe/Dublin",         53.3498,   -6.2603),
    ("CLI-D", "dc",        "DC Frankfurt",       "DE", "Frankfurt",         "Europe/Berlin",         50.1109,    8.6821),
    ("CLI-D", "dc",        "DC Amsterdam",       "NL", "Amsterdam",         "Europe/Amsterdam",      52.3676,    4.9041),
    ("CLI-D", "warehouse", "Warehouse Rotterdam","NL", "Rotterdam",         "Europe/Amsterdam",      51.9244,    4.4777),
    ("CLI-D", "office",    "Oficina Zurich",     "CH", "Zurich",            "Europe/Zurich",         47.3769,    8.5417),
    ("CLI-D", "office",    "Oficina Stockholm",  "SE", "Stockholm",         "Europe/Stockholm",      59.3293,   18.0686),
    ("CLI-D", "dc",        "DC Warsaw",          "PL", "Warsaw",            "Europe/Warsaw",         52.2297,   21.0122),
]


# ---------------- alert templates (18 spread) ----------------

ALERT_TEMPLATES = [
    # traffic
    ("traffic",  "warning",  "ETA drift +40min · tráfico M-30 Madrid",
                  "Tech Agustin reporta congestion severa en M-30 salida Atocha. Intervencion en Madrid Centro retrasada.",
                  "Avisar a store manager · replanificar ventana 15:00→16:00",
                  "external", 40),
    ("traffic",  "info",     "Cierre vial Av. Bolívar CDMX",
                  "Marcha sindical bloquea Bolívar hasta 14:00 aprox. Revisar rutas desviadas.",
                  "Tomar ruta Reforma · sumar ~25min",
                  "external", 25),
    # no_show
    ("no_show",  "critical", "Supervisor no llego a tienda · Tenancingo MX",
                  "Tech en sitio hace 45min. Store manager no contesta celular ni radio. WO detenido.",
                  "Escalar a regional manager · considerar cancelacion ventana",
                  "srs", None),
    ("no_show",  "warning",  "Contacto LCON no disponible · Lima PE",
                  "Orlando no contesta desde 09:30. Tech Luis en sitio esperando aprobacion entrada.",
                  "Llamar backup LCON · Wilmer +51 9...",
                  "client", None),
    # accident
    ("accident", "critical", "Accidente ruta Santiago-Talcahuano",
                  "Carretera 5 Sur cerrada tramo Chillan. ETA +4h o replanificar dia.",
                  "Replanificar WO ZARA-TAL para manana · avisar Rackel",
                  "external", 240),
    # site_closed
    ("site_closed", "critical", "Almacen cerrado por permiso · DC Miami",
                  "Security cerro docks. Auditoria interna sin aviso previo. Tech en puerta.",
                  "Llamar Arturo Pellerano urgente · intervention on hold",
                  "client", None),
    ("site_closed", "warning",  "Tienda cerrada por decoracion remodelacion · Sevilla",
                  "Remodelacion de vitrina cierre tienda 08:00-12:00. Tech llega 10:30.",
                  "Replanificar entrada 12:15",
                  "client", None),
    # weather
    ("weather",  "warning",  "Tormenta severa Porto PT",
                  "Alerta naranja IPMA hasta 16:00. Lluvia intensa + granizo. Riesgo traslado.",
                  "Diferir intervencion outdoor · WO indoor sigue",
                  "external", None),
    ("weather",  "info",     "Ola de calor Sevilla ES · 42C",
                  "Trabajos en rooftop pausados 12:00-17:00 por seguridad.",
                  "Ventana manana antes 11:00",
                  "external", None),
    # access_denied
    ("access_denied", "critical", "Guardia rechaza acceso tech · DC São Paulo",
                  "Tech Arlindo sin credencial nueva post-renovacion. Security verificando.",
                  "Provisionar credencial via portal cliente · escalar si >30min",
                  "client", None),
    ("access_denied", "warning", "Permiso municipal pendiente · Tienda Cancún",
                  "Obras civiles requieren permiso ayuntamiento entrega retrasada.",
                  "Solicitar copia digital via email",
                  "client", None),
    # fleet
    ("fleet",    "warning",  "Tech Agustin bateria 12% · Madrid",
                  "Dispositivo de captura en 12%, WO apenas iniciado. Posible interrupcion.",
                  "Llamar tech · indicar punto de carga en tienda",
                  "srs", None),
    ("fleet",    "info",     "Vehiculo Luis en taller · Lima",
                  "Auto en taller por mantenimiento programado. WOs del dia en transporte publico.",
                  "Sumar +20min por ruta a ETA",
                  "srs", 20),
    # global / wide
    ("traffic",  "info",     "Feriado nacional Argentina",
                  "Dia no laborable. WOs argentinos re-asignados a mañana.",
                  "Validar Telefonica acepta deslizamiento sin penal",
                  "srs", None),
    ("weather",  "warning",  "Huracan categoria 2 acercandose a Yucatan",
                  "NHC tracking huracan Isidro ETA costa mexicana 48h. Cancun + Merida alerta.",
                  "Adelantar WOs criticos · stand-by resto",
                  "external", None),
    # other
    ("other",    "info",     "Capacity planning sobrecalentado · London",
                  "6 WOs simultaneos en London cluster. Bandwidth tech estrecho.",
                  "Evaluar traer refuerzo sub contractor",
                  "srs", None),
    ("other",    "warning",  "Cliente reenvia mismos tickets via WhatsApp",
                  "Raquel Fractalia mandando follow-ups por WhatsApp paralelo al thread. Data-loss riesgo.",
                  "Responder solo en thread · invitarla a portal",
                  "srs", None),
    ("no_show",  "info",     "Contacto confirmado · Paris Haussmann",
                  "Store manager confirmo presencia 14:00. WO PAR-001 ready to go.",
                  None,
                  "srs", None),
]


async def enrich():
    await connect_db()
    db = get_db()
    assert db is not None

    # --- 1) patch existing sites with coords + site_type ---
    print("Cockpit enrichment — patching coords on existing sites...")
    patched = 0
    for code, (lat, lng, tz, stype) in EXISTING_COORDS.items():
        r = await db.sites.update_one(
            {"code": code},
            {"$set": {
                "lat": lat,
                "lng": lng,
                "timezone": tz,
                "site_type": stype,
                "updated_at": _now(),
            }},
        )
        patched += r.matched_count
    print(f"  ✓ patched {patched} existing sites with coords")

    # Any remaining sites without coords get a rough country-center fallback
    country_fallback = {
        "ES": (40.4637, -3.7492, "Europe/Madrid"),
        "PT": (39.3999, -8.2245, "Europe/Lisbon"),
        "IT": (41.8719, 12.5674, "Europe/Rome"),
        "FR": (46.2276,  2.2137, "Europe/Paris"),
        "GB": (55.3781, -3.4360, "Europe/London"),
        "US": (37.0902, -95.7129, "America/New_York"),
        "MX": (23.6345, -102.5528, "America/Mexico_City"),
        "CL": (-35.6751, -71.5430, "America/Santiago"),
        "AR": (-38.4161, -63.6167, "America/Argentina/Buenos_Aires"),
        "CO": (4.5709,  -74.2973, "America/Bogota"),
        "PE": (-9.1900, -75.0152, "America/Lima"),
        "BR": (-14.2350, -51.9253, "America/Sao_Paulo"),
        "VE": (6.4238,  -66.5897, "America/Caracas"),
        "PA": (8.5380,  -80.7821, "America/Panama"),
    }
    missing = await db.sites.find({"lat": {"$in": [None]}}).to_list(length=500)
    if missing:
        fb = 0
        for s in missing:
            c = s.get("country")
            if c in country_fallback:
                lat, lng, tz = country_fallback[c]
                await db.sites.update_one(
                    {"_id": s["_id"]},
                    {"$set": {
                        "lat": lat + random.uniform(-0.5, 0.5),
                        "lng": lng + random.uniform(-0.5, 0.5),
                        "timezone": s.get("timezone") or tz,
                        "site_type": s.get("site_type") or "retail",
                        "updated_at": _now(),
                    }},
                )
                fb += 1
        print(f"  ✓ fallback coords applied to {fb} sites (country-center + jitter)")

    # --- 2) create or reuse CLIENTE-A/B/C/D generic organizations ---
    tenant = await db.tenants.find_one({"code": "SRS"})
    if not tenant:
        raise RuntimeError("SRS tenant not found — run seed_foundation first")
    tenant_id = str(tenant["_id"])

    demo_orgs = {
        "CLI-A": "CLIENTE-A Retail International",
        "CLI-B": "CLIENTE-B Telco Group",
        "CLI-C": "CLIENTE-C Bancario Regional",
        "CLI-D": "CLIENTE-D Logistics Europe",
    }
    demo_org_ids: dict[str, str] = {}
    for code, legal_name in demo_orgs.items():
        existing = await db.organizations.find_one({"legal_name": legal_name})
        if existing:
            demo_org_ids[code] = str(existing["_id"])
            continue
        doc = {
            "tenant_id": tenant_id,
            "legal_name": legal_name,
            "display_name": legal_name,
            "country": "XX",
            "status": "active",
            "partner_relationships": [{"type": "client", "since": _now()}],
            "notes": "Demo org generica · cockpit showcase",
            "created_at": _now(),
            "updated_at": _now(),
        }
        r = await db.organizations.insert_one(doc)
        demo_org_ids[code] = str(r.inserted_id)
    print(f"  ✓ demo orgs: {list(demo_orgs.values())}")

    # --- 3) insert generic sites (skip duplicates by name) ---
    print("Cockpit enrichment — inserting generic sites...")
    inserted_site_ids: list[tuple[str, str]] = []  # (site_id, client_code)
    for (client_code, stype, name, country, city, tz, lat, lng) in GENERIC_SITES:
        code_candidate = f"{client_code}-{country}-{city.replace(' ', '').upper()[:8]}"
        existing = await db.sites.find_one({"code": code_candidate})
        if existing:
            inserted_site_ids.append((str(existing["_id"]), client_code))
            continue
        doc = {
            "tenant_id": tenant_id,
            "organization_id": demo_org_ids[client_code],
            "code": code_candidate,
            "name": name,
            "country": country,
            "city": city,
            "timezone": tz,
            "lat": lat,
            "lng": lng,
            "site_type": stype,
            "has_physical_resident": stype == "dc",
            "status": "active",
            "created_at": _now(),
            "updated_at": _now(),
        }
        r = await db.sites.insert_one(doc)
        inserted_site_ids.append((str(r.inserted_id), client_code))
    print(f"  ✓ {len(inserted_site_ids)} generic sites present (inserted or existing)")

    # --- 4) seed operational_alerts ---
    print("Cockpit enrichment — seeding operational_alerts...")
    # Clean previous demo alerts (source == 'manual' + created by demo tag)
    await db.operational_alerts.delete_many({"created_by": "seed_cockpit_demo"})

    # Fetch a few sites + techs + WOs to ground alert scopes
    some_sites = await db.sites.find({"tenant_id": tenant_id}).limit(20).to_list(length=20)
    some_techs = await db.users.find(
        {"tenant_id": tenant_id, "space_memberships.space": "tech_field"}
    ).limit(5).to_list(length=5)
    some_wos = await db.work_orders.find({"tenant_id": tenant_id}).limit(10).to_list(length=10)

    alerts_docs = []
    now = _now()
    for i, (kind, sev, title, message, hint, ball, eta) in enumerate(ALERT_TEMPLATES):
        scope: str = "global"
        scope_ref: dict = {}
        # Alternate scope to exercise the widget
        if i % 4 == 0 and some_sites:
            s = some_sites[i % len(some_sites)]
            scope = "site"
            scope_ref = {
                "site_id": str(s["_id"]),
                "organization_id": str(s.get("organization_id") or ""),
            }
        elif i % 4 == 1 and some_wos:
            w = some_wos[i % len(some_wos)]
            scope = "wo"
            scope_ref = {
                "work_order_id": str(w["_id"]),
                "organization_id": str(w.get("organization_id") or ""),
                "site_id": str(w.get("site_id") or "") or None,
            }
        elif i % 4 == 2 and some_techs:
            t = some_techs[i % len(some_techs)]
            scope = "tech"
            scope_ref = {"tech_user_id": str(t["_id"])}
        # else: remains global

        alerts_docs.append({
            "tenant_id": tenant_id,
            "kind": kind,
            "severity": sev,
            "scope": scope,
            "scope_ref": scope_ref,
            "source": "manual",
            "ball_in_court": ball,
            "title": title,
            "message": message,
            "action_hint": hint,
            "eta_drift_minutes": eta,
            "affected_wo_count": None,
            "status": "active" if i % 6 != 5 else "acknowledged",
            "expires_at": now + timedelta(hours=random.randint(2, 48)),
            "acknowledged_at": None,
            "acknowledged_by_user_id": None,
            "resolved_at": None,
            "resolved_by_user_id": None,
            "resolution_note": None,
            "created_at": now - timedelta(minutes=random.randint(5, 720)),
            "updated_at": now,
            "created_by": "seed_cockpit_demo",
            "updated_by": "seed_cockpit_demo",
        })
    await db.operational_alerts.insert_many(alerts_docs)
    print(f"  ✓ {len(alerts_docs)} alerts seeded")

    # --- 5) sprinkle a few active WOs on the generic sites ---
    # Keep it modest: for 10 generic sites pick a WO template.
    print("Cockpit enrichment — generic active WOs on demo sites...")
    wo_title_bank = [
        ("Reemplazo switch TOR",         "in_progress",  "high",   "silver"),
        ("Soporte onsite impresora",     "dispatched",   "medium", "bronze_plus"),
        ("Cableado estructurado parche", "in_progress",  "medium", "silver"),
        ("Migracion bastidor completo",  "assigned",     "high",   "gold"),
        ("Cambio UPS 2KVA",              "in_closeout",  "medium", "silver"),
        ("Reconfiguracion AP WiFi6",     "in_progress",  "low",    "bronze_plus"),
        ("Instalacion camaras IP",       "assigned",     "medium", "bronze_plus"),
        ("Diagnostico fallo intermitente","dispatched",  "medium", "silver"),
        ("Revision BMS climatizacion",   "in_progress",  "high",   "gold"),
        ("Cambio firmware router WAN",   "assigned",     "medium", "silver"),
    ]
    wo_docs = []
    for idx, (site_id, client_code) in enumerate(inserted_site_ids[:20]):
        title, status_, severity, shield = wo_title_bank[idx % len(wo_title_bank)]
        ref = f"DEMO-{client_code.replace('-','')}-{idx:03d}"
        existing = await db.work_orders.find_one({"reference": ref})
        if existing:
            continue
        wo_docs.append({
            "tenant_id": tenant_id,
            "reference": ref,
            "organization_id": demo_org_ids[client_code],
            "site_id": site_id,
            "title": title,
            "description": f"Intervencion demo {client_code} #{idx}",
            "severity": severity,
            "shield_level": shield,
            "status": status_,
            "ball_in_court": {
                "side": "srs" if status_ in ("dispatched", "assigned") else "tech",
                "since": _now() - timedelta(hours=random.randint(1, 24)),
            },
            "created_at": _now() - timedelta(hours=random.randint(6, 96)),
            "updated_at": _now(),
            "created_by": "seed_cockpit_demo",
            "updated_by": "seed_cockpit_demo",
        })
    if wo_docs:
        await db.work_orders.insert_many(wo_docs)
    print(f"  ✓ {len(wo_docs)} demo WOs on generic sites")

    total_sites = await db.sites.count_documents({"tenant_id": tenant_id})
    total_alerts = await db.operational_alerts.count_documents({"tenant_id": tenant_id})
    total_wos = await db.work_orders.count_documents({"tenant_id": tenant_id})
    print("\n=== Cockpit demo enrichment ready ===")
    print(f"  sites total:           {total_sites}")
    print(f"  operational_alerts:    {total_alerts}")
    print(f"  work_orders total:     {total_wos}")
    print("  next: open /srs/cockpit (pending Z-c) or pull /api/alerts/active/summary")

    await close_db()


if __name__ == "__main__":
    asyncio.run(enrich())
