# Company Context — System Rapid Solutions (SRS)

## Overview
System Rapid Solutions (SRS), Madrid, Espana. 25 anos de experiencia en soporte IT internacional. Opera red de tecnicos en Centroamerica, Sudamerica y Europa.

## Tesis de Negocio
El trabajo onsite es a prueba de IA. No hay modelo de lenguaje que resetee un switch en un rack en Bogota a las 3am. Ese es el moat permanente de InsiteIQ.

## Tools & Systems

| Tool | Used for | Internal name |
|------|----------|---------------|
| Notion | Documentacion, SDDs, wikis, checklists | - |
| GitHub | Repositorios de codigo | - |
| Docker | Containerizacion de todos los proyectos | - |
| Nginx | Reverse proxy en produccion | - |
| MongoDB | Base de datos principal (ecosistema SRS) | - |
| Redis | Cache y colas de trabajo | - |
| healthcheck.sh | Monitoring de containers | - |
| SA99 InfraService | Dashboard de infraestructura | SA99 |
| Hostinger | DNS management | - |
| Certbot | SSL certificates | - |

## Servidores

| Server | IP | Tailscale IP | Uso |
|--------|----|-------------|-----|
| vps-prod | 72.62.41.234 | 100.71.174.77 | Produccion |
| vps-staging | 187.77.71.102 | 100.110.52.22 | Staging |
| bleu (Mac Mini) | local | - | Desarrollo |

## Convencion de Puertos
- Frontend: 3xxx
- API: 4xxx
- Servicios internos: 5xxx
- Bases de datos: 6xxx
- Docker SIEMPRE con `127.0.0.1:PUERTO:INTERNO` (nunca 0.0.0.0)

## Convencion de Deploy
- Apps en: `/opt/apps/nombre-proyecto/`
- Nginx reverse proxy: `/` -> frontend, `/api/` -> backend
- SSL via Certbot: `certbot --nginx -d nombre.systemrapid.io`
- DNS en Hostinger: registro A -> 72.62.41.234
- MongoDB backup: agregar a `backup-mongo.sh`

## Registro Obligatorio de Proyectos
Todo proyecto desplegado debe:
1. Registrar containers en healthcheck.sh (staging + prod)
2. Registrar en SA99 InfraService (MongoDB `servers` collection)
3. Actualizar seed data en `/Users/juanguti/dev/sa99/SA99/backend/app/modules/infra/service.py`

## Proyectos SRS Activos (referencia)

| Proyecto | Estado | Dominio |
|----------|--------|---------|
| DroneHub | Produccion | dronehub.systemrapid.io |
| SA99 | Produccion | sa99.systemrapid.io |
| SKYPRO360 | Produccion | skypro360.systemrapid.io |
| MOEVE-T | Produccion | moevet.systemrapid.io |
| InsiteIQ | Fase 4 — MVP local | insiteiq.systemrapid.io |

## Mercados Objetivo InsiteIQ

| Fase | Mercado |
|------|---------|
| Interna (MVP) | SRS Operations — red propia de tecnicos |
| MSPs | Empresas de soporte IT que subcontratan |
| Integradores/VARs | Proyectos multi-site internacionales |
| Admin publica | Ayuntamientos, ministerios, organismos publicos |
| Alta rotacion IT | Retail, hosteleria, logistica, franquicias |

## Cobertura Geografica Planificada
- Fase 1: Centroamerica + Sudamerica + Espana
- Fase 2: Europa completa
- Fase 3: Global (modelo franquicia)

## Modelo de Ingresos
Fee por work order: 8-10% (mas competitivo que Field Nation 10%, Fiverr 20%, Upwork 10%)

## Manifiesto SDD-SRS
Documento rector. Reglas clave:
- No hay codigo hasta que las 8 secciones SDD esten completas
- Stack aprobado o desviacion documentada como ADR
- Checklist de kickoff se copia por proyecto (nunca se referencia)
- Cada proyecto sigue las mismas fases (sin excepciones)
- Responsable: JuanCho (con asistencia de SA99 y agentes IA bajo supervision)

## Patron DroneHub
InsiteIQ sigue el patron probado de DroneHub SRS:
- Directorio profesional vertical
- Mapa como componente central
- Perfiles verificados con certificaciones
- Empieza interno, se abre cuando esta validado
- Stack tecnologico compartido

Diferencia: InsiteIQ va mas alla del directorio. La capa de inteligencia (Copilot, Site Bible, Playbooks, TechMatch) lo convierte en un sistema operativo completo.

## Design System
SRS Nucleus v2.0 — metodologia de identidad visual propia. NO es un kit de UI generico.
- Cada producto SRS pasa por un Identity Sprint (6 pasos)
- Foundation tokens compartidos + Vertical Theme por producto
- Blacklist estricta: fuentes genericas (Inter, Poppins), colores default Tailwind, layouts clone
- InsiteIQ theme: "War room meets luxury ops center" — stone/amber/warm
