# InsiteIQ — Project Status

**Estado:** 🚀 v2.63i DEPLOYED · 2026-05-10 · LISTA PARA USO CON EQUIPO
**Decisión:** Owner (JuanCho)
**Último commit live en PROD:** `80af95c` · rama `v1-foundation` · 9 iters deployed esta sesión (2.63 → 2.63i)
**Dominio:** https://insiteiq.systemrapid.io
**Repo:** https://github.com/gutierrezbj/insiteIq
**Equipo validando ahora:** Andros + Agustín con cuentas reales · Adriana en finanzas · plan de pruebas docx generado y compartido

---

## SPRINT PRE-USO REAL · 2026-05-08 → 2026-05-10

Sesión de cierre de bloqueantes operacionales antes de uso del equipo en producción. **17 commits** entre i18n epic + workers + PWA + Admin write ops + Tech mobile-first. Todo deployed.

### Iter 2.62 · i18n epic (8 lotes · ~980 keys ES+EN)

Lote 3 RolloutDetailPage refactor completo (CSV/PDF exports + flag labels + modales schedule + timeline duration helpers). Lote 4 InterventionReportPage modales (Regenerate · Email dispatch · Webhook dispatch · timeline labels). Lote 5a+5b AdminPage + Agreements list/detail. Lote 5c Finance pages (3140 líneas · delegado a sub-agent · 271 keys). Lote 5d+5f TechDetail + SiteDetail + InsightsPage. Lote 5e+5g Projects + Client HomePage. Lote 6 Tech PWA mobile (Layout + Home + BriefingToday + Profile). Lote 7+8 admin/finance modales + sections + UI primitives. **Resultado:** toggle ES/EN funciona edge-to-edge desde login hasta Finance modales, Tech PWA, Reports, Rollouts, Insights. Listo para Inetum/F4E.

### Iter 2.63 · Outbox workers (Principio #1 · emit outward live)

`app/workers/email_worker.py` con SMTP via stdlib smtplib + asyncio.to_thread + backoff exponencial 2/4/8/16/32min + NoOp safe si SMTP_HOST vacío. `app/workers/webhook_worker.py` con httpx POST JSON + timeout configurable + HMAC-SHA256 signing opcional (WEBHOOK_SIGNING_SECRET). `app/main.py` lifespan arranca asyncio.create_task() para cada worker + graceful shutdown. 12 env vars nuevas (WORKERS_ENABLED · SMTP_* · WEBHOOK_*). Status flow real: `queued → sending → delivered/failed`. Workers actualizan `intervention_reports.deliveries[].status` para que la UI del owner vea progreso en `/srs/ops/{wo_id}/report`. **Pendiente owner:** configurar SMTP_HOST/USER/PASS en `.env` del VPS para activar envío real.

### Iter 2.63b · PWA installable (íconos paleta F + iOS meta)

Bug encontrado: `public/icons/` vacío en repo · nginx servía SPA index.html (~2KB HTML) cuando browser pedía `/icons/icon-192.png` · manifest cargaba pero install prompt nunca aparecía. Fix: 4 íconos PNG generados con paleta F (navy `#0A1628` + amber accent bar + "iQ" blanco centrado · pequeño dot amber). `apple-touch-icon` 180×180 (iOS Safari ignora manifest.json · usa este link). `manifest.json` v2 navy theme + scope `/` + portrait + lang `es` + SRS branding. `index.html` con apple-mobile-web-app-title + status-bar black-translucent + mobile-web-app-capable. `sw.js` cache bump `v1 → v2.63` para invalidar caches viejos. **Verificación PROD curl headers:** icon-192/512/apple-touch-icon → `image/png` 3-10KB cada uno · manifest.json → `application/json` 636 bytes.

### Iter 2.63c · TECH_REGISTRY → backend + Admin edit users + i18n cleanup

