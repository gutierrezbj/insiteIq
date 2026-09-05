---
name: Sprint Afinar — plan operativo semana 2026-05-27
description: Sprint dedicado a cerrar la grieta entre "el sistema funciona" y "el equipo lo usa de verdad". Firmado por owner JuanCho al cierre de la sesión 2026-05-20 tras la primera vuelta Modo 1 completa con caso real TOUS Pembroke. Notificaciones cross-rol + path cristal clear + Top 5 mejoras UX/UI senior dev.
type: sprint_plan
---

# Sprint Afinar — plan operativo

> **Sprint dedicado a cerrar la grieta entre "el sistema funciona" y "el equipo lo usa de verdad".**
> Firmado por owner JuanCho al cierre de la sesión 2026-05-20.

---

## ⚡ ESTADO DE EJECUCIÓN · actualizado 2026-08-31

**Tramo A (bloqueantes duros pre-operaciones) · 2026-08-31 mañana:**
- ✅ `f36a3ee` Crear WOs desde la UI (IntakeWorkOrderAction montado en Kanban · VALIDADO por owner)
- ✅ `df3836f` 3 enlaces rotos (chat tech CONSTRUIDO · sidebar client podado)
- ✅ `e255e66` Hardening (fail-fast JWT + rate limit login VERIFICADO con 429 real + .env.example completo)
- ⏳ SMTP · pendiente credenciales del owner (email worker en NoOp)

**Tramo B (este sprint) · 2026-08-31 tarde:**
- ✅ `cabad12` **B1 · Backend notificaciones** · modelo + notifier service + 4 endpoints + triggers en advance/briefing/capture/threads · VERIFICADO E2E en PROD (ack demo-tech → notif demo-coord)
- ✅ `bc9e59e` **B2 · Campanita header** · badge polling 30s + dropdown feed + mark read + ball_to_me amber · visible en los 3 espacios
- ✅ `c66947a` **B3 · Path cristal clear** · PendingOfYouBlock ("Pendiente de ti · N acciones" con CTAs) + halo amber "TE TOCA A TI" en cards
- ✅ `63e9052` **B5.3 · Compound sort** · urgencyScore = severity × ball_age en cockpit + espacio ops
- ⏳ **B4 · WebSocket** (upgrade del polling) · pendiente validación de B1-B3 primero
- ⏳ **B5 restantes** · hover preview cards · inline quick actions · tabular-numeric CSS global

**Pendiente de validación del owner:** B1+B2+B3+B5.3 en PROD · guion en el chat de la sesión 2026-08-31.

**Auditoría E2E operativo (sesión 2026-09-05) · 4 huecos cerrados:**
- ✅ `fcf520a` Iter 1 · modal de advance del WO Detail expone tech + fecha programada en transiciones tempranas (el backend ya los aceptaba · solo faltaba UI)
- ✅ `2c35d25` Iter 2 · POST /work-orders/{id}/assign · reasignar tech / reprogramar SIN transición de estado (SRS only · audita · notifica ball_to_me al tech nuevo) + AssignAction en la ActionBar · VERIFICADO E2E en PROD
- ✅ `aac475a` Iter 3 · botón reporte del modal Kanban navega al informe (era stub con toast)
- ✅ `6c81e12` Iter 4 · informe = entregable PDF para el cliente (decisión owner 2026-09-05: "el informe es para cliente, no lo puede modificar, sería PDF") · botón PDF ↓ abre el HTML autenticado y lanza impresión · HTML ↗ / CSV ↓ ahora con Bearer (antes 401 por `<a href>`) · CSS `@page` A4 + `@media print` en report_assembler · DEPLOYED · el informe se ensambla al cerrar el WO (Pembroke sigue en resolved → botón PDF pendiente de validar tras el cierre)

