# SDD-05 · InsiteIQ v2 — Decisiones arquitecturales (ADRs)

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Depende de:** `SDD_03_ARQUITECTURA.md`

Cada ADR documenta una decisión con trade-off. Si una decisión cambia, se crea un ADR nuevo que supera al anterior — no se edita el histórico.

---

## ADR-001 · MongoDB como base de datos principal

**Contexto.** InsiteIQ tiene que soportar plantillas por cliente con campos custom (cada cliente exige headers y fields distintos en sus reportes). Además, evolución rápida del schema en las primeras fases.

**Decisión.** MongoDB 7 como base de datos principal.

**Alternativas consideradas.** PostgreSQL con columnas JSONB, SQLite (no escala), DynamoDB (vendor lock-in).

**Trade-offs aceptados.**
- Joins menos cómodos que en Postgres → se compensa con denormalización controlada y `$lookup` donde haga falta.
- Transacciones más limitadas → se usan donde importa (state transitions + audit log).
- Menos herramientas BI maduras → para v1 no es dolor.

**Beneficios.** Schema flex natural. Velocidad de iteración. Ya es estándar SRS (DroneHub, SA99, MOEVE-T lo usan).

---

## ADR-002 · FastAPI + Pydantic v2 como backend

**Contexto.** Backend async con type safety, validación dura, docs automáticas.

**Decisión.** FastAPI + Pydantic v2 + Motor (driver async Mongo).

**Alternativas consideradas.** Node.js/Express + MongoDB (ecosistema JS más amplio), NestJS (overkill), Django REST (sync-first, no encaja).

**Trade-offs aceptados.**
- Python async ecosystem más pequeño que Node.
- Librerías de LLM más jóvenes en Python que en JS → irrelevante, solo usamos OpenAI SDK.

**Beneficios.** Pydantic v2 captura errores de modelo al instante. OpenAPI auto. Stack SRS estándar.

---

## ADR-003 · PWA sobre app nativa para el Tech

**Contexto.** Los técnicos de campo necesitan app móvil que funcione offline, capture fotos, reciba push.

**Decisión.** PWA React con service worker + IndexedDB para offline + Push API.

**Alternativas consideradas.** React Native (doble código, doble deploy), Flutter (stack nuevo para SRS), apps nativas iOS+Android (coste de mantenimiento alto).

**Trade-offs aceptados.**
- Push notifications en iOS limitadas (mejoraron con iOS 16.4+, pero no son full).
- Acceso a hardware más limitado (cámara OK, escaneo barcode con libs web OK, BLE limitado — no lo necesitamos en v1).
- Sin distribución por stores → ventaja, no fricción.

**Beneficios.** Un solo código base. Distribución por URL. Actualización instantánea. Cero fricción de instalación (agregar a home screen).

**Re-evaluación.** Si la adopción de la PWA por los techs es < 80% por problemas de notificación push en iOS, se evalúa app nativa en v2+.

---

## ADR-004 · Email IMAP poll sobre webhook para intake

**Contexto.** Las WOs llegan por email. Necesitamos ingesta confiable.

**Decisión.** IMAP poll cada 60 segundos al buzón único `wo@systemrapid.com`.

**Alternativas consideradas.** Webhook de proveedor (SendGrid Inbound Parse, Mailgun), Microsoft Graph API (outlook), Gmail API.

**Trade-offs aceptados.**
- Latencia hasta 60s vs instantánea. Aceptable: el objetivo es < 60s de email a WO, hay margen.
- Menor información estructurada que un webhook dedicado → el LLM parser compensa.

**Beneficios.** Independiente de proveedor de email. Si SRS cambia de Gmail a Outlook a Hostinger a lo que sea, el código no cambia. Setup mínimo.

---

## ADR-005 · LLM (GPT-4o-mini) solo en M1 intake

**Contexto.** Tentación de meter IA en todos lados (copilot, resumen, recomendaciones). El v1 se enredó con Copilot Briefing + AI Learning Engine que nadie usó.

**Decisión.** LLM aislado en M1 intake de email. `AIProvider` abstracto para poder sustituir. Modelo por defecto `gpt-4o-mini` (coste marginal).

**Alternativas consideradas.** Regex puras (no soportan la plantilla narrativa de Fractalia), modelo local (coste infra + latencia mayor), LLM más caro como GPT-4 full (no justifica el coste para parsing estructurado).

**Trade-offs aceptados.**
- Dependencia de OpenAI API → mitigada por el abstract `AIProvider`, sustituible por Anthropic/Azure/local.
- Coste variable → estimado < $50/mes al volumen de WOs actuales.
- Datos enviados a proveedor externo → emails de clientes. Se revisa cumplimiento en SDD-07. No se envían contraseñas ni datos financieros.