User model extendido con 6 fields opcionales (`tz` · `tz_label` · `role_title` · `display_name` · `work_start` · `work_end`) reemplazando el TECH_REGISTRY hardcoded en `lib/tz.js`. `_shape()` expone los nuevos + phone + country. Create/Update bodies aceptan los 6. **Nuevo endpoint** `POST /api/users/{id}/reset-password` (SRS owner/director · genera temp pwd 12-char URL-safe · setea `must_change_password=true` · audited · self-reset prohibido). `seed_foundation.py` puebla los 9 users con tz/role completos. Frontend `lib/tz.js` refactor con backward compat: `getTechTimeInfo(nameOrUser)` acepta object (preferred) o string (legacy lookup TECH_REGISTRY). TechsListPage migrado al patrón nuevo. **EditUserAction.jsx** modal completo con todos los fields + panel Reset password con copy-to-clipboard + ~50 keys nuevas `modal_edit_user`. AdminPage UsersTab grid 5col→6col con columna "Editar" por row. **Cleanup i18n:** 4 strings hardcoded en ChangePasswordPage refactoreados.

### Migration script · user profile fields en PROD existentes

`scripts/migrate_user_profile_fields.py` idempotente. Match por email · solo actualiza fields en null · NO sobrescribe data manual. **Resultado en PROD:** 9 SRS users updateados (Juan Madrid · Sajid London · Adriana Madrid · Andros Montevideo · Luis Lima · Agustín NY · Hugo Madrid · Yunus London · Arlindo NY). Rackel skipped (no canónico).

### Iter 2.63d · Admin edit orgs + sites

**EditOrgAction.jsx**: modal completo con legal_name + display_name + country + jurisdiction + tax_ids.primary + status (active/inactive/archived) + **partner_relationships dinámicas** (array con add/remove rows · type + status + notes opcional). Soporta múltiples roles simultáneos (Fervimax = client + channel_partner + JV). **EditSiteAction.jsx**: modal con code + name + country + city + address + timezone + status + Panel Contacto onsite (name + role + phone + email) + Panel Modelo cierre + NOC (has_physical_resident + default_noc_operator_user_id select de SRS users). NO permite cambiar organization_id (previene cross-tenant leaks). Botón "Editar" wire en AdminPage OrgRow + SitesListPage row con `stopPropagation` para no triggear el Link wrapper. Backend cero cambios (PATCH endpoints ya existían).

### Iter 2.63e · Country + Timezone dropdowns reusables

Owner roast: _"intento cambiar el timezone u se sale el cursor del field, seria bueno tener los timezone en un deplegable"_ + _"Los paises deberian ser desplegables preestablecidos"_. `lib/locales-data.js` con 32 países (LATAM + EU + EEUU sort alfa) + 31 timezones IANA (sort por offset GMT). `DialogCountrySelect` y `DialogTimezoneSelect` wrappers de DialogSelect. **DialogTimezoneSelect** además acepta `onChangeLabel` para autopoblar el `tz_label` corto cuando user elige el IANA. Wireado en 6 modales (Edit + Create de User/Org/Site).

### Iter 2.63f · Fix pantallazo negro /srs/techs + defensa runtime + validación tz backend

Owner reportó: _"Techs da pantallazo negro"_ tras editar Arlindo con `America/Miami` (NO es IANA válido · el correcto es `America/New_York`). Cuando TechsListPage hace map sobre users y llama getTechTimeInfo(u), el `Intl.DateTimeFormat({ timeZone: 'America/Miami' })` tira RangeError no capturado · crashea TODO el render. **Defensas triples:** (1) Frontend `lib/tz.js` envuelve la lógica Intl en try/catch · si tz inválido logea warning y devuelve null · UI degrada silenciosamente sin crashear. (2) Backend `_validate_tz()` en `routes/users.py` y `routes/sites.py` rechaza tz inválido en POST/PATCH con HTTP 400. (3) Script `repair_invalid_tz.py` que escanea users en mongo y restaura al canonical si está corrupto. **Resultado script en PROD:** 8 users válidos · 1 repair (Arlindo: `America/Miami` → `America/New_York`).

