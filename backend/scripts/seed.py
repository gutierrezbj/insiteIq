"""Seed script — creates admin user, demo sites, technicians, and interventions."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.database import connect_db, get_db, close_db
from app.utils.security import hash_password
from datetime import datetime, timezone, timedelta


DEMO_SITES = [
    {
        "name": "Equinix MI1",
        "client": "Equinix",
        "address": "1300 SW 145th Ave, Pembroke Pines, FL 33027",
        "country": "US",
        "city": "Miami",
        "region": "Florida",
        "location": {"type": "Point", "coordinates": [-80.3356, 25.9878]},
        "contact": {"name": "John Smith", "phone": "+1-305-555-0100", "email": "noc@equinix-mi1.com", "available_hours": "24/7"},
        "access_instructions": "Check in at security desk. Badge required. Escort to cage area.",
        "tags": ["datacenter", "colocation", "miami"],
        "quirks": ["Loading dock closes at 6pm", "Need 24h advance notice for large equipment"],
    },
    {
        "name": "CyrusOne SAT1",
        "client": "CyrusOne",
        "address": "4100 Wiseman Blvd, San Antonio, TX 78251",
        "country": "US",
        "city": "San Antonio",
        "region": "Texas",
        "location": {"type": "Point", "coordinates": [-98.6657, 29.4881]},
        "contact": {"name": "Maria Garcia", "phone": "+1-210-555-0200", "email": "ops@cyrusone-sat1.com", "available_hours": "24/7"},
        "access_instructions": "Government ID required. No cameras allowed past lobby.",
        "tags": ["datacenter", "enterprise", "texas"],
        "quirks": ["Double auth required for cage access", "No food/drinks in data hall"],
    },
    {
        "name": "Telmex Insurgentes",
        "client": "Telmex",
        "address": "Av. Insurgentes Sur 3500, CDMX, Mexico 04530",
        "country": "MX",
        "city": "Mexico City",
        "region": "CDMX",
        "location": {"type": "Point", "coordinates": [-99.1784, 19.3445]},
        "contact": {"name": "Carlos Ramirez", "phone": "+52-55-5555-0300", "email": "noc@telmex-ins.mx", "available_hours": "L-V 8:00-20:00"},
        "access_instructions": "Registrarse en recepcion planta baja. Credencial INE obligatoria.",
        "tags": ["telco", "pop", "cdmx"],
        "quirks": ["Elevador de carga solo hasta piso 3", "Requiere autorizacion previa del NOC"],
    },
    {
        "name": "Interxion MAD1",
        "client": "Digital Realty",
        "address": "Calle Albasanz 71, Madrid 28037, Spain",
        "country": "ES",
        "city": "Madrid",
        "region": "Comunidad de Madrid",
        "location": {"type": "Point", "coordinates": [-3.6292, 40.4381]},
        "contact": {"name": "Pablo Fernandez", "phone": "+34-91-555-0400", "email": "ops@interxion-mad1.es", "available_hours": "24/7"},
        "access_instructions": "Biometric access. Pre-register visitors 48h in advance.",
        "tags": ["datacenter", "colocation", "madrid"],
        "quirks": ["Strict temperature monitoring - report any alarms", "Spanish required for security staff"],
    },
    {
        "name": "Ascenty SP4",
        "client": "Ascenty",
        "address": "Rua Olimpiadas 242, Sao Paulo, SP 04551-000, Brazil",
        "country": "BR",
        "city": "Sao Paulo",
        "region": "Sao Paulo",
        "location": {"type": "Point", "coordinates": [-46.6866, -23.5948]},
        "contact": {"name": "Ana Costa", "phone": "+55-11-5555-0500", "email": "noc@ascenty-sp4.com.br", "available_hours": "24/7"},
        "access_instructions": "CCTV monitored. Visitor badge at reception. Escort mandatory.",
        "tags": ["datacenter", "latam", "sao-paulo"],
        "quirks": ["Power outage protocol requires 15min advance warning", "Portuguese only at security desk"],
    },
]

DEMO_TECHNICIANS = [
    {
        "name": "Roberto Diaz",
        "email": "roberto.diaz@insiteiq.io",
        "phone": "+1-786-555-1001",
        "country": "US",
        "city": "Miami",
        "region": "Florida",
        "location": {"type": "Point", "coordinates": [-80.1918, 25.7617]},
        "skills": ["networking", "cabling", "rack-mount", "cisco", "fiber-optics"],
        "certifications": [
            {"name": "CCNA", "issuer": "Cisco", "expires": "2027-06-15"},
            {"name": "CompTIA A+", "issuer": "CompTIA", "expires": "2027-03-01"},
        ],
        "tier": "senior",
        "hourly_rate": 85.0,
        "availability": "available",
        "languages": ["en", "es"],
        "rating": {"average": 4.8, "count": 47},
    },
    {
        "name": "Sarah Chen",
        "email": "sarah.chen@insiteiq.io",
        "phone": "+1-210-555-1002",
        "country": "US",
        "city": "San Antonio",
        "region": "Texas",
        "location": {"type": "Point", "coordinates": [-98.4936, 29.4241]},
        "skills": ["server-install", "hardware", "dell", "hp", "storage"],
        "certifications": [
            {"name": "Dell Certified", "issuer": "Dell Technologies", "expires": "2027-09-01"},
        ],
        "tier": "mid",
        "hourly_rate": 65.0,
        "availability": "available",
        "languages": ["en", "zh"],
        "rating": {"average": 4.5, "count": 23},
    },
    {
        "name": "Diego Morales",
        "email": "diego.morales@insiteiq.io",
        "phone": "+52-55-5555-1003",
        "country": "MX",
        "city": "Mexico City",
        "region": "CDMX",
        "location": {"type": "Point", "coordinates": [-99.1332, 19.4326]},
        "skills": ["networking", "cabling", "fiber-optics", "mikrotik", "ubiquiti"],
        "certifications": [
            {"name": "MTCNA", "issuer": "MikroTik", "expires": "2026-12-01"},
        ],
        "tier": "senior",
        "hourly_rate": 55.0,
        "availability": "available",
        "languages": ["es", "en"],
        "rating": {"average": 4.9, "count": 62},
    },
    {
        "name": "Elena Ruiz",
        "email": "elena.ruiz@insiteiq.io",
        "phone": "+34-91-555-1004",
        "country": "ES",
        "city": "Madrid",
        "region": "Comunidad de Madrid",
        "location": {"type": "Point", "coordinates": [-3.7038, 40.4168]},
        "skills": ["server-install", "networking", "cabling", "juniper", "palo-alto"],
        "certifications": [
            {"name": "JNCIA", "issuer": "Juniper Networks", "expires": "2027-01-15"},
            {"name": "PCNSA", "issuer": "Palo Alto Networks", "expires": "2026-11-01"},
        ],
        "tier": "senior",
        "hourly_rate": 70.0,
        "availability": "available",
        "languages": ["es", "en", "pt"],
        "rating": {"average": 4.7, "count": 38},
    },
    {
        "name": "Lucas Oliveira",
        "email": "lucas.oliveira@insiteiq.io",
        "phone": "+55-11-5555-1005",
        "country": "BR",
        "city": "Sao Paulo",
        "region": "Sao Paulo",
        "location": {"type": "Point", "coordinates": [-46.6333, -23.5505]},
        "skills": ["cabling", "rack-mount", "hardware", "fiber-optics", "power"],
        "certifications": [
            {"name": "BICSI Installer", "issuer": "BICSI", "expires": "2027-04-01"},
        ],
        "tier": "mid",
        "hourly_rate": 45.0,
        "availability": "busy",
        "languages": ["pt", "es", "en"],
        "rating": {"average": 4.3, "count": 15},
    },
    {
        "name": "James Wilson",
        "email": "james.wilson@insiteiq.io",
        "phone": "+1-305-555-1006",
        "country": "US",
        "city": "Fort Lauderdale",
        "region": "Florida",
        "location": {"type": "Point", "coordinates": [-80.1373, 26.1224]},
        "skills": ["networking", "server-install", "windows-server", "active-directory", "vmware"],
        "certifications": [
            {"name": "VCP-DCV", "issuer": "VMware", "expires": "2027-08-01"},
            {"name": "MCSA", "issuer": "Microsoft", "expires": "2027-02-01"},
        ],
        "tier": "lead",
        "hourly_rate": 110.0,
        "availability": "available",
        "languages": ["en"],
        "rating": {"average": 4.9, "count": 89},
    },
]


async def seed():
    await connect_db()
    db = get_db()
    now = datetime.now(timezone.utc)

    # --- Admin user ---
    existing = await db.users.find_one({"email": settings.ADMIN_EMAIL})
    if existing:
        print(f"[skip] Admin user already exists: {settings.ADMIN_EMAIL}")
    else:
        await db.users.insert_one({
            "email": settings.ADMIN_EMAIL,
            "name": settings.ADMIN_NAME,
            "role": "admin",
            "password_hash": hash_password(settings.ADMIN_PASSWORD),
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "last_login": None,
        })
        print(f"[created] Admin user: {settings.ADMIN_EMAIL}")

    # --- Demo sites ---
    site_ids = {}
    for site_data in DEMO_SITES:
        existing = await db.sites.find_one({"name": site_data["name"], "client": site_data["client"]})
        if existing:
            site_ids[site_data["name"]] = existing["_id"]
            print(f"[skip] Site already exists: {site_data['name']}")
        else:
            doc = {**site_data, "created_at": now, "updated_at": now, "photos": [], "equipment": []}
            result = await db.sites.insert_one(doc)
            site_ids[site_data["name"]] = result.inserted_id
            print(f"[created] Site: {site_data['name']} ({site_data['city']}, {site_data['country']})")

    # --- Demo technicians ---
    tech_ids = {}
    for tech_data in DEMO_TECHNICIANS:
        existing = await db.technicians.find_one({"email": tech_data["email"]})
        if existing:
            tech_ids[tech_data["name"]] = existing["_id"]
            print(f"[skip] Technician already exists: {tech_data['name']}")
        else:
            doc = {
                **tech_data,
                "is_active": True,
                "shield_level": "bronze",
                "stats": {"total_interventions": 0, "completed": 0, "avg_resolution_minutes": 0},
                "created_at": now,
                "updated_at": now,
            }
            result = await db.technicians.insert_one(doc)
            tech_ids[tech_data["name"]] = result.inserted_id
            print(f"[created] Technician: {tech_data['name']} ({tech_data['city']}, {tech_data['country']})")

    # --- Demo interventions ---
    interventions = [
        {
            "reference": "IIQ-2026-00001",
            "site_id": str(site_ids.get("Equinix MI1", "")),
            "site_name": "Equinix MI1",
            "technician_id": str(tech_ids.get("Roberto Diaz", "")),
            "technician_name": "Roberto Diaz",
            "type": "reactive",
            "priority": "high",
            "status": "in_progress",
            "description": "Server rack 14B losing intermittent connectivity. Customer reports packet loss on ports 3-8.",
            "sla": {"response_minutes": 120, "resolution_minutes": 240, "started_at": (now - timedelta(hours=2)).isoformat()},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(hours=3)).isoformat(), "actor": "admin@insiteiq.io", "note": "Ticket created from NOC alert"},
                {"event": "assigned", "timestamp": (now - timedelta(hours=2, minutes=45)).isoformat(), "actor": "admin@insiteiq.io", "note": "Assigned to Roberto Diaz"},
                {"event": "accepted", "timestamp": (now - timedelta(hours=2, minutes=30)).isoformat(), "actor": "roberto.diaz@insiteiq.io"},
                {"event": "en_route", "timestamp": (now - timedelta(hours=2)).isoformat(), "actor": "roberto.diaz@insiteiq.io"},
                {"event": "on_site", "timestamp": (now - timedelta(hours=1, minutes=30)).isoformat(), "actor": "roberto.diaz@insiteiq.io", "note": "Arrived, checking in at security"},
                {"event": "in_progress", "timestamp": (now - timedelta(hours=1, minutes=15)).isoformat(), "actor": "roberto.diaz@insiteiq.io", "note": "Found loose fiber patch cables on ports 3,5,7. Reseating and testing."},
            ],
            "created_at": now - timedelta(hours=3),
        },
        {
            "reference": "IIQ-2026-00002",
            "site_id": str(site_ids.get("Telmex Insurgentes", "")),
            "site_name": "Telmex Insurgentes",
            "technician_id": str(tech_ids.get("Diego Morales", "")),
            "technician_name": "Diego Morales",
            "type": "preventive",
            "priority": "normal",
            "status": "assigned",
            "description": "Quarterly preventive maintenance on core switches. Firmware update and cable audit.",
            "sla": {"response_minutes": 480, "resolution_minutes": 960},
            "timeline": [
                {"event": "created", "timestamp": (now - timedelta(hours=1)).isoformat(), "actor": "admin@insiteiq.io", "note": "Scheduled PM"},
                {"event": "assigned", "timestamp": (now - timedelta(minutes=30)).isoformat(), "actor": "admin@insiteiq.io", "note": "Assigned to Diego Morales"},
            ],
            "created_at": now - timedelta(hours=1),
        },
        {
            "reference": "IIQ-2026-00003",
            "site_id": str(site_ids.get("Interxion MAD1", "")),
            "site_name": "Interxion MAD1",
            "technician_id": "",
            "technician_name": "",
            "type": "install",
            "priority": "normal",
            "status": "created",
            "description": "New 42U rack installation in suite 3A. Includes PDU, cable management, and labeling per client spec.",
            "sla": {"response_minutes": 1440, "resolution_minutes": 2880},
            "timeline": [
                {"event": "created", "timestamp": now.isoformat(), "actor": "admin@insiteiq.io", "note": "Installation request from Digital Realty"},
            ],
            "created_at": now,
        },
    ]

    # Counter for auto-increment
    counter = await db.counters.find_one({"_id": "intervention_ref"})
    if not counter:
        await db.counters.insert_one({"_id": "intervention_ref", "seq": 3})
        print("[created] Counter: intervention_ref = 3")

    for intv in interventions:
        existing = await db.interventions.find_one({"reference": intv["reference"]})
        if existing:
            print(f"[skip] Intervention already exists: {intv['reference']}")
        else:
            doc = {**intv, "updated_at": now, "pre_flight": None, "proof_of_work": None, "resolution": None, "rating": None}
            await db.interventions.insert_one(doc)
            print(f"[created] Intervention: {intv['reference']} — {intv['status']} ({intv['site_name']})")

    # --- Demo knowledge base ---
    kb_entries = [
        {
            "site_id": str(site_ids.get("Equinix MI1", "")),
            "site_name": "Equinix MI1",
            "category": "networking",
            "problem": "Intermittent packet loss on rack patch panels",
            "solution": "Check fiber patch cable seating. Equinix MI1 uses SC connectors on older racks (rows A-F) and LC on newer racks (G+). Replace any cables showing >0.5dB loss.",
            "tags": ["fiber", "patch-panel", "packet-loss"],
        },
        {
            "site_id": str(site_ids.get("Telmex Insurgentes", "")),
            "site_name": "Telmex Insurgentes",
            "category": "access",
            "problem": "After-hours access denied at main entrance",
            "solution": "Call NOC at +52-55-5555-0300 ext 2. They will remote-unlock the side entrance on Calle Crater. Use visitor badge from lockbox (code changes monthly, get from NOC).",
            "tags": ["access", "after-hours", "security"],
        },
        {
            "site_id": str(site_ids.get("Interxion MAD1", "")),
            "site_name": "Interxion MAD1",
            "category": "power",
            "problem": "PDU tripping on high-density racks",
            "solution": "MAD1 racks in zone 3 have 16A PDUs. For high-density loads, request 32A circuit from facility ops (48h lead time). Temporary fix: redistribute load across A+B feeds.",
            "tags": ["power", "pdu", "high-density"],
        },
    ]

    for kb in kb_entries:
        existing = await db.knowledge_base.find_one({"problem": kb["problem"]})
        if existing:
            print(f"[skip] KB entry already exists: {kb['problem'][:50]}...")
        else:
            doc = {**kb, "created_at": now, "updated_at": now, "created_by": settings.ADMIN_EMAIL}
            await db.knowledge_base.insert_one(doc)
            print(f"[created] KB: {kb['problem'][:50]}...")

    print("\n--- Seed complete ---")
    print(f"  Sites: {len(DEMO_SITES)}")
    print(f"  Technicians: {len(DEMO_TECHNICIANS)}")
    print(f"  Interventions: {len(interventions)}")
    print(f"  KB entries: {len(kb_entries)}")

    await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