**Reanclaje 2026-09-05 · "volver a la app pensada al inicio" · Tramo 1 (firmado por owner):**
- Diagnóstico: 0 uso real desde 2026-05-20 (audit_log) · features sin operación dentro · lección #16
- Decisión owner: afinar sobre la base actual, NO reiniciar · producto modular en 3: **Administración · Operaciones · Coordinación** · cada módulo necesita info de los otros para CERRAR su parte, no para continuar
- ✅ `e2a4536`+`7d0d143` McDonald's Panamá REAL cargado desde la hoja de Andros (`Hoja de control Panama/…25-04-26.xlsx`): org Claro CES + Arcos + Alarmas · SA 04MSP-V1.1 · project `ARCOS-CLARO-SDWAN-OFFNET` · 57 sites PA (52 con coordenadas vía lista SOW) + 12 Caribe · 58 WOs (51 cerradas · 7 canceladas) con status_timestamps reales · 63 equipos Cisco con serial + evento installed · coordinador Andros · cluster lead Agustín
- ✅ `a024ab7` `deactivate_user.py` · Luis Sánchez dado de baja (is_active=False · sin borrar) · Pembroke reasignada a Andros
- ✅ `e764fdb` Informe de intervención en español calcado del docx que el owner hizo a mano para Pembroke · resumen de cierre (notas del coord al cerrar) · anexo fotográfico incrustado en el HTML/PDF (fotos de la captura como data URI · antes 401 en ventana nueva)
- ⏳ Owner: cerrar Pembroke desde Pendiente de ti (ya con Andros como coord) → primer informe real · datos de Dadeland (qué pasó y cuándo) para cerrarla/cancelarla · SMTP en `.env`
- ⏳ Tramo 2: cierre del rollout McDonald's dentro del sistema (definir alcance real vs 101 del SOW · hoy dashboard 50.5%) + entregable de cierre para Claro + espacio Cliente listo para la demo a Grupo Claro
- ⏳ Tramo 3: vertical survey (Venezuela · Panamá · Caribe) = primer proyecto que nace dentro
- ❄️ Congelado hasta terminar 1-3: finanzas, insights/AI, F4E, WebSocket, hover cards, dashboards de eventos, ambiente demo Aurora (sale del login)

**Snapshot:** 2026-05-20 · v1.0
**Fechas tentativas:** semana 2026-05-27 al 2026-05-31
**Owner:** JuanCho
**Espejo en Notion:** página `🎯 Sprint Afinar · plan operativo semana 2026-05-27` (hija del hub InsiteIQ)

---

## Por qué este sprint existe

Durante la sesión 2026-05-20 hicimos la primera vuelta completa Modo 1 end-to-end con caso real (TOUS Pembroke · Iduber Montes tech · cliente Fervimax). El sistema **HIZO lo correcto** en cada paso. PERO el equipo quedó con 2 quejas estructurales:

> *"Somos muchos y no sabemos ni nos notifican · eso es fundamental."*
> *"El path de la incidencia debe ser cristal clear."*

Sin estos 2 ejes, el sistema queda como "buena DB con UI bonita". El equipo SIGUE en WhatsApp porque InsiteIQ no les llama la atención y no les dice qué hacer. **El Modo 1 "WhatsApp kill day 1" del Blueprint NO se cumple sin esto.**

Se suman mejoras UX/UI senior dev (estudio del mock OverWatch) con foco operativo: tabular-numeric · hover preview · compound sort · inline actions · WebSocket.

---

## 2 prioridades acopladas (MUST bloqueante)

### Prioridad A · Notificaciones cross-rol

Eventos disparan notifs automáticas a los roles que necesitan saber.

**Triggers iniciales (MVP):**
- Tech acked briefing → notif a coord SRS responsable
- Tech resolved → notif a coord SRS · "te toca cerrar"
- Coord closed → notif a Adriana (finance) · "WO listo para pre-invoice"
- Drift llegada > 30min → notif a coord
- scheduled_at se aproxima (1h antes) → notif al tech
- Mensaje recibido en thread → notif a participantes
- Briefing nuevo creado → notif al tech asignado
- WO sin asignar > 24h → notif a ops director (Sajid/Juan)

