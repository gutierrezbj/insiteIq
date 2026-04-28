# SDD-02 · InsiteIQ v2 — Alcance

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Depende de:** `SDD_01_PROBLEMA.md`

---

## 1. Definición de "la mejor herramienta de gestión de operaciones"

Ambición del owner: *"vamos a desarrollar la MEJOR herramienta de gestión de operaciones del mercado"*.

Para que esto no se desvirtúe en volumen y scope creep, se define así:

> La mejor **para el tipo de operación que SRS ejecuta** (servicios de campo IT internacionales, multi-cliente, multi-país, con intermediación compleja y plantilla del cliente impuesta). No la mejor para todo el universo de FSM.

Los competidores relevantes (ServiceNow FSM, Salesforce FSL, ClickSoftware, IFS) resuelven el caso simple: un cliente con sus técnicos propios en un país. Lo que rompe hoy — cadenas de 3-5 capas, plantillas por cliente, reporting recurrente con nomenclatura externa, bloqueadores por hardware que no es nuestro, cobros triangulados — no lo resuelven. **Ahí es donde InsiteIQ gana.**

Criterio competitivo para v1: **Andros, Adriana, Agustín, Rackel, NOC cliente, técnico de calle — si los pusiéramos a elegir entre ServiceNow FSM y InsiteIQ el lunes a las 9am para SU trabajo real, eligen InsiteIQ.** No por features, por ajuste al dolor.

---

## 2. Alcance IN (v1)

Módulos que entran en v1. Cada uno cierra un pilar de los 6 usuarios del Blueprint.

### M1 · Intake de email → WO (gatekeeper)
- Buzón único (`wo@systemrapid.com` o `intake@insiteiq.systemrapid.io`).
- Parser LLM ligero (GPT-4o-mini) para emails entrantes.
- Clasificación: nuevo (crea WO draft) vs seguimiento (añade mensaje a thread existente por match de referencia `CS…`, `FM…`, `USC…`).
- Tiempo objetivo: < 60 segundos entre llegada del email y WO asignada.
- Soporta dos plantillas de entrada: narrativa (Fractalia) y estructurada (Claro).
- Reply desde InsiteIQ sale con subject correcto y originales en CC.

### M2 · WorkOrder core + estado + ball-in-court con timer
- WorkOrder con state machine (7 stages del v1 como referencia, revisable en SDD-03).
- Ball-in-court explícito: SRS / tech / cliente. Timer visible.
- 3 referencias de cliente por WO: directo-comercial, intermedio, final-sitio.
- Entidad-que-paga separable del cliente-directo (triangulación AP).
- Bloqueadores externos como banderas (hardware-pendiente, regulatorio-pendiente) que impiden despacho.

### M3 · Thread shared del WO (WhatsApp killer)
- Canal único NOC cliente ↔ tech SRS ↔ coordinador SRS dentro del WO.
- Mensajes, adjuntos, fotos. Push a móvil del tech.
- Thread interno SRS separado (ropa en casa).

### M4 · Requisitos por visita (compliance gatekeeper)
- Checklist configurable por país/cliente (DUVRI Italia, Visura Camerale, EPP, formación, permisos, credenciales NOC).
- Sin check verde, no se despacha.
- Docs adjuntos al WO. Validación manual por coordinador.

### M5 · Tech PWA (móvil, offline-capable)
- Briefing del día.
- WO detail + captura de fotos + entrada de actividad.
- Thread con NOC cliente desde dentro de InsiteIQ (mata WhatsApp).
- Handshake digital al cierre.

### M6 · Intervention Report (output al cliente)
- Plantilla del cliente siempre gana (Fractalia tiene la suya, Claro la suya, etc.).
- 3 canales de emisión mínimo: PDF adjunto, email al cliente, upload a SharePoint/portal del cliente si aplica.
- Visita de validación post-cierre como subtipo de WO con etiqueta comercial (courtesy / QA / scope extra).

### M7 · Proyecto (rollout + servicio recurrente)
- Tipo proyecto = rollout (lista de sitios con estado por sitio) o servicio-recurrente-reporting (engagement continuo con entregables periódicos).
- Cockpit proyecto: sitios por estado (listo / bloqueado / despachado / cerrado).
- Reporting periódico (daily/weekly) con nomenclatura, headers y formato de fecha configurables por cliente. Upload a sistema del cliente (SharePoint/email/portal).

