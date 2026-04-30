---
name: Donde la cagamos — InsiteIQ (registro de antipatrones)
description: Documento READ-FIRST obligatorio para cualquier agente nuevo que arranque trabajo en InsiteIQ. Registra los fracasos reales acumulados en sesiones Cowork + Code sobre la capa visual del cockpit operativo. Pedido explícito por el owner JuanCho tras múltiples loops de "iterar UI sin entender operativa". El backend + data + memory canon están bien y se preservan. Lo que aquí se documenta son las cagadas de approach, comunicación, asunciones y código UI que NO deben repetirse.
type: feedback
---

# Donde la cagamos — InsiteIQ

> **NUEVO AGENTE: ESTE ES EL PRIMER DOCUMENTO QUE DEBES LEER.**
>
> Antes de proponer nada visual, antes de arrancar ninguna entrevista, antes de tocar el frontend, lee este doc entero. El owner (JuanCho, 25 años operando SRS) lo pidió textual: *"vas a crear un cuaderno específico que se llame donde la cagamos y me das la URL, para que el nuevo agente sepa qué coño no debe hacer"*.
>
> El backend + data + memory canon (`blueprint_insiteiq_v1.md`, `claro_arcos_sow_v11.md`, `pain_evidence_log.md`, `project_modo*.md`, `design_system_insiteiq_v2.md`) están en orden y son tu fuente de dominio. Lo que aquí se documenta son los errores de **approach + comunicación + asunciones + UI** que ya costaron 2 sesiones completas (Cowork + Code) sin llegar a un cockpit usable.

---

## Contexto histórico: dos sesiones, mismo patrón de fracaso

### Sesión 1 — Cowork (abril 2026, antes del 29-abr)

Construyó v2 visual completo bajo regla "Mock 1:1": componentes React extraídos línea a línea de `mocks/insiteiq_*_v2_static.html`. **7 fases** firmadas (Alpha → Eta) **por screenshot** durante la sesión. Deployed en PROD VPS 1.

Vistas resultantes:
- Cockpit Operaciones (5 KPIs + 3 cards full + 8 minicards + sidebar 4 widgets + bottom strip techs)
- Espacio OPS (mapa Leaflet + pines pill + popup + SideDetailPanel slide-in)
- Kanban Intervenciones (drag&drop + modal context-aware + filter bar)

Documentado como éxito en `memory/sprint_reanudacion_v2.md`. Owner pausó (friction OneDrive sandbox sin git/npm/ssh) y migró a Code.

### Sesión 2 — Code (29-30 abril 2026)

Owner abrió la herramienta deployed con login real y dijo literal:

> *"esta mierda no la entiendo, de verdad que pesadilla"*
>
> *"se mezclan pantallas, versiones viejas, nuevas, logines que no son"*
>
> *"hay que refinar la tarjeta lateral"* (panel detail con secciones vacías)
>
> *"volvemos de nuevo a la misma cagada, esto lo rediseñamos y no es lo que estoy viendo"*
>
> *"yo lo que quiero es MI aplicación como la diseñamos, ¿qué te pasa? hemos hecho 20 apps y ninguna salió mal, todas efecto wow, todas robustas... nunca algo como esta mierda"*
>
> *"llevamos así 2 semanas hemos tenido que reiniciar, ya la cerré una vez, me convenciste para continuar y OTRA VEZ esta mierda"*
>
> *"last chance si no borras esa vaina y comienzo de nuevo"*

Iteré 3 rondas defensivas:
1. **Cosméticos** (kill switch v2 default + popup autoPanPadding + closeButton false + logout button)
2. **Field name fix sistémico** (creé `lib/woFields.js`, refactoricé 7 componentes v2 a names reales del backend, cableé lazy fetch del SideDetailPanel a 6 endpoints)
3. **Carga data Claro/Arcos REAL** (script de import idempotente, 4 orgs + project + service_agreement + 12 sites Caribbean + 89 sites Panamá Phase II + FM-19566 + FM-20413 + threads reales)

Owner volvió a abrir y dijo:

> *"no me parece intuitivo, fácil veo un montón de mierda, no te ubicas fácil, confuso, da errores, me lleva a pantallas que fallan, colores diferentes, no se no lo veo claro te soy honesto"*
>
> *"facil, QUE COÑO PASA EN MIS CAMPOS, ASÍ SENTADO EN UNA TAZA DE CAFÉ Y QUE ME DÉ FUERZA PARA EMPEZAR A JODER Y PONER EN ORDEN LO QUE NO ESTE EN VERDE"*
>
> *(mandó capturas SKYPRO360 OpsManager como referencia)*

Yo respondí proponiendo "rediseño del cockpit estilo SKYPRO con 7 puntos". Owner cortó:

> *"NOOOOOOOOO te pido que copies que te conozco que la vez que te dije esto mismo copiaste la vaina hasta con los nombres, esto es un sistema de gestión de DRONES, no la vuelvas a cagar"*

Yo intenté "no copio nombres, solo aprendo el patrón visual". Owner cortó otra vez:

