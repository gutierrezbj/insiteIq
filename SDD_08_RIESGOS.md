# SDD-08 · InsiteIQ v2 — Riesgos y plan de mitigación

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Depende de:** todos los SDD previos

Qué puede matar v2 y cómo lo detectamos antes de que pase. No es checklist de ISO — es la lista real de cosas que ya vimos fallar en v1 o que son frágiles por estructura.

---

## 1. Taxonomía de riesgos

Cuatro familias, ordenadas por probabilidad × impacto (alto→bajo):

1. **Producto / adopción** — que nadie use la herramienta.
2. **Técnicos** — que algo del stack falle o no escale.
3. **Operacionales** — que el equipo/infra no aguante.
4. **Comerciales / datos** — que el cliente cambie las reglas o se filtre algo que no debe.

Riesgos de seguridad profunda (pentesting, compliance GDPR formal, SOC2) **no aplican en v1 interno** y se retoman cuando haya "salida al mercado" (venta a Fractalia/Telefónica). Ver ADR-015 sobre alcance.

---

## 2. Riesgos de producto / adopción

### R-P1 · Los usuarios no abandonan Excel/WhatsApp el lunes 9am

**Probabilidad:** Alta (ya pasó en v1 a su manera — el coordinador seguía operando fuera del sistema).
**Impacto:** Crítico. Si no se cumple el criterio de éxito de SDD-02 (6 usuarios, lunes 9am, Excel/WhatsApp cerrados), el proyecto falla igual que v1.

**Señales tempranas:**
- Beta-testers (Andros, Adriana, Agustín, Rackel) siguen pegando capturas de WhatsApp en el thread de InsiteIQ.
- Rackel pide "oye y esto lo puedes pasar también por correo" después de haber recibido el report por el app.
- Andros mantiene su Excel paralelo >2 semanas después del F3 go-live.

**Mitigación:**
- F3 ácid test no es opcional: una WO real de Fractalia se cierra sin una sola línea de WhatsApp entre Agustín y NOC. Si falla, se bloquea F4 hasta arreglarlo.
- Cada viernes durante F3-F4 hacer retro de 30 min con los 6 usuarios. Lo que digan va a un log `memory/adoption_friction.md`.
- Owner (JuanCho) usa el sistema en modo NOC él mismo 1 semana antes del go-live real. Si duele, no sale.

**Plan B si falla el ácid test:** no escalar a F4. Volver a capturar fricción, fixear M3 (Thread NOC↔Tech) y M2 (PWA Tech) hasta que el ácid test pase. Vale más retrasar 3 semanas que repetir v1.

---

### R-P2 · El cockpit operativo vuelve a fallar el "wow"

**Probabilidad:** Media-alta. V1 falló 3 veces en esto (ver `CLAUDE.md` § Intentos de cockpit operativo).
**Impacto:** Alto. Sin cockpit que funcione, supervisor (Andros) no ve valor sobre su Excel actual.

**Señales tempranas:**
- Identity Sprint (F1) no produce mock pixel-perfect del cockpit, o el mock no incluye resolución de: cómo se ve una operación con 20 WOs simultáneas, cómo se ve el ball-in-court con timer, cómo se ve el mapa con sites lejanos.
- En la implementación F4, el agente LLM empieza a "reinventar" layouts en cada sprint.

**Mitigación:**
- ADR-015 de SDD-05 lo bloquea por diseño: F4 no arranca sin mock aprobado. Sin mock, no hay cockpit.
- El mock se prueba con Andros y Rackel en F1 antes de escribir una línea de código. Click-test sobre Figma.
- Durante F4, el agente sólo implementa el mock. Cualquier decisión que no esté en el mock requiere ADR adicional o vuelve a Figma.
- Si el mock no se aprueba en F1 a los 3 intentos, se evalúa si el diseñador es el correcto o si el alcance del cockpit está sobre-especificado.

---

### R-P3 · Requisitos compliance bloquean ejecución real y los usuarios empiezan a saltárselos

**Probabilidad:** Media. Pasó en el caso Miramar: el tech llegó sin pulsera antiestática porque nadie chequeó el paquete. Si ponemos gate duro y el tech no lo cumple, el coordinador va a empezar a marcar compliance_met=true sin evidencia.
**Impacto:** Medio-alto. Compliance bypass degrada el modelo de visibilidad, y el reporte al cliente deja de ser defendible.

