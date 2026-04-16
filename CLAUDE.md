# InsiteIQ — Claude Code Project Context

## What is this
Sistema operativo **interno SRS** para field services IT internacional. Construido por y para SRS, basado en 25 anos de dolor real operando soporte IT. **No es producto comercial.** Fractalia/Claro/clientes ven OUTPUT (reportes), nunca el software.

> *"InsiteIQ sirve para arreglar las cagadas de cualquier compania que nos hace sufrir."* — JuanCho, 2026-04-15

## Current State
- **Fase:** 0 — Foundation (reinicio total 2026-04-15, clean build radical)
- **Branch activo:** `v1-foundation` (el v0 vive en `main` como referencia historica)
- **Blueprint:** v1.1 validado — 11 domains, 8 principios cross-cutting, 7 fases roadmap
- **SDD:** 8 secciones completas en Notion (v1.1 alineado)
- **Kickoff Notion:** Fases 0-3 cerradas, Fase 4 (desarrollo local) en curso
- **UX/UI checklist:** Fase 0 pre-poblada para 3 espacios — Track B Identity Sprint pendiente
- **Dominio reservado:** insiteiq.systemrapid.io
- **Repo:** github.com/gutierrezbj/insiteIq
- **Design System:** SRS Nucleus v2.0 preservado como base. Track B revisitara Identity Sprint por espacio.

## Tech Stack (confirmado)
- **Frontend:** React 19 + Vite 6 + Tailwind CSS 4 + React Router 7
- **Backend:** FastAPI (Python 3.11) + Pydantic v2 + Motor async
- **DB:** MongoDB 7
- **Cache:** Redis 7
- **Auth:** PyJWT + bcrypt (passlib) — JWT con space/role/authority_level en payload
- **Infra:** Docker Compose, Nginx reverse proxy, Certbot SSL
- **Fonts:** Instrument Sans (display), DM Sans (body), JetBrains Mono (mono)

## Project Structure (v1 Foundation)
```
InsiteIQ/
  backend/
    app/
      core/
        config.py          # Settings (env-loaded)
        security.py        # JWT + bcrypt
        dependencies.py    # get_current_user + require_space + require_authority
      middleware/
        audit_log.py       # The heart — every mutation stamped
      models/
        base.py            # BaseMongoModel (tenant_id, timestamps)
        tenant.py          # Tenant (SRS = tenant 1, Ghost Tech ready)
        organization.py    # partner_relationships (8 tipos, multi-rol)
        user.py            # employment_type + space_memberships
        srs_entity.py      # SR-UK / SR-US / SR-SA / SR-ES
        asset.py           # Domain 11 — asset + asset_event + Visibility Model C
        audit_log.py       # AuditLogEntry (append-only)
      routes/
        health.py          # /health (no auth, no audit)
        auth.py            # /api/auth/login, /api/auth/refresh, /api/auth/me
      main.py              # FastAPI + CORS + AuditLogMiddleware
      database.py          # Motor client + indexes Foundation
    scripts/
      seed_foundation.py   # SRS tenant + 4 entities + 16 orgs + 9 users + audit
    requirements.txt
  frontend/
    src/
      lib/
        api.js             # fetch wrapper (JWT inject, 401 broadcast)
        auth.js            # token storage, space helpers
      contexts/
        AuthContext.jsx    # user state + login/logout
      components/
        RequireSpace.jsx   # route guard por espacio
      pages/
        auth/LoginPage.jsx # login compartido
      spaces/
        srs/               # Layout + HomePage (war room, desktop)
        client/            # Layout + HomePage (minimal, desktop)
        tech/              # Layout + HomePage (PWA, mobile, bottom nav)
      App.jsx              # Router 3 espacios + guards
      main.jsx
      index.css            # SRS Nucleus foundation (accent-bar, label-caps, ...)
    tailwind.config.js     # SRS Nucleus v2.0 tokens
    index.html             # Google Fonts + PWA meta
  docker/
    api/Dockerfile
    frontend/Dockerfile + nginx.conf
  docker-compose.yml       # 4 services: frontend, api, mongo, redis (litellm v0 removed)
  memory/                  # Claude Code project memory (fuente canonica viva)
```