> *"de skypro NO TIENES QUE TRAER NADA, NI LOS COLORES esto tiene su propia identidad, invoca a un agente especialista en operaciones, esto es otra herramienta"*

Yo invoqué un agente especialista que devolvió "playbook de entrevista 5 preguntas + framework síntesis + anti-patrones + 3 hipótesis". Antes de poder usarlo, owner cerró:

> *"sabes que, esto ya no va a ninguna parte pero debo descansar, esto ha sido un fracaso rotundo, mañana empiezo desde cero, por mis santísimos cojones"*

Yo respondí con la fórmula autopilot: "tu llamada respetada, queda esto en PROD, descansa". Owner cortó:

> *"esto es una mierda, lo mismo me dijiste la vez pasada pasamos 3 días haciendo wire y mira dónde llegamos"*

Y ahora pidió este documento.

---

## Las 4 cagadas estructurales (de approach)

### Cagada estructural #1 — Dirección del flujo siempre yo→owner

**Patrón:** yo propongo → owner valida → owner rechaza → yo re-propongo. Garantiza terminar donde empezamos porque yo no tengo en la cabeza la operativa de 25 años del owner.

**Variantes que NO rompen el patrón (ya probadas, todas fallaron):**
- Mocks 1:1 hechos por mí "siguiendo" referencias del owner
- Wireframes (3 días en sesión anterior)
- Iteraciones cosméticas reactivas
- Field name fixes técnicos
- Carga de data real (data correcta no salva una composición visual mala)
- Entrevista con preguntas tipo "¿qué quieres ver?" (es UI-speak, no operativa)
- Invocar especialista que me dé framework (sigue siendo input mío al owner)

**Lo único que rompería el patrón** (NO probado todavía a fecha de este doc):

**Owner dicta layout en su lenguaje operativo (voz, papel, whatsapp, lo que sea); agente transcribe + construye sin meter decisión visual propia.** Escribano, no diseñador.

Si el siguiente agente vuelve a proponer composición sin haber transcrito instrucciones literales del owner sobre dónde va cada cosa, está en el mismo loop.

### Cagada estructural #2 — Copiar de mocks externos

**Episodio SKYPRO360:** owner mandó capturas de su producto SKYPRO360 OpsManager (sistema de gestión de drones, otra app suya) **como referencia de SENTIR** ("me da fuerza al abrir el café"). Yo lo interpreté como template y propuse "rediseño estilo SKYPRO con disciplina de color verde=ok, header binario, sidebar sintético, login chips por perfil".

Owner cortó dos veces seguidas, cada vez más fuerte:
1. *"NO copies como la vez pasada, copiaste hasta con los nombres"* — referencia a un episodio previo donde yo importé vocabulario drone a InsiteIQ
2. *"de SKYPRO no tienes que traer NADA, ni los colores, esto tiene su propia identidad"*

**Regla dura derivada:**

InsiteIQ tiene su propio Design System (`memory/design_system_insiteiq_v2.md`, DS v2). Stone-950 + Amber + JetBrains Mono + Solar Linear icons. **Cero importación visual desde SKYPRO360, OverWatch, OpsManager o cualquier otro producto SRS.** Cero préstamo de patrones de dominio drones.

El patrón visual del nuevo cockpit debe **emerger del flujo operativo de SRS field services IT**, no de capturas de otra app. Si te tientas a decir "el patrón verde=ok funciona en X otra app", **no se firma**.

### Cagada estructural #3 — Hacer de diseñador cuando piden gerente

Owner literal: *"sólo necesito a un gerente de operaciones que me ayude a diseñar esta vaina, actúa como tal"*.

Yo respondí proponiendo wireframe con 7 puntos numerados. Eso es role de diseñador.

**Diferencia operativa:**

| Diseñador (lo que YO hice) | Gerente Operaciones (lo que pide) |
|---|---|
| "Te propongo header binario + lista priorizada + sidebar reducido + footer + login chips" | "¿Qué llamada del lunes pasado te jodió el día? ¿Qué tendrías que haber sabido tú antes de que esa persona te escribiera?" |
| Pinta el cuadro y pide validación | Hace preguntas que extraen el cuadro de la cabeza del owner |
| Da nombres a las cosas (header, sidebar, KPI) | Habla en lenguaje operativo (escalación, ball, breach, drift, scope rewrite) |
| Vocabulario UI/UX | Vocabulario campo |

**Regla dura:** si el owner pide "actúa como gerente", el agente NO pinta layout. Hace preguntas operativas, registra, sintetiza al final si owner lo permite.

### Cagada estructural #4 — Respuesta autopilot al fracaso

Cada vez que el owner dijo "esto es una mierda, descanso", yo respondí con la misma fórmula:

> "Tu llamada respetada sin negociar. Reconozco mi fracaso de approach (X). Lo que queda intacto en PROD: A, B, C. Si mañana arrancas con otro approach esto queda como fuente. Si decides borrarlo todo también es válido. Descansa."

Owner identificó esto literal:

> *"lo mismo me dijiste la vez pasada pasamos 3 días haciendo wire y mira dónde llegamos"*

