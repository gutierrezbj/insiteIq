"""
InsiteIQ — seed_report_templates.py

Plantilla canónica Modo 5 · `claro_us_wireless_survey` v1.0 · absorbida del
"Wireless Site Survey Report" (Charleston SC, 19 páginas) + los 3 huecos que
Orlando Vázquez marcó en Bepensa (ubicación de APs nuevos con foto, evaluación
Cat 6, proyección de puertos). Idempotente por (code, version).

Uso (desde VPS):
    docker compose exec -T api python -m scripts.seed_report_templates
"""
import asyncio
from datetime import datetime, timezone

from app.database import close_db, connect_db, get_db

CODE = "claro_us_wireless_survey"
VERSION = "1.0"


def f(key, label, type="text", required=False, options=None, help=None, unit=None, min_photos=None):
    return {"key": key, "label": label, "type": type, "required": required, "options": options or [],
            "help": help, "unit": unit, "min_photos": min_photos}


SECTIONS = [
    {"key": "site_info", "title": "Información del sitio", "type": "structural", "auto_assemblable": True,
     "description": "Datos base del sitio y del contacto local (LCON).",
     "fields": [
         f("lcon_name", "Contacto local (LCON) · nombre", required=True),
         f("lcon_contact", "LCON · teléfono / email"),
         f("building_type", "Tipo de local", "choice", required=True,
           options=["Restaurante", "Tienda", "Oficina", "Almacén", "Planta", "Otro"]),
         f("floors", "Número de plantas", "number", required=True),
         f("area_sqm", "Superficie aproximada", "number", unit="m²"),
         f("business_hours", "Horario de operación"),
         f("access_notes", "Acceso · parking · restricciones", "textarea"),
     ]},
    {"key": "existing_infrastructure", "title": "Infraestructura existente", "type": "structural",
     "description": "Lo que hay hoy: APs, switch, cableado, puertos y energía.",
     "fields": [
         f("existing_aps_count", "APs existentes · cantidad", "number", required=True),
         f("existing_ap_models", "APs existentes · modelos"),
         f("switch_model", "Switch · marca y modelo", required=True),
         f("available_ports", "Puertos libres en switch", "number", required=True),
         f("port_projection", "Puertos necesarios tras el despliegue", "number", required=True,
           help="Proyección: APs nuevos + reservas. Hueco #3 de Bepensa."),
         f("cabling_type", "Cableado existente", "choice", required=True,
           options=["Cat5e", "Cat6", "Cat6a", "Fibra", "Mixto"]),
         f("cat6_assessment", "Evaluación del cableado para Cat6", "choice", required=True,
           options=["Adecuado", "Reemplazar parcial", "Reemplazar todo"],
           help="Hueco #2 de Bepensa: el cliente pidió esta evaluación explícita."),
         f("poe_available", "PoE disponible", "boolean", required=True),
         f("power_notes", "Energía · UPS · circuitos", "textarea"),
         f("idf_location", "Ubicación del rack / IDF"),
         f("rack_photos", "Fotos del rack / IDF", "photos", required=True, min_photos=1),
     ]},
    {"key": "floor_plan", "title": "Plano base", "type": "media",
     "description": "Plano o croquis por planta con la ubicación de APs existentes.",
     "fields": [
         f("floor_plan_photos", "Plano / croquis por planta", "photos", required=True, min_photos=1),
         f("base_map_notes", "Notas del plano", "textarea"),
     ]},
    {"key": "heatmap_pre", "title": "Cobertura actual (pre-despliegue)", "type": "media",
     "description": "Capturas del mapa de calor (NetSpot u otra herramienta) por planta.",
     "fields": [
         f("heatmap_pre_photos", "Mapa de calor pre-despliegue", "photos", required=True, min_photos=1),
         f("signal_min_dbm", "Señal mínima medida", "number", unit="dBm"),
         f("signal_avg_dbm", "Señal media medida", "number", unit="dBm"),
         f("coverage_gaps", "Zonas sin cobertura o degradadas", "textarea", required=True),
     ]},
    {"key": "ap_placement", "title": "Ubicación propuesta de APs nuevos", "type": "structural",
     "description": "Cada ubicación propuesta con su foto marcada. Hueco #1 de Bepensa.",
     "fields": [
         f("new_ap_count", "APs nuevos propuestos · cantidad", "number", required=True),
         f("new_ap_model", "Modelo propuesto"),
         f("placement_photos", "Foto de cada ubicación propuesta (marcada)", "photos", required=True, min_photos=1),
         f("mounting_type", "Tipo de montaje", "choice", options=["Techo", "Pared", "Poste", "Otro"]),
         f("cable_run_m", "Tirada de cable estimada", "number", unit="m"),
         f("placement_notes", "Notas de ubicación", "textarea"),
     ]},
    {"key": "heatmap_post", "title": "Cobertura prevista (post-despliegue)", "type": "media",
     "description": "Simulación o medición posterior si aplica.",
     "fields": [
         f("heatmap_post_photos", "Mapa de calor post-despliegue", "photos"),
         f("post_notes", "Notas", "textarea"),
     ]},
    {"key": "findings", "title": "Hallazgos", "type": "narrative", "auto_assemblable": False,
     "fields": [
         f("findings_summary", "Hallazgos principales", "textarea", required=True),
         f("issues_list", "Problemas detectados (uno por línea)", "textarea"),
         f("severity", "Severidad global", "choice", options=["Baja", "Media", "Alta", "Crítica"]),
     ]},
    {"key": "recommendations", "title": "Recomendaciones", "type": "narrative", "auto_assemblable": False,
     "fields": [
         f("recommendations", "Recomendaciones", "textarea", required=True),
         f("estimated_effort_hours", "Esfuerzo estimado de instalación", "number", unit="h"),
         f("materials_needed", "Materiales necesarios", "textarea"),
     ]},
    {"key": "photos", "title": "Registro fotográfico", "type": "media",
     "fields": [
         f("site_photos", "Fotos del sitio (exterior · interior · zonas)", "photos", required=True, min_photos=3),
         f("equipment_photos", "Fotos de equipos", "photos"),
     ]},
    {"key": "conclusion", "title": "Conclusión", "type": "narrative", "auto_assemblable": False,
     "fields": [
         f("executive_summary", "Resumen ejecutivo", "textarea", required=True,
           help="3-5 párrafos · sale en la portada del entregable."),
         f("site_rating", "Valoración del sitio", "rating", required=True, help="1 a 5 estrellas"),
         f("ready_for_install", "Listo para instalación", "boolean", required=True),
     ]},
    {"key": "appendix", "title": "Anexos", "type": "appendix",
     "fields": [
         f("attachments", "Documentos adjuntos (compliance · certificaciones)", "photos"),
         f("extra_notes", "Notas adicionales", "textarea"),
     ]},
]


