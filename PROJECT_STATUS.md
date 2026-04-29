# InsiteIQ — Project Status

**Estado:** v2 deployed · 2026-04-29
**Decisión:** Owner (JuanCho)
**Último commit live en PROD:** branch `v1-foundation` · sprint v2 (Alpha→Eta) deployed 2026-04-29 13:19 CET
**Dominio:** https://insiteiq.systemrapid.io · acceso v2 vía `?v2=1` query param
**Repo:** https://github.com/gutierrezbj/insiteIq

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