**Señales tempranas:**
- Tasa de `compliance_bypass_reason` poblada > 10% de WOs en un mes.
- Fotos de compliance borrosas o genéricas (misma pulsera antiestática en 5 visitas de 5 techs distintos).
- NOC cliente reporta que el tech llegó sin un requisito que el reporte decía cumplido.

**Mitigación:**
- El gate es bloqueante en backend (ADR-013), no en UI. No se puede "apagar" desde frontend.
- Si un tech tiene que usar `bypass`, se loggea con razón obligatoria y va a un panel de revisión de Andros.
- Revisión manual mensual por Andros del sample de compliance_photos. Si detecta patrones sospechosos, se eleva a Luis/Yunus.
- Los templates de requisitos (DUVRI Italia, Visura Camerale, etc.) son revisados por Yunus/Luis cada trimestre. Si algo no aplica, se elimina — no se fuerza a los techs a cumplir cosas fake.

---

### R-P4 · El cliente percibe InsiteIQ como "ruido extra" y no como valor

**Probabilidad:** Baja-media (Fractalia ya usa varios sistemas y Rackel opera en el suyo).
**Impacto:** Medio. Si Rackel no entra al espacio Cliente, perdemos la diferenciación vs v1 (emit outward).

**Señales tempranas:**
- Rackel no abre el link del report en el app y pide siempre el PDF por correo.
- El NOC cliente no entra al thread operativo y sigue mandando WhatsApp a Andros.
- Frecuencia de login de Rackel < 1/semana tras 1 mes de operación.

**Mitigación:**
- El espacio Cliente es minimalista y no requiere entrenamiento — si Rackel necesita más de 5 minutos para entender qué pasa con su WO, fallamos.
- Report sigue llegando por email con link al espacio (no forzamos login). El link es el gancho, no el gate.
- Yunus es el champion con Fractalia. Si en 1 mes Rackel no entra, Yunus hace demo personal.

---

## 3. Riesgos técnicos

### R-T1 · Dependencia OpenAI (LLM intake M1)

**Probabilidad:** Media (outages de OpenAI son reales y ocasionales; rate limits también).
**Impacto:** Medio-alto. Si el parser LLM cae, los emails no se procesan y el objetivo <60s falla. Pero los emails no se pierden — se acumulan en la cola.

**Señales tempranas:**
- `llm_calls` con `status=error` > 5% en 1h.
- Tiempo medio de procesamiento email→WO > 5min (objetivo: 60s).
- Costos OpenAI duplicándose sin razón de volumen.

**Mitigación:**
- ADR-005: LLM sólo en M1. Si M1 cae, el resto del sistema sigue vivo.
- Fallback manual: si un email no parsea, cae a cola "intake_manual_review" y Andros lo captura a mano en 5 min. No bloquea la operación.
- Circuit breaker en el worker de intake: si 3 llamadas consecutivas fallan, pausa 5 min antes de reintentar. Logs a `audit_log` y alerta a owner.
- Alternativa evaluable en F3: si OpenAI falla >2 veces en un mes, considerar Anthropic Claude como segundo proveedor detrás de `AIProvider` abstract (ya pensado en v1 Y-c).

---

### R-T2 · IMAP poll se cae o se desincroniza

**Probabilidad:** Media (IMAP es viejo y los providers a veces rotan credenciales / TLS / etc).
**Impacto:** Alto. Sin intake, la entrada principal al sistema desaparece.

**Señales tempranas:**
- Worker IMAP no tiene log en `email_intake_log` en >10 min durante horario hábil.
- Errores de autenticación IMAP en logs del worker.
- Inbox de `ops@systemrapid.com` crece sin que se procesen.

**Mitigación:**
- Healthcheck dedicado al worker IMAP en `healthcheck.sh` (SA99). Si el worker lleva >15 min sin procesar, alerta a Slack/WhatsApp del owner.
- Cuenta IMAP dedicada (`ops@systemrapid.com`) con credenciales App Password — no password humano que alguien pueda cambiar.
- Ruta alternativa: formulario manual en espacio SRS (`/intake/manual`) para crear WO sin email. Siempre disponible.
- Runbook en `/docs/runbooks/imap_down.md` con pasos de recuperación (generar app password, reiniciar worker, replay últimas 24h de inbox).

