# InsiteIQ — Project Status

**Estado:** Pausado · 2026-04-23
**Decisión:** Owner (JuanCho)
**Último commit live en PROD:** `1cc3cd6` en rama `v1-foundation`
**Dominio:** https://insiteiq.systemrapid.io
**Repo:** https://github.com/gutierrezbj/insiteIq

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