**Beneficios.** Parser funciona con ambas plantillas (narrativo Fractalia + estructurado Claro). Nivel de confianza > 0.7 en la mayoría. Casos de baja confianza caen a `pending_manual`, no rompen.

---

## ADR-006 · Audit log en MongoDB, no en servicio dedicado

**Contexto.** Toda mutación queda registrada. Es el corazón del sistema.

**Decisión.** Colección `audit_log` en el mismo Mongo. Append-only a nivel de API (no hay endpoints de delete/update sobre esta colección).

**Alternativas consideradas.** Servicio dedicado (ej. SnowflakeDB event store), Postgres separado, write-ahead log en filesystem.

**Trade-offs aceptados.**
- Si audit_log crece mucho (> 100M entries), Mongo se ralentiza. Mitigación: sharding + TTL en entries viejas NO aplicable (no se borran); migración a timeseries collection de Mongo si llegan los números.
- Compartir cluster con datos operativos → aislamiento mental claro vía colección, pero mismo cluster.

**Beneficios.** Simplicidad. Mismo deploy. Mismo backup. Queryable desde el mismo API.

---

## ADR-007 · Sin staging para InsiteIQ

**Contexto.** Herramienta interna. Equipo pequeño. Velocidad > ceremonia.

**Decisión.** Flujo directo bleu (Mac Mini dev) → VPS 1 PROD. Sin staging.

**Alternativas consideradas.** VPS 2 como staging (ya existe, ya se usa para otros proyectos), deploy con blue/green.

**Trade-offs aceptados.**
- Riesgo de bug directo a PROD → se mitiga con feature flags por env var + pruebas locales exhaustivas antes de push.
- Sin entorno compartido para probar con clientes beta → el primer cliente beta (Fractalia/Rackel) probará sobre PROD con datos marcados como beta.

**Beneficios.** Menos infra. Menos sincronización. Flujo rápido. Igual que DroneHub y SA99.

**Re-evaluación.** Si en F3 aparece mucha regresión, se activa staging en VPS 2 sin drama.

---

## ADR-008 · SRS es último mono — no integración bidireccional con ticketing cliente

**Contexto.** Cliente usa ServiceNow, SOHO, Remedy, etc. Tentación de integrar via API.

**Decisión.** SRS NO se integra bidireccionalmente con el ticketing del cliente. Input: email. Output: email + PDF + upload a SharePoint si cliente lo pide. El cliente carga a su ServiceNow manualmente o con su propio flujo.

**Alternativas consideradas.** Integración ServiceNow vía API, middleware tipo MuleSoft, Zapier.

**Trade-offs aceptados.**
- Menos "features" visibles en demos comerciales.
- Copia-pega manual en el lado cliente (ya lo hacen hoy igual).

**Beneficios.** InsiteIQ no se vuelve rehén del sistema del cliente. Cero mantenimiento de integraciones por cliente. Principio arquitectural de "emit outward, never ingest inward". Se escala a N clientes sin código custom.

---

## ADR-009 · Plantillas del cliente como assets, no como código

**Contexto.** Cada cliente impone formato de reporte (Fractalia su estructura, Claro sus headers, Miramar sus nomenclaturas de archivo).

**Decisión.** Las plantillas se guardan como archivos (docx/xlsx/html Jinja) en `attachments` con metadata en `report_templates`. El motor de render las hidrata con `render_payload`. Los campos se mapean con `field_mapping` en el documento de la template.

**Alternativas consideradas.** Templates hardcoded por cliente en código (no escala), templating engine con DSL propio (reinventar la rueda), low-code tipo Handlebars con UI de edición (sobreingeniería v1).

**Trade-offs aceptados.**
- Subir una plantilla nueva requiere mínimo tocar `field_mapping` a mano en Mongo en v1.
- No hay UI de edición de plantillas en v1 — se sube el docx/xlsx base y se ajusta mapping en admin.

**Beneficios.** Cliente nuevo se enchufa en días: nueva plantilla + mapping + se prueba. Sin redeploy.

---

## ADR-010 · Seed mínimo viable, no masivo

**Contexto.** El v1 tenía seed de 4 entities + 16 orgs + 10 users + 19 sites + 14 WOs + etc. Eso es demo, no base útil.

**Decisión.** Seed v2 mínimo para flujo end-to-end (ver SDD-04 §20). Datos reales se ingresan por uso, no por seed.

**Alternativas consideradas.** Mantener seed masivo del v1 (inflado, falso, ruido), seed solo con tenant + 1 admin (no sirve ni para demo).

**Trade-offs aceptados.**
- Demos tempranas tendrán pocos datos.
- Tests E2E necesitan fixtures propias (no seed).

**Beneficios.** Seed es auditable. No acumula ruido. Refleja la operación real.

---

## ADR-011 · Multi-tenant en schema desde día 0, single-tenant en uso

