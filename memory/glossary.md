# Glossary — InsiteIQ / SRS

Shorthand, acronimos y lenguaje interno de SRS y del proyecto InsiteIQ.

> **Nota 2026-04-29:** InsiteIQ v2 deployed en PROD. Glosario actualizado con
> términos del sprint de reanudación (KPI-as-filter, drag handle 6-dots,
> Solar Linear, scope filter, etc.). Fuente canónica viva.

## Acronimos SRS

| Term | Meaning | Context |
|------|---------|---------|
| SDD | System Design Document | 8 secciones obligatorias pre-codigo |
| ADR | Architecture Decision Record | SDD-04, cada decision con contexto y alternativas |
| SRS | System Rapid Solutions | La empresa, Madrid |
| MVP | Minimum Viable Product | Fase 1 del Manifiesto — NO aplica a InsiteIQ (herramienta interna, no producto) |
| SLA | Service Level Agreement | Compromisos de tiempo/calidad embebidos en service_agreement, snapshot al work_order.intake |
| ITIL | IT Infrastructure Library | Framework de gestion IT |
| NBD | Next Business Day | Unidad de SLA (bronze_plus Fractalia = 1/2/3 NBD, ~9h working-day) |
| PoW | Proof of Work | Evidencia trazable de intervencion (fotos geolocalizadas + handshakes + capture) |
| PWA | Progressive Web App | Tech Field space — mobile-first offline-capable |
| RBAC | Role-Based Access Control | `require_space()` + memberships en JWT payload |
| BUMM | Burn Up + Monthly Metrics | KPI dashboard de un project rollout (Modo 2) |
| AP | Accounts Payable | Vendor payables layer con three-way match |
| AR | Accounts Receivable | Cobranza cliente + Invoice Inbox + collections ball |
| JV | Joint Venture | Tipo 4 de `organization.partner_relationships` (Fervimax en Bepensa con revenue_split_pct) |
| CMDB | Configuration Management Database | Export canonico del Master Report al cierre de un project |

## Secciones SDD

| Seccion | Contenido |
|---------|-----------|
| SDD-01 | Definicion del Problema |
| SDD-02 | Alcance y Limites |
| SDD-03 | Arquitectura Tecnica |
| SDD-04 | Decisiones Tecnicas / ADRs |
| SDD-05 | Backlog Inicial |
| SDD-06 | Reglas de Desarrollo |
| SDD-07 | Plan de Testing |
| SDD-08 | Plan de Despliegue |

## Modulos InsiteIQ

| Term | Meaning |
|------|---------|
| Site Bible | Base de conocimiento por sitio fisico (historial, quirks, acceso, rack layout) — Fase 5 completa |
| Copilot Briefing | Paquete pre-intervencion que el tech LEE antes de salir (site summary + history + device bible + coordinator_notes). Ack bloquea `dispatched → en_route` |
| TechMatch AI | Motor de seleccion inteligente de tecnicos (no solo cercania, adecuacion) |
| Shield | Nivel de cobertura contractual — vive en `service_agreement`, se snapshotea al WO intake |
| Ghost Tech | White-label — cliente usa la plataforma con su marca (multi-tenant ready desde dia 0) |
| Control Tower | Dashboard coordinador — vision de aguila de operaciones |
| Playbook | Guia paso a paso para intervenciones especificas |
| Skill Passport | Perfil profesional del tecnico: level (bronze/silver/gold), jobs_completed, rating_avg, certs, skills con tier, countries_covered, quality_marks |
| Proof of Work | Documentacion: fotos geolocalizadas + handshakes (check_in/resolution/closure) + tech_capture |
| Panic Button | Boton de emergencia para clientes |
| Shadow Mode | Onboarding automatizado de tecnicos nuevos |
| Pre-Flight Check | Verificacion pre-intervencion: `kit_verified` + `parts_ready` + `site_bible_read` → `all_green`. Desbloquea `pre_flight → dispatched` sin emergency |
| Tech Capture | Ritual post-intervencion (Domain 10.4): `what_found`, `what_did`, `anything_new_about_site`, devices_touched, photos, time_on_site. Bloquea `on_site → resolved` |
| Client Handshake | Confirmacion automatica con contacto del site 24h antes |
| Parts & Tools Intel | Generacion automatica de lista de materiales |
| Live Escalation Path | Videollamada a tecnico senior si se atasca |
| Post-Mortem Automatico | Resumen post-intervencion + mejoras identificadas |
| Coverage Map | Mapa de tecnicos disponibles por zona |
| Seasonal Forecast | Planificacion de demanda estacional |