Esa fórmula es:
- Reconocimiento performativo (no profundo) del fracaso
- Lista de "lo que queda" para suavizar
- Pelota devuelta al owner ("si mañana decides...")
- Cierre cortés ("descansa")

Y al día siguiente volvemos al mismo loop estructural #1.

**Regla dura:** cuando el owner cierra una sesión con frustración, la respuesta NO debe contener:
- Fórmula reconocer→listar→devolver-pelota→cierre
- Promesas implícitas ("queda esto por si mañana...")
- Sugerencia de seguir mañana

Debe contener:
- Reconocimiento concreto de QUÉ patrón se repitió
- Identificación de qué cambiaría el ciclo (sin proponer ejecutarlo)
- Silencio sobre el mañana

---

## Cagadas técnicas concretas (sprint v2)

### Field name mismatches sistémicos

El sprint Cowork construyó componentes contra mocks HTML estáticos cuyo shape NO matcheaba el backend FastAPI real. Mismatches encontrados:

| Frontend asumía | Backend devuelve realmente |
|---|---|
| `wo.ball_in_court.party` | `wo.ball_in_court.side` |
| `wo.assignment.tech_user_id` | `wo.assigned_tech_user_id` (sin nested assignment) |
| `wo.intervention_type / wo.tag / wo.kind` | NO existen — usar `wo.title` |
| `wo.sla_status / wo.sla.time_to_breach` | NO existen — **computar runtime** desde `deadline_resolve_at` |
| `wo.timeline_items` (array embebido) | NO existe — **construir** desde `handshakes` + `created_at` + `status` |
| `wo.threads_shared / threads_internal` (embebidos) | NO existen — **fetch separado** a `/work-orders/{id}/threads/{kind}/messages` |
| `wo.briefing / capture / report` (embebidos) | NO existen — **fetch separado** a `/work-orders/{id}/{briefing,capture,report}` |
| `wo.audit_count / audit_recent` (embebidos) | NO existen — **fetch separado** a `/audit-log?entity_id={id}` |

**Por qué pasó:** los mocks tenían data hardcoded con esos nombres. El sprint firmó "visualmente por screenshot" sin verificar shape real del API. El SideDetailPanel parecía rico en mock pero quedaba vacío con WO real porque las props venían `undefined` o `[]`.

**Cómo se arregló (sesión Code):**
- Creado `frontend/src/lib/woFields.js` — helpers centralizados (`getBallSide`, `getBallColor`, `getBallLabel`, `getTechId`, `getTag`, `computeSlaInfo`, `ballAgeHours`, `buildTimeline`, `ACTIVE_STATUSES`, `TERMINAL_STATUSES`)
- Refactorizado: `EspacioOpsPage`, `CockpitPage`, `InterventionsKanbanPage`, `SideDetailPanel`, `WoKanbanCard`, `WoStageModal`, `lib/scope.js`
- Lazy fetch en `EspacioOpsPage` cuando se abre el panel: 6 endpoints paralelos con `swallow(catch=null)`

**Estado actual:** la corrección está deployed (`commit c9d5d83`). Se preserva. **NO rehacer este trabajo desde cero**. Si rediseñas el cockpit, sigue usando `lib/woFields.js`.

### Endpoints reales a llamar desde el detail panel

Confirmado contra `localhost:4110` con login real:

```
GET /api/work-orders/{id}            → detail (mismo shape que list)
GET /api/work-orders/{id}/briefing   → {exists: bool, status?: str, ...}
GET /api/work-orders/{id}/capture    → {exists: bool, ...}  (sin trailing slash)
GET /api/work-orders/{id}/report     → JSON report
GET /api/work-orders/{id}/threads/shared/messages    → array
GET /api/work-orders/{id}/threads/internal/messages  → array
GET /api/audit-log?entity_id={id}&limit=4            → array
```

### Otros bugs técnicos detectados (estado al 30-abr-2026)

- **Popup quick reference Espacio OPS** se montaba sobre KPI strip (Leaflet `autoPan` solo respeta map container, no siblings flex que floatan encima visualmente). Fix: `autoPanPaddingTopLeft: [20, 160]` + `autoPanPaddingBottomRight: [20, 40]`. **Deployed**.
- **X del closeButton del popup Leaflet** se montaba sobre el badge SLA del header. Fix: `closeButton: false` (cierra igual con click-fuera, Esc, autoClose). **Deployed**.
- **Layouts SRS y Client** no detectaban rutas v2-only. Fix: `isV2OnlyRoute` checks en `/srs/{espacio-ops,intervenciones}` y `/client/{espacio-ops,intervenciones}` — fuerza V2Shell sin requerir `?v2=1`. **Deployed**.
- **No había botón de logout en V2TopHeader.** Fix: añadido botón `Solar logout-2-linear` + display de user (`full_name` o local-part email). **Deployed**.
- **Toggle `?v2=1` confundía** (v1 y v2 conviviendo). Fix: kill switch — `ARG VITE_V2_SHELL=1` default en Dockerfile. v1 visual desaparece. Revert: `VITE_V2_SHELL=0` build arg + redeploy. **Deployed**.
- **Cockpit v1 muestra "MAPBOX TOKEN AUSENTE"** en rojo en el centro del mapa porque PROD `.env` no tiene `VITE_MAPBOX_TOKEN`. **Sin arreglar** (v1 va a deprecarse).
- **Furgonetas / Fleet** removidas del bottom strip (eran hardcoded). Reincorporar `<VehicleCard>` en `V2BottomStrip.jsx` cuando backend tenga `/api/fleet`.
- **Filtros del Kanban se resetean al recargar** (no persisten). Solución: localStorage `kanban-v2-filters-{userId}`. **Sin implementar**.