### Iter 2.63g · Agustín + Andros promovidos a director

`scripts/promote_to_admin.py` idempotente. Backend `_is_admin()` check pide `authority_level ∈ {owner, director}` en SRS membership. **Resultado:** Agustín y Andros pasaron de `mid_manager` → `director` · ambos pueden ahora editar users/orgs/sites + reset password del equipo + ver audit log completo. **Reset pwds generadas y compartidas con owner** para que arranquen limpio (Agustín `SmYDF28ht85z` · Andros `eBT5iKJzSxz3`).

**Doc Word entregado:** `Plan_Pruebas_InsiteIQ_2026-05-10.docx` en raíz del repo · 513 párrafos · validation PASSED · estructura: pre-flight (URL + tabla de credenciales) + 12 secciones Andros + 9 secciones Agustín + casos comunes + bugs conocidos + checklist marcable. Generado con `docx-js` skill.

### Iter 2.63h · Tech WO Detail mobile-first operativo

Owner roast: _"PIENSA COMO TECNICO DE CAMPO · es una app de campo · no inventes ni te vuelvas loco · es gente operativa"_. Antes `/tech/ops/:wo_id` reusaba el `WorkOrderDetailPage` SRS desktop (1682 líneas pensadas para pantalla grande). Ahora pieza nueva `frontend/src/spaces/tech/WoDetailPage.jsx` (889 líneas) mobile-first OPERATIVA.

**Flow forzado por status:** `dispatched → [SALÍ HACIA EL SITIO] → en_route → [LLEGUÉ AL SITIO] → on_site → form capture + [TERMINÉ] → resolved → "Esperando validación del CAU" → closed → "✓ Cerrado · buen trabajo"`.

**Componentes mobile-first inline:** HeaderRow con back + WO ref + status pill · LocationBlock con dirección + lat/lng + botón gigante navy "📍 Abrir en Google Maps" · ContactBlock con tap-to-call (tel: href nativo) + email mailto · BriefingBlock con nota del coord + botón amber 52px "HE LEÍDO Y ENTENDÍ" · InterventionBlock con textareas grandes (qué encontraste · qué hiciste) + fotos via `<input capture="environment">` con preview grid + remove · ActionButton 64px alto navy strong (gigante touch target). Validación: needs `what_did >5 chars + min 1 foto` para terminar.

**Backend cero cambios** · usa GET `/work-orders/{id}` + GET `/sites/{id}` + GET briefing + POST briefing/acknowledge + POST capture + POST advance + POST `/uploads` (multipart).

**Phase 2 diferido:** video upload (uploads.py hoy solo imagen) · firma del responsable (canvas o foto papel firmado) · botón "SALÍ DEL SITIO" en status resolved · offline cache · geofence check-in (validar lat/lng tech vs site).

### Iter 2.63i · Test user pruebas@ con doble membership + chip de login one-click

`scripts/create_test_user.py` crea/asegura `pruebas@systemrapid.com` con pwd seed `InsiteIQ2026!` y `must_change_password=False` (entra directo · es curioseo). Memberships dobles `srs_coordinators` + `tech_field` ambas `mid_manager`. Cross-vista profile poblado (Madrid · role "Tech de pruebas"). **Bonus:** el script asigna 1-3 WOs activas sin tech (no le roba a Agustín/Arlindo) + promueve a `dispatched` si están en estado no-operativo + siembra briefing pendiente de ack en una. Login chip nuevo en LoginPage (7º chip "Pruebas Tech · Doble SRS + campo").

**Resultado:** owner click chip → entra directo → ve WO `FM-19566` asignada con briefing pendiente · puede curiosear el flow tech mobile completo sin tocar credenciales reales.

---

## DEPLOY v2 · 2026-04-29

Sprint de reanudación completado y desplegado en PROD VPS 1. Las 7 fases del plan cerradas en sesiones consecutivas:

| Fase | Entregable | Status |
|---|---|---|
| Alpha   | Foundation: tokens DS v1.7, lib/icons + lib/tz + lib/woCode | ✓ |
| Beta    | Shell v2: V2TopHeader (dinámico por ruta) + V2SidebarNav + V2BottomStrip | ✓ |
| Gamma   | Cockpit Operaciones: KpiStripV2 con KPI-as-filter + InterventionCard Full/Mini + 4 widgets sidebar | ✓ |
| Delta   | Espacio OPS: mapa Leaflet light Positron + WoMapMarker pill + QuickPopup timezone-aware + SideDetailPanel slide-in 520px | ✓ |
| Epsilon | Kanban Intervenciones: drag&drop nativo HTML5 + drag handle 6-dots + WoStageModal context-aware + filter dropdowns multi-select | ✓ |
| Zeta    | Polish: Skeleton states, EmptyState, ErrorBoundary, polling indicator pulsante, RefreshContext compartido | ✓ |
| Eta     | Deploy PROD: build local validado (1675 módulos · 3.35s), git push, docker compose build frontend, force-recreate, smoke test OK | ✓ |

**Smoke test PROD validado:**
- Login + auth OK
- Cockpit (`/srs?v2=1`): KPI strip + intervenciones en curso + historial + sidebar widgets + bottom strip con timezone live
- Espacio OPS (`/srs/espacio-ops?v2=1`): mapa con pines pill + popup + panel detail
- Kanban (`/srs/intervenciones?v2=1`): drag&drop + modal context-aware + filter dropdowns funcionales
- Polling indicator: pill verde pulsa amber durante refresh + tooltip "última sincronización"
- ErrorBoundary protege cada vista v2 ante runtime crashes

**Toggle de activación:**
- Por default `/srs` muestra v1 viejo. Acceso a v2 con `?v2=1` en URL.
- Activación global v2: setear `VITE_V2_SHELL=1` en build env y redeploy.

**Backend intacto.** Cero cambios a endpoints, schemas, rutas FastAPI. Todo el sprint fue refactor de capa visual + nuevas vistas v2 + helpers compartidos. Los 22+ pasitos previos (F-T + X-a..X-g + Y-a..Y-c + Z-a..Z-e) siguen funcionando sin modificaciones.

**Próximos pasos pendientes (no del sprint v2):**
- Cambio default de v1 → v2 una vez Andros + Juan validen v2 con datos reales una semana.
- Client space (Rackel Fractalia, Adrian Arcos) con misma shell dark + data filtrada por organization scope. Sprint separado.
- Tech PWA mobile reducida — mantiene la actual hasta sprint específico.
- Code splitting (lazy load de páginas v2) si bundle > 500KB se vuelve problema en cliente real.
- Dropdown filters Kanban: persistir selección en localStorage entre sesiones.

---

## REANUDACIÓN 2026-04-24

Owner firma reanudación oficial tras cerrar el vacío que motivó la pausa. Las tres condiciones que fallaban han sido resueltas:

1. **Design System v1.7 formalizado** — ver `memory/design_system_insiteiq_v2.md`. Tokens cerrados (colores, tipografía, spacing), Solar Icon Set estilo Linear como único set oficial, arquitectura dual Cockpit + War Room validada contra SKYPRO360 OpsManager PROD, regla §3.6a timezone-aware personas obligatoria cross-vista, regla dura #0 Anti-plantilla IA como principio activo.