---

### R-T3 · Mongo crece sin control (audit_log + attachments_meta)

**Probabilidad:** Media a mediano plazo (6-12 meses). Cada WO genera decenas de entries de audit_log + fotos.
**Impacto:** Medio. Degrada performance de queries, infla backups, llena disco VPS.

**Señales tempranas:**
- `audit_log` > 5M docs.
- Queries > 500ms en el endpoint `/api/work_orders/:id` (que carga state_history denormalizado).
- Disco VPS > 70% lleno.

**Mitigación:**
- SDD-07 § 8 ya define acciones: sharding por tenant_id cuando >2 tenants reales, cold storage de audit_log > 2 años a archivo comprimido.
- `uploads/` en disco, no en Mongo. Mongo sólo guarda `attachments_meta`. Esto ya baja 10x el tamaño de la DB.
- Índices estrictos en SDD-04. Queries sin índice se rechazan con `notablescan` en PROD.
- Monitoreo: `mongostat` exportado a SA99 cada 5 min. Alerta si disco > 80%.

---

### R-T4 · VPS 1 único punto de fallo (SPOF)

**Probabilidad:** Baja-media (Hostinger ha tenido outages puntuales).
**Impacto:** Alto. Toda la herramienta cae. No hay failover.

**Señales tempranas:**
- Healthcheck SA99 detecta VPS 1 down.
- Tailscale reporta nodo offline.

**Mitigación:**
- ADR-007: no hay staging, pero sí backup diario a SA99 (Mac Mini M4 Pro) vía rsync. Si VPS 1 muere, en 4h se puede levantar v2 en VPS 2 o en SA96 con el último backup.
- Runbook en `/docs/runbooks/disaster_recovery.md` con pasos (provisionar VPS 2, restaurar Mongo dump, apuntar DNS, validar smoke test).
- **No se promete SLA.** Herramienta interna. Si cae 2h un sábado, no es crítico. Si cae 8h un lunes, sí.
- A mediano plazo (post-F7): evaluar multi-VPS activo/pasivo si el uso crece y la tolerancia baja.

---

### R-T5 · PWA iOS tiene limitaciones (push notifications, background sync)

**Probabilidad:** Alta (es sabido, no es sorpresa).
**Impacto:** Medio. El tech iOS no recibe push inmediato; depende de abrir el app.

**Señales tempranas:**
- Techs iOS reportan que se enteran tarde de asignaciones.
- Latencia promedio asignación→acknowledgment > 15 min en techs iOS vs <5 min en Android.

**Mitigación:**
- ADR-003 lo asume: PWA con degradación conocida en iOS. No se vende push inmediato en iOS.
- Fallback: notificación vía WhatsApp Business / SMS al tech cuando se asigna WO. No reemplaza el app, lo complementa.
- Si la fricción es crítica (>20% techs iOS), evaluar en F7 wrapper nativo con Capacitor.

---

### R-T6 · Agente LLM (este) hace cambios grandes sin cerrar e2e

**Probabilidad:** Media-alta. Es el patrón que mató v1 (ver "Patrón del fallo" en `CLAUDE.md`).
**Impacto:** Crítico. Deuda técnica y frankenstein = proyecto muere.

**Señales tempranas:**
- Agente propone "pasitos pequeños" que no cierran un escenario e2e demostrable.
- Commits sin ADR cuando la decisión es arquitectural.
- Reinvención de patrones ya definidos en SDD-03/04.

**Mitigación:**
- Regla dura: ningún merge a `main` sin que un escenario e2e cierre (intake→WO→thread→report o similar).
- ADRs son obligatorios para cualquier decisión que no esté en SDD-03/04/05. Sin ADR, no se implementa.
- Owner review semanal en las primeras 4 semanas. Si hay drift, se detiene.
- Red flag explícita en SDD-06: "agent proposes small steps without closing e2e scenario" → pausa inmediata.

---

## 4. Riesgos operacionales

### R-O1 · Beta-testers no disponibles en F3