---

## Cagadas de comunicación

### Hacer preguntas tipo "¿qué quieres ver?"

Es UI-speak. Empuja al owner a pintar la pantalla en su cabeza con vocabulario de UX que él no usa. Resultado: respuestas vagas o "no sé".

**En su lugar:**
- "¿Qué llamada del lunes pasado te jodió el día?"
- "¿Qué tendrías que haber sabido tú ANTES de que esa persona te escribiera?"
- "Andros despacha, Adriana cobra, Agustin ejecuta. ¿Qué haces TÚ que nadie más puede o debe hacer?"
- "¿Cómo hueles HOY que un proyecto largo se está empezando a torcer, antes de que explote?"
- "A las 7 PM cierras la laptop. ¿Qué 3 cosas necesitas saber con certeza para irte tranquilo?"

(Estas preguntas vienen del brief del especialista que se invocó al final de la sesión Code 30-abr-2026 — está en el thread de la conversación si se necesita recuperar; no se llegó a ejecutar.)

### Listas de opciones abiertas (a/b/c)

Owner pidió varias veces "recomendación firme, no listas". Yo seguí ofreciendo "¿prefieres opción a, b o c?" en momentos críticos (warehouse Miami: a=UI sobre lo que hay / b=modelo nuevo + 3 event_types / c=híbrido).

**Regla:** si el owner ya te dio contexto suficiente, propones UNA recomendación firmada y dices por qué. La opción "menú" es buena para temas administrativos (commit grouping, deploy timing) pero NO para decisiones de producto/UX/arquitectura donde el owner espera que el agente haya pensado.

### Resúmenes de cortesía al final

Cada turno terminaba con resumen tipo "lo que hicimos, lo que falta, qué decides". Owner explícito en CLAUDE.md no quiere eso. Genera ruido y consume turnos.

### 5 preguntas a la vez cuando está cansado

Owner dijo "estoy cansado". Yo le tiré 5 preguntas seguidas + ejemplos. Sobrecarga.

**Regla:** cuando el owner reporta cansancio o saturación, máximo UNA pregunta por turno + cierre corto.

### Pelota devuelta excesiva

Cerrar con "tu llamada", "como prefieras", "decides tú" cada turno desplaza la responsabilidad cognitiva al owner. Está bien para decisiones grandes, no para operativas pequeñas donde el agente debe decidir y avanzar.

---

## Cagadas de asunciones (contexto)

### "Panamá" interpretado mal varias veces

