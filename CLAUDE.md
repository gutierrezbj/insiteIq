# InsiteIQ — Claude Code Project Context

> **⛔ AGENTE NUEVO — LEE PRIMERO:** [`memory/donde_la_cagamos.md`](memory/donde_la_cagamos.md)
>
> Documento READ-FIRST obligatorio. Registra los antipatrones reales acumulados
> en sesiones Cowork + Code sobre la capa visual del cockpit. Pedido explícito
> por el owner JuanCho. **NO proponer nada visual antes de leerlo entero.**
>
> ---
>
> **🚀 SPRINT v2 DEPLOYED EN PROD · 2026-04-29 · MIGRACIÓN A CODE**
>
> 7 fases del sprint de reanudación completadas y desplegadas en VPS 1
> (Alpha + Beta + Gamma + Delta + Epsilon + Zeta + Eta) más pulidos A
> (Open-Meteo + Shields breakdown + Fleet placeholder + Code splitting) y
> trabajo B (Client space scope-aware + hidden fields + Layouts auto-v2 en
> rutas v2-only). Ver `PROJECT_STATUS.md` para resumen ejecutivo y
> `memory/sprint_reanudacion_v2.md` para log detallado.
>
> **Migración a Claude Code (2026-04-29):** el sprint continuará en Code
> porque las fricciones del Cowork sandbox sobre OneDrive (no puede ejecutar
> git/npm/ssh nativo) hacen ineficiente cada cambio. Documento de handoff
> completo en `memory/handoff_to_code.md` — leer ese primero al arrancar Code.
>
> **Pendiente al cierre Cowork:** trabajo de B + hotfix routes v2-only NO
> está commiteado ni deployed. Working tree del Mac local del owner tiene
> ~9 archivos modificados que cubren: `lib/scope.js`, `V2SidebarNav` scope-aware,
> `SideDetailPanel viewerScope` prop, 3 páginas v2 con scope filter, Layouts
> con detección de rutas v2-only, popup fallbacks. Code arranca con `git status`
> + `npm run build` + commit + push + deploy.
>
> **Acceso v2 en PROD:** `https://insiteiq.systemrapid.io/srs?v2=1`
> Sin `?v2=1` se ve la v1 legacy. Toggle por query param hasta que el v2
> sea validado por Andros + Juan en una semana, después switch a default v2.
>
> **Vistas v2 en producción:**
> - `/srs?v2=1` — Cockpit de Operaciones (KPI filter + cards + sidebar widgets)
> - `/srs/espacio-ops?v2=1` — Espacio OPS (mapa Leaflet + popup + panel detail)
> - `/srs/intervenciones?v2=1` — Kanban Intervenciones (drag&drop + modal stage)
>
> **Regla rectora del sprint v2 (mantener):** el agente ejecuta mocks 1:1,
> no inventa. Fuente canónica visual: `memory/design_system_insiteiq_v2.md`
> y `mocks/insiteiq_*_v2_static.html`. Si una pantalla no se puede construir
> con referencia 1:1 al mock, se para y se vuelve al doc antes de inventar.
>
> Backend (FastAPI + MongoDB + pasitos F-T..Z-e) **no se tocó** en el sprint v2.
> Sprint fue capa visual + helpers + componentes React exclusivamente.

## What is this
Sistema operativo **interno SRS** para field services IT internacional. Construido por y para SRS, basado en 25 anos de dolor real operando soporte IT. **No es producto comercial.** Fractalia/Claro/clientes ven OUTPUT (reportes), nunca el software.

> *"InsiteIQ sirve para arreglar las cagadas de cualquier compania que nos hace sufrir."* — JuanCho, 2026-04-15