2. **Mocks HTML canónicos validados** por el owner en tres ciclos de revisión iterativa:
   - `mocks/insiteiq_cockpit_srs_dark_v2_static.html` — Cockpit de Operaciones SRS dark con KPI strip accionable, misiones activas, historial reciente, sidebar widgets (alertas/shields/meteo/resumen), bottom strip flota + personal con timezone live.
   - `mocks/insiteiq_map_srs_dark_v2_static.html` — Espacio OPS War Room con mapa Positron light sobre shell dark, pines pill estilo SKYPRO360, popup referencia rápida con bloque timezone del tech, panel lateral slide-in con detalle completo (timeline · threads shared/internal · parts · briefing/capture/report · audit log · CTA escalar ball), KPI-as-filter con filtrado bidireccional minicards + markers, minicards grid auto-fit.
   - `mocks/insiteiq_kanban_v2_static.html` — Kanban Intervenciones con drag & drop + drop zones + modal context-aware por stage + drag handle 6-dots + 5 columnas con sub-stage como badge.

3. **Rol del agente LLM reposicionado** — el agente deja de ser diseñador autónomo. Ahora es **ejecutor 1:1 de mocks pre-aprobados**. Cumple la recomendación #2 del propio PROJECT_STATUS pausado: _"Usar agente LLM únicamente para traducir mocks a HTML/Tailwind 1:1, sin decisiones de diseño autónomas. Ejecutor, no diseñador."_

Plan de extracción a React documentado en `memory/sprint_reanudacion_v2.md`, fases Alpha → Eta. Backend existente en PROD (FastAPI + MongoDB + todos los pasitos F-T + X-a..X-g + Y-a..Y-c + Z-a..Z-e) **no se toca** — la reanudación es capa visual exclusivamente.

Branch de trabajo: `v1-foundation`. Commits etiquetados con prefijo `[v2]` para trazabilidad.

---

## Por qué se pausa

Incompatibilidad entre la complejidad del dominio y el alcance real de
ejecución autónoma de un agente LLM (Claude, Anthropic) para este tipo
de proyecto.

Dominio:
- Sistema operativo interno SRS para field services IT internacional
- 6 modos operativos con decisions propias (Reactivo, Rollout, Tier-2,
  Audit/Inventory, Survey multi-site, DC Migration)
- 3 espacios con RBAC (SRS Coordinators, Client Coordinator, Tech Field)
- 11 domains, 8 principios cross-cutting, Blueprint v1.1 → v1.2
- Visión "aplicación corporativa WOW nivel Palantir / consulting-led GTM"
- 20+ años de dolor operativo real como punto de referencia

El punto de fallo concreto ha sido la **capa de diseño UX del cockpit
operativo**. Tras tres iteraciones con correcciones del owner:

1. Primera versión: cards con hora local y widget de alertas con emojis.
   Rechazada por amateur y copy explicativo de IA.
2. Segunda versión: swap a CartoDB tiles + cleanup de copy. Rechazada
   por seguir pareciendo IA-vibe-coded, no profesional.
3. Tercera versión: Mapbox GL + markers SVG por site_type + cards densas
   + drawer 480px + iconos Lucide. Rechazada por markers ambiguos sin
   leyenda, labels desalineados, z-index de controles mapa encima del
   drawer, timestamps duplicados, jerarquía visual pobre, botón "más
   detalles" sin énfasis.

El patrón es claro: el agente reinventa layouts en cada iteración en
lugar de adherirse 1:1 a una referencia visual. Diseño UX de producto
corporativo complejo sin mock Figma pixel-perfect no es territorio
donde un agente LLM produce resultados fiables sin supervisión constante
de un diseñador humano.

---

## Qué queda vivo y funcional

### Backend (sólido, en PROD)