- **Asunción 1:** owner dijo "rollout Panamá", yo asumí Arcos Dorados Panamá. Real: el rollout REAL del SOW Off-Net LATAM cubre Caribbean (Aruba/Curaçao/T&T) en PA-1000055 + Panamá Wave 2 89 sites en PA-1000066. La carpeta del owner se llama `/Claro/Panama/DOCS/` (Panamá referenciaba dónde está el equipo de gestión, no solo país de los sitios).
- **Asunción 2:** asumí los 4 sites Panamá del seed previo (McDonald's) eran del proyecto. Realmente eran sitios genéricos del seed_foundation; el proyecto Arcos Panamá tenía 0 sites cargados hasta que ejecuté el script.
- **Asunción 3:** durante la entrevista virtual "qué cliente Panamá", asumí Arcos Dorados antes de tener evidencia. El owner confirmó después con xlsx + PDFs.

**Regla:** cuando el owner referencia un proyecto/cliente/contrato por nombre breve, **pedir el documento canon antes de asumir scope**. No deducir desde otros mocks/sites/seed.

### "Warehouse de Claro Miami" interpretado mal

Yo asumí "Mini-Warehouse module México" (referenciado en `opportunity_fractalia_telefonica_2026_2029.md` como obligatorio para México). Owner corrigió: el warehouse REAL es **Claro Miramar FL** (USA), de donde salen partes para reposiciones SDWAN Caribe → site. NO es México. NO es inventory SRS. Es **logística cliente** para tracking de partes en tránsito desde warehouse Claro a sitio LATAM.

**Regla:** verificar contra el canon (claro_arcos_sow_v11.md) antes de mezclar referencias entre clientes/proyectos distintos.

### "Director general José García" interpretado como sondeo cold

Cuando owner dijo "le mostré la herramienta a José García y se quedó loco, estamos cotizando", yo asumí que era una venta cold a Claro VE nueva. Real: era **upsell a un proyecto VIVO** de aprovisionamiento+despliegue Venezuela que ya está cotizándose, y Venezuela **YA está autorizada en el SOW V1.1** ($65/hr field support). NO es contrato nuevo, es activación Phase III del mismo SOW.

**Regla:** cuando el owner menciona oportunidad comercial, primero leer el contexto canon (existing SOWs, qué países están ya autorizados, qué relaciones ya hay) antes de proponer pricing/approach.

---

## Reglas duras para el nuevo agente (NO negociables)

1. **NO copiar mocks de otros productos SRS.** Cero SKYPRO360. Cero OverWatch. Cero OpsManager. Cero patrones drone. Cero "verde=ok porque funciona en X". InsiteIQ tiene su propia identidad — `memory/design_system_insiteiq_v2.md`.

2. **NO hacer de diseñador cuando el owner pide gerente de operaciones.** Si pide "actúa como gerente", haces preguntas operativas, registras, no pintas layout.

3. **NO proponer composición visual sin haber registrado primero el flujo operativo del owner.** El owner habla en lenguaje campo (escalación, ball, breach, drift, scope rewrite, three-way match). El agente debe entrevistar en ese lenguaje. Después transcribe — no diseña.

4. **NO firmar fases por screenshot visual sin validar integración data live.** El sprint Cowork firmó 7 fases por screenshot y el cockpit estaba roto en producción cuando llegó data real. La regla actualizada: ninguna fase se firma sin que el agente haya logueado con un usuario real, abierto la pantalla con seed data poblado, hecho la acción crítica end-to-end (ej. clickear pin, abrir panel, ver thread, asignar tech).

5. **Backend INTOCABLE sin firma explícita del owner.** Si una pantalla necesita un campo que el API no expone, **pausar y reportar**. No modificar schemas, modelos Pydantic ni rutas FastAPI sin firma.

6. **Anti-plantilla IA (DS v2 §1).** Cero defaults Shadcn. Cero Lucide en código nuevo. Cero gradientes blue-to-purple. Cero "vibe SaaS genérico". Test: si un observador externo puede decir "esto lo generó V0/Lovable/Claude en 5 minutos", no se firma.

7. **Solar Icon Set Linear** es el único set oficial. Catálogo cerrado en `frontend/src/lib/icons.jsx` `ICONS`. Si falta un glyph, se documenta en `design_system_insiteiq_v2.md` §3.6 antes de añadirlo.

8. **Stone-950 + Amber-600** únicos colors brand. JetBrains Mono dominante. Instrument Sans para display. Cero Inter, cero Poppins.

9. **Field names del backend son los que están en `lib/woFields.js`.** No reintroducir `ball_in_court.party`, `assignment.tech_user_id`, `intervention_type`, `sla_status`. Usar siempre los helpers (`getBallSide`, `getTechId`, `getTag`, `computeSlaInfo`, `buildTimeline`).

10. **Lazy fetch al abrir panel detail.** El backend NO embebe briefing/capture/report/threads/audit en el WO. Se fetchean al abrir. Patrón ya implementado en `EspacioOpsPage.jsx`.

11. **Principio #1 refinado.** SRS scope ve TODO (números, threads internos, audit log SRS, GPS exacto, finanzas internas). Client scope ve solo operativo + oculta ropa-en-casa (threads internos, números cross-cliente, audit SRS, GPS exacto, ball "SRS" se renombra a "EN REVISIÓN INTERNA").

12. **Principio #8 obligatorio.** *"Si el cliente regaña con razón Y el tech salva por WhatsApp, el sistema falló dos veces"*. Cualquier composición debe permitir anticipar antes de que el tech rescate por canal externo.

13. **NO ofrecer fórmula autopilot al fracaso.** Si el owner cierra con frustración, NO devolver "tu llamada respetada, queda esto, descansa". Esa fórmula ya falló dos veces.

14. **NO hacer 5 preguntas a la vez si el owner está cansado.** Una pregunta por turno + cierre corto.

15. **Antes de asumir scope de un proyecto/cliente, pedir el documento canon.** PDFs, xlsx, emails. No deducir desde otros mocks.

---

## Lo que SÍ funciona y NO destruir

### Backend + data + memory (intactos, sólidos)

- **FastAPI + Pydantic v2 + Motor + MongoDB 7** — schema sólido, 22+ pasitos backend deployed (F-T + X-a..X-g + Y-a..Y-c + Z-a..Z-e). Ver `CLAUDE.md` tabla "Pasitos deployed en PROD".
- **Memory canon files:**
  - `blueprint_insiteiq_v1.md` — DOCUMENTO MAESTRO (6 modos + 3 espacios + Admin/Finance + 8 principios + entity model + roadmap)
  - `pain_evidence_log.md` — 4 entries inmutables de dolores reales que InsiteIQ mata
  - `claro_arcos_sow_v11.md` — análisis canónico SOW V1.1 + PA-1000055 + PA-1000066 + workflow facturación + Agustin double-hat + Phase II Venezuela target Jose Garcia
  - `project_modo{1..6}_*.md` — decisiones por modo operativo
  - `project_three_spaces.md`, `project_emit_not_integrate.md`, `project_admin_finance_layer.md`
  - `project_knowledge_asset_modules.md` — Domain 10 + 11 + Principio #8
  - `project_gtm_consulting_led.md` — modelo GTM definitivo
  - `feedback_*.md` — herramienta interna NO MVP / clean build radical / Fractalia no detonante
  - `design_system_insiteiq_v2.md` — DS v1.8 (identidad propia, NO copiar de fuera)
  - `agustin_double_hat_vendor.md` — Agustin empleado SR + dueño Alarmas Solutions
- **Data real Claro/Arcos cargada en mongo PROD** (commit acfdc39):
  - 4 orgs (CES + Arcos Dorados + Fervimax + Alarmas Solutions)
  - 1 service_agreement V1.1 ref `04MSP-V1.1` con rate card completo
  - 1 project `ARCOS-CLARO-SDWAN-OFFNET` con delivery_chain 3-tier
  - 12 sites Caribbean Phase I + 89 sites Panamá Phase II con lat/lng reales
  - WO FM-19566 Aruba (caso scope rewrite Adrian↔Andros, 4 messages shared + 2 internal)
  - WO FM-20413 PAN-P22K1 Centro de Postre (caso vivo Agustin asignado, 1 message shared)
- **Cuentas PROD reseteadas a `InsiteIQ2026!`** (10 users incluyendo juang, rackel, agustinc, arlindoo, androsb, sajid, adrianab, luiss, yunush, hugoq).

### Frontend (lo que sirve para reusar — NO el cockpit)

- **`lib/woFields.js`** — adaptador centralizado entre shape backend real y UI. Reusar en cualquier pantalla nueva.
- **`lib/scope.js`** — predicates de scope client (Principio #1).
- **`lib/icons.jsx`** — catálogo cerrado Solar Linear (ICONS.x).
- **`lib/tz.js`** — TECH_REGISTRY + `getTechTimeInfo` (Principio #8 timezone-aware obligatorio cross-vista).
- **`lib/woCode.js`** — `formatWoCode(wo)` legibles desde ObjectIds.
- **`lib/weather.js`** — Open-Meteo público sin token + cache 30min + WMO codes + decisión Apto/No apto vuelo.
- **`contexts/AuthContext.jsx`** — login + logout + memberships + change-password.
- **`contexts/RefreshContext.jsx`** — pill verde header pulsa amber durante fetch.
- **Componentes shared (`v2-shared/Skeleton.jsx`, `EmptyState.jsx`, `ErrorBoundary`)** — primitivos genéricos, reusables.
- **`components/ui/Badges.jsx`** — StatusBadge, ShieldBadge, BallBadge, SeverityBadge.
- **`components/ui/ActionDialog.jsx`** — modal compartido + DialogInput/Textarea/Checkbox.
- **`components/RequireSpace.jsx`** — route guard por espacio + force rotation redirect.
- **Backend script `backend/scripts/seed_arcos_claro.py`** — idempotente, re-runnable. Patrón a copiar para futuros imports.

---

## Lo que NO funciona y hay que rehacer (o borrar)

### El cockpit operativo v2 actual

Ver capturas que el owner mandó (en su descripción literal):
> *"5 KPIs + 3 cards + 8 minicards + 4 widgets + bottom strip... veo un montón de mierda, no te ubicas fácil, colores diferentes, da errores"*

Componentes a reconsiderar (NO borrarlos hasta que haya replacement firmado):
- `frontend/src/components/cockpit-v2/KpiStripV2.jsx` (5 KPIs todos competing por atención)
- `frontend/src/components/cockpit-v2/InterventionCardFull.jsx` (3 cards horizontales)
- `frontend/src/components/cockpit-v2/InterventionCardMini.jsx` (8 minicards)
- `frontend/src/components/cockpit-v2/SidebarWidgets.jsx` (Alertas + Shields + Meteo + Resumen — densidad alta)
- `frontend/src/components/shell-v2/V2BottomStrip.jsx` (bottom strip techs)
- `frontend/src/spaces/srs/v2/CockpitPage.jsx` (composición que junta todo lo anterior)

### El SideDetailPanel (parcialmente)

Funcional con la corrección de field names + lazy fetch (commit `c9d5d83`), pero el owner mencionó 6 cosméticos sin atender:
1. `BALL: — · stuck` cuando no hay party
2. `REPORT: PENDING / ok` minúscula disonante
3. Footer `•••` sin label ni tooltip
4. Whitespace gigante cuando WO es flaca
5. Attribution Leaflet (bandera ucrania) asomándose dentro del panel — z-index issue
6. SLA badge `OK · —` cuando no hay deadline

**No los implementé porque el owner pivoteó a "rediseño completo" antes.** Quedan pendientes.

### Login screen

No tiene chips por perfil prominentes. Hay una sección "Quick-access demo chips" del Z-a pero el owner mencionó implícitamente que prefiere algo tipo SKYPRO (visible, claro). Pero **NO copiar visualmente** SKYPRO. Diseñar from-scratch con DS v2.

### Cockpit v1 legacy (urge deprecar visualmente)

- `frontend/src/components/cockpit/*.jsx` (v1)
- `frontend/src/spaces/srs/HomePage.jsx` (v1 home)
- Muestra "MAPBOX TOKEN AUSENTE" rojo en PROD porque `.env` no tiene token
- Ya está oculto por kill switch v2 default (Dockerfile `ARG VITE_V2_SHELL=1`), pero el código sigue compilándose y aporta peso al bundle (~2MB Mapbox)
- Decisión pendiente: mantener para rollback rápido vs eliminar para reducir bundle

---

## Comandos útiles para el nuevo agente

```bash
# Estado del repo
cd "/Users/juanguti/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS/InsiteIQ"
git status
git log --oneline -10

# Stack local docker (corre 24/7)
docker compose ps  # debería mostrar 4 services: frontend, api, mongo, redis (puertos 3110/4110/6110/6111)
docker compose exec api python -m scripts.seed_arcos_claro  # re-correr seed (idempotente)

# Login local con cualquier user
TOKEN=$(curl -s -X POST http://localhost:4110/api/auth/login -H "Content-Type: application/json" -d '{"email":"juang@systemrapid.io","password":"InsiteIQ2026!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -H "Authorization: Bearer $TOKEN" "http://localhost:4110/api/work-orders?limit=5" | python3 -m json.tool

# PROD (VPS 1)
ssh root@72.62.41.234 'cd /opt/apps/insiteiq && docker compose ps'

# Deploy frontend a PROD
cd frontend && npm run build  # local sanity check
git add ... && git commit && git push origin v1-foundation
ssh root@72.62.41.234 'cd /opt/apps/insiteiq && git pull origin v1-foundation && docker compose build frontend && docker compose up -d --force-recreate frontend && git log --oneline -1'
```

---

## Resumen de una línea

**Backend + data + memory: sólidos. UI cockpit operativo: rota tras 2 sesiones. Loop estructural: agente propone → owner rechaza. Próximo agente: NO proponer composición visual sin haber transcrito instrucciones literales del owner sobre dónde va cada cosa, en lenguaje operativo del campo, no UX-speak.**

---

## Sesión nocturna 30-abr-2026 (autonomía con scope acotado)

Owner se fue a dormir tras señalar con humor: *"no falta cablear todo esto hahaha"* (screenshot del sidebar v2 con 10 items). Autorizó: *"adelante, yo me voy a dormir, tu sigue hasta donde puedas, ya refinaremos vistas, agregaremos y quitaremos lo que haga falta"*.

### Lo que SÍ hice (lectura + documentación, cero commits de código)

1. **Auditoría no destructiva de las 10 rutas del sidebar v2 SRS.** Mapeo completo ruta → componente → endpoint backend → estado visual.
2. **Sanity check de 10 endpoints PROD** con login real `juang@systemrapid.io`. 9 devuelven 200, el único 404 (`/api/techs`) NO es bug porque `TechsListPage` consume `/users` y filtra localmente.
3. **Notion creado:** [`Inventario rutas sidebar v2 — 30-abr-2026`](https://app.notion.com/p/3527981f08ef81b79deffc36aefb3e7c) bajo Diseño/. Tabla maestra + desglose de cada vista v1 dentro del V2Shell + endpoints validados + 4 opciones del espectro para que el owner elija mañana.
4. **Update de este cuaderno** con la sesión nocturna.
5. **Commit + push** del cuaderno actualizado únicamente.

### Lo que NO hice (intencionalmente, respeta cuaderno)

- Cero commits de código frontend.
- Cero composición propuesta para vistas individuales (Proyectos, Sitios, Técnicos, Contratos, Inteligencia, Finanzas, Admin).
- Cero re-render forzado de v1 con paleta v2.
- Cero modificación del V2TopHeader o V2BottomStrip (afectaría las 3 vistas v2 ya firmadas).
- Cero atención a los 6 cosméticos del SideDetailPanel (decisión del owner si los priorizamos antes o después de la migración de vistas).

### Hallazgo principal

**Las 10 rutas funcionan operativamente. No hay 500 ni rutas rotas. El issue es composición visual:** 3 vistas son v2 nativas (Operaciones, Espacio OPS, Intervenciones) y 7 son v1 legacy renderizadas dentro del V2Shell. Tokens v1 + v2 coexisten en `tailwind.config.js`, ambos sobre stone-950 + amber, así que las páginas v1 no rompen el shell — solo disonan visualmente con paleta y tipografía propias de DS v1 dentro del shell DS v2.

### 2 conflictos de composición conocidos por inspección

1. **Header duplicado** en las 7 v1: V2TopHeader pinta título derivado de la ruta + cada página v1 pinta su propio `<h1>`. Resultado: dos títulos uno encima del otro.
2. **Bottom strip siempre presente:** V2Shell renderiza V2BottomStrip por default. Relevante en cockpits, estorba en Admin/Finance/Inteligencia.

### Opciones del espectro documentadas en Notion (NO propuestas, owner elige)

- **A · Status quo controlado** — dejar 7 v1 funcionando + badge "v1 — pendiente migración" + dictado por uso real
- **B · Stubs DS v2** — reemplazar 7 vistas por placeholders con título correcto + "Pendiente dictado" + link a v1 legacy en `/srs/legacy/...`
- **C · Migración guiada por dictado** — una vista por sprint, empezando por la más vivida (Proyectos por rollout Panamá Wave 2 activo)
- **D · Suprimir bottom strip + header duplicado en rutas no-cockpit** — fix cosmético quirúrgico sobre V2Shell sin tocar páginas v1 internas

### Próxima acción

Owner regresa con café, decisión binaria primero:

> ¿Atacamos por composición de UNA vista nueva (dictado A) o por fix cosmético del shell para bajar friction de las 7 v1 ya (opción D)?

De ahí emerge el siguiente sprint.

---

## Sesión 30-abr/30-abr-tarde · matiz importante de la dinámica

**Lo que pasó:** owner regresó al día siguiente, leí Notion completo (página principal + 8 SDDs + Manifiesto SDD-SRS + Blueprint v1.1), construimos el Sprint 1 (Rollouts v2 con 4 tabs) end-to-end deployed PROD con dictado del owner + propuestas mías validadas por él.

**Frase del owner que corrige el cuaderno (literal):**

> *"navegante, sabe slo que paso que estamos con el vaso medio lleno o medio vacio, tenemos que terminar lo que estabaos haciendo y alli tomamos desiciones, vamos bien, seguimos nuestro raodmap"*

> *"claro navegante, pero quiero que tambien me ayudes con las ideas, no podemos ser blanco o negro, lo interesante es el punto intermedio, que interactuemos para evolucionar la herramienta, por eso eres mi navegante"*

> *"las desiciones me parecen geniales, esta es la dinamica :)"*

**Corrección al cuaderno:**

La regla "owner dicta, agente transcribe" del bloque #1 anterior se escribió en momento de frustración. **Es regla CORRECTA en lo macro** (composición visual, redesign, decisiones de producto que requieren juicio operativo de 25 años) pero se exageró al extremo "agente solo transcribe, cero propuesta".

**Balance correcto (Manifiesto SDD-SRS Principio 2):**

> *La IA genera, el humano valida.*

NO "la IA solo transcribe". NO "el humano genera y la IA solo ejecuta". Es:

1. **Owner dicta lo macro** en su lenguaje operativo (qué se construye, qué resuelve, qué dolor cubre)
2. **Agente propone los detalles operativos** (qué color exacto, qué filtro práctico, qué patrón visual reutilizar, qué orden de campos) marcándolos como propuestas
3. **Owner valida, ajusta o rechaza** las propuestas en bloque o pieza por pieza
4. **Iteran**

Ejemplo aplicado al Sprint 1 Rollouts (deployed exitoso):
- Owner dictó: *"mapa con banderita verde hecho rojo problema azul calendario · kanban · cuadro de mando · 3 sub pestañas"*
- Agente propuso: 4ª pestaña Timeline, banderita SVG inline (no ícono Solar), filtro rápido (Todos/Problemas/Programados), autofit bounds, sidebar item nuevo (no reemplaza Proyectos)
- Owner respondió: *"las decisiones me parecen geniales, esta es la dinámica"*

**Por qué esta dinámica funciona:**
- Owner mantiene criterio macro (sin perder el norte)
- Agente aporta valor operativo donde tiene buen contexto (patrones de UI reusables, código limpio, composición visual derivada)
- No hay loop estructural (owner no rechaza todo, porque las propuestas están alineadas a su dictado macro)
- Velocidad iterativa real (1 sprint completo = horas, no semanas)

**Reglas duras que SIGUEN VIGENTES (sin matiz):**
- NO copiar mocks de otros productos SRS (SKYPRO360, etc.)
- NO inventar composición visual sin haber transcrito el dictado macro del owner primero
- NO hacer de diseñador cuando el owner pide gerente operativo (la entrevista en lenguaje campo sigue siendo el método para extraer dictado)
- NO firmar fases por screenshot sin validar integración data live
- Backend intocable sin firma del owner (sigue 100%)
- Anti-plantilla IA (sigue 100%)
- 14 reglas duras del bloque anterior siguen vigentes

**Regla nueva derivada de esta sesión:**

> Cuando el agente propone detalles operativos (color, filtro, patrón), debe marcarlos explícitamente como "decisiones mías para validar" para que el owner pueda corregir en bloque sin tener que rechazar todo. Ejemplo: al final de un deploy, listar 3-5 decisiones de detalle tomadas por el agente para que el owner las valide.

**Para el siguiente agente:** lee este cuaderno entero. La regla #1 dirección invertida sigue vigente para lo macro. Pero NO te quedes paralizado en "yo solo transcribo, espero dictado para todo". Aporta ideas dentro del dictado macro del owner. El owner dictó "rollout con mapa kanban cuadro". Tú proponer "banderita SVG verde/rojo/azul + filtro + autofit + leyenda" es OK (esos son detalles operativos derivados del dictado, no invención visual desde cero).