**Probabilidad:** Media (Andros y Rackel tienen 40 cosas encima).
**Impacto:** Alto. Sin beta-testers reales, F3 go-live es ciego.

**Señales tempranas:**
- Al llegar a F3 gate (semana 8-9 estimada), Andros no ha tenido tiempo de probar el intake con 5 emails reales.
- Rackel no responde a demo agendada.

**Mitigación:**
- Agendar los slots de beta-testing con Andros/Rackel al final de F2 (no esperar al arranque de F3).
- Si Andros no puede, JuanCho hace de Andros 1 semana (ya lo hizo en v1).
- Rackel es más difícil — Yunus es el punto de contacto. Si Rackel no está disponible, se prueba con Luis simulando Rackel, pero se marca como riesgo abierto para F4.

---

### R-O2 · Identity Sprint (F1) se alarga

**Probabilidad:** Alta. Diseñador externo no probado, scope ambicioso (3 espacios × 20 pantallas).
**Impacto:** Medio-alto. F1 es dependencia dura para F4 (cockpit).

**Señales tempranas:**
- Semana 2 sin primer entregable.
- Feedback round > 3 sin convergencia.
- Diseñador no entiende SRS-specific (caos-tolerant, ball-in-court, 3 espacios).

**Mitigación:**
- SDD-06 ya acota F1 a 2-3 semanas con gate: mock pixel-perfect aprobado por owner + Andros + Rackel.
- Contratar al diseñador con un sprint corto pagado de 1 semana para SRS Cockpit solamente. Si no cierra, se cambia de diseñador sin haber quemado el presupuesto entero.
- Referencias visuales preparadas antes (Rackel Fractalia, Adrian Arcos, Linear, Height). El diseñador parte de eso, no de cero.
- Plan B: si tras 4 semanas no hay mock aprobado, owner hace wireframes a mano en Figma y contrata sólo skinning visual (alternativa menos ambiciosa pero ejecutable).

---

### R-O3 · Owner bandwidth (JuanCho wears N hats)

**Probabilidad:** Alta (pasa en todos los proyectos SRS).
**Impacto:** Alto. Si JuanCho no revisa, los ADRs no se escriben, el diseño no se aprueba, el plan se desvía.

**Señales tempranas:**
- Más de 1 semana sin review de trabajo del agente.
- Decisiones que debían ser de owner las toma el agente por default.
- Backlog de cosas "pendientes de Juan" crece.

**Mitigación:**
- Cadencia fija: lunes 9am review del plan semanal (30 min máximo).
- El agente escribe ADRs propuestos como borrador; owner aprueba/rechaza en async.
- Cualquier decisión no-reversible sí requiere owner antes de tocarla. Cualquier decisión reversible, el agente procede y loggea.

---

### R-O4 · Bus factor 1 en contextos críticos (Yunus con Gruma, Andros con Claro)

**Probabilidad:** Media (vida pasa, gente se enferma, renuncia, etc).
**Impacto:** Alto. Gruma sin Yunus = no sabemos a qué país despachar. Claro sin Andros = no sabemos qué tickets son vivos.

**Señales tempranas:**
- Ninguna info clave está en InsiteIQ, sólo en la cabeza de Yunus/Andros.
- Al preguntar "si Yunus se va de vacaciones 3 semanas, quién sabe cómo responder a Gruma?" la respuesta es "nadie".

**Mitigación:**
- InsiteIQ mismo reduce este riesgo: tickets con external_refs, thread histórico, compliance_requirements por país, SLA por client_relationship. El conocimiento crítico sale de la cabeza de los humanos y entra al sistema.
- Hacer que durante F5 (Proyecto+Compliance), Yunus documente al menos 3 países con templates en el sistema. No como task paralela, como parte del trabajo de F5.
- Agustín + Luis deben poder leer cualquier WO en el sistema y entender la situación sin preguntarle a Andros. Test: durante F6, escoger 5 WOs aleatorios y pedir a Agustín+Luis que los resuman. Si no pueden, falta contexto en el sistema.

---

### R-O5 · Backup parece que funciona pero no restaura

**Probabilidad:** Media (clásico). El rsync corre, el dump se genera, pero nadie probó restaurar.
**Impacto:** Catastrófico si coincide con R-T4.

