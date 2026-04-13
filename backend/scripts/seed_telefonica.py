"""Seed script — Telefonica-grade demo data for production demo."""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import connect_db, get_db, close_db

now = datetime.now(timezone.utc)


# ─── Telefonica-relevant sites ───────────────────────────────────────────────
NEW_SITES = [
    {
        "name": "Telefonica DC Alcala",
        "client": "Telefonica",
        "address": "Calle de Alcala 505, Madrid 28027, Spain",
        "country": "ES",
        "city": "Madrid",
        "region": "Comunidad de Madrid",
        "location": {"type": "Point", "coordinates": [-3.6100, 40.4350]},
        "contact": {"name": "Javier Serrano", "phone": "+34-91-700-2100", "email": "noc.madrid@telefonica.com", "available_hours": "24/7"},
        "access_instructions": "Badge access required. Visitor registration 24h in advance via portal. Security escort to data hall.",
        "tags": ["telco", "datacenter", "tier-3", "madrid"],
        "quirks": ["Strict ESD policy — wristband mandatory", "No photography without written auth from facility manager"],
    },
    {
        "name": "Telefonica Central Barcelona",
        "client": "Telefonica",
        "address": "Avinguda Diagonal 579, Barcelona 08014, Spain",
        "country": "ES",
        "city": "Barcelona",
        "region": "Catalonia",
        "location": {"type": "Point", "coordinates": [2.1380, 41.3930]},
        "contact": {"name": "Marta Vidal", "phone": "+34-93-700-3200", "email": "noc.bcn@telefonica.com", "available_hours": "L-D 7:00-23:00"},
        "access_instructions": "Entrada por parking subterraneo. Registrarse en control B2. DNI/Pasaporte obligatorio.",
        "tags": ["telco", "central-office", "barcelona"],
        "quirks": ["Fiber risers saturated — coordinate with planta externa", "Limited parking — arrive 30min early"],
    },
    {
        "name": "Movistar Flagship Gran Via",
        "client": "Telefonica",
        "address": "Gran Via 28, Madrid 28013, Spain",
        "country": "ES",
        "city": "Madrid",
        "region": "Comunidad de Madrid",
        "location": {"type": "Point", "coordinates": [-3.7010, 40.4200]},
        "contact": {"name": "Carmen Lopez", "phone": "+34-91-700-4100", "email": "tienda.granvia@movistar.es", "available_hours": "L-S 10:00-22:00"},
        "access_instructions": "Entrada tecnica por Calle Valverde. Coordinar con store manager. Trabajo fuera de horario comercial preferible.",
        "tags": ["retail", "flagship", "movistar", "madrid"],
        "quirks": ["Work only before 10am or after 22pm during high season", "Customer-facing area — clean uniform required"],
    },
    {
        "name": "Telefonica NOC Bogota",
        "client": "Telefonica Colombia",
        "address": "Calle 100 #7-33, Bogota, Colombia",
        "country": "CO",
        "city": "Bogota",
        "region": "Cundinamarca",
        "location": {"type": "Point", "coordinates": [-74.0445, 4.6867]},
        "contact": {"name": "Andres Restrepo", "phone": "+57-1-600-5000", "email": "noc.bogota@telefonica.co", "available_hours": "24/7"},
        "access_instructions": "Registro en lobby torre norte. Cedula obligatoria. Acompanamiento permanente.",
        "tags": ["telco", "noc", "bogota", "latam"],
        "quirks": ["Altitude 2600m — equipment cooling specs differ", "Building shared with other tenants — noise restrictions after 20:00"],
    },
    {
        "name": "Telefonica DC Sao Paulo",
        "client": "Telefonica Brasil / Vivo",
        "address": "Av. Engenheiro Luis Carlos Berrini 1376, Sao Paulo, SP 04571-000, Brazil",
        "country": "BR",
        "city": "Sao Paulo",
        "region": "Sao Paulo",
        "location": {"type": "Point", "coordinates": [-46.6870, -23.5980]},
        "contact": {"name": "Fernanda Souza", "phone": "+55-11-7200-6000", "email": "noc.sp@vivo.com.br", "available_hours": "24/7"},
        "access_instructions": "CCTV + biometric. Pre-registration required via VIVO Portal. Portuguese mandatory for security staff.",
        "tags": ["telco", "datacenter", "vivo", "sao-paulo", "latam"],
        "quirks": ["Power redundancy N+1 — always verify feed before work", "Generator test every Wednesday 14:00"],
    },
    {
        "name": "Movistar Chile - Santiago DC",
        "client": "Telefonica Chile",
        "address": "Av. Providencia 1760, Santiago, Chile",
        "country": "CL",
        "city": "Santiago",
        "region": "Region Metropolitana",
        "location": {"type": "Point", "coordinates": [-70.6150, -33.4290]},
        "contact": {"name": "Felipe Gonzalez", "phone": "+56-2-2691-7000", "email": "noc.santiago@movistar.cl", "available_hours": "24/7"},
        "access_instructions": "Ingreso por calle lateral. Cedula de identidad. Registro en bitacora.",
        "tags": ["telco", "datacenter", "movistar", "santiago", "latam"],
        "quirks": ["Seismic zone — equipment must be rack-bolted", "UPS maintenance window: Sunday 06:00-10:00"],
    },
    {
        "name": "O2 Munich Office",
        "client": "Telefonica Germany / O2",
        "address": "Georg-Brauchle-Ring 50, 80992 Munich, Germany",
        "country": "DE",
        "city": "Munich",
        "region": "Bavaria",
        "location": {"type": "Point", "coordinates": [11.5290, 48.1750]},
        "contact": {"name": "Klaus Richter", "phone": "+49-89-2442-0", "email": "it.ops@o2.de", "available_hours": "M-F 8:00-18:00"},
        "access_instructions": "Reception at ground floor. Visitor badge required. Ausweis/Passport mandatory.",
        "tags": ["telco", "office", "o2", "munich", "europe"],
        "quirks": ["German labor law — no work on Sundays without special permit", "Strict cable labeling standard DIN EN 50174"],
    },
]