## Key Patterns (Blueprint v1.1)
- **Clean build radical.** Cero deuda tecnica, cero frankenstein. Si codigo no alinea Blueprint, se descarta.
- **audit_log es el alma.** Middleware intercepta toda mutacion. Append-only. Nada se edita o borra.
- **Multi-tenant desde dia 0.** `tenant_id` en cada documento. Ghost Tech ready.
- **3 espacios + RBAC.** `srs_coordinators` / `client_coordinator` / `tech_field`. `require_space()` decorator.
- **Organization multi-rol.** `partner_relationships` array con 8 tipos. Fervimax = client + channel_partner + JV.
- **Asset v1.1.** asset + asset_event inmutable + Visibility Model C (public/internal/restricted).
- **Docker:** `127.0.0.1:PUERTO:INTERNO` siempre, nunca `0.0.0.0`.
- **Pydantic:** `model_config = ConfigDict(extra="ignore")` para flex MongoDB.

## 8 Principios Cross-cutting (inmutables, Blueprint v1.1)
1. Emit outward, never ingest inward
2. Plantilla del cliente siempre gana
3. Proxy Coordination medida y monetizable
4. La ropa se lava en casa
5. No se hace lo que no se firma
6. Anti-trampa-al-solitario
7. Nuestro corazon guarda todo
8. Si el cliente nos regana con razon Y el tech nos salva de memoria, el sistema fallo dos veces (v1.1)

## Design System — SRS Nucleus v2.0 (base, Track B refinara)
- **Character:** "War room meets luxury ops center"
- **Palette:** Stone-950 warm black (#0C0A09), amber-600 primary (#D97706)
- **Typography:** Instrument Sans (display), DM Sans (body), JetBrains Mono (data)
- **Motion:** ease-out-expo (0.16, 1, 0.3, 1), stagger-in 60ms
- **Signature:** accent-bar (3px amber), label-caps, warm scrollbar, glow shadows
- **Blacklist:** Inter, Poppins, Tailwind default blue/indigo, generic card layouts
- **Track B pendiente:** Identity Sprint por espacio (SRS war-room, Client minimal professional, Tech field-tool)

## Puertos Asignados (Offset +110)
- Frontend: `127.0.0.1:3110:80`
- API: `127.0.0.1:4110:8000`
- MongoDB: `127.0.0.1:6110:27017`
- Redis: `127.0.0.1:6111:6379`

## Deploy
Mac Mini bleu (dev) → VPS 1 PROD (72.62.41.234 / Tailscale 100.71.174.77). **No staging.** (InsiteIQ solo vive en VPS 1, confirmed en memory/infra_vps_layout.md).

## Running locally
```bash
docker compose up -d --build
docker compose exec api python -m scripts.seed_foundation
# Frontend: http://localhost:3110
# API: http://localhost:4110 (docs at /docs)
# Default seed password: InsiteIQ2026!
```

## Memory canonical files (read order)
1. `memory/MEMORY.md` — master index
2. `memory/blueprint_insiteiq_v1.md` — Blueprint v1.0 master
3. `memory/project_knowledge_asset_modules.md` — Blueprint v1.1 additions (Domains 10, 11 + principle #8)
4. `memory/pain_evidence_log.md` — 4 entries immutable
5. `memory/project_modo{1..6}_*.md` — decisions per operational mode
6. `memory/project_three_spaces.md` + `project_admin_finance_layer.md` + `project_emit_not_integrate.md`
7. `memory/feedback_*.md` — herramienta interna no MVP · clean build radical · Fractalia no detonante

## Team
| Who | Role |
|-----|------|
| JuanCho | Lead, owner |
| Sajid | owner_readonly |
| Andros | SRS Operations |
| Adriana | SRS Finance |
| Luis Sanchez | Field Consultant (Lima, cubre CET) |
| Agustin | Top tech plantilla |
| Yunus | Account Lead London |
| Arlindo | Tech external_sub (email @systemrapid.com por contrato Claro US) |

## Projects (Active en SRS)
| Name | What |
|------|------|
| **InsiteIQ** | Sistema operativo interno SRS (este proyecto) |
| **DroneHub** | Directorio profesional de drones |
| **SA99** | Dashboard de infraestructura SRS |
| **SKYPRO360 / MOEVE-T / OttoIA / Copiloto Ciudadano** | Otros proyectos SRS |

## Preferences
- Respuestas claras, directas, sin rodeos
- Nada de emojis ni tono formal
- Explicaciones practicas, al grano
- Tono natural y cercano
