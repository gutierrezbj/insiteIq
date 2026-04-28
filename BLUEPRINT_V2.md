# InsiteIQ v2 — Blueprint de una sola hoja

**Fecha:** 2026-04-23
**Estado:** Fase 0 Kickoff cerrada · reemplaza Blueprint v1.1 / v1.2
**Owner:** JuanCho (JRG)
**Revisión:** v2.0.5 — aclaración de qué es "campo" en SRS (sí contamos/auditamos hardware ajeno, no lo compramos ni lo movemos) · tercer modo de operación: servicio recurrente con reporting a plantilla · caso Miramar Warehouse Audit añadido como tercer dolor documentado.

---

## Tesis

InsiteIQ es **una herramienta de operaciones de campo que aprende del cliente y se adapta a sus requerimientos**. No es un SaaS comercial. No es un producto white-label. Es el sistema operativo interno de SRS para coordinar, ejecutar, reportar y cobrar servicios de campo en cualquier vertical (IT, retail rollout, assessment, inventario/auditoría de warehouse, lo que entre).

Cada cliente tiene su plantilla, su protocolo, su forma. InsiteIQ los absorbe. No los reescribe.

**Qué es "servicios de campo" en SRS (para evitar confusiones de scope):**

- ✅ Instalar, configurar, mantener, desinstalar hardware/red en sitio del cliente (o de quien el cliente diga).
- ✅ Assessments y surveys técnicos presenciales.
- ✅ **Inventarios y auditorías físicas** de hardware ajeno (escanear, contar, validar SN/PO, reconciliar contra BBDD del cliente). Caso Claro US Warehouse Miramar: 21,263 records escaneados en 10 semanas.
- ✅ Validación y revalidación física post-evento.
- ✅ Transporte de documentación y entrega de informes formales al cliente.
- ❌ **No** compramos hardware (lo compra el cliente o su broker).
- ❌ **No** movemos/distribuimos hardware entre locaciones (logística no es SRS).
- ❌ **No** tenemos inventario propio ni stock-keeping (no somos almacén).
- ❌ **No** somos integrador que orquesta la cadena de suministro (no le decimos a Fervimax qué pedir).

---

## Criterio de "producción"

InsiteIQ está en producción cuando **Andros, Agustín, Adriana, Rackel, el NOC del cliente y el técnico de calle abren la app el lunes a las 9am y cierran Excel y WhatsApp.** Nada menos cuenta como producción. Containers corriendo con SSL en PROD no cuentan si la operación real vive en WhatsApp.

El NOC del cliente es el caso más duro de todos. Si los operadores de Fractalia/Telefónica trabajan sus tickets dentro de InsiteIQ en vez de WhatsApp, el resto cae por gravedad.

---

## Los 6 usuarios · los 6 jobs

| # | Usuario | Rol | Job del lunes 9am |
|---|---------|-----|---------------------|
| 1 | **Andros / Luis / Yunus / JuanCho** | Equipo coordinador reactivo SRS (mismo job, distribuido) | Recibir WO de Fractalia/Telefónica/Claro/etc. (mayormente por correo a `wo@systemrapid.com`), asignar técnico, seguir el hilo hasta cierre, emitir informe al cliente. Sin perder ninguna. Luis lleva Fractalia (Rackel), Andros lleva Claro (Adrian Alvarado), Yunus Londres clientes internacionales (proyectos multi-país tipo Gruma), JuanCho todo lo que haga falta. El job es el mismo: coordinar servicios de campo. Lo que cambia es el cliente. |
| 2 | **Agustín** | Lead de rollout / proyecto | 90+ sitios de McDonald's Panamá (y los que vengan). Tener la lista viva con estado por sitio. Matar el WhatsApp infinito. Incluye variantes tipo "assessment Claro Miami" (rollout con entregable-informe). |
| 3 | **Adriana** | Finance SRS | Dos vistas: qué cobramos al cliente (facturación activada por sitio instalado + recurrente), qué pagamos al proveedor (lo que hizo, cuándo, cuánto). **Triangulación AP real:** quien ordena no es siempre quien paga (caso Claro ordena, Hitss paga). Cada WO lleva cliente-directo-comercial + entidad-que-paga + centro-de-costes del cliente. Sin Excel. |
| 4 | **Rackel (y equivalentes)** | Supervisor cliente | Abrir InsiteIQ y ver en vivo dónde están sus intervenciones: sitio, técnico, estado, cuándo, alcance. Dejar de pedir razón por email. |
| 5 | **NOC / soporte cliente** | Técnico de soporte del centro de control cliente (Fractalia, Telefónica, etc.) | Trabajar SU WO día a día: abrir ticket, dar detalles técnicos del incidente, comunicarse con el tech de SRS en sitio, validar que el cierre técnico resuelve, cerrar en su lado. Es la trinchera del cliente. Hoy todo eso vive en WhatsApp con el técnico de SRS. |
| 6 | **Técnico de calle** | Field tech SRS (plantilla o sub) | En el móvil: ver qué tiene que hacer hoy, llegar al sitio, reportar lo que hace, subir fotos, dejar constancia. Hablar con el NOC del cliente desde dentro de InsiteIQ, no por WhatsApp. Matar el WhatsApp como canal de reporte. |