**Contexto.** Blueprint v2 anticipa que Fractalia/Telefónica pueden comprar InsiteIQ para sí mismos ("salida al mercado" v2+).

**Decisión.** Cada documento lleva `tenant_id`. Todos los índices lo prefijan. Todos los queries filtran por él via dependency API. En v1 solo existe tenant `"srs"`.

**Alternativas consideradas.** Single-tenant puro y refactor cuando toque (coste futuro alto), deploy por tenant en infra separada (coste infra alto).

**Trade-offs aceptados.**
- Overhead mínimo por documento (campo extra).
- Tests de regresión obligatorios para asegurar que ningún query omite el filtro.

**Beneficios.** Cuando llegue la venta a Fractalia/Telefónica, no hay refactor mayor — se crea tenant nuevo y se aíslan datos. El coste de hacerlo ahora es marginal, el de no hacerlo es dramático después.

---

## ADR-012 · Ball-in-court con timer visible como pattern UX base

**Contexto.** Warehouse Miramar = 2 años para cobrar. Laly hizo 4 follow-ups persiguiendo fecha. Gruma = proyecto envejecido en la cabeza de Yunus. El patrón común: nadie ve de un vistazo quién debe mover la pelota siguiente.

**Decisión.** Cada WO, cada invoice y cada ítem de proyecto lleva `ball_in_court: { actor, since, red_threshold_days }`. El cockpit colorea en rojo cuando envejece. Es feature core, no "nice to have".

**Alternativas consideradas.** Alertas email (pierde efectividad con el tiempo), dashboards agregados (abstracto, no procesable).

**Trade-offs aceptados.**
- Obliga a disciplina: cada acción debe indicar "ahora la pelota pasa a X". Si nadie actualiza ball, el cockpit se desincroniza.
- Mitigación: cada transición de state + cada mensaje enviado actualiza ball automáticamente según la lógica del WO.

**Beneficios.** Mata el patrón más doloroso documentado.

---

## ADR-013 · Compliance por sitio bloqueante, no recordatorio

**Contexto.** Gruma Italia exigió DUVRI + Visura Camerale + certificados de formación antes de permitir acceso. Si se despacha al tech sin esto, viaje desperdiciado.

**Decisión.** `compliance_requirements_status` dentro del WO. Todos los requirements con `blocking: true` deben estar `validated` antes de poder transicionar a `in_transit`. API rechaza la transición.

**Alternativas consideradas.** Recordatorio suave al coordinador (ignorado bajo presión), checklist manual en Notion (fuera del sistema).

**Trade-offs aceptados.**
- Fricción adicional para el coordinador: tiene que subir docs y validar antes de despachar.
- Mitigación: compliance se valida a nivel de site, tech, o country una vez y se reutiliza (ejemplo: DUVRI de un tech es válido por 12 meses en Italia, no se re-sube por WO).

**Beneficios.** Cero viajes desperdiciados por docs faltantes. Evidencia centralizada para pelea comercial si el cliente pide prueba.

---

## ADR-014 · Monolito FastAPI, no microservicios

**Contexto.** Equipo pequeño. Velocidad de iteración alta en v1.

**Decisión.** Monolito FastAPI con módulos (routes/, models/, middleware/). Separación por capa, no por servicio.

**Alternativas consideradas.** Microservicios por dominio (WO, finance, intake, reports).

**Trade-offs aceptados.**
- Escalado vertical antes de horizontal → en v1 un VPS es más que suficiente.
- Si un bug tira un módulo, tira todo → mitigado con circuit breakers internos + monitoring.

**Beneficios.** Deploy simple. Debug simple. Menos complejidad de red. Transacciones locales. Si alguna parte justifica aislamiento (ej. intake por carga), se extrae después.

---

## ADR-015 · Sin staging de diseño — Identity Sprint con mock pixel-perfect

**Contexto.** Post-mortem v1: las 3 iteraciones de cockpit fallaron porque se construyó sin mock, el agente reinventó layout cada vez.

**Decisión.** Identity Sprint F1 entrega mock Figma pixel-perfect firmado antes de tocar código de UI. Designer humano (no agente) hace el mock. El agente ejecuta contra el mock.

**Alternativas consideradas.** Agente diseña + codifica directo (lo que falló en v1), wireframe low-fi y pulir sobre la marcha (ambiguo, falló también).

**Trade-offs aceptados.**
- Coste externo de designer → necesario para no repetir error.
- Tiempo adicional de F1 antes de código → menor que el tiempo de 3 iteraciones fallidas.

**Beneficios.** Blueprint de implementación visual antes de que cualquier agente abra un `.jsx`. Adherencia 1:1 al mock. Acaba la discusión de estilo cada commit.

---

**Siguiente SDD:** SDD-06 · Plan de proyecto con fases, hitos y criterios de salida.