### M8 · Cockpit por rol
- Cockpit SRS: intervenciones activas + ball-in-court + bloqueadores + alertas + columna de Adriana (cobros y pagos).
- Cockpit cliente Supervisor: sus intervenciones en vivo + informes cerrados.
- Cockpit cliente NOC: cola de tickets + WO detail + thread con tech.
- Cockpit Tech (PWA): briefing + WO del día.
- Diseño visual se congela en Identity Sprint (UX/UI Fase 1), no se arranca sin mock pixel-perfect.

### M9 · Finance simple (Adriana)
- Dos tablas: cobros (qué cobramos al cliente, por WO o recurrente) y pagos (qué pagamos al tech/sub por lo hecho).
- Trigger de cobro: WO cerrada → pre-factura en draft.
- Trigger de pago: tech firma cierre + coordinador valida → pre-pago en draft.
- Triangulación AP: cliente-directo-comercial vs entidad-que-paga vs centro-de-costes.
- Sin three-way match. Sin P&L 3 márgenes. Sin recurring billing engine.

### M10 · Audit log append-only
- Middleware intercepta toda mutación.
- Nada se edita ni se borra.
- Base para trazabilidad + compliance + defensa en pelea comercial (ejemplo: "Laly nos pidió visita el 23-mar y respondimos el 7-abr" es una realidad con evidencia, no un recuerdo).

### M11 · Admin (usuarios, orgs, accesos)
- RBAC por espacio (SRS / Cliente-Supervisor / Cliente-NOC / Tech).
- Multi-tenant desde schema (de uso único SRS en v1, margen para v2+ de negocio).
- Gestión de accesos externos tipo "Francis entra, Gonzalo sale" en SharePoint cliente — **out of scope v1** (se hace a mano como hoy, pero el WO lo refleja).

### M12 · i18n UI mínima (ES + EN)
- UI soporta español e inglés desde v1. Sajid (owner_readonly, London) y Yunus (Account Lead London) operan en inglés; los servicios internacionales (Gruma multi-país, Claro US via Arlindo, cuentas UK) se llevan en inglés.
- Preferencia de idioma por usuario en su perfil. Fallback a ES si no está seteado.
- Diccionarios `es.json` / `en.json` cargados en frontend. Textos del sistema (UI labels, botones, mensajes) traducibles desde archivo, no hardcoded.
- Formatos locales: fechas, números y monedas según locale del usuario (UTC almacenado en DB, render local).
- **Out v1:** italiano, francés, portugués, alemán. RTL. Traducción automática de contenido de threads. El **contenido** (reports, templates de cliente, mensajes del thread) va en el idioma que el cliente exija — eso es data multi-idioma, no UI i18n.

---

## 3. Alcance OUT (v1)

Escrito en negativo para que aparezca resistencia cuando alguien proponga añadirlos.

- **NO** SaaS comercial ni Ghost Tech ni white-label.
- **NO** Shield catalog / Service Agreements con niveles / SLA engine.
- **NO** Horizonte 2 financiero (three-way match, P&L 3 márgenes, proxy-adjusted, recurring billing engine).
- **NO** 6 modos operativos con arquitectura propia. Hay 3 modos con esqueleto compartido.
- **NO** 11 domains ni 8 principios numerados. 6 usuarios, 6 jobs, 4 principios.
- **NO** Asset v1.1 con AssetEvent append-only Domain 11.
- **NO** Copilot Briefing con LLM enrichment como feature Fase 1. LLM solo en M1 intake.
- **NO** integración bidireccional con ServiceNow / SOHO cliente / Remedy / otros ticketings.
- **NO** gestión de compra de hardware ni logística ni stock-keeping.
- **NO** orquestación de brokers ni subs locales ajenos. Entran al WO como bloqueador externo si afectan fecha.
- **NO** Copiloto Ciudadano ni OttoIA ni otras capas SRS cross-project.
- **NO** 22 pasitos micro. Módulos completos.

---

## 4. Criterio de éxito (definición de "producción")

Única definición válida, heredada del Blueprint:

> InsiteIQ está en producción cuando **Andros, Agustín, Adriana, Rackel, el NOC del cliente y el técnico de calle abren la app el lunes a las 9am y cierran Excel y WhatsApp.**

Containers corriendo con SSL no cuentan. El test ácido de v1 es: **el NOC de Fractalia prefiere abrir InsiteIQ antes que WhatsApp** para coordinar con el tech de SRS en sitio. Si eso pasa, todos los demás caen por gravedad.

### KPIs operativos de seguimiento (post-lanzamiento)

| KPI | Objetivo |
|---|---|
| % de WOs creadas desde email entrante en < 60s | > 80% |
| WOs con ball-in-court en rojo > 30 días | < 5% del total activo |
| Threads WhatsApp NOC↔tech por WO (medido vía encuesta a techs) | 0 |
| Facturas > 60 días post-cierre sin disparar | 0 |
| Cobros > 90 días sin follow-up registrado | 0 |
| Techs de calle que abrieron la PWA el lunes de la semana | > 90% de activos |