**Regla única de scope:** cada feature propuesta pasa un solo filtro. ¿A cuál de estos 6 sirve el lunes a las 9am? Si no sirve a ninguno, no entra.

**Nota sobre el usuario 1:** aunque el job es compartido por 4 personas (Andros, Luis, Yunus, JuanCho), se cuenta como un solo usuario lógico porque tienen la misma vista de producto, los mismos permisos, el mismo flujo. La diferencia es a qué clientes atienden, no qué hacen. Sajid queda fuera de los 6 como usuario operativo: es owner con vista read-only ejecutiva, no trabaja WOs.

**Nota sobre el par NOC ↔ Tech de calle:** este es el eje WhatsApp-killer más crítico del sistema. Hoy el 90% del tráfico operativo real entre SRS y cliente pasa por conversaciones 1:1 en WhatsApp entre un operador del NOC y un técnico en sitio. InsiteIQ tiene que absorber ese canal o no vale. El thread del WO (shared entre NOC cliente + tech SRS + coordinador SRS) es la infraestructura técnica de esto — pero la prueba ácida es: ¿el NOC de Fractalia prefiere abrir InsiteIQ antes que WhatsApp?

---

## El cockpit (feature central)

Los supervisores — tanto SRS como cliente — tienen cockpit. Ahí es donde InsiteIQ debe volarles la cabeza. No por efectos visuales, sino porque ven de un vistazo lo que hoy les toma llamadas, emails y WhatsApp.

**Cockpit SRS** (Andros / Luis / Yunus / Agustín / JuanCho):
- Qué está pasando ahora mismo en todas las intervenciones activas
- **Ball-in-court con timer visible**: quién tiene la pelota (SRS / tech / cliente) y desde cuándo. Rojo a los N días configurables por cliente. Mata el patrón Warehouse (2 años con ball invisible en cliente).
- Qué está atorado y desde cuándo, con el thread un click abajo
- Rollouts activos como lista de sitios con estado por sitio (listo / bloqueado / despachado / cerrado), no % genérico. Lección Gruma.
- Bloqueadores externos visibles por WO: requisitos regulatorios pendientes (DUVRI, Visura, permisos), hardware-no-llegó según lo que diga el cliente. Si hay bandera, el sitio no sale a despacho.
- Alertas reales (tech no llegó, sitio cerrado, cliente no responde, doc regulatorio vencido)
- Adriana ve su propia columna: cobros con ball en cliente > 30 días, pagos a proveedor por activar.

**Cockpit cliente** (Rackel y equivalentes):
- Sus intervenciones en vivo, sin ver la ropa sucia interna
- Dónde, cuándo, qué técnico, qué está haciendo, cuándo termina
- Acceso directo al informe del WO cerrado

El cockpit no es una página más. Es **la razón por la que abren la app en vez de WhatsApp.** Si el cockpit no da eso, falló. Si lo da, ganó.

El diseño visual del cockpit se define en Identity Sprint (UX/UI Fase 1 del cuaderno SRS). No se arranca sin mock pixel-perfect. Regla post-mortem v1.

---

## Dolores documentados — casos reales (evidence base)

