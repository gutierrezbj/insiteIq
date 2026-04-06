# InsiteIQ — Claude Code Project Context

## What is this
Sistema operativo para soporte IT de campo a nivel global. Directorio de tecnicos verificados + IA de asistencia + dispatch inteligente + documentacion automatica + pagos integrados. Nace de 25 anos de experiencia SRS en soporte IT internacional.

## Current State
- **Fase:** 4 — Desarrollo Local (MVP funcional con datos demo)
- **Dominio reservado:** insiteiq.systemrapid.io
- **Repo:** github.com/gutierrezbj/insiteIq
- **SDD:** En progreso — desarrollo MVP adelantado para validar concepto
- **Kickoff checklist:** Notion — protocolo SRS activo
- **Design System:** SRS Nucleus v2.0 aplicado — Identity Sprint completado

## Tech Stack (confirmado)
- **Frontend:** React 19 + Vite 6 + Tailwind CSS 4 + React Router 7
- **Backend:** FastAPI (Python 3.11) + Pydantic v2
- **DB:** MongoDB 7 (Pymongo + Motor)
- **Cache:** Redis 7
- **Infra:** Docker Compose, Nginx (reverse proxy frontend), Certbot SSL
- **CI/CD:** Pendiente definicion en SDD-08
- **Monitoring:** healthcheck.sh + SA99 InfraService
- **Fonts:** Instrument Sans (display), DM Sans (body), JetBrains Mono (mono)

## Project Structure
```
InsiteIQ/
  backend/
    app/
      models/          # Pydantic models (intervention, site, technician, kb, dashboard)
      routes/          # FastAPI routers (same modules)
      main.py          # FastAPI app + CORS + router registration
      database.py      # MongoDB connection (Motor async)
    scripts/
      seed.py          # Demo data seeder (5 sites, 6 techs, 3 interventions, 3 KB)
    requirements.txt
  frontend/
    src/
      api/client.js    # Axios wrapper (/api prefix)
      hooks/useFetch.js # Generic data fetching hook
      components/
        layout/
          Sidebar.jsx   # Navigation sidebar (220px fixed)
          PageWrapper.jsx # Layout wrapper (sidebar + main content)
      pages/
        dashboard/DashboardPage.jsx
        sites/SiteListPage.jsx, SiteDetailPage.jsx
        technicians/TechnicianListPage.jsx, TechnicianDetailPage.jsx
        interventions/InterventionListPage.jsx, InterventionDetailPage.jsx, NewInterventionPage.jsx
        kb/KBPage.jsx
      App.jsx           # React Router config
      main.jsx          # Entry point
      index.css         # SRS Foundation CSS (accent-bar, label-caps, stagger, scrollbar)
    tailwind.config.js  # SRS Nucleus tokens (colors, spacing, typography, animations)
    index.html          # Google Fonts loaded here
  docker/
    api/Dockerfile      # Python 3.11 + uvicorn --reload
    frontend/
      Dockerfile        # Node build + Nginx serve
      nginx.conf        # SPA routing + /api proxy
  docker-compose.yml    # 4 services: frontend, api, mongo, redis
  memory/               # Project memory for Claude Code
  scripts/              # Utility scripts
```

## Key Patterns
- SRS Nucleus v2.0 Design System — identity-first, NOT generic UI
- Accent bar (3px left amber border) como firma visual
- Label-caps (uppercase mono tracking-wide) para etiquetas de seccion
- Stagger Wave animation en listas (60ms delay entre items)
- scale(0.97) on :active para todos los elementos clickables
- Docker siempre con `127.0.0.1:PUERTO:INTERNO` (nunca 0.0.0.0)
- Todo container registrado en healthcheck.sh y SA99
- Patron DroneHub: directorio vertical + mapa + perfiles verificados
- Pydantic models con `model_config = {"extra": "ignore"}` para flexibilidad con MongoDB
- Campos opcionales con defaults en models para evitar ValidationError

## Design System — SRS Nucleus v2.0
- **Character:** "War room meets luxury ops center"
- **Palette:** Stone-900 base (#0C0A09), amber-600 primary (#D97706), warm neutrals
- **Typography:** Instrument Sans (headlines), DM Sans (body), JetBrains Mono (data/labels)
- **Motion:** ease-out-expo (0.16, 1, 0.3, 1), stagger-in for lists
- **Signature details:** accent-bar, label-caps, warm scrollbar, glow shadows
- **Blacklist:** Inter, Poppins, Tailwind default blue/indigo, generic card layouts

## Puertos Asignados (Offset +110)
- Frontend: `127.0.0.1:3110:80`
- API: `127.0.0.1:4110:8000`
- Internal: `127.0.0.1:5110:INTERNO`
- MongoDB: `127.0.0.1:6110:27017`
- Redis: `127.0.0.1:6111:6379`

## Deploy
Pendiente — se definira en SDD-08. Flujo estandar SRS:
1. Local (Mac Mini bleu) → 2. Staging (100.110.52.22) → 3. Prod (100.71.174.77)
- Staging: `/opt/apps/insiteiq/`
- Prod: `/opt/apps/insiteiq/`
- DNS: Hostinger → A record → 72.62.41.234
- Dominio: insiteiq.systemrapid.io

## Memory
| Who | Role |
|-----|------|
| **JuanCho** | Lead, responsable del proyecto |
| **Andros** | SRS Operations |
| **Adriana** | SRS Operations |

| Term | Meaning |
|------|---------|
| SDD | System Design Document (8 secciones obligatorias) |
| ADR | Architecture Decision Record |
| Site Bible | Base de conocimiento por sitio fisico |
| Copilot | IA de asistencia en tiempo real al tecnico |
| TechMatch AI | Motor de seleccion inteligente de tecnicos |
| Shield | Sistema de garantia/cobertura por nivel de tecnico |
| Ghost Tech | White-label de la plataforma |
| Control Tower | Dashboard de coordinador, vision en tiempo real |
| Playbook | Guia paso a paso para intervenciones |
| SA99 | InfraService — dashboard de infra SRS |

## Projects (Active)
| Name | What |
|------|------|
| **InsiteIQ** | Plataforma IT field services (este proyecto) |
| **DroneHub** | Directorio profesional de drones (patron base) |
| **SA99** | Dashboard de infraestructura SRS |
| **SKYPRO360** | Proyecto SRS (referencia infra) |
| **MOEVE-T** | Proyecto SRS (referencia infra) |

## Preferences
- Respuestas claras, directas, sin rodeos
- Nada de emojis ni tono formal
- Explicaciones practicas, al grano
- Tono natural y cercano