## Work Order State Machine (Modo 1 Decision #1)

| Stage | Ball default | Guard para avanzar |
|-------|--------------|--------------------|
| intake | srs | — |
| triage | srs | — |
| pre_flight | srs | `pre_flight_checklist.all_green=true` o `emergency=true` para pasar a dispatched |
| dispatched | tech | briefing acknowledged por assigned_tech o emergency para pasar a en_route |
| en_route | tech | — |
| on_site | tech | tech_capture submitted por assigned_tech o emergency para pasar a resolved |
| resolved | client | (esperando sign-off — auto-emit intervention_report al pasar a closed) |
| closed | srs | terminal · sella threads · auto-assembla intervention_report · billing_line hook |
| cancelled | srs | terminal · requiere `reason` |

## Terminos del Core

| Term | Meaning |
|------|---------|
| Ball-in-court | Quien tiene el balon ahora: `srs` / `tech` / `client`. Con `actor_user_id` + `since` timestamp. Expone tiempo sentado por lado en reporte ejecutivo |
| Handshake | Evento explicito con geo snapshot: `check_in` / `resolution` / `closure`. Se appendea al WO y entra al intervention_report |
| Shield Level | `bronze` (4h recv / 72h resolve) · `bronze_plus` (1/2/3 NBD Fractalia-Telefonica) · `silver` (2h / 48h) · `gold` (1h / 24h · 24x7 · copilot RO cliente) |
| SLA snapshot | Copia inmutable del sla_spec en el WO al intake. Si el contrato se renegocia, WOs viejos preservan su SLA original |
| Thread Kind | `shared` (SRS + tech + cliente NOC/resident ven) · `internal` (solo SRS — "ropa en casa"). Lazy-created, sealed al cerrar/cancelar WO |
| System Event | Tipo de mensaje auto-emitido al thread shared cuando advance state (no es mensaje humano, kind=`system_event`) |
| Exchange (parts) | Back-and-forth en un budget_approval: `quote_sent`, `client_question`, `srs_answer`, `approval`, `rejection`, `auto_purchase`, `srs_revision`, `timeout_noted`. Cada uno flipea el ball |
| Auto-purchase | Flag en budget_approval_request: SRS compro ya sin esperar sign-off (urgent ops). Queda grabado con `reason` |
| Below-threshold | `total_amount_usd <= service_agreement.parts_approval_threshold_usd`. Auto-aprobado sin mover ball al cliente |
| Intervention Report | Paquete auto-ensamblado al cierre del WO. 5 canales emit: JSON portal / HTML / CSV / email outbox / webhook outbox. Versionable (regenerate supersedes) |
| Emit Channel | Canal de salida scoped por rol (cliente ve vista scoped sin internal_message_count) |
| Deliveries Log | Registro append-only por intervention_report: channel, target, status, attempts |
| Equipment Plan Entry | Fila de equipment planeada (Excel/email/portal/scan). Estatus: `planned` / `match` / `substituted` / `missing` / `sin_plan` / `conflicto` |
| Reconciliation Status | Resultado de reconcile project plan vs scanned assets (los 5 estatus arriba — calculados por algoritmo backend) |
| Tech Scan | Tech on-site registra un asset via `POST /sites/:id/equipment/scan`. Backend decide event_type: `installed` (nuevo) / `relocated` (estaba en otro site) / `inspected` (mismo site) |
| Asset Event | Append-only log por asset (Domain 11 Visibility Model C — public/internal/restricted) |
| Forced Rotation | Flag `must_change_password=true` en user. `RequireSpace` rebota a `/change-password` antes de entrar a cualquier space. Seed marca todos los users asi |
| Pasito | Unidad de avance nombrada con letra (F-T, luego X-a..X-g Finance, Y-a..Y-c AI, Z-a..Z-e Cockpit). Cada pasito = commit + deploy. Se usa como shorthand de "incremento funcional entregable" |
| Backhref adaptativo | `location.pathname.startsWith()` para que un mismo componente (WO detail, report) se quede dentro del espacio del caller: `/tech`, `/client`, `/srs` |
| BackLink | Componente compartido `components/ui/BackLink.jsx` · chip con border + hover amber + Lift. Reemplaza el back-link text-tertiary casi invisible |
| Quick-access chips | 6 botones demo en la página de login que rellenan email + password seed + login directo. Admin SRS / Coord SRS / Finanzas / Cliente / Tech plantilla / Tech externo. `must_change_password=false` para evitar fricción en demos |
| OperationalAlert | Entidad Z-b · 8 kinds (traffic/no_show/accident/site_closed/weather/access_denied/fleet/other) · 3 severity · 5 scope (global/client/site/tech/wo) · ball_in_court propio · TTL con expires_at · ack/resolve/dismiss lifecycle |
| site_type | Enum de Site añadido en Z-b: `retail`/`dc`/`office`/`warehouse`/`branch`/`other`. Usado para forma de marker en mapa operativo |
| Cockpit de Operaciones | Vista compartida SRS + Client (intentada 3 veces) que concentra KPIs + mapa + intervenciones activas + alertas. **No cerró** — ver `PROJECT_STATUS.md` |
| Drawer detail | Panel 480px slide-in desde la derecha con estado + alertas + acciones del WO. Intento 3 del cockpit. |
| AI Learning Engine | Capa Y · Fase 1 sin LLM (similar cases retrieval + site metrics) · Fase 2 con OpenAI gpt-4o-mini (briefing ai_summary enrichment) |
| AIProvider | Abstract service pluggable (disabled/openai/anthropic/ollama/sa99) · backend/app/services/ai_provider.py |
| Three-way match | Vendor invoice · valida PO total vs invoice vs receipts. Lifecycle received→matched→approved→paid (o disputed/rejected) |
| P&L 3 margenes | Invoice con margenes nominal / cash-flow / proxy-adjusted. Nominal usa cost_snapshot manual, cash-flow usa vendor_invoices pagadas |
| Proxy Coordination | Tiempo que SRS absorbe coordinando entre capas que el cliente no paga. Medido, monetizable (Principio #3) |

## Capas de Plataforma

| Capa | Contenido |
|------|-----------|
| A | Inteligencia y Datos |
| B | Operaciones y Dispatch |
| C | Calidad y Garantia |
| D | Tecnicos y Talento |
| E | Clientes y Visibilidad |

## Espacios de Usuario

| Espacio | Tipo | Para quien | Layout |
|---------|------|------------|--------|
| SRS Coordinators | Web desktop | JuanCho, Sajid (RO), Andros, Adriana, Luis, Agustin, Yunus | Sidebar con 8 items (Overview, Work Orders, Projects, Sites, Techs, Agreements, Finance, Admin) |
| Client Coordinator | Web desktop | Rackel Fractalia + contactos cliente tier_contractual | Top nav 3 items + drill-down WO |
| Tech Field | PWA mobile | Tech plantilla + external_sub | Bottom nav 4 items (Jobs, Briefing, Profile, Sign out) |

## Design System — SRS Nucleus v2.0

| Term | Meaning |
|------|---------|
| Nucleus v2.0 | Metodologia SRS de identidad visual por producto |
| Identity Sprint | Proceso de 6 pasos para definir la identidad de un producto |
| SRS Foundation | Tokens estructurales compartidos: spacing (4px base), border-radius, z-index, durations, easing |
| Vertical Theme | Skin de producto aplicado sobre Foundation (colores, tipografia, motion) |
| Distinctiveness Audit | Checklist pre-launch para verificar que el producto no parece generico |
| Accent Bar | Firma visual: borde izquierdo de 3px color primary (amber en InsiteIQ) |
| Label-Caps | Estilo de etiqueta: uppercase, mono (JetBrains), tracking-wide, color terciario |
| Stagger Wave | Patron de animacion: items aparecen secuencialmente con 60ms delay |
| Character Phrase | Frase que define la personalidad visual ("War room meets luxury ops center") |
| Blacklist | Lista de elementos prohibidos: fuentes (Inter, Poppins), colores (Tailwind defaults), layouts genericos |
| Glow Shadow | Shadow sutil con color primary para hover states (shadow-glow-primary) |

## Infraestructura SRS

| Term | Meaning |
|------|---------|
| SA99 | InfraService — dashboard de red de servidores SRS |
| healthcheck.sh | Monitoring obligatorio de containers |
| bleu | Mac Mini — entorno de desarrollo local |
| vps-staging | Servidor staging (100.110.52.22 / 187.77.71.102) |
| vps-prod | Servidor produccion (72.62.41.234) |
| Hostinger | DNS provider |
| Certbot | SSL automatico via Let's Encrypt |

## Competencia

| Competidor | Contexto |
|------------|----------|
| Field Nation | USA/Canada, 1M+ work orders/ano, cobra 10%. No cubre LATAM/EU |
| FieldEngineer | Superficial fuera USA/UK |
| Kinettix | Broker opaco, anade coste sin transparencia |
| Fiverr | En crisis (caida revenue 2026), IA destruye sus categorias. No cubre onsite |
| Upwork | Cobra 10% variable, no disenado para onsite |

## Fases del Protocolo de Kickoff

| Fase | Nombre |
|------|--------|
| 0 | Ideacion y Brainstorming |
| 1 | Setup del Proyecto en Notion |
| 2 | Documentacion SDD (8 secciones) |
| 3 | Reserva de Infraestructura |
| 4 | Desarrollo Local (MVP) |
| 5 | Deploy en Staging |
| 6 | Deploy en Produccion |
| 7 | Documentar y Cerrar Kickoff |

## Nicknames

| Nickname | Person |
|----------|--------|
| JuanCho | Juan Gutierrez, lead del proyecto |
| Navegante | Forma de tratamiento mutua entre JuanCho y el agente IA en sesiones cowork |
| Andros | Operaciones SRS |
| Adriana | Operaciones SRS |

## Términos v2 (sprint reanudación 2026-04-24/29)

| Term | Meaning |
|------|---------|
| Sprint v2 | Reanudación del proyecto con 7 fases (Alpha→Eta) que llevaron InsiteIQ del estado pausado al deployed en PROD |
| Cowork mode | Sesión interactiva con Claude (no Code) donde se construyó la mayor parte del v2 · friction documentada por OneDrive sandbox |
| Mock 1:1 | Regla rectora del sprint v2: el agente NO inventa visual, copia mocks pre-firmados. Mocks canónicos en `mocks/insiteiq_*_v2_static.html` |
| Anti-plantilla IA | Regla Dura #0 del DS v1.7 §1: cero defaults Shadcn/Lucide, cero gradientes blue-to-purple, cero "vibe SaaS genérico". Test: si parece generado por V0/Lovable en 5min, no se firma |
| Solar Linear | Único icon set oficial v2. Catálogo cerrado en `lib/icons.jsx`. Blacklist: Lucide, Heroicons, Phosphor, Material, FA, Feather, Tabler |
| KPI-as-filter | Patrón en Cockpit y Espacio OPS donde cada KPI card es un button accionable que filtra el resto del contenido. Mata clicks redundantes |
| Drag handle 6-dots | SVG inline 2×3 circles arriba-izquierda de WoKanbanCard · afordancia universal "esto se arrastra" · estados idle/hover/dragging |
| Modal context-aware | Modal del Kanban donde el CTA primary cambia según stage del WO (Triagear→Despachar→Llegar al sitio→Marcar resuelta→Cerrar). Tabla §5.3 DS v1.7 |
| Pin pill | Marcador del mapa War Room: pill horizontal blanca con dot stage color + WO code corto. Pattern SKYPRO360 1:1 |
| Quick popup | Popup 320px que aparece al click en pin · referencias rápidas concretas (CLI/BALL/TECH/TAG + bloque timezone live + warning si aplica) |
| Side detail panel | Panel lateral derecho 520px slide-in con detalle completo del WO (timeline + threads shared/internal + parts + briefing/capture/report + audit log + CTA escalar ball) |
| Scope filter | Mecanismo del frontend para mostrar/ocultar data según viewer es SRS o Client. Implementado en `lib/scope.js` · helper `getClientOrgId(user)` + 4 predicates |
| Ropa-en-casa hidden fields | Campos OPACOS al cliente (Principio #1): threads_internal, audit log SRS, números cross-cliente, GPS exacto, finanzas internas, ball "SRS" se renombra a "EN REVISIÓN INTERNA" |
| Polling indicator | Pill verde del header v2 que pulsa amber durante refresh de data · tooltip "Última sincronización hace Xs" via `RefreshContext` |
| Auto-v2 routes | Las rutas `/srs/espacio-ops`, `/srs/intervenciones`, `/client/espacio-ops`, `/client/intervenciones` solo existen en v2 · Layout detecta y fuerza V2Shell sin requerir `?v2=1` |
| WO code legible | Display layer sobre ObjectId de Mongo: `formatWoCode(wo)` devuelve `WO-XXXXXXXX` (últimos 8 chars uppercase) si no hay `wo.code` formal |
| Skeleton states | Componentes shimmer en `v2-shared/Skeleton.jsx` (KpiCard / InterventionFull / Mini / KanbanCard / Widget) usados durante primer load · matchea dimensions reales para evitar layout shift |
| Empty state v2 | Componente `v2-shared/EmptyState.jsx` con Solar glyph (inbox/bellOff/magniferBug) + title + sublabel + acción opcional. Tonos: neutral/success/warning/danger |
| Open-Meteo | API meteo público gratuito sin token usado en `WeatherWidget`. Cache 30min en `lib/weather.js`. WMO weather codes mapeados a labels español + decisión Apto/No apto vuelo |
