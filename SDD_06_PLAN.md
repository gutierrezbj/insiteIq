# SDD-06 · InsiteIQ v2 — Plan de proyecto

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Depende de:** `SDD_02_ALCANCE.md`, `SDD_05_ADRS.md`

Plan de ejecución. Fechas indicativas, no compromiso rígido — el owner (JuanCho) alterna con otros proyectos SRS. Lo que sí es inmutable es el **orden lógico** y los **gates de salida**.

---

## 1. Principio rector del plan

Una fase no avanza hasta que su gate de salida esté verde. No importa cuánto se tarde. Este principio no aplicado en v1 es lo que trajo los 22 pasitos sin producto.

Cada fase cierra **un escenario end-to-end observable**, no un conjunto de features sueltas.

---

## 2. Fases (F0 → F7)

### F0 · SDDs 01–08 completos
**Objetivo.** Protocolo SRS-SDD cerrado. Cero código escrito durante esta fase.

**Entregables.**
- SDD-01 Problema (✅ cerrado 2026-04-24)
- SDD-02 Alcance (✅ cerrado 2026-04-24)
- SDD-03 Arquitectura (✅ cerrado 2026-04-24)
- SDD-04 Modelo de datos (✅ cerrado 2026-04-24)
- SDD-05 ADRs (✅ cerrado 2026-04-24)
- SDD-06 Plan (este documento, en progreso)
- SDD-07 Operación (pendiente)
- SDD-08 Riesgos (pendiente)

**Gate de salida.** Los 8 documentos escritos, leídos por owner, sin ajustes pendientes materiales.

**Estimación.** 1 sesión más para cerrar SDD-07 y SDD-08. Luego lectura owner.

---

### F1 · Identity Sprint (UX/UI Fase 1)
**Objetivo.** Mock pixel-perfect Figma de los cockpits principales + PWA tech + páginas core. Sin esto no arranca código.

**Entregables.**
- Foundation tokens InsiteIQ v2 (colores, tipografía, motion, sombras, spacing, radius) — deriva del SRS Nucleus v2.0 pero se cuestiona cada token contra la tesis "cockpit de operaciones de campo que aprende del cliente".
- Mock cockpit SRS (vista coordinador).
- Mock cockpit Cliente Supervisor.
- Mock cockpit Cliente NOC.
- Mock PWA Tech (briefing + WO detail + capture + thread).
- Mock WO detail completo (todos los estados + ball-in-court + compliance + bloqueadores + thread).
- Mock pantalla de proyecto (rollout + recurring reporting).
- Mock pantalla de finance (cobros + pagos con triangulación).
- Auditoría de distintividad SRS: la app no se parece a ServiceNow, Salesforce FSL, Telefonica admin dashboard ni otro FSM genérico.

**Responsable.** Designer humano externo + JuanCho como owner.

**Gate de salida.** Mocks firmados por owner. Export Figma entregable al agente codificador con assets + specs.

**Estimación.** 2–3 semanas (depende de disponibilidad designer). Es la fase más larga de prep y la más decisiva. No se escatima.

---

### F2 · Spike de intake (M1 standalone)
**Objetivo.** Probar que un email real de Fractalia y uno de Claro se convierten en WO draft parseada en < 60s. Sin UI completa, endpoint + script.

**Entregables.**
- Conexión IMAP al buzón `wo@systemrapid.com` (o buzón de pruebas equivalente).
- `EmailIngestor` + `Classifier` + `LLMParser` (abstract `AIProvider` con implementación OpenAI).
- Dos casos reales procesados: (1) email narrativo Fractalia (CS0540150), (2) email estructurado Claro (FM + NSR codes).
- Métrica: tiempo promedio email → WO draft creada.
- `email_templates_by_client` seed con hints para Fractalia y Claro.

**Gate de salida.** Los dos emails reales se procesan correctamente. WO draft generado con scope, sitio, fecha, referencia, contacto, equipos cuando vienen. Tiempo < 60s. Caso de baja confianza cae a `pending_manual`.

**Estimación.** 1–2 semanas. Parte valiosa: validar early que el parser funciona en el dolor real, antes de construir el resto.

---

### F3 · Core WO + Thread + Tech PWA (flujo end-to-end reactivo)
**Objetivo.** Un WO reactivo se recibe, se asigna, se briefea al tech, el tech lo ejecuta, el NOC cliente coordina en thread, se cierra con handshake. **Todo dentro de InsiteIQ, cero WhatsApp.**