**Señales tempranas:**
- "Último drill de restore: nunca" en el doc de ops.

**Mitigación:**
- SDD-07 § 6.3 ya lo menciona: drill trimestral. Restauración en SA96 desde el backup más reciente + smoke test mínimo (login, listar WOs, crear WO fake).
- El primer drill se hace al final de F7 (pre-go-live v2). Sin drill exitoso, no hay go-live.
- Si el drill falla, se arregla backups antes de seguir.

---

## 5. Riesgos comerciales / datos

### R-C1 · Cliente cambia el template del reporte sin avisar

**Probabilidad:** Alta (ya pasó con Gruma — Laly reprobó el reporte de Honduras por no tener las columnas esperadas).
**Impacto:** Medio. Retrabajo y desconfianza del cliente.

**Señales tempranas:**
- Reports de un cliente empiezan a ser reprobados / pedidos de "añade esta columna".
- Rackel o Laly mandan correo "desde ahora el reporte debe incluir X".

**Mitigación:**
- ADR-009: templates son assets versionados en el sistema. Cada entrega tiene `template_version_id`. Si el cliente pide cambio, se crea nueva versión — la vieja queda como referencia.
- Revisión trimestral de templates activos por cliente con Yunus/Luis. Preguntar proactivamente "¿sigue siendo este tu formato preferido?" vs esperar queja.
- Si el cliente pide cambio mid-proyecto, se notifica impacto (reprocesar WOs ya reportadas sí/no) y se documenta en thread interno.

---

### R-C2 · Compliance docs del tech expiran invisiblemente

**Probabilidad:** Alta (DUVRI Italia, Visura Camerale, certificaciones Claro — todos tienen fecha de vencimiento).
**Impacto:** Alto. Tech llega al sitio, el cliente pide el doc, está vencido, WO se cae y nos expone legalmente.

**Señales tempranas:**
- `compliance_requirements` de un tech con `expires_at` en el pasado pero no flagged.
- Cliente rechaza tech in-situ por docs vencidos.

**Mitigación:**
- SDD-04 modelo `compliance_requirements` tiene `expires_at`. Dashboard en espacio SRS muestra próximos vencimientos con 30 días de antelación.
- M7 (Requisitos y compliance) incluye "wall of expirations" visible a Andros y Luis. No se puede asignar tech con doc expirado — gate duro.
- Proceso: notificación automática al tech 60/30/14/7 días antes del vencimiento. Si al día 0 sigue sin renovar, el tech no aparece en lista de asignables para ese cliente.

---

### R-C3 · Cross-tenant leak (visibilidad de datos entre clientes)

**Probabilidad:** Baja en v1 interno (1 tenant real: SRS). Media si hay "salida al mercado" (Fractalia o Telefónica entran como tenants separados).
**Impacto:** Catastrófico si pasa — perdemos el cliente y la confianza.

**Señales tempranas:**
- Query sin filtro `tenant_id` detectada en review de código.
- Audit log muestra acceso de usuario de tenant A a doc de tenant B.

**Mitigación:**
- ADR-011: `tenant_id` en cada doc desde día 0. Todas las queries van por la capa `repo/` que inyecta tenant_id del JWT. **No se bypassa.**
- Tests automatizados específicos de cross-tenant: crear tenant A y tenant B, loguearse con user de A, intentar leer docs de B, debe ser 404 (no 403 para no revelar existencia).
- En cualquier revisión de código, buscar `find(` y `find_one(` sin `tenant_id`. Si aparece, es bloqueante.
- Pre-"salida al mercado", pentest de cross-tenant explícito.

---

### R-C4 · Triangulación AP (Claro orders / Hitss paga) no queda bien modelada

**Probabilidad:** Media. Es un caso raro pero real.
**Impacto:** Medio. Afecta finanzas y cobranza, no operación día a día.

**Señales tempranas:**
- Adriana tiene que abrir el Excel paralelo para calcular margen porque el sistema no refleja que quien paga no es quien ordena.
- Collections dashboard muestra saldo con la entidad equivocada.