Estos tres casos son los que justifican cada módulo de v2. Si un módulo no ayuda a prevenir uno de estos patrones, no entra.

**Caso Warehouse Miramar — cobro (Adriana), 2 años para cobrar una factura.**
Servicio ejecutado marzo 2024. Factura negociada y re-emitida intermitentemente entre marzo 2024 y abril 2026. Thread con 4 stakeholders en el lado cliente (Claro + Hitss como AP separado), cambios de contacto, cambios de formato de factura, negociación de descuento offline, silencios de meses. Hoy vive en Outlook + Excel en la cabeza de Adriana. **Patrón: cobro invisible, sin timer, sin ball-in-court, sin memoria del sistema.** El thread envejece y nadie se entera hasta que Adriana lo persigue.

**Caso Miramar Warehouse Audit — operación (Juan/Andros), servicio recurrente con reporting estricto.**
Proyecto de inventario físico para Claro US. Kickoff dic 2025, fieldwork 10 semanas, reconciliación adicional hasta abril 2026. 21,263 registros escaneados (vs. 9,000 del SOW original — pelea comercial: Arturo Pellerano defiende que el SOW era "por tiempo no por barcode", SRS defiende que el volumen triplicó lo planeado). Cliente (Laly Castro) impone reporting estricto: reporte diario con nomenclatura obligatoria `WH Audit_XXXXX mm-dd-yyyy.xlsx`, reporte semanal los viernes, upload a SharePoint cliente, headers fijos, formato de fecha `mm-dd-yyyy`, celdas salmón = revalidación física, celdas verde = intangibles, items `EO301xxxx` = revalidar todos. Gestión de accesos SharePoint a mano (Francis entra, Gonzalo sale). Visita de validación post-cierre con 4 follow-ups de Laly (23-mar → 26-mar → 1-abr → 7-abr) porque SRS no respondía. Carlos y Jose Marin vuelven al warehouse como "courtesy visit" vs "quality assurance" — pelea de scope documentada en thread. **Patrón: servicio continuo con entregables periódicos a plantilla estricta del cliente, no una visita puntual. InsiteIQ tiene que soportar reporting recurrente con formato-del-cliente, no solo cerrar WOs con informe final.**

**Caso Gruma Foods Cisco Meraki (Claro global) — Yunus/Andros, 5 meses y 40+ emails, aún sin cerrar.**
Proyecto arranca noviembre 2025, sigue vivo abril 2026. 11 sitios en 8 países. El hardware lo compra y distribuye el cliente (o su broker). SRS no compra hardware. **Pero las fechas de SRS dependen de dos cosas externas que nos afectan:** (a) que el hardware llegue al sitio, (b) que el país permita el acceso al tech con los docs regulatorios OK (Italia pide DUVRI + Visura Camerale + certificados de formación antes de dejar entrar). Cada retraso externo obliga a re-coordinar fecha con cliente y tech. **Patrón: el dolor no es gestionar la cadena de suministro, el dolor es no saber cuándo podremos despachar al tech sin quedar mal con el cliente.**

Lo que estos casos enseñan al diseño:

- **Ball-in-court con timer visible.** Cada WO tiene un único responsable actual (SRS / tech / cliente) y un contador de tiempo en esa casilla. Si un WO lleva 30 días con ball en cliente, aparece en rojo en el cockpit. Warehouse Miramar se hubiera cerrado en meses, no en años, si esto existiera.
- **Requisitos por visita.** Antes de despachar al tech a un sitio, el WO muestra el checklist de lo que el país/cliente exige: DUVRI, Visura Camerale, certificados de formación, EPP, permisos de acceso, credenciales de NOC. Sin check verde, no se despacha. Gatekeeper pre-visita, no formulario opcional. SRS no produce estos docs, pero sí valida su existencia antes de mandar al tech.
- **Bloqueadores externos visibles en el WO.** Campos opcionales para "hardware en camino (tracking X, ETA Y)" y "permisos regulatorios pendientes". No son entidades que SRS gestione, son banderas que el coordinador marca cuando el cliente le dice "el equipo llega el 15". Mientras haya banderas rojas, el WO no se despacha. Cuando se cumplen, el WO queda listo.
- **Proyecto = sitios con estado propio.** Un "proyecto" en InsiteIQ es una lista de sitios donde cada sitio tiene su WO, su compliance checklist, sus bloqueadores externos y su fecha. El cockpit del proyecto muestra los sitios por estado (listo / bloqueado / despachado / cerrado), no una barra de % genérica. Eso ya mata Gruma operacionalmente sin que SRS tenga que entrar al negocio de brokers.
- **Servicio recurrente con reporting a plantilla del cliente.** Tercer modo de operación además de reactivo (WO única) y rollout (proyecto multi-sitio): engagement continuo con entregable periódico. Daily y/o weekly report con nomenclatura, headers y formato-de-fecha definidos por el cliente. Upload al sistema del cliente (SharePoint/email/portal). InsiteIQ emite el archivo en el formato del cliente, sin copia-pega, sin Excel en la cabeza de Andros. Lección Miramar.
- **Visita de validación post-cierre.** Existe como tipo de WO ligera, distinto del servicio principal: "volver al sitio a revalidar N items que el cliente objetó". Es donde hoy se pelea si cae en SOW o fuera. InsiteIQ lo captura como subtipo con referencia al WO/proyecto madre y con etiqueta comercial (courtesy / QA / scope extra).

---

## Canales de entrada de WO (cómo nace una intervención)

La realidad operativa, no la ideal:

- **Correo electrónico — canal primario.** El 80%+ de las WOs llegan así. Hoy ya existe `wo@systemrapid.com` como buzón recolector. Cada cliente con su plantilla propia.
- **SOHO — sistema interno SRS.** Histórico, pre-InsiteIQ. v2 lo absorbe o lo reemplaza, no se integra con él.
- **ServiceNow y equivalentes — ticketing del cliente.** SRS **no se integra** con ServiceNow. SRS es el último eslabón de la cadena. El cliente abre el ticket en su ServiceNow, de ahí sale un email, ese email llega a `wo@systemrapid.com`. SRS ejecuta y devuelve output (informe, email de cierre) que el cliente adjunta a su ServiceNow. Principio: **no le entramos al sistema del cliente, absorbemos lo que él nos empuja.**
- **(Futuro, no ahora)** Webhook / API push desde el ticketing del cliente. Solo si algún cliente grande lo ofrece.

**Cadena de intermediación — SRS es el último mono.** Casi nunca hablamos con el usuario final. Ejemplo Fractalia: Purificación García (usuario) → Telefónica Tech → Fractalia → SRS → técnico local. Ejemplo Claro: Arcos Dorados (usuario) → Claro Enterprise → SRS → técnico local.

Consecuencias de diseño para v1 core:

- Cada WO lleva **hasta 3 referencias de cliente**: cliente-directo-comercial (quien nos escribe y nos paga, o triangula el pago — ej. Fractalia, Claro, Hitss), cliente-intermedio (si existe, ej. Telefónica Tech entre Fractalia y el usuario), cliente-final/sitio (dueño físico del sitio, ej. Arcos Dorados Panamá).
- El informe de cierre se entrega al directo pero puede necesitar formato apto para adjuntar al ticketing del intermedio.
- El pago se dispara contra la entidad-que-paga, que puede no ser el cliente directo (caso Claro ordena / Hitss factura).

**Capas que SRS NO gestiona (ni como core v1 ni más adelante como feature operativa).** Hardware brokers (Fervimax, Ingram Micro, CTC, Provis, Triforce), distribuidores, subcontratistas locales (Adel AUS, Marco Fontolan IT, Nezih Oktay TR) cuando los use un cliente. No entramos al negocio de comprar, mover o inventariar hardware. Cuando afectan una fecha, entran al WO como **bloqueador externo** (bandera + texto libre + ETA), no como entidad del sistema.

**Nota sobre "salida al mercado".** Si algún día Fractalia o Telefónica compran InsiteIQ para usarlo ellos mismos (modelo empresarial tailored, no SaaS abierto), la arquitectura del cliente tiene margen: ya está separada por espacios y por roles, con tenant_id desde el día 0. En ese escenario, el cliente comprador se convierte en el "SRS" de su propia cadena y podrá activar capas más profundas (gestión de subs, de hardware, etc.) si las necesita. **Eso es v2+ de negocio, no v1 de producto.** Para v1 solo importa que el schema no lo impida.