---

## 5. Fases / hitos

Sin fechas duras (vienen en SDD-06 Plan de Proyecto). Orden lógico:

| Fase | Qué cierra | Gate de salida |
|------|-----------|----------------|
| **F0 · SDDs 01-08** | Protocolo SRS-SDD completo. | 8 secciones firmadas. |
| **F1 · Identity Sprint** | Mock pixel-perfect del cockpit SRS + cockpit cliente + PWA tech. Sin arrancar código sin esto. | Mocks firmados por owner. |
| **F2 · Spike de intake** | M1 end-to-end con un email real de Fractalia + uno de Claro. Standalone, sin UI final. | < 60s de email a WO draft. |
| **F3 · Core WO + Thread + Tech PWA** | M2 + M3 + M5. Un WO reactivo entra, se asigna, el tech lo ejecuta, el NOC cliente coordina dentro, cierra. Un solo flujo end-to-end. | 1 caso real de Fractalia ejecutado en InsiteIQ, no en WhatsApp. |
| **F4 · Cockpit + Report** | M6 + M8. Cockpit SRS y cockpit cliente Supervisor. Informe al cliente en plantilla. | Rackel abre InsiteIQ antes que Outlook para ver estado. |
| **F5 · Proyecto + Compliance** | M4 + M7. Rollouts y servicio recurrente con reporting. | Gruma y Miramar Audit se gestionan en InsiteIQ. |
| **F6 · Finance + Admin + Audit** | M9 + M10 + M11. | Adriana dispara cobros desde InsiteIQ. Juan audita sin abrir Mongo. |
| **F7 · Hardening + migración** | QA, carga, backups, docs. Migración de operación real desde Outlook/WhatsApp/Excel. | Los 6 usuarios abren el lunes 9am. |

---

## 6. Supuestos

- Owner (JuanCho) es product owner único. Decisiones de scope pasan por él.
- Andros + Adriana + Agustín + Yunus + Luis disponibles para validación de flujo (no full-time, pero accesibles).
- Rackel (Fractalia) + un operador NOC dispuestos a beta-test cuando F3 esté listo. Sin eso, el test ácido no corre.
- Un tech de plantilla (Agustín) + un sub (Arlindo) como beta-testers PWA.
- Infra: VPS 1 PROD (72.62.41.234) disponible. Puertos offset +110 ya asignados.
- Stack confirmado: FastAPI + Pydantic v2 + Motor + MongoDB 7 + Redis 7 + React 19 + Vite 6 + Tailwind 4 + JWT. Desviación = ADR.

---

## 7. Dependencias externas

- **OpenAI API** (o equivalente) para parser LLM en M1. Coste estimado marginal con `gpt-4o-mini`.
- **SMTP + IMAP** para el buzón de intake. Requiere DNS + credenciales `wo@systemrapid.com` o nuevo buzón.
- **SharePoint / portales cliente** para subida de reportes (M7). Acceso por credenciales del equipo SRS, sin API. Upload manual asistido desde InsiteIQ (descargar archivo generado, subir a mano) aceptable en v1.
- **Plantillas de informe por cliente** (Fractalia, Claro, Telefónica, Fervimax como referencia). Hay que conseguir copia formal de cada una antes de F4.
- **Designer humano** para Identity Sprint F1 (decisión owner post-mortem v1). Entregable: mock pixel-perfect Figma. InsiteIQ no arranca UI sin este.

---

## 8. Congelación del v1 (acción paralela)

Antes de escribir código v2, el v1 queda congelado. Decisión pendiente de ejecutar:

- Repo `gutierrezbj/insiteIq` renombrado a `insiteiq-v1-archive`.
- `docker compose down` en VPS 1 para los contenedores v1 (frontend + api). Mongo y Redis se quedan vivos para servir dumps.
- Dump MongoDB `insiteiq` → backup offline (conservar por compliance + referencia de data real para seed v2).
- Dominio `insiteiq.systemrapid.io` liberado o mantenido apuntando a landing "en construcción" mientras se desarrolla v2.
- Memoria `memory/` del v1 queda como referencia histórica. Todo doc nuevo cita Blueprint v2 + SDDs, no Blueprint v1.x.

Se ejecuta cuando des OK operativo (no es prerequisito para escribir SDDs 03-08).

---

**Siguiente SDD:** SDD-03 · Arquitectura técnica (stack confirmado, schema MongoDB de alto nivel, separación de espacios, patrón de audit log, deployment).