async def seed():
    await connect_db()
    db = get_db()

    # ─── Fetch existing tech IDs ──────────────────────────────────────
    tech_map = {}
    async for t in db.technicians.find({}, {"_id": 1, "name": 1, "email": 1}):
        tech_map[t["name"]] = str(t["_id"])
    print(f"Found {len(tech_map)} technicians: {list(tech_map.keys())}")

    # ─── Insert new sites ─────────────────────────────────────────────
    site_ids = {}
    # First, grab existing sites
    async for s in db.sites.find({}, {"_id": 1, "name": 1}):
        site_ids[s["name"]] = str(s["_id"])

    for site in NEW_SITES:
        if site["name"] in site_ids:
            print(f"[skip] {site['name']}")
            continue
        doc = {**site, "created_at": now, "updated_at": now, "photos": [], "equipment": []}
        result = await db.sites.insert_one(doc)
        site_ids[site["name"]] = str(result.inserted_id)
        print(f"[created] Site: {site['name']}")

    # ─── Add new technicians for new regions ──────────────────────────
    new_techs = [
        {
            "name": "Andres Gutierrez",
            "email": "andres.gutierrez@insiteiq.io",
            "phone": "+57-1-555-2001",
            "country": "CO",
            "city": "Bogota",
            "region": "Cundinamarca",
            "location": {"type": "Point", "coordinates": [-74.0721, 4.7110]},
            "skills": ["networking", "cabling", "cisco", "mikrotik", "fiber-optics"],
            "certifications": [{"name": "CCNA", "issuer": "Cisco", "expires": "2027-08-01"}],
            "tier": "senior",
            "hourly_rate": 45.0,
            "availability": "available",
            "languages": ["es", "en"],
            "rating": {"average": 4.6, "count": 31},
        },
        {
            "name": "Hans Mueller",
            "email": "hans.mueller@insiteiq.io",
            "phone": "+49-89-555-3001",
            "country": "DE",
            "city": "Munich",
            "region": "Bavaria",
            "location": {"type": "Point", "coordinates": [11.5820, 48.1351]},
            "skills": ["networking", "server-install", "cabling", "fiber-optics", "juniper"],
            "certifications": [{"name": "JNCIS-ENT", "issuer": "Juniper Networks", "expires": "2027-05-01"}],
            "tier": "senior",
            "hourly_rate": 80.0,
            "availability": "available",
            "languages": ["de", "en"],
            "rating": {"average": 4.8, "count": 44},
        },
        {
            "name": "Felipe Araya",
            "email": "felipe.araya@insiteiq.io",
            "phone": "+56-2-555-4001",
            "country": "CL",
            "city": "Santiago",
            "region": "Region Metropolitana",
            "location": {"type": "Point", "coordinates": [-70.6693, -33.4489]},
            "skills": ["cabling", "rack-mount", "hardware", "fiber-optics", "power"],
            "certifications": [{"name": "BICSI Installer", "issuer": "BICSI", "expires": "2027-06-01"}],
            "tier": "mid",
            "hourly_rate": 40.0,
            "availability": "available",
            "languages": ["es", "en"],
            "rating": {"average": 4.4, "count": 18},
        },
    ]

    for tech in new_techs:
        if tech["name"] in tech_map:
            print(f"[skip] Tech: {tech['name']}")
            continue
        doc = {
            **tech,
            "is_active": True,
            "shield_level": "bronze",
            "stats": {"total_interventions": 0, "completed": 0, "avg_resolution_minutes": 0},
            "created_at": now, "updated_at": now,
        }
        result = await db.technicians.insert_one(doc)
        tech_map[tech["name"]] = str(result.inserted_id)
        print(f"[created] Tech: {tech['name']} ({tech['city']})")

    # Create user accounts for new techs
    from app.utils.security import hash_password
    for tech in new_techs:
        existing = await db.users.find_one({"email": tech["email"]})
        if existing:
            print(f"[skip] User: {tech['email']}")
            continue
        await db.users.insert_one({
            "email": tech["email"],
            "name": tech["name"],
            "role": "technician",
            "password_hash": hash_password("tech123"),
            "is_active": True,
            "technician_id": tech_map[tech["name"]],
            "created_at": now, "updated_at": now,
        })
        print(f"[created] User: {tech['email']}")

    # ─── Get counter for interventions ────────────────────────────────
    counter = await db.counters.find_one({"_id": "intervention_ref"})
    seq = counter["seq"] if counter else 3

    # ─── Create realistic interventions ───────────────────────────────
    interventions = [
        # --- COMPLETED (historical) ---
        {
            "reference": f"IIQ-2026-{seq+1:05d}",
            "site_name": "Telefonica DC Alcala",
            "technician_name": "Elena Ruiz",
            "type": "reactive",
            "priority": "emergency",
            "status": "completed",
            "title": "Core switch failure — partial network outage",
            "description": "Core Nexus 9300 in rack A-12 showing critical errors. 40% of hosted services impacted. Failover active but degraded performance.",
            "resolution": "Replaced failed PSU module. Cleared error logs. Full redundancy restored. Recommended preventive PSU replacement on adjacent racks.",
            "sla": {"response_minutes": 60, "resolution_minutes": 180, "started_at": (now - timedelta(days=3, hours=6)).isoformat()},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(days=3, hours=6)).isoformat(), "actor": "noc.madrid@telefonica.com", "note": "Critical alert from monitoring"},
                {"event": "assigned", "timestamp": (now - timedelta(days=3, hours=5, minutes=50)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "accepted", "timestamp": (now - timedelta(days=3, hours=5, minutes=40)).isoformat(), "actor": "elena.ruiz@insiteiq.io"},
                {"event": "en_route", "timestamp": (now - timedelta(days=3, hours=5, minutes=30)).isoformat(), "actor": "elena.ruiz@insiteiq.io"},
                {"event": "on_site", "timestamp": (now - timedelta(days=3, hours=5)).isoformat(), "actor": "elena.ruiz@insiteiq.io"},
                {"event": "in_progress", "timestamp": (now - timedelta(days=3, hours=4, minutes=45)).isoformat(), "actor": "elena.ruiz@insiteiq.io", "note": "Identified failed PSU on Nexus 9332C"},
                {"event": "completed", "timestamp": (now - timedelta(days=3, hours=3)).isoformat(), "actor": "elena.ruiz@insiteiq.io", "note": "PSU replaced, all services verified operational"},
            ],
            "created_at": now - timedelta(days=3, hours=6),
            "rating": {"score": 5, "comment": "Exceptional response time. Issue resolved within SLA."},
        },
        {
            "reference": f"IIQ-2026-{seq+2:05d}",
            "site_name": "Telefonica NOC Bogota",
            "technician_name": "Andres Gutierrez",
            "type": "install",
            "priority": "normal",
            "status": "completed",
            "title": "New monitoring rack deployment",
            "description": "Deploy 2x 42U racks for expanded NOC monitoring stations. Includes KVM setup, cable management, and power distribution.",
            "resolution": "Both racks installed, labeled per Telefonica standard. KVM operational. 48 patch cables terminated and tested. Documentation delivered.",
            "sla": {"response_minutes": 1440, "resolution_minutes": 4320, "started_at": (now - timedelta(days=5)).isoformat()},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(days=7)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "assigned", "timestamp": (now - timedelta(days=6)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "accepted", "timestamp": (now - timedelta(days=6)).isoformat(), "actor": "andres.gutierrez@insiteiq.io"},
                {"event": "en_route", "timestamp": (now - timedelta(days=5, hours=1)).isoformat(), "actor": "andres.gutierrez@insiteiq.io"},
                {"event": "on_site", "timestamp": (now - timedelta(days=5)).isoformat(), "actor": "andres.gutierrez@insiteiq.io"},
                {"event": "in_progress", "timestamp": (now - timedelta(days=5)).isoformat(), "actor": "andres.gutierrez@insiteiq.io"},
                {"event": "completed", "timestamp": (now - timedelta(days=4)).isoformat(), "actor": "andres.gutierrez@insiteiq.io"},
            ],
            "created_at": now - timedelta(days=7),
            "rating": {"score": 5, "comment": "Clean install, excellent documentation."},
        },
        {
            "reference": f"IIQ-2026-{seq+3:05d}",
            "site_name": "Movistar Flagship Gran Via",
            "technician_name": "Elena Ruiz",
            "type": "reactive",
            "priority": "high",
            "status": "completed",
            "title": "POS system network failure — store revenue impacted",
            "description": "All 6 POS terminals lost connectivity. Store cannot process sales. Estimated revenue loss EUR 2,000/hour.",
            "resolution": "Failed switch in comms closet replaced. Root cause: power surge from building maintenance. UPS recommended for comms closet.",
            "sla": {"response_minutes": 60, "resolution_minutes": 120, "started_at": (now - timedelta(days=1, hours=8)).isoformat()},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(days=1, hours=8)).isoformat(), "actor": "tienda.granvia@movistar.es", "note": "Store manager emergency call"},
                {"event": "assigned", "timestamp": (now - timedelta(days=1, hours=7, minutes=50)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "accepted", "timestamp": (now - timedelta(days=1, hours=7, minutes=45)).isoformat(), "actor": "elena.ruiz@insiteiq.io"},
                {"event": "en_route", "timestamp": (now - timedelta(days=1, hours=7, minutes=40)).isoformat(), "actor": "elena.ruiz@insiteiq.io"},
                {"event": "on_site", "timestamp": (now - timedelta(days=1, hours=7)).isoformat(), "actor": "elena.ruiz@insiteiq.io"},
                {"event": "in_progress", "timestamp": (now - timedelta(days=1, hours=6, minutes=50)).isoformat(), "actor": "elena.ruiz@insiteiq.io", "note": "Switch dead, replacing with spare from van stock"},
                {"event": "completed", "timestamp": (now - timedelta(days=1, hours=6)).isoformat(), "actor": "elena.ruiz@insiteiq.io", "note": "All 6 POS terminals verified online. Store operational."},
            ],
            "created_at": now - timedelta(days=1, hours=8),
            "rating": {"score": 5, "comment": "Resolved in under 2 hours. Store back to full operation."},
        },
        # --- ACTIVE (in various lifecycle stages) ---
        {
            "reference": f"IIQ-2026-{seq+4:05d}",
            "site_name": "Telefonica Central Barcelona",
            "technician_name": "Elena Ruiz",
            "type": "preventive",
            "priority": "normal",
            "status": "en_route",
            "title": "Quarterly fiber audit — Barcelona central",
            "description": "Full fiber infrastructure audit. Test all trunk connections, check splice trays, update documentation. 3rd floor and rooftop equipment.",
            "sla": {"response_minutes": 480, "resolution_minutes": 960, "started_at": (now - timedelta(hours=2)).isoformat()},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(hours=4)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "assigned", "timestamp": (now - timedelta(hours=3)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "accepted", "timestamp": (now - timedelta(hours=2, minutes=30)).isoformat(), "actor": "elena.ruiz@insiteiq.io"},
                {"event": "en_route", "timestamp": (now - timedelta(hours=1)).isoformat(), "actor": "elena.ruiz@insiteiq.io", "note": "ETA 45 minutes"},
            ],
            "created_at": now - timedelta(hours=4),
        },
        {
            "reference": f"IIQ-2026-{seq+5:05d}",
            "site_name": "O2 Munich Office",
            "technician_name": "Hans Mueller",
            "type": "install",
            "priority": "normal",
            "status": "assigned",
            "title": "WiFi 6E access point deployment — floors 3-5",
            "description": "Deploy 24x Cisco Meraki MR56 access points across 3 floors. Includes PoE switch upgrade and heat map validation.",
            "sla": {"response_minutes": 1440, "resolution_minutes": 5760, "started_at": None},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(hours=6)).isoformat(), "actor": "it.ops@o2.de", "note": "Approved by IT director"},
                {"event": "assigned", "timestamp": (now - timedelta(hours=2)).isoformat(), "actor": "coordinator@insiteiq.io", "note": "Hans Mueller — local to Munich"},
            ],
            "created_at": now - timedelta(hours=6),
        },
        {
            "reference": f"IIQ-2026-{seq+6:05d}",
            "site_name": "Telefonica DC Sao Paulo",
            "technician_name": "Lucas Oliveira",
            "type": "reactive",
            "priority": "high",
            "status": "on_site",
            "title": "UPS battery alarm — redundancy at risk",
            "description": "Battery string #2 on UPS-A showing degraded capacity (67%). System running on single string. Risk of total UPS failure if string #1 fails.",
            "sla": {"response_minutes": 120, "resolution_minutes": 360, "started_at": (now - timedelta(hours=3)).isoformat()},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(hours=3)).isoformat(), "actor": "noc.sp@vivo.com.br", "note": "Auto-alert from BMS"},
                {"event": "assigned", "timestamp": (now - timedelta(hours=2, minutes=45)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "accepted", "timestamp": (now - timedelta(hours=2, minutes=30)).isoformat(), "actor": "lucas.oliveira@insiteiq.io"},
                {"event": "en_route", "timestamp": (now - timedelta(hours=2, minutes=15)).isoformat(), "actor": "lucas.oliveira@insiteiq.io"},
                {"event": "on_site", "timestamp": (now - timedelta(hours=1, minutes=45)).isoformat(), "actor": "lucas.oliveira@insiteiq.io", "note": "On site, assessing battery status"},
            ],
            "created_at": now - timedelta(hours=3),
        },
        {
            "reference": f"IIQ-2026-{seq+7:05d}",
            "site_name": "Movistar Chile - Santiago DC",
            "technician_name": "Felipe Araya",
            "type": "preventive",
            "priority": "normal",
            "status": "in_progress",
            "title": "Seismic rack inspection and reinforcement",
            "description": "Annual seismic compliance check. Verify bolt torque on all racks, check seismic bracing, update certification documentation.",
            "sla": {"response_minutes": 1440, "resolution_minutes": 2880, "started_at": (now - timedelta(hours=5)).isoformat()},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(days=2)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "assigned", "timestamp": (now - timedelta(days=1)).isoformat(), "actor": "coordinator@insiteiq.io"},
                {"event": "accepted", "timestamp": (now - timedelta(days=1)).isoformat(), "actor": "felipe.araya@insiteiq.io"},
                {"event": "en_route", "timestamp": (now - timedelta(hours=6)).isoformat(), "actor": "felipe.araya@insiteiq.io"},
                {"event": "on_site", "timestamp": (now - timedelta(hours=5, minutes=30)).isoformat(), "actor": "felipe.araya@insiteiq.io"},
                {"event": "in_progress", "timestamp": (now - timedelta(hours=5)).isoformat(), "actor": "felipe.araya@insiteiq.io", "note": "Floor 1 complete, moving to floor 2. 12 of 36 racks inspected."},
            ],
            "created_at": now - timedelta(days=2),
        },
        # --- SCHEDULED (future) ---
        {
            "reference": f"IIQ-2026-{seq+8:05d}",
            "site_name": "Telefonica DC Alcala",
            "technician_name": "Elena Ruiz",
            "type": "preventive",
            "priority": "normal",
            "status": "assigned",
            "title": "Firmware upgrade — Nexus 9000 series (scheduled)",
            "description": "Coordinated firmware upgrade on 8x Nexus 9332C switches. Maintenance window Sunday 02:00-06:00. Rolling upgrade to minimize downtime.",
            "scheduled_date": (now + timedelta(days=3)).isoformat(),
            "sla": {"response_minutes": 1440, "resolution_minutes": 720, "started_at": None},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(hours=12)).isoformat(), "actor": "coordinator@insiteiq.io", "note": "Change request CR-2026-0412 approved"},
                {"event": "assigned", "timestamp": (now - timedelta(hours=10)).isoformat(), "actor": "coordinator@insiteiq.io"},
            ],
            "created_at": now - timedelta(hours=12),
        },
    ]

    # ─── Insert interventions ─────────────────────────────────────────
    created_count = 0
    for intv in interventions:
        existing = await db.interventions.find_one({"reference": intv["reference"]})
        if existing:
            print(f"[skip] {intv['reference']}")
            continue

        # Resolve IDs
        site_name = intv.pop("site_name")
        tech_name = intv.pop("technician_name")
        intv["site_id"] = site_ids.get(site_name, "")
        intv["site_name"] = site_name
        intv["technician_id"] = tech_map.get(tech_name, "")
        intv["technician_name"] = tech_name
        intv["updated_at"] = now
        intv.setdefault("pre_flight", None)
        intv.setdefault("proof_of_work", None)
        intv.setdefault("resolution", intv.pop("resolution", None))
        intv.setdefault("rating", intv.pop("rating", None))
        intv.setdefault("scheduled_date", None)
        intv.setdefault("title", "")

        await db.interventions.insert_one(intv)
        created_count += 1
        print(f"[created] {intv['reference']} | {intv['status']:12s} | {site_name}")

    # Update counter
    new_seq = seq + len(interventions)
    await db.counters.update_one(
        {"_id": "intervention_ref"},
        {"$set": {"seq": new_seq}},
        upsert=True,
    )

    # ─── Update existing technician stats ─────────────────────────────
    # Elena: 3 completed
    await db.technicians.update_one(
        {"name": "Elena Ruiz"},
        {"$set": {"stats": {"total_interventions": 5, "completed": 3, "avg_resolution_minutes": 95}, "availability": "busy"}}
    )
    # Roberto: 1 in progress (from original seed)
    await db.technicians.update_one(
        {"name": "Roberto Diaz"},
        {"$set": {"stats": {"total_interventions": 2, "completed": 1, "avg_resolution_minutes": 120}}}
    )
    # Andres: 1 completed
    await db.technicians.update_one(
        {"name": "Andres Gutierrez"},
        {"$set": {"stats": {"total_interventions": 1, "completed": 1, "avg_resolution_minutes": 1440}}}
    )
    # Lucas: 1 active
    await db.technicians.update_one(
        {"name": "Lucas Oliveira"},
        {"$set": {"stats": {"total_interventions": 2, "completed": 1, "avg_resolution_minutes": 180}, "availability": "busy"}}
    )

    # ─── Add Telefonica-specific KB ───────────────────────────────────
    kb_entries = [
        {
            "site_name": "Telefonica DC Alcala",
            "site_id": site_ids.get("Telefonica DC Alcala", ""),
            "category": "networking",
            "problem": "Nexus 9300 PSU failure — fan alarm followed by PSU shutdown",
            "solution": "Stock replacement PSUs at Madrid warehouse (code: NXA-PAC-1100W-PE2). Hot-swap procedure: remove failed PSU (slot will show amber), insert replacement. Verify via 'show environment power' — both slots should show OK within 30s.",
            "tags": ["nexus", "psu", "cisco", "hot-swap"],
            "created_at": now, "updated_at": now, "created_by": "coordinator@insiteiq.io",
        },
        {
            "site_name": "Telefonica Central Barcelona",
            "site_id": site_ids.get("Telefonica Central Barcelona", ""),
            "category": "access",
            "problem": "After-hours access to 3rd floor telecom room",
            "solution": "Call NOC Barcelona +34-93-700-3200. They remote-authorize via building management system. Wait for green LED on door reader (takes 2-3 min). If BMS is down, security guard has master key — office in parking level B1.",
            "tags": ["access", "after-hours", "barcelona"],
            "created_at": now, "updated_at": now, "created_by": "coordinator@insiteiq.io",
        },
        {
            "site_name": "Movistar Flagship Gran Via",
            "site_id": site_ids.get("Movistar Flagship Gran Via", ""),
            "category": "networking",
            "problem": "POS terminal connectivity loss after power event",
            "solution": "Check comms closet (behind display wall, access panel marked 'TECH'). Switch is Cisco SG350-28P. Power cycle first. If switch is dead, spare at Madrid warehouse (code: SG350-28P-K9). VLAN config: POS=VLAN10, Guest WiFi=VLAN20, Corporate=VLAN30.",
            "tags": ["pos", "retail", "switch", "vlan"],
            "created_at": now, "updated_at": now, "created_by": "coordinator@insiteiq.io",
        },
    ]

    for kb in kb_entries:
        existing = await db.knowledge_base.find_one({"problem": kb["problem"]})
        if existing:
            print(f"[skip] KB: {kb['problem'][:50]}...")
            continue
        await db.knowledge_base.insert_one(kb)
        print(f"[created] KB: {kb['problem'][:50]}...")

    print(f"\n--- Telefonica seed complete ---")
    print(f"  New sites: {len(NEW_SITES)}")
    print(f"  New techs: {len(new_techs)}")
    print(f"  New interventions: {created_count}")
    print(f"  New KB entries: {len(kb_entries)}")
    print(f"  Counter updated to: {new_seq}")

    await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