**Dos plantillas de email reales (aprendizaje 2026-04-23):**

- **Fractalia / Telefónica — thread narrativo.** Emails conversacionales largos. Coordinación de fecha/hora se negocia en reply chain ("confirmamos jueves 23/04 a las 23:30", "recargo 20% nocturno ok", "enviado a cliente y os digo algo asap"). Referencia CS0540150 + USC 882839 en subject. Datos operativos embebidos en texto libre. Un thread puede durar semanas hasta que se ejecuta la visita.
- **Claro / Arcos Dorados — tabla estructurada.** Un solo email con tabla formal. FM number, NSR codes, PO/BPA, direcciones con lat/long, scope of work en bullets, equipos con serial numbers (Meraki MX/MS/MR), tools required, contactos. Parseable con regex o LLM ligero sin esfuerzo.

InsiteIQ tiene que tolerar ambos mundos en el mismo buzón.

**Módulo de intake — mínimo viable:**

1. Buzón único (`wo@systemrapid.com` o `intake@insiteiq.systemrapid.io`). Forward manual desde Outlook cuenta como entrada.
2. InsiteIQ clasifica el email entrante:
   - **Nuevo** → se crea WO en draft. Parser LLM ligero (GPT-4o-mini o similar) extrae campos comunes: cliente-directo (por sender), sitio, país, fecha/hora solicitada, referencia, scope resumen, contacto en sitio, equipos si vienen listados.
   - **Seguimiento de WO existente** (subject `Re:` + match de referencia tipo `CS0540150`, `FM 20502`, `USC 882839`) → se añade como mensaje al thread del WO que ya existe. No crea WO nueva.
3. Andros/Luis abre el draft, completa los campos que el parser no pilló, asigna técnico, confirma. **Tiempo objetivo: < 60 segundos por WO.**
4. Thread queda vivo en el WO. Cada reply al mismo subject entra como mensaje en el thread shared. El email que SRS responde desde dentro de InsiteIQ sale con el subject correcto y los originales en CC para no romper continuidad con el cliente.

Sin este módulo, Andros vuelve a Outlook el lunes y estamos muertos igual que en v1. El intake es el gatekeeper de InsiteIQ.

---

## Adaptabilidad al cliente

El sistema aprende del cliente y se adapta. Eso significa:
- Cada cliente puede tener su plantilla de informe (Fractalia ya tiene un formato, Telefónica otro, Claro otro).
- Cada cliente puede tener sus estados propios, su terminología, sus campos obligatorios.
- El motor de InsiteIQ es genérico. La capa visible al cliente usa su plantilla.
- No reescribimos al cliente. El cliente configura InsiteIQ, no al revés.

En práctica: **un cliente nuevo se enchufa en días, no en meses.**

---

## Qué NO es InsiteIQ (blacklist explícita)

Esto se escribe para que cuando aparezca la tentación de añadirlo, haya una razón clara de rechazarlo.

- **No es SaaS comercial.** No se vende como producto. Es interno SRS.
- **No es Ghost Tech / white-label multi-cliente.** Un solo tenant: SRS.
- **No tiene Shield catalog / SLA snapshot / Service Agreements con niveles.** Si hay SLA, se escribe como texto en el WO y punto.
- **No tiene Horizonte 2 financiero.** Ni three-way match, ni P&L 3 márgenes, ni proxy-adjusted, ni recurring billing engine. Lo de Adriana son dos tablas: cobros y pagos.
- **No tiene 6 modos operativos con arquitectura propia.** Hay 3 modos de uso operacional (reactivo, rollout, servicio recurrente con reporting) y se comparten esqueleto.
- **No tiene 11 domains numerados ni 8 principios numerados.** Tiene 6 usuarios, 6 jobs, 4 principios.
- **No tiene Asset v1.1 con AssetEvent append-only Domain 11.** Si un equipo entra al sitio, se registra. Si sale, se registra. Sin ontología.
- **No tiene Copilot Briefing con AI enrichment LLM como feature de Fase 1.** El tech abre su WO y lee lo que hay. Si más adelante sirve LLM, se evalúa. Hoy no.
- **No tiene vibe Palantir / consulting-led GTM.** Es operación seria que aprende del cliente. No teatro.
- **No tiene 22 pasitos.** Tiene módulos que cierran pilares completos.

