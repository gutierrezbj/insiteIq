# Sprint pre-uso real · v2.63 (2026-05-08 → 2026-05-10)

> **Propósito:** cerrar los bloqueantes operacionales para que el equipo SRS use InsiteIQ en producción real con clientes vivos.
>
> **Resultado:** 17 commits deployed · app bilingüe + workers de emit outward + PWA installable + Admin write ops + Tech mobile-first + cuenta de pruebas. Andros y Agustín ya validando con plan_pruebas.docx en mano.

---

## Cronología de commits (orden ejecución)

| Commit | Iter | Qué cerró |
|---|---|---|
| 82ed29a | 2.62 lote 3 | RolloutDetailPage 100% i18n · CSV/PDF exports + timeline |
| 6d76d01 | 2.62 lote 4 | InterventionReportPage 100% · Regenerate/Email/Webhook modales |
| 0ac1e87 | 2.62 lote 5a+5b | AdminPage + Agreements list/detail |
| e6419aa | 2.62 lote 5e+5g | Projects list/detail + Client HomePage |
| aeb5508 | 2.62 lote 5d+5f | TechDetail + SiteDetail + InsightsPage |
| f4d3817 | 2.62 lote 5c | Finance pages (FinancePage + InvoiceDetail + VendorInvoiceDetail) · delegado a sub-agent · 271 keys |
| 5947b4a | 2.62 lote 6 | Tech PWA mobile (Layout + Home + BriefingToday + Profile) |
| c4b8c91 | 2.62 lote 7+8 | Admin/finance modales + sections + UI primitives · ~328 keys |
| 51617ec | 2.63 | Outbox workers (email + webhook) · backoff exponencial · NoOp safe |
| 02d1e8d | 2.63b | PWA installable · íconos paleta F + iOS apple-touch-icon meta |
| 280213d | 2.63c | TECH_REGISTRY → backend · EditUserAction + reset-password endpoint |
| 1b305d3 | migration | scripts/migrate_user_profile_fields.py · 9 SRS users en PROD |
| a30caa8 | 2.63d | Admin edit orgs + sites · partner_relationships dinámicas |
| 3c395d7 | 2.63e | Country + Timezone dropdowns (32 países · 31 IANA tz · auto-label) |
| 52cde07 | 2.63f | Fix pantallazo negro /srs/techs · defensa runtime + validación tz backend + repair script |
| dd4a4e1 | 2.63g | Promote Agustin + Andros → director · reset pwds · doc Word pruebas |
| c688819 | 2.63h | Tech WO Detail mobile-first operativo (889 líneas · pieza nueva separada del SRS) |
| 0fde482 | 2.63i | Test user pruebas@ + chip de login one-click |
| 80af95c | 2.63i fix | Script promueve WO a dispatched si está en estado no-operativo |
| e928f42 | docs sprint cierre | PROJECT_STATUS + bitácora + Notion sync v1.6 + Plan_Pruebas.docx |
| 9ab20af | **2.63j** | Feedback Agustín filtrado · drift llegada + tiempo on-site + horizonte programación + sidebar reorg (Rollouts fuera del menú · B&F · Intervenciones) |

**Total:** 21 commits · ~4000 líneas netas + ~1000 keys i18n (es+en simétricas)

---

## Iter 2.63j · feedback Agustín filtrado (2026-05-11)

Agustín entregó documento Word `Pruebas_Equipo/Que preguntas tendria como gerente o coordinador.docx` con 15 preguntas tipo "director/gerente" + árbol estructural "Por ticket/actividad". Owner pidió análisis con lente **"gerente operativo pragmático · poda burocracia"**.

Filtrado de las 15:
- **YA resueltas (6):** Q1 búsqueda ticket · Q2 filtro localidad · Q3 responsable técnico · Q7 % avance · Q8 ejecutadas counter · Q9 restantes counter
- **Construido (3):** Q5 drift entrada · Q6 tiempo on-site · Q10 horizonte programación
- **Descartado (3):** Q4 PM directivo cliente (campo fantasma) · Q11 programado sin ticket (no aplica al diseño) · Q14 t min/max threads (parálisis por análisis)
- **Diferido (3):** Q12 search por serial · Q13 equipos por site · Q15 IA proactiva tiempo real

Respuesta arquitectónica a la pregunta del owner "intervenciones · proyectos · rollouts · necesitamos los 3 o solo proyectos": **2 conceptos, no 3.** Rollouts es solo un tipo de proyecto · sale del menú · pasa a filtro `?type=rollout` dentro de `/srs/projects`. Intervenciones renombrado a "B&F · Intervenciones" para dejar claro que son reactivos (break-fix) vs Proyectos (planificados).