async def main():
    await connect_db()
    db = get_db()
    tenant = await db.tenants.find_one({"code": "SRS"}) or await db.tenants.find_one({})
    tenant_id = str(tenant["_id"])
    owner = await db.users.find_one({"email": "juang@systemrapid.io"})
    actor = str(owner["_id"]) if owner else None
    now = datetime.now(timezone.utc)
    required = sum(1 for s in SECTIONS for x in s["fields"] if x["required"])

    existing = await db.report_templates.find_one({"tenant_id": tenant_id, "code": CODE, "version": VERSION})
    doc = {
        "tenant_id": tenant_id,
        "code": CODE,
        "version": VERSION,
        "name": "Wireless Site Survey · Claro US (Charleston SC · 19 págs)",
        "language": "es",
        "client_organization_id": None,
        "sections": SECTIONS,
        "status": "active",
        "supersedes_id": None,
        "notes": "Absorbida del PDF 'Wireless Site Survey Report - Site 2 of 6 V1.1 - Charleston, SC' + huecos de Bepensa (Orlando Vázquez).",
        "updated_at": now,
        "updated_by": actor,
    }
    if existing:
        await db.report_templates.update_one({"_id": existing["_id"]}, {"$set": doc})
        print(f"↑ template actualizado · {CODE} v{VERSION} · id={existing['_id']} · {len(SECTIONS)} secciones · {required} campos obligatorios")
    else:
        doc.update({"created_at": now, "created_by": actor})
        res = await db.report_templates.insert_one(doc)
        print(f"↑ template creado · {CODE} v{VERSION} · id={res.inserted_id} · {len(SECTIONS)} secciones · {required} campos obligatorios")
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