- FastAPI + Pydantic v2 + Motor async + MongoDB 7 + Redis 7
- Auth JWT con must_change_password + forced rotation
- RBAC 3 espacios + 6 authority levels
- State machine 7-stage para WorkOrders
- Threads shared + internal (WhatsApp kill from day 1)
- Parts/Budget approvals con threshold + exchanges + auto-purchase
- Copilot Briefing con AI enrichment via OpenAI gpt-4o-mini
- Tech Capture con photos upload
- Intervention Report · 5 canales emit (JSON/HTML/CSV/email/webhook)
- Skill Passports + Tech Ratings
- Projects + ClusterGroups (Modo 2 Rollout + BUMM dashboard)
- Service Agreements con Shield catalog + SLA detail
- Invoices + Recurring Billing + Vendor Invoices con three-way match
- P&L con 3 márgenes (nominal, cash-flow, proxy-adjusted)
- OperationalAlerts con 8 kinds / 3 severity / 5 scope / ball-in-court
- Insights dashboard SRS-wide
- AI Learning Engine Fase 1 (similar cases retrieval + site metrics)
- Audit log append-only middleware (Principio #7)
- Multi-tenant from day 0 (Ghost Tech ready)
- 55 sites con coords, 36 WOs, 18 alertas seed demo

### Infraestructura

- Docker Compose 4 servicios (frontend, api, mongo, redis)
- Puertos offset +110 (Catálogo SRS)
- Nginx reverse proxy + Certbot SSL en VPS 1 PROD
- Deploy flow `bleu → VPS 1` validado y documentado
- Env vars + Mapbox token domain-locked

### Frontend funcional (feo pero operativo)

- Login con 6 chips demo (one-click access, no forced rotation)
- 3 espacios con layout y rutas (SRS, Client, Tech PWA)
- Admin CRUD (Users, Orgs, Sites, Audit Log)
- Finance page con AR/AP/Recurring/PnL
- Work Order detail con acciones completas 7-state
- Site / Tech / Agreement / Project / Invoice / Vendor Invoice pages
- BackLink component shared
- BriefingSection con AI summary display
- PartsSection, ThreadsSection, EquipmentSection

---

## Qué quedó sin cerrar

- Cockpit operativo visual "WOW" (3 intentos fallidos)
- Track B Identity Sprint por espacio (war-room SRS / minimal Client /
  field-tool Tech)
- Espacio OPS con mapa full-screen
- Style Mapbox custom SRS (se usó `mapbox/dark-v11` por default)
- Blueprint v1.2 formal con Principio #1 refinado documentado
- Notion sync del estado final
- Memory files (MEMORY.md) con reflexión post-mortem

---

## Cómo retomar si algún día

Recomendación operativa concreta:

1. **Contratar diseñador UX humano** que produzca mocks Figma
   pixel-perfect del cockpit operativo + las 3 identities por espacio
   (SRS war-room, Client minimal professional, Tech field-tool).
2. **Usar agente LLM únicamente para traducir mocks a HTML/Tailwind 1:1**,
   sin decisiones de diseño autónomas. Ejecutor, no diseñador.
3. **Mantener el backend y data model tal como está.** Son sólidos y
   reflejan 20 años de dolor operativo real.
4. **Considerar dashboard plano tipo ERP** (tabla + filtros + modal
   detail) como vista provisional mientras se construye el diseño
   definitivo. El agente sí puede producir esto de forma fiable.
5. **Restringir el scope agentic a una feature por vez**, con validación
   visual humana antes de pasar a la siguiente.

---

## Lecciones registradas

- Diseño UX de producto corporativo complejo ≠ task agentic autónomo.
- Volumen de código producido no equivale a valor producido.
- Sin referencia visual concreta, un LLM inventa. Siempre.
- El backend + data model + flujos operativos sí son terreno agentic
  fiable. La capa visual de producto no lo es sin supervisión humana.
- 3 semanas de trabajo · backend sólido · UX cockpit sin cerrar.

---

## Decisión final

Owner (JuanCho, 2026-04-23): **pausar el proyecto.** Motivo registrado:
proyecto complejo, incompatible con el alcance de ejecución autónoma
del agente LLM (Claude) para la capa UX de producto corporativo sin
mock Figma pixel-perfect.

Proyecto pausado. El código queda disponible en el repo y el entorno
PROD activo hasta que el owner decida lo contrario. La capa UX se
retomará cuando haya un diseñador humano enfrente con referencias
visuales concretas; el agente ejecuta, no diseña.