**Canales:**
- In-app: badge count en sidebar + dropdown campanita top-right (siempre)
- Email: vía outbox que ya existe (falta SMTP_HOST en `.env` VPS)
- PWA push: fase 2

**Modelo backend nuevo:** `notification` collection con `user_id` (destinatario) · `event_type` · `entity_type` · `entity_id` · `title` · `body` · `ball_to_me` (bool) · `cta_url` · `read_at` · `created_at`.

**Endpoints:**
- `GET /api/notifications?unread_only=true`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`
- `WS /api/notifications/stream` (Prioridad #5 abajo)

### Prioridad B · Path cristal clear · "TE TOCA A TI"

Cada rol al login debe ver en menos de 3 segundos: *"estas N cosas dependen de ti AHORA"*.

**Cambios:**

1. **Bloque "Pendiente de ti" arriba del Home/Cockpit** · lista compacta de items donde ball=current_user. CTAs directos sin pasar por Detail. Por rol:
   - SRS coord: cerrar WOs resolved · triage WOs nuevos · aprobar parts · escalar alertas critical
   - Tech: ack briefing · salí · llegué · termina
   - Client coord: aprobar parts · firmar cierre (sign-off NOC)
   - Finance: revisar pre-invoices · vendor invoices pendientes match

2. **Halo amber o ribbon "TE TOCA"** en cards del cockpit cuando ball=tú. Visible al escanear sin leer.

3. **Botón gigante navy de la acción siguiente** al tope del WO Detail (como en PWA Tech 64px). ActionBar queda como "más opciones" colapsable.

4. **Badge count en sidebar**: "Operaciones · 3" · "B&F · Intervenciones · 2" · etc. Crisp tabular-numeric.

5. **Empty states que enseñan**: "0 pendientes · ver resueltas hoy [12]" con CTA.

---

## Top 5 mejoras UX/UI senior dev (mismo sprint)

ROI operativo máximo. Referencias: Bloomberg Terminal · Linear · Datadog · PagerDuty.

### #1 · Tabular-numeric mono en TODAS las cifras

CSS 1-líner:
```css
.num { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', monospace; }
```
Aplicado a: tiempos · fechas · counters · drift · time-on-site · SLA · IDs cortos · counts.

**Esfuerzo:** 30 min · **ROI:** enorme.

### #2 · Hover preview cards · info densa antes del click

Componente `<HoverPreview>` que muestra tooltip rich al hover (300ms delay) con WO ref + cliente + site + tech + ball + age + severity. Aplicar a: lista eventos · cockpit cards · Kanban cards · markers del mapa.

**Esfuerzo:** 2-3h · **ROI:** alto.

### #3 · Compound sort default · severity × ball_age

Función `urgencyScore(wo)` = severity_rank * ball_age_hours. Aplicar a: cockpit · Kanban · Espacio OPS · alerts panel.

**Esfuerzo:** 1h backend + 30min frontend · **ROI:** alto.

### #4 · Inline quick actions sin modal (happy path)

Botón directo "AVANZAR A X" en card del cockpit + header del WO Detail. Modal con notas queda como "más opciones". Aplicar a happy path: triage→pre_flight · pre_flight→dispatched · en_route→on_site · resolved→closed.

**Esfuerzo:** 3-4h · **ROI:** alto.

### #5 · WebSocket para alertas + notifs

FastAPI WebSocket nativo. 1 channel por user. Push real-time de: nueva alerta · WO status change · briefing acked · thread message · notif nueva. Frontend conecta al login + reconnect on drop sin perder estado.

**Esfuerzo:** 1 día backend + 4h frontend · **ROI:** transformador.

---

## Decisión confirmada visualmente (demo 2026-05-20)

### Toggle Filas ⇄ Cuadrícula en la lista de eventos · CONFIRMADO

Owner pidió "tarjetas cuadradas más pequeñas". Tras construir demo con toggle (`mocks/insiteiq_eventos_v2_grid_demo.html`) y comparar ambos modos en vivo, owner aprobó: *"pusiste los 2 mundos jajaja"*. Decisión:

- **Toggle Filas ⇄ Cuadrícula** visible siempre (arriba-derecha de la lista de eventos)
- **Default automático**: Cuadrícula si >12 eventos (modo alarma · pared de luces) · Filas si ≤12 (modo trabajo · más contexto + acción inline)
- **Recordar preferencia manual** en `localStorage` (mismo patrón validado que los filtros del Kanban · ver `useLocalStorageSet`/`useLocalStorageBool` en InterventionsKanbanPage)
- Filas = worklist (más info · acción inline cómoda) · Cuadrícula = monitoreo (densidad · glance "qué está rojo" · click abre panel lateral)
- Halo amber + ribbon "TE TOCA" funciona en ambos modos

Mock de referencia visual 1:1 para construir: `mocks/insiteiq_eventos_v2_grid_demo.html` (los dos modos en un solo HTML con toggle JS). El `mocks/insiteiq_eventos_v1_demo.html` es solo-filas (primera iteración).

---

## Bonus si queda tiempo (NO MUST)

### Densidad operativa (Bloomberg style)
- Truncate con tooltip · NUNCA wrap text en listas densas
- ~~Compact/comfortable mode toggle~~ → CONFIRMADO arriba como Filas ⇄ Cuadrícula

### Operational ergonomics
- Ball-in-court con time decay visible en cada card
- Recency-of-action indicator (dot pulsante si otro coord editó <2min)
- Bulk select + bulk actions

### States olvidados
- Empty states que enseñan
- Error states con next-step
- Loading skeletons matching layout (falta para lista eventos + dashboards)

### Accesibilidad
- No solo color para estados · siempre símbolo + color
- Focus rings visibles
- Min sizes: 14px datos · 16px CTAs · 12px solo mono caps/badges

### Performance percibida
- Stale-while-revalidate en routes ya visitadas
- Virtualization en listas >50 items
- Code splitting agresivo (WoDetailPage dynamic import)

### Telemetría + reporting
- Heap o PostHog autohospedado · operativa real
- Bug reporting in-app 1 click desde el panel ErrorBoundary
- Onboarding contextual · tooltip tour primera vez por rol

---

## Layout dashboard de eventos/alarmas (estudio · referencia · NO construir en este sprint)

Mock OverWatch del owner 2026-05-20 · lectura del **layout** solamente.

**Lo que rescatamos:**
- Grid 3 zonas
- Lista vertical con barras de progreso para time-in-ball
- Sparklines mini-cards para tendencias

**Layout invertido propuesto:**
```
[ header horizontal fino                                              ]
[ sb │ KPI │ KPI │ KPI │ KPI │ KPI │                                  ]
[ v  ├────────────────────────────────┬───────────────────────────────┤
[ e  │                                │                                │
[ r  │ LISTA VERTICAL EVENTOS         │ MAPA (con mini-map PIP)        │
[ t  │ ~60% ancho                     │ ~40% ancho                     │
```

**Diferencias respecto al mock:**
- Lista vertical PROTAGONISTA (60%) · mapa secundario (40%). Inverso al mock.
- Mapa con mini-map PIP en lugar de 2 mapas apilados.
- Bottom strip de KPIs fusionado con top cards (una sola tira horizontal arriba).

**Cuándo construir:** DESPUÉS del sprint Afinar. Sin notifs el dashboard es opaco.

---

## Orden de ejecución sugerido (ITERATE > BUNDLE)

Cada item es 1 commit · 1 deploy · validación del owner · siguiente.

| Día | Items |
|---|---|
| Lun | SMTP config `.env` VPS (5 min) + Welcome email worker Iter B (~2h) |
| Mar | Modelo `notification` backend + endpoints REST + UI badge sidebar + dropdown campanita (~6h) |
| Mié | Triggers backend (resolved · closed · briefing_acked · drift · message) (~4h) + WebSocket FastAPI + frontend connect (~4h) |
| Jue | Path cristal clear: bloque "Pendiente de ti" por rol + halo amber + botón gigante WO Detail (~7h) |
| Vie | Top 5 senior dev: tabular-numeric + compound sort + inline actions + hover preview (~6h) |
| Sab/Dom | Validación owner + ajustes según feedback del equipo |

**No es plan rígido.** Owner decide orden al arrancar lunes según urgencias del equipo (Andros · Adriana · Iduber feedback). Lo importante: **ITERATE · 1 cambio · 1 deploy · validar**.

---

## Lo que NO entra en este sprint

Por disciplina del filtro "gerente operativo pragmático":

- Dashboard de Eventos/Alarmas estético tipo OverWatch · post-Afinar
- Search global por serial (Q12 Agustín)
- Bloque equipos por Site Detail (Q13 Agustín)
- AI proactive recommendations (Q15 Agustín)
- Caso Agustín + rollout · firmado pero diferido a post-Afinar
- Refactor visual masivo · cero "hacer todo bonito" sin firma puntual (lecciones #1-#4 donde_la_cagamos)

---

## Definición de éxito · checklist al cierre del viernes

- [ ] Andros recibe email + badge in-app cuando Iduber termina una WO
- [ ] Adriana recibe notif cuando una WO se cierra (lista para pre-invoice)
- [ ] Iduber recibe notif cuando le asignan briefing nuevo
- [ ] Al entrar al cockpit veo arriba "Pendiente de ti · 3 items" con CTAs directos
- [ ] Las cards con ball=yo se destacan visualmente sin leer texto
- [ ] Los números están alineados verticalmente en cualquier lista
- [ ] Hover sobre un WO en el cockpit muestra info densa antes del click
- [ ] Avanzar status de happy path es 1 click · no 2
- [ ] Las listas están ordenadas por urgencia compuesta (severity × ball_age)
- [ ] El cockpit se actualiza en tiempo real sin refresh manual

≥7/10: sprint exitoso. <7: iter siguiente.

---

## Para el agente que arranque lunes

**Lectura previa obligatoria (en este orden):**
1. `memory/donde_la_cagamos.md` (15 lecciones · sobre todo #9 ITERATE > BUNDLE)
2. Este documento (`memory/sprint_afinar.md`)
3. `PROJECT_STATUS.md` (estado live)
4. `memory/sprint_pre_uso_real_v2.63.md` (contexto sprint anterior)

**Primer turno tras login:**
1. Verificar PROD verde con `curl -sI https://insiteiq.systemrapid.io`
2. Pedir al owner: "¿arrancamos lunes con SMTP + Welcome email o saltamos directo al modelo notification?"
3. NO empezar nada sin firma. NO empacar. Default ITERATE.

**Recordatorios duros:**
- Toda ruta nueva en App.jsx → envolver en `<V2View>` (lección #11)
- Toda operación destructiva PROD → DRY-RUN + whitelist (lección #10)
- Toda defensa (ErrorBoundary · logs) → funciona IGUAL en PROD que DEV (lección #12)
- Field names backend↔frontend → grep antes de cerrar commit (lección #15)
- Cuando el equipo reporte bug → pide "Ver detalle técnico" del panel naranja directamente (lección #14)

---

*Plan redactado 2026-05-20 al cierre de la sesión primera-vuelta-Modo-1. Owner aprobó "esta semana que viene le metemos duro". Documento vivo · editar al arrancar lunes si el orden o el alcance se ajustan.*