**Mitigación:**
- SDD-04 modelo `work_orders` tiene `client_refs` array + `paying_entity` separable (3 client refs, 1 paying entity distinto). Ya diseñado.
- Test específico en F6 Finance: crear WO con `client_refs=[Claro]` y `paying_entity=Hitss`, validar que invoice sale a Hitss pero los reports de ops van a Claro.
- Adriana valida el modelo en F6 con sus 3 clientes más complejos (Claro/Hitss, Fractalia, Gruma).

---

## 6. Qué mataría v2 — señales de alerta roja

Si cualquiera de estas se cumple, se detiene avance y se re-evalúa:

1. **Tres iteraciones fallidas del cockpit tras F1** — mismo patrón que mató v1. Si pasa, el problema no es técnico, es de producto. Parar.
2. **F3 ácid test no pasa tras 2 intentos** — NOC↔Tech siguen en WhatsApp. Sin M3+M2 funcionando, el resto es humo. Parar.
3. **Adopción <50% en los 6 beta-testers tras 4 semanas de F4 go-live** — la herramienta no resuelve dolor real. Parar, retro profunda.
4. **Mongo o VPS degradan performance <2s queries sin volumen que lo justifique** — problema estructural en el modelo o infra. Parar F-actual, fixear.
5. **Cross-tenant leak detectado** — seguridad crítica. Parar todo, remediar, auditar, luego seguir.

"Parar" no es "cancelar". Es: revisar con owner, escribir ADR de corrección, ajustar plan. Pero no seguir agregando features sobre un problema no resuelto.

---

## 7. Riesgos explícitamente aceptados (no mitigamos)

Para que no se confundan con descuido:

- **No HA multi-VPS en v1.** Si el VPS cae, cae. Backup diario cubre el peor caso. Herramienta interna, no SaaS público.
- **No SLA formal.** Uptime objetivo 95% horario hábil, no comprometido contractualmente con nadie.
- **No certificación GDPR/SOC2 en v1.** InsiteIQ es interno. Si hay "salida al mercado", eso se retoma en un proyecto separado.
- **No soporte a browsers viejos.** Chrome/Safari/Firefox últimas 2 versiones. IE/Edge Legacy no.
- **No funciona 100% offline.** PWA tiene cache básico, pero si el tech está 4 horas sin señal, al reconectar sube lo pendiente — no opera totalmente offline con sync conflict resolution compleja. Eso es un producto en sí mismo.
- **UI multi-idioma acotada a ES + EN.** Mínimo español e inglés desde v2 (Sajid y Yunus son nativos inglés, los servicios internacionales se operan en inglés: Gruma multi-país, Claro US via Arlindo, Londres con Yunus). No se soporta italiano/francés/alemán/portugués en UI en v1 — el contenido del report al cliente sí puede ir en el idioma del cliente (eso es data, no UI). RTL (árabe/hebreo) fuera de alcance.

---

## 8. Responsable por riesgo

| Familia | Owner del riesgo |
|---|---|
| Producto / adopción | JuanCho (owner) |
| Técnicos (stack/infra) | JuanCho + agente |
| Operacionales (equipo) | JuanCho + Andros |
| Comerciales / datos | JuanCho + Yunus |

No es comité. Es quién tiene que estar mirando esa familia al menos semanalmente.

---

## 9. Revisión de riesgos

- **Semanal** durante F1-F3: 10 min el lunes al inicio del review.
- **Quincenal** de F4 en adelante.
- **Trimestral** post F7 cuando v2 esté en producción estable.

Cada revisión: ¿alguna señal temprana se está disparando? ¿algún riesgo se volvió realidad? ¿aparece uno nuevo no listado acá? Actualizar este doc.

---

## 10. Cierre protocolo SDD

Este es el último SDD (SDD-01 a SDD-08). Con los 8 cerrados, el protocolo F0 queda completo. Siguiente paso en SDD-06: **F1 Identity Sprint** (contratar diseñador + preparar referencias + arrancar mocks pixel-perfect).

v1 queda en PROD en `insiteiq.systemrapid.io` bajo el dominio actual hasta que v2 esté listo para reemplazarlo (ver SDD-06 § v1 freeze procedure). No se toca v1 para añadir features — sólo fixes críticos si algún usuario sigue operando cosas sueltas.

Vamos.
