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

**Total:** 19 commits · ~3500 líneas netas + ~980 keys i18n (es+en simétricas)

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

## Lo que sigue después del sprint (cuando despierte el owner)

1. **Escuchar feedback de Andros + Agustín** del plan_pruebas. Lo que rompa o falte real (vs imaginario).
2. **SMTP creds** para activar email worker → dispatch real al cliente.
3. **Phase 2 Tech mobile** si validan que el MVP del flow es correcto:
   - Video upload (extender uploads.py para `video/mp4` + bump tamaño a 50MB)
   - Firma del responsable (signature canvas)
   - "SALÍ DEL SITIO" botón en status resolved con timestamp `departed_at`
4. **Admin edit Agreements + Projects** si el equipo lo pide (no urgente · workaround pide-a-Juan).
5. **Cleanup data sucia heredada xlsx Panamá** (address con coords + notes con finance).

---

> *Esto es lo más cerca de "puesta en uso con el equipo" que ha estado InsiteIQ desde su arranque. La diferencia con los 3 intentos de cockpit operativo fallidos del sprint anterior: este sprint fue todo backend + flow operativo + datos reales · cero diseño UX autónomo · cero invento visual. El agente hizo de plomero · no de arquitecto.*