---

## Principios operativos (4, no 8)

1. **La ropa se lava en casa.** Números internos, desacuerdos comerciales, threads internos, costes, tech GPS, AI internals → opacos al cliente. Operación (tech, estado, ETA, alcance, informe) → transparente al cliente. (Principio #1 refinado del v1, simplificado.)
2. **La plantilla del cliente siempre gana.** El informe, los estados, los campos obligatorios los pone el cliente. InsiteIQ se adapta. Nunca al revés.
3. **Nada se edita ni se borra.** Audit log append-only de toda mutación. El corazón de InsiteIQ es la trazabilidad. (Principio #7 del v1, único que queda numerado porque es regla técnica dura.)
4. **Caos-tolerant.** La realidad no es ordenada. Fechas se mueven, techs cambian, hardware no llega, docs regulatorios faltan, clientes no responden semanas. InsiteIQ tiene que absorber el caos sin perder el thread: cada reschedule queda registrado, cada cambio de tech queda justificado, cada doc pendiente bloquea el despacho pero no pierde el WO, cada silencio de cliente dispara un timer visible. El sistema no pide que la realidad se ordene para él — se ordena él alrededor de la realidad. (Lección Gruma + Warehouse.)

---

## Arquitectura de alto nivel (3 espacios, 2 roles dentro del espacio cliente)

- **Espacio SRS** (web desktop) — Andros, Agustín, Adriana, JuanCho. Cockpit + intervenciones + rollouts + finance simple + admin.
- **Espacio Cliente** (web desktop) — dos roles diferenciados con RBAC:
  - *Supervisor* (Rackel y equivalentes): cockpit cliente + informes de cierre. Vista estratégica. Sin ropa sucia.
  - *NOC / soporte cliente*: cola de tickets que le tocan, WO detail con thread shared al tech de SRS, validación de cierre técnico. Vista operativa día a día. Sin ropa sucia.
- **Espacio Técnico** (PWA mobile) — Agustín-tech, Arlindo, plantilla y subs. Briefing del día + WO + capture + foto + handshake + thread con NOC cliente. Offline capable.

RBAC por espacio + sub-rol en cliente. JWT con membership. Multi-tenant en schema pero de uso único (SRS). Nada más.

---

## Qué queda del v1 (data model como referencia, no como copia)

El v1 se congela. Repo queda como `insiteiq-v1-archive`. Containers apagados. Dominio se libera para v2.

Lo que inspira (sin copiar-pegar código): WorkOrder state machine, Audit log middleware, JWT + RBAC 3 espacios, Intervention Report como output, Threads shared/internal, seed de usuarios reales.

Lo que muere completo: Service Agreements, Shield, Budget Approvals con exchanges, Vendor Invoice AP, three-way match, P&L 3 márgenes, Projects BUMM, ClusterGroups, OperationalAlerts con 8 kinds, Equipment plan reconciliation, AI Learning Engine Fase 1 y 2, Copilot Briefing Domain 10.5, Asset/AssetEvent Domain 11, quick-access chips demo con seed pwd, los 22+ pasitos.

---

## Siguiente paso inmediato

1. JuanCho lee esta hoja. Firma GO o pide ajustes.
2. Si GO: arrancamos SDD-01 (Problema) y SDD-02 (Alcance) en siguiente sesión. Salen en 30 min porque ya está todo dicho aquí.
3. En paralelo: comando para congelar v1 (repo rename + `docker compose down` en VPS 1 + dump Mongo a backup).
4. Cuando SDD esté cerrado (8 secciones), arranca Identity Sprint del cockpit. Con mock primero. Skill `frontend-design` se invoca ahí, no antes.

---

## GO / NO-GO

**GO del owner (JuanCho):** ✅ APROBADO — Juan Ramón Gutiérrez (JRG)

**Fecha:** 2026-04-24

**Nota:** este blueprint sustituye completamente Blueprint v1.1 y lo que estaba quedando de v1.2. A partir de la firma, Blueprint v1.x es histórico y no se consulta para decisiones de scope. Solo esta hoja manda.