**Entregables M2 + M3 + M5.**
- Backend: WO CRUD + state machine + ball-in-court + transiciones auditadas.
- Backend: threads shared/internal + messages + email-to-thread via reply al mismo subject.
- Frontend SRS: lista de WOs + detail + asignar tech + acciones de state.
- PWA Tech: login + briefing del día + WO detail + capture foto + thread chat.
- PWA cliente NOC: cola de tickets + WO detail + thread chat + validar cierre.
- Audit log middleware activo desde día 1.

**Gate de salida.** **Test ácido:** un WO real de Fractalia ejecutado por un tech real sin usar WhatsApp. Rackel (o equivalente) y el NOC de Fractalia (o usuario beta equivalente) coordinan dentro de InsiteIQ. Tiempo total: una sesión operativa normal.

**Estimación.** 3–4 semanas. Es el núcleo del producto.

---

### F4 · Cockpit + Report (visibilidad + output al cliente)
**Objetivo.** Los supervisores abren InsiteIQ antes que Outlook porque ven lo que les toca.

**Entregables M6 + M8.**
- Cockpit SRS completo: intervenciones activas + ball-in-court rojo + alertas + columna Adriana.
- Cockpit Cliente Supervisor: intervenciones en vivo + acceso a informes cerrados.
- `intervention_reports`: motor de render con plantillas del cliente (al menos 2: Fractalia + Claro).
- 3 canales de emisión: PDF adjunto por email, email rico, upload asistido a SharePoint.
- `report_templates` editables a nivel Admin (subir docx/xlsx, definir mapping).

**Gate de salida.** Rackel (Fractalia) abre InsiteIQ cada mañana para ver estado. Un WO cerrado genera informe formal en plantilla Fractalia y se envía desde InsiteIQ.

**Estimación.** 2–3 semanas.

---

### F5 · Proyecto + Compliance (rollouts y servicio recurrente)
**Objetivo.** Gruma y Miramar Audit se gestionan en InsiteIQ, no en Excel ni SharePoint en la cabeza de Yunus.

**Entregables M4 + M7.**
- `projects` CRUD con tipo `rollout` y `recurring_reporting`.
- Cockpit de proyecto: sitios por estado + bloqueadores externos + fecha objetivo.
- `compliance_requirements` CRUD + `compliance_submissions` + bloqueo de transición si no validado.
- Motor de reporting recurrente: genera archivo con nomenclatura exacta del cliente, guarda en `recurring_reports`, se ofrece upload asistido.
- Caso piloto: migrar Gruma a proyecto en InsiteIQ. Caso piloto: migrar Miramar Audit diario a InsiteIQ.

**Gate de salida.** Yunus coordina Gruma sin Excel. Andros emite el reporte diario de Miramar desde InsiteIQ con la plantilla y nomenclatura que exige Laly.

**Estimación.** 3 semanas.

---

### F6 · Finance + Admin + Audit visible (Adriana y JuanCho)
**Objetivo.** Adriana cierra cobros en InsiteIQ. JuanCho audita sin abrir Mongo.

**Entregables M9 + M10 + M11.**
- `invoices` + `payments_to_providers` con triggers automáticos desde WO cerrada.
- Triangulación AP: cliente-directo + entidad-que-paga + centro de costes.
- Ball-in-court en invoices (mata el patrón Warehouse).
- Admin: users, orgs, audit log navegable con filtros.
- Compliance report: desde audit log, exporte por WO o por cliente para pelea comercial.

**Gate de salida.** Adriana dispara cobros desde InsiteIQ sin Excel. JuanCho abre una ventana y ve quién hizo qué cuándo sin salir de la app.

**Estimación.** 2 semanas.

---

### F7 · Hardening + migración real
**Objetivo.** Apagar WhatsApp y Excel de verdad. Migración de operación real.

**Entregables.**
- QA exhaustivo de flujos.
- Carga de datos reales (orgs, sites, users, templates) desde lo que hay en Outlook/Excel/SharePoint.
- Pruebas con 3 clientes reales simultáneos: Fractalia reactivo + Claro Miramar recurrente + Claro Gruma rollout.
- Docs de onboarding por rol (SRS coord, Adriana, tech, cliente supervisor, cliente NOC).
- Backups verificados (restore drill).
- Monitoring + healthcheck + alertas por Slack/email si API cae.
- Plan de corte: fecha X, WhatsApp se apaga como canal oficial, InsiteIQ es el único.

**Gate de salida.** **El criterio de producción del Blueprint v2.** Los 6 usuarios abren la app el lunes 9am y cierran Excel y WhatsApp. Mantenido durante 2 semanas seguidas.

**Estimación.** 2–3 semanas.

---

## 3. Congelación del v1 (acción paralela, no prerequisito de F0)