Backend cambio mínimo: 1 campo opcional `status_timestamps: dict[str, datetime]` en WorkOrder model · 1 línea en `advance()` que lo puebla con primer ingreso al status. Backward compat preservado.

Frontend nuevo helper `lib/wo-metrics.js` reusable: `driftMinutes()` · `timeOnSiteMinutes()` · `formatMinutes()` · `driftSeverity()` · `scheduledNextDays()` · `lastScheduledDate()`. Reuse en WO Detail + Rollout Dashboard + Cockpit widget.

**Resultado en PROD:** 5 cambios visibles · **PENDIENTE validación del owner uno por uno** tras roast de bundle (ver decisión #7 + lección #9 abajo).

---

## Decisiones del owner que rigieron el sprint

### 1. "Cero deuda · refactor completo" (2026-05-08)

Tras el primer commit del epic i18n, el agente propuso deferir modales para una "iter 2.60 si Inetum los pide". Owner: _"y propones que lo dejemos para luego cuando tengamos clientes en produccion hahahaha se te va la olla"_ + _"es decir dejamos deuda tecnica y acarreamos cosas que se pueden resolver ahora?"_. **Postura adoptada:** sigo sin pausar entre lotes hasta cerrar el epic entero.

### 2. "Hablar venezolano · no porteño" (2026-05-10)

Owner: _"que eres venezolano coño deja de habalr con deje argentino"_. Reset del registro: `tú` en vez de `vos`, `puedes` en vez de `podés`, `coñazo` y `chévere` como interjecciones naturales, etc.

### 3. "Pinchar Panamá se vuelve loco · país y timezone deberían ser desplegables" (2026-05-10)

Owner reportó que al editar un user el text input libre de timezone se comportaba raro · sugirió dropdowns. Resultó ser la pista del bug del pantallazo negro (próximo punto).

### 4. "Techs da pantallazo negro" (2026-05-10)

Bug crítico introducido cuando el owner editó Arlindo con `America/Miami` en el text input legacy. Ese string NO es IANA válido (correcto: `America/New_York`). `Intl.DateTimeFormat({ timeZone: 'America/Miami' })` tira RangeError y crashea el render del map en TechsListPage. **Resuelto:** try/catch defensivo + validación backend + script de reparación + dropdown ya impide el bug entre.

### 5. "PIENSA COMO TECNICO DE CAMPO · no inventes" (2026-05-10)

Owner roast cuando el agente propuso un TechWoDetailPage con bloques pesados similares al SRS desktop. _"Agustín es coordinador, es una app de campo, no inventes ni te vuelvas loco, es gente operativa"_. **Reset:** vista nueva con UNA acción grande visible por status, todo lo demás a un tap. Botones gigantes 64px tap-to-call, tap-to-Maps, foto con cámara nativa.

### 6. "Hacemos cuenta de pruebas para curiosear · más fácil clicar" (2026-05-10)

En vez de loguear como Agustín y romper su workflow, owner pidió cuenta dedicada `pruebas@` con doble membership SRS + Tech, sin forced rotation, accesible vía un chip 7º en login. Resultado: 1 click → entra → curiosea ambos espacios.

### 7. "Actúa como gerente operativo pragmático · poda burocracia" (2026-05-11)

Tras primer análisis del docx de Agustín (15 preguntas + árbol) en que el agente listó 11 items en 3 sprints como roadmap acumulativo, owner roast:

> *"Espera navegante, actua como gerente de operaciones muy pragmatico, esta es una herramienta que surge por podar toda la capa burocratica de una gestion · proyectos son proyectos · B&F es solo eso · lo importante es que InsiteIQ SABE como gestionar tus operaciones agiles y sabe interpretar tus numeros y ayudar a tus gestores a optimizar el tiempo."*

> *"Agustin es mi mejor tecnico de campo pero tiende al paralisis por analisis, sin embargo tiene un 'tercer ojo' que ayuda · ese punto de vista crítico es el que necesitamos y evaluamos."*

**Filtro adoptado:** cada propuesta pasa por 3 preguntas:
1. ¿Poda burocracia o agrega?
2. ¿Ahorra tiempo decidir a Andros/Adriana o solo añade campo a llenar?
3. ¿Es automático (sistema calcula) o manual (alguien escribe)?

Resultado del re-análisis: 11 items → 3 construir · 3 descartar · 3 diferir. Lo construido es 100% auto-calculado · cero campos nuevos para llenar.

### 8. "ITERATE > BUNDLE · nada de salir a lo loco" (2026-05-11)

Tras el iter 2.63j (5 cambios deployed en un solo push), owner declaró regla operativa nueva:

> *"validamos cambios, los organizamos y procedemos, ya lo sabes NADA de salir a lo loco y ya sabes los productos se ITERAN salvo que me digas ese es un MUST."*

**Regla:** default = ITERATE (1 cambio · 1 deploy · validación · siguiente). Excepción solo si el agente declara explícitamente "MUST bloqueante" y el owner firma. Lección #9 del cuaderno · ver `donde_la_cagamos.md`.

**Estado del iter 2.63j al cierre de la sesión:** los 5 cambios están EN PROD pero **PENDIENTE de validación uno por uno** del owner. Si alguno no convence, se ajusta o se quita individualmente.

---

## Lecciones técnicas duras de este sprint

### Lección 1 · Text input libre = bomba de tiempo

**Caso:** Owner editó Arlindo con `America/Miami` confiando en que era IANA válido (porque Miami es ciudad reconocida · pero IANA usa la zona representativa · Miami está en `America/New_York`). El frontend asume que el dato viene limpio y llama `Intl.DateTimeFormat` que tira `RangeError` no capturado · crashea TODO el render del map donde aparece ese user.

**Regla:** cualquier campo libre que alimente a una API del browser que puede crashear (Intl, locales, IANA timezones, ISO countries, etc.) requiere SIEMPRE:
1. Validación backend dura (whitelist · ZoneInfo · etc.)
2. Try/catch defensivo en frontend render path (degradar silenciosamente · NO crashear)
3. UI que restrinja a valores válidos (dropdown · combobox · no text input libre)

Confianza ciega en input limpio = bomba de tiempo. Las 3 capas no son redundancia · son defense-in-depth.

### Lección 2 · La PWA de campo NO es "el desktop reducido"

**Caso:** El primer Tech WO Detail reusaba el `WorkOrderDetailPage` SRS (1682 líneas, padding 32-40px, maxWidth 1400, grids 3-col). Funcionalmente cargaba en mobile pero la UX era pésima · acciones críticas perdidas en bloques densos pensados para pantalla grande.

**Regla:** la herramienta del tech de campo es un **animal distinto**, no una versión adaptada del cockpit. Pensar como el operativo en plena calle con cliente al lado · una mano en el teléfono otra en el destornillador · prisa real · cero paciencia. Cada pantalla = UNA acción grande visible · el resto a un tap.

### Lección 3 · Migration scripts son la diferencia entre "deploy clean" y "todos pidiendo arreglos"

**Caso:** Iter 2.63c agregó 6 fields al User model · los users ya existentes en mongo se quedaban con esos fields en `null`. Sin script, cada uno tendría que abrir el modal Edit y poblarlos manualmente. Con script `migrate_user_profile_fields.py` idempotente, los 9 SRS users quedan poblados en una sola ejecución sin tocar data operacional.

**Regla:** todo cambio aditivo al schema (nuevos fields opcionales) merece su script de migration paralelo. Idempotente · log claro de qué tocó · safe para re-correr. El owner no debería tener que hacer trabajo manual de carga por defecto del agente.

### Lección 4 · Sub-agents son útiles para refactor masivo cuando hay patrón claro

**Caso:** Finance pages (3140 líneas en 3 archivos) eran el 30% del epic i18n restante. Delegé a un sub-agent con instrucciones claras (namespaces específicos, patrón de useTranslation, regla de rename de loop vars `t→ev` para evitar shadow). Sub-agent entregó 271 keys + 3 archivos refactoreados + commit + push en una sola pasada.

**Regla:** delegación funciona cuando: (a) el patrón ya está validado en archivos previos del mismo lote, (b) las instrucciones son específicas con ejemplos, (c) el sub-agent puede validar él mismo (build + sintaxis). NO delegar cuando hay decisiones de diseño abiertas.

### Lección 5 · "Cero importación visual desde SKYPRO360" sigue vigente

El sprint anterior cerró con la regla dura del cuaderno: _"cero importación visual o vocabulario desde SKYPRO360. Solo el patrón se reutiliza, con DS InsiteIQ paleta F"_. Este sprint mantuvo la regla: paleta F (Stone-950 navy + amber-600) consistente en todo · íconos PWA generados con la misma identidad · cero referencia al competidor.

---

## Estado del plan post-i18n al cierre del sprint

| ID | Tarea | Estado |
|----|-------|--------|
| A | Smoke test e2e bilingüe contigo (juntos) | ⏳ Andros + Agustín validando con plan_pruebas.docx |
| B1 | Email worker | ✅ Deployed · NoOp · falta SMTP cred del owner |
| B2 | Webhook worker | ✅ Deployed live |
| B3 | PWA installable | ✅ Deployed |
| B4 | Forced pwd rotation | ✅ Verified (Sajid OK · case juang@ era esperado) |
| C1 | TECH_REGISTRY backend | ✅ Deployed + migration aplicada en PROD |
| C2 · Users | Admin edit + reset pwd | ✅ Deployed |
| C2 · Orgs | Admin edit + partner_relationships | ✅ Deployed |
| C2 · Sites | Admin edit + contacto/NOC | ✅ Deployed |
| C2 · Agreements | Admin edit | ⏳ Pendiente (no bloqueante hoy) |
| C2 · Projects | Admin edit | ⏳ Pendiente (no bloqueante hoy) |
| D | Onboarding doc | ✅ Done (ONBOARDING_EQUIPO.md + Plan_Pruebas_InsiteIQ_2026-05-10.docx) |
| E | Test user con chip one-click | ✅ Deployed (`pruebas@systemrapid.com`) |
| F | Tech WO Detail mobile-first | ✅ Deployed (Iter 2.63h · MVP capture + advance + tap-to-call + tap-to-Maps) |
| Phase 2 Tech | Video + firma + departed + offline + geofence | ⏳ Diferido post validación |

---

## Lo que sigue después del sprint (cuando vuelva el owner del viaje)

### Prioridad 0 · Validación pendiente del iter 2.63j (BLOQUEA todo lo demás)

Owner se fue de viaje sin firmar los 5 cambios del iter 2.63j. **Antes de cualquier nueva feature** el equipo de operaciones (Andros + Agustín + Adriana + el propio owner) debe validar uno por uno los 5 ítems en PROD y decidir:

| # | Cambio en PROD | URL para validar | Decisión esperada |
|---|---|---|---|
| 1 | Badges "Drift entrada" + "Tiempo on-site" en WO Detail header | `/srs/ops/{wo_id}` resolved | ✅ se queda · ✏️ ajustar threshold · ❌ quitar |
| 2 | DataPanel "Drift entrada" en Rollout Dashboard tab | `/srs/rollouts/{id}` → Dashboard | ✅ ✏️ ❌ |
| 3 | Widget "Horizonte de programación" en Cockpit sidebar derecho | `/srs` → sidebar derecho abajo | ✅ ✏️ ❌ |
| 4 | Sidebar SIN "Rollouts" + "B&F · Intervenciones" rename | Cualquier `/srs/*` | ✅ ✏️ ❌ |
| 5 | Chips por tipo en `/srs/projects` clickeables (filter) | `/srs/projects` click chip | ✅ ✏️ ❌ |

**Regla del owner (lección #9):** los 5 se validan UNO POR UNO · cada uno cuesta máximo 5 min reverter si no convence. No empacar ajustes.

### Prioridad 1 · Bloqueantes operacionales reales (sin owner action)

1. **SMTP creds en .env del VPS** (5 min owner cuando vuelva) · activa email worker · sin esto los reportes no salen al cliente real.

### Prioridad 2 · Feedback del equipo (esperando)

- Andros + Agustín probando con `Plan_Pruebas_InsiteIQ_2026-05-10.docx` desde el 2026-05-10.
- Agustín ya entregó 1 docx más con preguntas director/gerente (analizado en iter 2.63j).
- Esperando ronda 2 del equipo después del viaje del owner.

### Prioridad 3 · Phase 2 diferidos (NO arrancar sin firma del owner)

Estos quedaron explícitamente diferidos · no asumir verde:
- **Phase 2 Tech mobile** · video upload · firma del responsable · botón "SALÍ DEL SITIO" · offline cache · geofence check-in
- **Admin edit Agreements + Projects** · workaround actual: pide-a-Juan
- **Search por serial** (Q12 Agustín) · cuando aparezca caso real
- **Equipos por site UI** (Q13) · cuando haya demanda
- **AI proactive** (Q15) · 3-6 meses de data acumulada primero
- **Cleanup data sucia xlsx Panamá** · address con coords + notes con finance

---

## ⛔ Para el siguiente agente que arranque al volver el owner

**Hoja de ruta de la primera sesión:**

1. **NO arrancar nada nuevo** hasta que el owner haya validado los 5 ítems del iter 2.63j en orden. Si el owner llega y dice "arranca con X" sin haber validado, **recordáselo** y proponé validación primero.
2. **Default = ITERATE.** Nunca empaquetar más de 1 cambio sin firma del owner declarada como "MUST bloqueante" (ver `donde_la_cagamos.md` lección #9).
3. Si el owner trae más feedback del equipo (Andros/Agustín/Adriana), aplicá el filtro pragmático del owner (decisión #7 arriba): **¿poda burocracia o agrega? ¿automático o manual? ¿ahorra tiempo decidir o solo campo a llenar?**
4. Recordá: cuenta de pruebas `pruebas@` + pwd `InsiteIQ2026!` entra directo · doble membership SRS+Tech · 1 WO asignada (FM-19566) con briefing pendiente.

---

## Sesión 2026-05-19/20 · Arranque uso real con caso TOUS

Owner volvió del viaje. Caso real entrante de Fervimax · cambio de switch en 2 tiendas TOUS Miami (Pembroke + Dadeland). Tech: Iduber Montes (3er intento · 2 techs previos no resolvieron). Cadena de mails Andrés Tyminskiy + WhatsApp group (262 msgs · 35 fotos · 1 audio).

**Lo que se hizo (4 scripts nuevos · 4 commits):**

| Commit | Script | Acción |
|---|---|---|
| `0d9ea98` | `load_tous_miami_fervi.py` v1 | Primer intento · 1 site (Dadeland) · sin Andres como user |
| `b604f64` | `load_tous_miami_fervi.py` v2 | Refactor tras leer WhatsApp · 2 sites · 2 WOs · histórico Jose+Carlos |
| `bfb47f4` | `load_tous_miami_fervi.py` v3 | + user Andres Tyminskiy como client_coord Fervi (patrón Rackel) |
| `973357b` | `load_tous_miami_fervi.py` v4 | Fix apellido Iduber (Montes · no Fercho que era apodo WhatsApp) |
| `96381c5` | `cleanup_seed_for_real.py` + `force_reset_juan.py` | Cleanup TOTAL fake info + force-reset pwd Juan |

**Ejecuciones en PROD:**
1. `load_tous_miami_fervi.py` · creó SA Bronze · 2 sites TOUS · user Iduber · user Andres · 2 WOs · 2 briefings
2. `cleanup_seed_for_real.py` DRY-RUN · 345 docs a borrar · whitelist 11 users
3. `cleanup_seed_for_real.py` EXECUTE · 345 docs borrados · audit_log intacto
4. `force_reset_juan.py` · pwd Juan → `InsiteIQ2026!` · must_change_password=True

**Estado PROD al cerrar sesión:**
- 1 tenant SRS
- 11 users (9 SRS plantilla + Iduber Montes + Andres Tyminskiy)
- 1 organization (Fervimax · partner_relationships=[joint_venture_partner, client])
- 1 service_agreement (FERVI-SRS-BF-2026 Bronze)
- 2 sites (TOUS Pembroke Pines + TOUS Dadeland Mall)
- 2 work_orders (FERVI-TOUS-PMB-001 dispatched · FERVI-TOUS-DDM-001 triage)
- 2 briefings (assembled · pending ack del tech)
- audit_log inmutable (con refs huérfanas a entities borradas · histórico legítimo)

**Decisiones del owner durante la sesión:**
1. Cleanup TOTAL · no conservar orgs seed como catálogo · "darle duro a esto"
2. Borrar también `pruebas@` test user
3. Force-reset pwd Juan antes del cleanup para garantizar acceso post
4. Andres Tyminskiy SÍ entra como user `client_coordinator` (no solo metadata)
5. Email de bienvenida diferido (Iter B) · por ahora credenciales por WhatsApp manual

**Bug encontrado al final de la sesión (sin resolver):**
- Cockpit `/srs` carga PERFECTO post-cleanup · Iter 2.63j visible
- Al pinchar Detalle de cualquier WO → `/srs/ops/<wo_id>` → **pantalla 100% negra**
- Backend responde 200 a TODAS las APIs · es crash JS frontend
- Sin consola browser no se diagnosticó el crash exacto
- **Fix preventivo en working tree (sin commit)**: envolver TODAS las rutas /srs/* y /client/* en `<V2View>` (V2ErrorBoundary) para que el crash futuro muestre mensaje legible · 42 líneas en App.jsx
- Documentado como Lección estructural #11 en `donde_la_cagamos.md`

**Próximo escenario firmado por el owner:** caso Agustín + rollout (probablemente Arcos · pero la data Arcos fue borrada en el cleanup · habrá que recargarla limpia desde la realidad operativa actual · no desde el seed sintético).

---

> *Esto es lo más cerca de "puesta en uso con el equipo" que ha estado InsiteIQ desde su arranque. La diferencia con los 3 intentos de cockpit operativo fallidos del sprint anterior: este sprint fue todo backend + flow operativo + datos reales · cero diseño UX autónomo · cero invento visual. El agente hizo de plomero · no de arquitecto.*