## Estado actual (2026-04-29 · v2 deployed en PROD)
- **Status:** 🚀 v2 DEPLOYED · 7 fases completadas en sprint reanudación. Ver `PROJECT_STATUS.md` y `memory/sprint_reanudacion_v2.md`.
- **Último commit live en PROD:** `1cc3cd6` en rama `v1-foundation`. Después vino `830df05` (docs de cierre).
- **Fase alcanzada:** Fase 2 UI plumbing + Horizonte 2 Admin/Finance + Horizonte 3 AI Learning Engine · 22+ pasitos deployed (F-T + X-a..X-g + Y-a..Y-c + Z-a..Z-e)
- **Branch activo:** `v1-foundation`
- **Blueprint:** v1.1 (v1.2 conceptualmente arrancado con Principio #1 refinado pero NO formalizado)
- **Dominio live:** https://insiteiq.systemrapid.io (activo hasta que owner decida lo contrario)
- **Repo:** github.com/gutierrezbj/insiteIq
- **Motivo de pausa:** incompatibilidad entre complejidad del dominio y alcance de ejecución autónoma de agente LLM para diseño UX de producto corporativo sin mock Figma pixel-perfect. Backend + data model + flujos sólidos. La capa visual del cockpit operativo no cerró tras 3 iteraciones.

### Principio #1 refinado (camino Blueprint v1.2)
Juan clarificó el 22-abr-2026:
- **"La ropa se lava en casa"** = numeros/clientes/desacuerdos comerciales/facturación/margenes/threads internos/tech GPS/AI internals · **OPACO al cliente**
- **"OPERATIVO"** = donde va el tech, tech asignado, acciones, mapa, ETA, cards, timeline, alertas · **TRANSPARENTE AL CLIENTE**
- El "hotel 5 estrellas minimalist" estaba en el espacio equivocado (Client). Lo correcto: Client desktop = cockpit radical transparente (como Rackel Fractalia, Adrian Arcos). Tech mobile = visión reducida porque usa el movil.

### Pasitos deployed en PROD (v1-foundation)
| # | Pasito | Qué cierra |
|---|---|---|
| F | Change password + forced rotation | first-login seed flow |
| G | WO actions | advance 7-state + preflight + ack briefing + capture submit + rate + cancel + emergency override |
| H | Parts / Budget approvals | WhatsApp-partes muerto · threshold + exchanges + auto-purchase |
| I | Sites list + detail | drill-down desde WO + base Site Bible Fase 5 |
| J | Intervention Report viewer | Principle #1 emit · 5 canales (JSON/HTML/CSV/email outbox/webhook outbox) · regenerate |
| K | Threads shared + internal | Decision #8 "WhatsApp kill from day 1" + `/api/users` dir |
| L | Copilot Briefing in-app | SRS assemble/edit notes + tech read + ack · Domain 10.5 |
| M | Equipment reconciliation | Modo 2 Decision #4 · 5 estatus (match/substituted/missing/sin_plan/conflicto) |
| N | Admin page | Users / Orgs / Audit log · `/api/organizations` + `/api/audit-log` |
| O | Techs + Skill Passports | Decision #4 Modo 1 · rating + jobs + level + quality marks |
| P | Client drill-down | Rackel (Fractalia) entra al WO + thread + parts + report scoped |
| Q | Tech scan equipment | Domain 11 · tech on-site crea asset + asset_event append-only |
| R | Service Agreements | Shield catalog + SLA detail + bind con WOs |
| S | Finance scaffold | Pre-invoice por org + channel/JV commissions + collections ball-in-court |
| T | Tech Profile + Briefing Today | Cirujano de campo PWA completo |
| X-a..X-g | Horizonte 2 Admin/Finance | RateCard + Invoice + Recurring + Vendor Invoice AP + three-way match + P&L 3 margins con vendor_invoices reales |
| Y-a | Similar cases retrieval + site metrics en Briefing | AI Learning Engine Fase 1 sin LLM (DB aggregations) |
| Y-b | Insights dashboard SRS-wide | `/api/insights/dashboard` · overview + clients + repeat_sites + tech_drift + finance_snapshot |
| Y-c | LLM briefing enrichment · OpenAI gpt-4o-mini | AIProvider abstract (disabled/openai) + build_briefing_user_prompt + ai_summary persisted en briefing |
| Z-a | Quick-access demo chips + BackLink shared | 6 one-click login buttons (seed pwd `InsiteIQ2026!`) + back navigation visible con border + hover amber |
| Z-b | Site lat/lng/site_type + OperationalAlert entity | 8 kinds (traffic/no_show/accident/site_closed/weather/access_denied/fleet/other) · 55 sites + 18 alertas seed demo |
| Z-c | Cockpit de Operaciones UI (SRS + Client compartido) | KpiStrip + AlertsWidget + ActiveInterventions con hora local site + hora origen user |
| Z-d | Mapa interactivo Leaflet | Stadia dark tiles + markers color por status (critical/active/normal) + popup WOs + link a sitio |
| Z-e | Sidebar renombrado | Operaciones/Intervenciones/Proyectos/Sitios/Tecnicos/Contratos/Inteligencia/Finanzas/Admin + Overview clasico como fallback |

### Intentos de cockpit operativo (todos rechazados por owner)
| Intento | Qué tenía | Por qué fue rechazado |
|---|---|---|
| 1 | Leaflet + Stadia tiles + CircleMarker + widget alertas con emojis unicode + KPI strip + cards con hora local | "Iconos genéricos de IA-vibe-coded", pidió Mapbox no Leaflet, apestaba a producto SaaS genérico |
| 2 | CartoDB Dark tiles + copy explicativo fuera + cleanup headers | "Sigue siendo panel de Telefónica aburrido, no WOW, no evidente qué es" |
| 3 | Mapbox GL + markers SVG custom por site_type + cards densas + drawer 480px + iconos Lucide | Markers ambiguos sin leyenda, labels desalineados, z-index controls mapa encima del drawer, timestamps duplicados, botón "más detalles" casi invisible |

**Patrón del fallo:** agente reinventa layout cada iteración en vez de adherirse 1:1 a una referencia visual. Diseño UX complejo sin mock Figma pixel-perfect no es territorio agentic fiable.

## Tech Stack (confirmado)
- **Frontend:** React 19 + Vite 6 + Tailwind CSS 4 + React Router 7
- **Backend:** FastAPI (Python 3.11) + Pydantic v2 + Motor async
- **DB:** MongoDB 7
- **Cache:** Redis 7
- **Auth:** PyJWT + bcrypt (passlib) — JWT con space/role/authority_level en payload
- **Infra:** Docker Compose, Nginx reverse proxy, Certbot SSL
- **Fonts:** Instrument Sans (display), DM Sans (body), JetBrains Mono (mono)

## Project Structure (v1 Foundation — actualizada)
```
InsiteIQ/
  backend/
    app/
      core/            # config + security (JWT/bcrypt) + dependencies (RBAC)
      middleware/
        audit_log.py   # The heart — every mutation stamped (Principio #7)
      models/          # Tenant, Organization (partner_relationships 8 tipos),
                       # User (employment_type + space_memberships + must_change_password),
                       # SRSEntity (SR-UK/US/SA), Asset + AssetEvent (Domain 11),
                       # AuditLogEntry (append-only), Site, ServiceAgreement (Shield + SLA),
                       # WorkOrder (7 stages + ball_in_court + handshakes),
                       # TicketThread + TicketMessage (shared/internal),
                       # CopilotBriefing (Domain 10.5), TechCapture (Domain 10.4),
                       # InterventionReport (5 emit channels + deliveries log),
                       # BudgetApprovalRequest (threshold + exchanges),
                       # SkillPassport + TechRating (Decision #4),
                       # Project + ClusterGroup (Modo 2), EquipmentPlanEntry
      routes/
        health.py               # /health (no auth, no audit)
        auth.py                 # login + refresh + /me + change-password
        users.py                # /api/users read-only dir (SRS full / tech-client narrowed)
        organizations.py        # /api/organizations read-only
        audit_log.py            # /api/audit-log (SRS only) con filtros action/actor/entity
        sites.py                # read-only + client scope
        service_agreements.py   # read-only + shield-levels catalog
        work_orders.py          # intake + list + detail + advance + cancel + preflight
        ticket_threads.py       # list + kind + messages (lazy creation + sealing)
        copilot_briefings.py    # assemble + PATCH notes + acknowledge
        tech_captures.py        # submit + get
        intervention_reports.py # JSON + HTML + CSV + dispatch email/webhook + regenerate
        budget_approvals.py     # create + send-to-client + client-approve/reject + auto-purchase + exchange
        skill_passports.py      # /techs/me/passport + PATCH + rate-tech + ratings list
        projects.py             # CRUD + dashboard BUMM + clusters + bulk-upload CSV aliasing
        equipment.py            # plan bulk + scan site + reconcile project
      main.py                   # FastAPI + CORS + AuditLogMiddleware + 16 routers
      database.py               # Motor client + ensure_indexes Foundation
    scripts/
      seed_foundation.py        # SRS tenant + 4 entities + 16 orgs + 10 users +
                                # 19 sites + 4 agreements + 14 WOs all stages +
                                # Arcos rollout + 2 passports + 2 budget approvals +
                                # plan entries + assets + briefings + captures
      smoke_test.py             # End-to-end ~158 assertions
    requirements.txt
  frontend/
    src/
      lib/               # api.js (fetch + JWT + 401 broadcast), auth.js, useFetch.js
      contexts/          # AuthContext (user + must_change_password + changePassword)
      components/
        RequireSpace.jsx # route guard por espacio + force rotation redirect
        ui/
          Badges.jsx     # StatusBadge, ShieldBadge, BallBadge, SeverityBadge, etc
          KpiCard.jsx
          ActionDialog.jsx  # Shared modal + DialogInput/Textarea/Checkbox primitives
        workorder/
          BriefingSection.jsx  # Copilot Briefing assemble/edit/read/ack
          PartsSection.jsx     # Budget approvals with exchanges + actions
          ThreadsSection.jsx   # Shared + Internal tabs with composer
        project/
          EquipmentSection.jsx # Plan vs Scan reconciliation (5 statuses)
      pages/
        auth/LoginPage.jsx           # war-room login
        auth/ChangePasswordPage.jsx  # forced rotation on first login
      spaces/
        srs/               # Layout + HomePage (war room cockpit, desktop)
          ops/             # WorkOrderDetailPage (acciones completas) +
                           # WorkOrdersListPage + InterventionReportPage
          projects/        # ProjectsListPage + ProjectDetailPage (BUMM + reconciliation)
          sites/           # SitesListPage + SiteDetailPage
          techs/           # TechsListPage + TechDetailPage (Skill Passport)
          agreements/      # AgreementsListPage + AgreementDetailPage (Shield catalog)
          finance/         # FinancePage (pre-invoice / channels / collections)
          admin/           # AdminPage (Users / Orgs / Audit log tabs)
        client/            # Layout + HomePage (hotel 5 estrellas, desktop)
                           # + /client/ops/:wo_id + /client/ops/:wo_id/report
        tech/              # Layout + HomePage (cirujano de campo, PWA mobile) +
                           # ProfilePage + BriefingTodayPage +
                           # /tech/ops/:wo_id + /tech/ops/:wo_id/report
      App.jsx              # Router 3 espacios + guards + RequireUser
      main.jsx
      index.css            # SRS Nucleus foundation
    tailwind.config.js     # SRS Nucleus v2.0 tokens
    index.html             # Google Fonts + PWA meta
  docker/
    api/Dockerfile
    frontend/Dockerfile + nginx.conf
  docker-compose.yml       # 4 services: frontend, api, mongo, redis
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
# Default seed password: InsiteIQ2026! (forced rotation on first login)
```

## Deploy flow (mac bleu → PROD VPS 1)
```bash
# local
docker compose build frontend && docker compose up -d --force-recreate frontend
git add <files> && git commit && git push origin v1-foundation

# PROD (via SSH)
ssh root@72.62.41.234 'cd /opt/apps/insiteiq && git pull && \
  docker compose build frontend api && \
  docker compose up -d --force-recreate frontend api && \
  git log --oneline -1'
```

## Seed users (passwords = `InsiteIQ2026!`, todos `must_change_password=True`)
- SRS: `juang@systemrapid.io`, `sajid@systemrapid.com`, `adrianab@systemrapid.com`, `androsb@systemrapid.com`, `luiss@systemrapid.com`, `yunush@systemrapid.com`
- Tech: `agustinc@systemrapid.com` (plantilla), `arlindoo@systemrapid.com` (external sub), `hugoq@systemrapid.com`
- Client: `rackel.rocha@fractaliasystems.es` (Fractalia)

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