Se ejecuta cuando JuanCho dé luz verde operativa. No bloquea la escritura de SDDs ni F1.

Pasos:
1. Dump MongoDB `insiteiq` en VPS 1 → backup offline.
2. `docker compose down` de contenedores v1 (frontend + api). Dejar Mongo + Redis del v1 apagados también tras backup.
3. Renombrar repo GitHub `gutierrezbj/insiteIq` → `insiteiq-v1-archive`.
4. Liberar `/opt/apps/insiteiq/` en VPS 1. Crear nuevo directorio `/opt/apps/insiteiq-v2/` vacío para cuando F3 despliegue.
5. Dominio `insiteiq.systemrapid.io` apunta a landing "v2 en construcción" mientras se desarrolla. Reutilizado por v2 cuando F3 despliegue.
6. Registrar v2 en SA99 InfraService (puertos offset +110 se mantienen).
7. Añadir `insiteiq-v2` containers a `healthcheck.sh` SRS.

**Gate.** OK operativo de owner.

---

## 4. Dependencias externas críticas (orden de consecución)

| Dependencia | Cuándo se necesita | Quién la consigue |
|---|---|---|
| Designer humano para Identity Sprint | F1 | JuanCho |
| Plantillas oficiales de informe por cliente | F4 (al menos Fractalia + Claro) | JuanCho / Andros (pedir al cliente) |
| Beta-testers cliente: Rackel (Fractalia) + 1 operador NOC | F3 gate | JuanCho |
| Beta-testers tech: Agustín plantilla + Arlindo sub | F3 gate | JuanCho / Andros |
| Credenciales buzón `wo@systemrapid.com` (SMTP + IMAP) | F2 | JuanCho |
| Cuenta OpenAI API + key | F2 | JuanCho (SRS ya tiene cuenta) |
| Acceso SharePoint de cliente Claro (Miramar) | F5 piloto | Andros / Laly Castro |

---

## 5. Equipo de trabajo

| Rol | Persona | Dedicación |
|---|---|---|
| Product Owner | JuanCho | Decisión scope + review de cada fase |
| Agent coding + arquitectura | Claude (Navegante) via Cowork | Por sesión, según disponibilidad JuanCho |
| Diseñador UI humano | Externo a contratar | F1 + consultas F2+ |
| Validadores operativos | Andros, Adriana, Agustín, Luis, Yunus | Beta-testing asíncrono por fase |
| Validadores cliente | Rackel (Fractalia), operador NOC beta | F3 gate onwards |
| Validadores tech | Agustín (plantilla), Arlindo (sub) | F3 gate onwards |

---

## 6. Ritmo de trabajo

- Sesiones de coding con agente: bloques de 2–4 horas con scope acotado (ej. "cerrar M2 state machine + audit log").
- Sesiones estratégicas: revisión fin-de-fase con owner (gate review). Cambios de scope se vuelven ADRs en SDD-05.
- Entre sesiones: owner valida con equipo operativo, reporta bloqueadores o señales. Equipo operativo no tiene que estar disponible en cada sesión.
- Commits y deploy: cada sesión produce algo probado en PROD (herramienta interna, sin staging). Rollback por git revert + compose.

---

## 7. Qué NO está en el plan (explícito)

- Salida comercial a Fractalia/Telefónica. Eso es v2+ de negocio, no de producto.
- Internacionalización multi-idioma de UI. Hoy es español + inglés donde aplique. i18n formal más adelante.
- App nativa iOS/Android. PWA suficiente.
- Integraciones ServiceNow/Remedy/SOHO. Principio: SRS es último mono.
- Migración completa histórica del v1. Solo se migra seed mínimo + templates + orgs/sites/users que se siguen usando.
- Certificaciones compliance externas (SOC2, ISO). Internas primero.

---

## 8. Señales de que el plan se está torciendo (red flags)

- **Una fase se extiende > 50% sobre estimación sin gate claro.** Significa scope escondido. Parar y revisar.
- **Se añade feature no documentada en Blueprint v2.** Parar, evaluar si justifica ADR nuevo o se rechaza.
- **Agente propone pasitos pequeños sin cerrar escenario end-to-end.** Retomar principio "fase cierra escenario observable".
- **Owner no tiene bandwidth para review de gate durante > 2 semanas.** Pausa formal, no empuje con dudas.
- **Beta-testers reales no disponibles cuando toca gate de F3.** Bloqueo. Sin ellos no se puede validar test ácido.

---

**Siguiente SDD:** SDD-07 · Operación y escalabilidad (deploy, backup, monitoring, escalado).
