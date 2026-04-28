# InsiteIQ Design System v2 — Merge OverWatch + SKYPRO360

> **Status:** Draft 1.7 · 2026-04-24 · Supersede la Identity Sprint v1 (war-room / amber) que fracasó en los 3 intentos de cockpit operativo documentados en `PROJECT_STATUS.md`. Icon set cerrado: Solar Linear. **Arquitectura corregida: ambas vistas SRS son dark; la diferencia entre Cockpit y War Room es estructural (cards+widgets vs mapa+detail), no de paleta.** Referencia validada 1:1 con SKYPRO360 OpsManager en PROD.
>
> **Fuente:** Merge de dos productos SRS en producción:
> - **OverWatch** (`overwatch.systemrapid.io`) — Kanban drag-and-drop, modales context-aware por stage, header dark, mapa con panel izq alertas + panel der detalle.
> - **SKYPRO360 OpsManager** (`skp360mgr.systemrapid.io`) — KPI strip con números gigantes, cards con border-top color, sidebar izq con nav minimalista, mapa light con pins etiquetados, compliance + analytics patterns.
>
> **Principio rector:** no se inventa visual nuevo. Se adoptan patrones ya validados en producción en dos apps SRS y se mapean 1:1 al dominio field services IT. Consistency cross-ecosystem, no app aislada.
>
> **Pendiente:** extracción de tokens reales vía Chrome DevTools de ambos productos. Los hex documentados aquí son aproximaciones derivadas de las capturas. Marcados `[tbd]` donde necesitan confirmación.

---

## 1. Identity Sprint v2

| Dimensión | v1 (fracasó) | v2 (merge) |
|---|---|---|
| Character | "War room meets luxury ops center" | "Operations control clean — field-hardened, no drama" |
| Color temperature | Neutral dark + warm amber | Light-first + cool cyan accent + dark header band |
| Primary | Amber/copper (#D97706) | Cyan tech (~#0EA5E9 `[tbd]`) |
| Background | Stone-950 warm black | White / gray-50 canvas + `#0A0A0A` header band |
| Signature detail | Accent-bar 3px amber izquierdo | Border-top 3px color-por-stage en cards |
| Motion | ease-out-expo + stagger | Se mantiene (Foundation SRS fija) |
| Typography | Instrument Sans + DM Sans + JetBrains Mono | **Se mantiene** (no está en blacklist, crea tensión correcta) |

**Character phrase extendida:** centro de coordinación operativa limpio, escaneable, sin decoración dramática. La información manda. El usuario viene a mover cosas adelante, no a admirar el UI.

**Regla dura #0 — Anti-plantilla IA:** InsiteIQ NO puede oler a "AI-vibe-coded SaaS plantilla". Cero defaults Shadcn/Tailwind genéricos, cero iconos Lucide/Heroicons, cero layouts AdminLTE, cero "cards con gradiente de moda". El test a aplicar en cada pantalla antes de firmar: si un observador externo puede decir "esto lo generó Claude/V0/Lovable en 5 minutos", no se firma. La diferenciación no es decorativa — es posicionamiento. Si se ve genérico, transmite que SRS opera genérico. No.

---

## 1.1 Arquitectura SRS dark · dos vistas estructurales

**Referencia validada:** SKYPRO360 OpsManager en PROD (`skp360mgr.systemrapid.io`), capturas "Cockpit de Operaciones" y "Espacio OPS" firmadas por owner 2026-04-24.

**Principio rector:** las dos vistas del espacio SRS comparten la misma paleta dark + misma tipografía mono dominante + mismo sidebar navegación. La diferencia es **estructural**, no cromática:

| Eje | Cockpit de Operaciones | Espacio OPS (War Room) |
|---|---|---|
| **Propósito** | Supervisión · vistazo rápido · control de cards · referencias claras | Acción geográfica · decisión sobre target · dónde está qué |
| **Protagonista** | KPI cards grandes + sección misiones activas + historial grid | Mapa (tiles Positron light) + pines + popup + panel lateral |
| **Sidebar derecho** | Widgets stackeados: Alertas operativas · Shields · Meteorología · Resumen | Usado como panel detail slide-in al click en marker |
| **Bottom strip** | Flota + personal con status dots y horas locales live | No aplica (mapa a pantalla completa) |
| **Topbar** | Título "COCKPIT DE OPERACIONES" + fecha + pill live | Compacto · pills contadores (En vuelo / Planificadas / Completadas / Drones / Pilotos / Live) |
| **Bloques de data** | Cards con border-top color stage + KPIs grandes con número cyan/amber + sparklines en sidebar | Pines pill con dot + código short sobre mapa · polígonos de zonas de trabajo · legend inferior de estados |
| **Tipo de sesión** | Revisión rutinaria · planificación turno · handoff | Despacho en vivo · resolución · coordinación spatial |
| **Interacción clave** | Click en card → abre detalle · filtros globales · búsqueda texto | Click en pin → popup quick ref · Click "Ver detalle →" → slide panel lateral derecho |

**La paleta es UNA para ambas vistas:** tokens `wr-*` (war room) aplican igualmente al Cockpit SRS. El nombre `wr-*` se mantiene por continuidad histórica pero el alcance real es "tokens dark SRS", aplicables a ambas vistas.

**El mapa es la única zona LIGHT dentro del shell dark** (tiles CartoDB Positron). Validado 1:1 con SKYPRO360. Razón: legibilidad geográfica + contraste de polígonos + labels de pines legibles sin esfuerzo.

**Regla de scope cross-espacio:**
- Tanto SRS como Client Coordinator acceden a Cockpit y War Room. La paleta es dark en ambos casos para ambos roles (misma shell, misma experiencia visual).
- Rackel (Fractalia) en War Room ve el mapa con SOLO sus sites; panel detail con SOLO sus WOs. Misma UI, data filtrada.
- Rackel en Cockpit ve KPIs de Fractalia (no SRS-wide), Shields de Fractalia, historial de Fractalia. Misma UI, data filtrada.
- Tech Field PWA no tiene ni Cockpit ni Espacio OPS en desktop — tiene vista mobile específica (briefing del día + WO en curso + captura on-site).

**Qué se oculta en Client scope (Principio #1 "la ropa se lava en casa"):**
- Threads internos SRS
- Números cross-cliente (margen SRS global, finanzas agregadas, P&L)
- GPS preciso del tech (solo se muestra "en ruta · ETA 14:20", no coordenadas)
- Audit log de acciones SRS internas
- AI provider internals, prompts, logs LLM
- Comisiones channel / JV

**Qué SÍ se muestra en Client scope (Principio #1 "operativo transparente"):**
- Dónde va el tech · tech asignado (nombre + rating)
- Acciones en curso
- Mapa de sus sites
- ETA real-time
- Cards con status
- Timeline de intervención
- Alertas de sus operaciones
- Todo lo que responde "¿qué pasa, quién, dónde, cómo?" sobre SUS operaciones

---

**Distinctiveness audit — aprobación v2:**
- Fonts no en blacklist.
- Cyan primary no es Tailwind default (`#0EA5E9` es sky-500 de Tailwind — a validar si exacto, si sí se shiftea 1 paso).
- Background blanco con personalidad vía header dark band + border-top colors por stage + sidebar derecho contextual.
- Firma visual: border-top color por stage se repite en cards + columnas Kanban + modales.
- Passes Template Test: un observador externo diría "es OverWatch/SKYPRO360 family", no "se parece a PagerDuty/Jira/Linear".

---

## 2. Foundation Tokens (heredados de SRS Nucleus v2.0, inmutables)

Spacing base 4px. Radius scale xs=4 / sm=6 / md=8 / lg=12 / xl=16 / 2xl=24 / pill=9999.
Z-index scale base=0 / raised=10 / overlay=20 / dropdown=30 / modal=40 / toast=50.
Durations instant=100 / fast=180 / normal=280 / slow=400 / slower=600.
Easings ease-out-expo (primario) / ease-out-back / ease-in-out-circ / ease-spring.
Motion: active=scale(0.97), small-fast / large-slow. Stagger wave 60ms entre items.

No se tocan. Esto es SRS Foundation, compartido con OverWatch, SKYPRO360, SA99, OttoIA, DroneHub.

---

## 3. Vertical Theme v2 (InsiteIQ específico)

### 3.1 Color system · modo COCKPIT (light)

**Base neutral (canvas y estructura):**

| Token | Hex `[tbd]` | Uso |
|---|---|---|
| `bg-canvas` | `#F9FAFB` | Fondo global desktop |
| `bg-surface` | `#FFFFFF` | Cards, modales, panels |
| `bg-surface-subtle` | `#F3F4F6` | Surfaces secundarias, filter tabs inactivos |
| `bg-header` | `#0A0A0A` | Header dark band OverWatch-style |
| `border-subtle` | `#E5E7EB` | Borders estándar cards/inputs |
| `border-strong` | `#D1D5DB` | Borders hover, dividers |
| `text-primary` | `#0F172A` | Títulos, números KPI |
| `text-secondary` | `#475569` | Body, labels |
| `text-tertiary` | `#94A3B8` | Metadata, timestamps |
| `text-on-dark` | `#F1F5F9` | Texto sobre header dark |

**Accent primary (cyan tech):**

| Token | Hex `[tbd]` | Uso |
|---|---|---|
| `accent` | `#0EA5E9` | CTAs primarios, links, focus ring |
| `accent-hover` | `#0284C7` | Hover |
| `accent-subtle` | `#E0F2FE` | Fill sutil, badges info |
| `accent-contrast` | `#FFFFFF` | Texto sobre accent |
| `accent-dark` | `#0C7EA4` | Accent para header dark (hover links nav) |

**Brand accent (verde SRS ecosystem — del logo OverWatch):**

| Token | Hex `[tbd]` | Uso |
|---|---|---|
| `brand` | `#10B981` | Logo, badge de bienvenida, success lenient |
| `brand-dark` | `#059669` | Hover brand, dot live status |

### 3.1b Color system · modo WAR ROOM (dark)

**Base neutral dark:**

| Token | Hex `[tbd]` | Uso |
|---|---|---|
| `wr-bg` | `#000000` | Background pleno, zonas de mapa, canvas global war room |
| `wr-surface` | `#0A0A0A` | Cards, popups, panel lateral, panel inferior |
| `wr-surface-2` | `#141414` | Hover state, cards con énfasis secundario |
| `wr-border` | `#1F1F1F` | Dividers internos, border estándar |
| `wr-border-strong` | `#2A2A2A` | Border hover, CTAs, inputs |
| `wr-text` | `#E5E5E5` | Body principal, valores destacados |
| `wr-text-mid` | `#9CA3AF` | Body secundario, labels de metadatos |
| `wr-text-dim` | `#6B7280` | Timestamps, metadata de fondo, labels caps |

**Accent amber (highlight de data, no decoración):**

| Token | Hex `[tbd]` | Uso |
|---|---|---|
| `wr-amber` | `#F59E0B` | KPI críticos, ball SRS, badges amber, CTA primary (bg amarillo + texto negro) |
| `wr-amber-soft` | `#D97706` | Hover amber, sub-estados |

**Semantic (heredados del sistema, ajustados para dark):**

| Token | Hex `[tbd]` | Uso |
|---|---|---|
| `wr-red` | `#DC2626` | Críticos activos, SLA breach, ball cliente |
| `wr-red-soft` | `#991B1B` | Hover red, backgrounds red 12% opacity |
| `wr-green` | `#22C55E` | SLA OK, operación saludable, live sync indicator |
| `wr-cyan` | `#06B6D4` | Threads shared client (para distinguir de amber internos) |
| `wr-violet` | `#8B5CF6` | Pre-flight state, parts warnings |

**Reglas de contraste War Room:**
- Numbers y data values siempre en `wr-text` (#E5E5E5), nunca en white puro.
- Labels caps siempre en `wr-text-dim` (#6B7280) con letter-spacing 0.14em.
- Highlights amber se reservan para: ball-in-court SRS, KPIs accionables (no informativos), headers de sección críticas. No decorativos.
- Background de badges siempre usa la misma familia + 22 alpha (ej `#DC262622` para red badge).

**Typography War Room:**
- Body default: `JetBrains Mono` · 11-13px · `font-variant-numeric: tabular-nums` global.
- Títulos grandes: `Instrument Sans` · 15-22px · solo en site names y modal titles.
- Labels caps: 10px + letter-spacing 0.14em + color `wr-text-dim`.
- Data tabular: JetBrains Mono con tabular-nums para que números alineen columnas.

---

### 3.2 Semantic stage colors (reglas del Kanban)

Colores que viven en `stage` del WO. Border-top 3px en cards + background header de columna Kanban + color del badge de stage + color del primary CTA en modal por stage.

| Stage InsiteIQ | Kanban column | Color token | Hex `[tbd]` | Rationale |
|---|---|---|---|---|
| `intake` | **Solicitadas** | `stage-intake` | `#3B82F6` azul | Recién llegada, sin trabajo |
| `triage` | **Solicitadas** (sub) | `stage-triage` | `#3B82F6` azul | Evaluación interna, mismo bucket |
| `pre_flight` | **Preparando** | `stage-preflight` | `#8B5CF6` violeta | Checklist + briefing SRS |
| `dispatched` | **Preparando** (sub) | `stage-dispatched` | `#7C3AED` violeta-dark | Tech notificado, briefing ack pending |
| `en_route` | **En campo** | `stage-enroute` | `#F59E0B` ámbar | Tech moviéndose |
| `on_site` | **En campo** (sub) | `stage-onsite` | `#EA580C` naranja | Intervención activa |
| `resolved` | **Cerrando** | `stage-resolved` | `#22C55E` verde claro | Pending sign-off cliente |
| `closed` | **Cerradas** | `stage-closed` | `#16A34A` verde | Terminal ok, report emitted |
| `cancelled` | **Canceladas** (hidden toggle) | `stage-cancelled` | `#6B7280` gris | Terminal negativo |

**Regla de sub-stage dentro de columna:** el card muestra badge del sub-stage exacto (ej: "Dispatched" dentro de columna "Preparando"). Esto respeta la realidad de 9 estados sin saturar el Kanban.

### 3.3 Priority system (directamente OverWatch)

| Priority | Token | Hex `[tbd]` | Treatment |
|---|---|---|---|
| Baja | `prio-low` | `#60A5FA` | Badge azul claro, uppercase label |
| Normal | `prio-normal` | `#475569` | Badge gris neutral |
| Alta | `prio-high` | `#F59E0B` | Badge ámbar |
| Urgente | `prio-urgent` | `#DC2626` | Badge rojo + warning icon |

Prioridad se muestra uppercase arriba a la izquierda del card (patrón OverWatch). No border-top. Border-top es stage, no prioridad.

### 3.4 Shield level system (InsiteIQ específico)

Heredado de `service_agreement`. Se muestra en card del WO con pill pequeño a la derecha del título del site.

| Shield | Token | Hex `[tbd]` | Tier |
|---|---|---|---|
| Bronze | `shield-bronze` | `#B45309` | Base |
| Bronze+ | `shield-bronze-plus` | `#D97706` | Fractalia default |
| Silver | `shield-silver` | `#64748B` | Mid |
| Gold | `shield-gold` | `#CA8A04` | Top |

Pill con icono `solar:shield-linear` (único icon permitido en pill, ver §3.6) + label. No confundir con prio.

### 3.5 Iconography rules (regla dura)

**Prohibido absoluto:**
- **Emojis Unicode en cualquier parte del UI** (labels, badges, toasts, empty states, headers, cards, tooltips, notificaciones, modals, alerts). Cero. Ninguno.
- **Iconos decorativos sin función semántica.** Si el icono se puede quitar sin pérdida de información, se quita.
- **Mix de icon sets.** Un único set: Solar Icon Set estilo Linear. No Lucide, no Heroicons, no Phosphor, no Font Awesome, no Material Icons, no SVG custom "por variedad".
- **Iconos como reemplazo de texto en CTA.** Un botón de acción lleva texto. Puede acompañarse de icono si clarifica, pero nunca solo icono (excepto casos específicos §3.6).
- **Iconos coloreados arbitrariamente.** El color del icono hereda del contexto (color del parent text o del stage/prio). No se pintan iconos de colores "decorativos".
- **Iconos "genéricos SaaS vibe":** caritas, estrellas decorativas, cohetes, rayos, checkmarks florecidos, iconos "playful". Nada.
- **Iconos redundantes en columnas Kanban.** La columna ya tiene título + color + counter. No icono adicional.

**Permitido, con disciplina:**
- **Icon set oficial: Solar Icon Set — estilo Linear.** Decisión cerrada 2026-04-24. MIT, 7800+ glyphs, stroke 1.5 round, carácter propio, poco usado en SaaS mainstream. Disponible vía Iconify (`@iconify-json/solar`) o SVG directo. Prefijo único: `solar:*-linear`.
- **Un único set** en todo InsiteIQ. No mix. Nadie puede agregar glyphs de otros sets "porque no hay en Solar" — si falta algún icon, se escala a decisión: o se crea custom alineado al stroke Solar, o se cambia el diseño para no necesitarlo.
- **StrokeWidth fijo 1.5** (default Solar Linear). No se modifica.
- **Tamaños fijos** (únicos permitidos):
  - 14px: inline con texto body (metadata, timestamps)
  - 16px: dentro de botones, dentro de inputs (search icon, chevron)
  - 20px: nav items del header
  - 24px: empty states, warnings grandes
  - 40px contenedor + 20px icon: KPI card icon wrapper (único lugar con color fill)
- **Color del icono** hereda del parent text color por default. Excepciones controladas:
  - KPI icon wrapper: fill color semántico, stroke blanco.
  - Warning icon en WO card: `prio-urgent` rojo si alerta SLA activa, si no no se muestra.
  - Stage icon en modal header (si aplica): color `stage-*`.

### 3.5b Icon set — decisión cerrada

**✓ CERRADO · 2026-04-24 · Solar Icon Set estilo Linear.**

Validación: comparación visual con Solar Broken + Iconoir lado a lado con 5 iconos clave (Search · Shield · AlertTriangle · Check · X) sobre card WO y KPI card InsiteIQ. Solar Linear lee más limpio incluso a 12px dentro del shield pill, preserva carácter propio sin parecer renderizado roto. Iconoir se descartó por vibe demasiado cercano a Heroicons/Feather genérico.

**Implementación técnica:**
- Vía Iconify (paquete `@iconify-json/solar`) + wrapper `<Icon icon="solar:nombre-linear" />` — permite lazy load del glyph sin cargar todo el set.
- Alternativa: descargar los ~60 glyphs del catálogo §3.6 como SVG individuales en `/frontend/src/assets/icons/` si queremos evitar dependencia Iconify.
- Decisión de implementación se cierra en paso 2 del Roadmap (mock Kanban).

**Sets descartados (para trazabilidad):**

| Set | Motivo descarte |
|---|---|
| Solar Broken | Corte intencional puede leerse como "render roto" a 12px en cards densas. |
| Iconoir | Cumple funcionalmente pero vibe es demasiado cercano a Heroicons/Feather — no diferencia lo suficiente. |
| Hugeicons | Free tier limitado, Pro requiere pago sin justificación vs Solar MIT. |
| Streamline HQ | Costo + lock-in sin ganancia clara vs Solar. |
| Custom set SRS | Ideal a largo plazo (cross-ecosystem real) pero impráctico ahora (~60 glyphs a diseñar). Queda en backlog post-v1.2. |
| Lucide / Heroicons / Material / Font Awesome | **Blacklist permanente § 9.** Genéricos SaaS default, vulneran Regla Dura #0 Anti-plantilla IA. |

### 3.6 Icons permitidos por contexto (catálogo cerrado · Solar Linear)

Todos los glyphs del catálogo pertenecen al set **Solar Icon Set estilo Linear**. Prefijo Iconify: `solar:*-linear`.

| Contexto | Función semántica | Glyph Solar | Tamaño | Color | Obligatorio? |
|---|---|---|---|---|---|
| Header nav items | (ninguno) | — | — | — | NO. Solo texto. |
| Search input | lupa / magnifier | `solar:magnifer-linear` | 16px | `text-tertiary` | Sí |
| Dropdown chevron | chevron down | `solar:alt-arrow-down-linear` | 16px | `text-secondary` | Sí |
| Filter pill (prioridades, etc) | (ninguno) | — | — | — | NO |
| KPI card · WOs activas | gráfico barras | `solar:chart-2-linear` | 20px / wrapper 40px | blanco sobre `brand` | Sí |
| KPI card · Programadas | calendario | `solar:calendar-linear` | 20px / wrapper 40px | blanco sobre `stage-intake` | Sí |
| KPI card · Técnicos en campo | usuario + pin | `solar:user-speak-linear` | 20px / wrapper 40px | blanco sobre `stage-onsite` | Sí |
| KPI card · Shields OK | escudo check | `solar:shield-check-linear` | 20px / wrapper 40px | blanco sobre `brand-dark` | Sí |
| KPI card · Briefings pendientes | documento check | `solar:document-text-linear` | 20px / wrapper 40px | blanco sobre `stage-preflight` | Sí |
| KPI card · Alertas SLA | campana | `solar:bell-linear` | 20px / wrapper 40px | blanco sobre `prio-urgent` | Sí |
| Warning en WO card | triángulo alerta | `solar:danger-triangle-linear` | 14px | `prio-urgent` | Solo si alerta SLA |
| Shield pill | escudo | `solar:shield-linear` | 14px | `shield-*` del pill | Sí |
| Modal close | X / close | `solar:close-circle-linear` | 20px | `text-secondary` | Sí |
| Map legend dots | (ninguno, solo dots) | — | — | — | NO |
| Map site marker | pin con check | `solar:map-point-linear` | 16px (dentro del rectangle label) | `stage-*` | Sí |
| Toast success | check circle | `solar:check-circle-linear` | 16px | `brand` verde | Sí |
| Toast error | círculo alerta | `solar:danger-circle-linear` | 16px | `prio-urgent` | Sí |
| Toast info | info circle | `solar:info-circle-linear` | 16px | `accent` cyan | Sí |
| Empty state · sin WOs | inbox vacío | `solar:inbox-linear` | 24px | `text-tertiary` | Sí |
| Empty state · sin resultados search | lupa cruz | `solar:magnifer-bug-linear` | 24px | `text-tertiary` | Sí |
| Empty state · sin alertas | campana muted | `solar:bell-off-linear` | 24px | `text-tertiary` | Sí |
| Nav overflow menu | tres puntos vertical | `solar:menu-dots-linear` | 20px | `text-secondary` | Cuando aplica |
| Refresh / reload | refresh | `solar:refresh-linear` | 16px | `text-secondary` | Cuando aplica |
| Arrow CTA interno (cross-module) | flecha derecha | `solar:arrow-right-linear` | 14px | hereda del texto | Cuando aplica |
| Logout user menu | logout | `solar:logout-2-linear` | 16px | `text-on-dark` | Sí |
| Dashboard badge header | panel | `solar:widget-5-linear` | 20px | `text-on-dark` | Sí |
| Avatar fallback (sin foto) | user circle | `solar:user-circle-linear` | 32px | `text-secondary` | Sí |
| Tech capture (mobile PWA) · cámara | cámara | `solar:camera-linear` | 20px | `accent` | Sí |
| Thread shared / internal | chat | `solar:chat-round-linear` | 16px | `text-secondary` | Sí |
| Clock / timestamp | reloj | `solar:clock-circle-linear` | 14px | `text-tertiary` | Cuando aplica |
| Asset / equipo | caja | `solar:box-linear` | 16px | `text-secondary` | Cuando aplica |
| Settings admin | tuerca | `solar:settings-linear` | 20px | `text-on-dark` | Cuando aplica |
| CTA button | (ninguno por default) | — | — | — | NO salvo excepción firmada |

Cualquier icono no listado aquí requiere decisión explícita y se agrega al catálogo. No se improvisa. Si un dominio nuevo requiere glyph fuera de Solar, ver §3.5b escalación.

### 3.6a Timezone-aware personas (regla obligatoria cross-vista)

**Principio rector:** cualquier UI que muestre a una persona humana (técnico, coordinador cliente, coordinador SRS, consultor) junto con un timestamp debe mostrar la hora en la **zona horaria de esa persona**, y debe hacer visible el contraste con la zona horaria del viewer. Sin excepciones.

Esto no es feature opcional. Es implementación directa del **Principio #8 del Blueprint v1.1**: _"si el cliente nos regaña con razón Y el tech nos salva de memoria, el sistema falló dos veces"_. Un coordinador cliente llamando al tech a las 3am hora local del tech es fallo de sistema, no de la persona.

**Dónde aplica (obligatorio):**
- Popup de marker en War Room cuando el WO tiene tech asignado.
- Panel lateral detalle (War Room o Cockpit) cuando se muestra el tech.
- Card del tech en listado "Técnicos en pista" del Cockpit.
- Thread messages: cada mensaje muestra la hora local del emisor (no la del viewer).
- Profile del tech (vista Técnicos).
- Widget "Cobertura global" del Cockpit.

**Estados de horario laboral (por tech, según su zona):**

| Estado | Condición | Color |
|---|---|---|
| `onduty` | workStart ≤ hora < workEnd (weekday) | `#22C55E` verde |
| `afterhours` | workEnd ≤ hora < 22 (weekday) | `#F59E0B` amber |
| `starting` | 6 ≤ hora < workStart (weekday) | `#06B6D4` cyan |
| `sleeping` | hora ≥ 22 o hora < 6 | `#DC2626` rojo |
| `weekend` | día = sábado o domingo | `#6B7280` gris |

**Dato mínimo a mostrar:**
- Hora local del tech en formato 24h + label de ciudad/zona (`15:30 Lima`).
- Pill de estado laboral (`EN HORARIO` / `POST-HORARIO` / `NO MOLESTAR · DURMIENDO` / `FIN DE SEMANA · NO MOLESTAR` / `INICIANDO JORNADA`).
- Hora del viewer + offset relativo (`Tu hora 21:30 Madrid · +6h de ti`).
- Si `onduty`: tiempo hasta fin de jornada (`fin jornada en 2h 30min`).

**Dato extendido (solo panel lateral, no popup):**
- Si `sleeping` o `weekend`: banner de escalación que indique el camino correcto para contactar fuera de horario (ej: _"No contactar salvo emergencia crítica · escalación vía Luis (Lima CET cover)"_).

**Implementación técnica:**
- Fuente de verdad: `TECH_REGISTRY` con `tz` (IANA Time Zone, ej `America/Lima`) + `workStart` + `workEnd` por cada tech.
- Cálculo live con `Intl.DateTimeFormat` + `timeZone` option. Zero libraries (no moment-timezone, no luxon — la API nativa basta).
- El contenido se regenera al abrir popup/panel (no se cachea en el bind inicial).
- En React: hook `useTechTimeInfo(techName)` que retorna `{techTime, status, label, color, offsetText, untilEndOfDay}` y re-renderiza cada 30s.

**Lo que NO se hace:**
- Mostrar solo una hora (la del tech o la del viewer) sin el contraste — el valor está en la comparación.
- Mostrar hora UTC directa al usuario — es opaca, requiere cálculo mental.
- Usar emoji reloj, luna o sol para representar estado — rompe §3.5 y no transmite el mensaje.
- Depender de la hora del navegador sin zona explícita — el tech puede estar viajando y la zona es la "timezone asignada", no la del device.

**Qué pasa si el viewer es el tech mismo:**
- No mostrar contraste (redundante). Mostrar solo hora local + estado.
- Aplicar en PWA tech (rutas `/tech/*`) con el mismo sistema.

**Nota de scope Principio #1:**
- La hora del tech se muestra en Client scope. No es "ropa en casa" — es operativo transparente. Rackel debe saber si Luis está durmiendo antes de escribirle. Es honestidad radical hacia el cliente.
- La ubicación GPS exacta del tech NO se muestra en Client scope (eso sí es opaco). Solo hora + estado laboral + zona.

---

### 3.6b Elementos funcionales de interacción (excepciones documentadas)

Estos **no son glyphs del set Solar**, son **marcas funcionales de UI** — equivalentes a un chevron de scrollbar, un checkbox custom, un drag indicator. No aplican las reglas de §3.5 (color hereda / un solo set / catálogo cerrado) porque no transmiten información semántica por sí mismos, solo señalan afordancia.

| Elemento | Función | Implementación | Tratamiento visual |
|---|---|---|---|
| **Drag handle 6-dots** | Afordancia de "esto se arrastra" en WO cards del Kanban | SVG inline custom, 2 columnas × 3 filas de circles (r=1.2, step 5.5px) | Base `#CBD5E1` · hover card `#64748B` · activo drag `#0EA5E9`. Posición: top-left de la card, antes del prio badge. |
| **Scrollbar column-interna** | Scroll vertical cards en columna Kanban | CSS `::-webkit-scrollbar` | Width 6px, thumb `#D1D5DB`, track transparente. |
| **Scrollbar kanban horizontal** | Scroll horizontal del board | CSS `::-webkit-scrollbar` | Height 10px, thumb `#D1D5DB`, track `#F3F4F6`. |
| **Drop zone outline** | Feedback visual durante drag activo | `outline: 2px dashed` + `outline-offset: -2px` | Ready: `#D1D5DB`. Target bajo cursor: `#0EA5E9` + fill `#E0F2FE`. |
| **Pulse dot** | Indicador live (contador WOs activas header) | CSS animation | Color `#10B981` (brand). Animación 1.8s scale+opacity. |
| **Focus ring** | A11y focus en inputs y buttons | `outline: 2px solid #0EA5E9` + `outline-offset: 2px` | Solo visible en `:focus-visible`. |

Cualquier elemento funcional nuevo que no sea glyph Solar se agrega aquí con su justificación. Si alguien quiere meter un "icon de estrella" o similar, no entra aquí — entra por §3.5b escalación (hay que cambiar el set, no parchar excepciones).

**Nota cross-ecosystem:** OverWatch mantiene su propio set de iconos vigente (incluidos los iconos de headers de columnas Kanban: reloj, avión, cámara, check, X). Esta decisión es InsiteIQ-only. SKYPRO360 mantiene los suyos hasta que se haga port formal.

---

## 4. Shell components

### 4.1 Top header (OverWatch-style, unificado SRS ecosystem)

Banda horizontal altura 56px, `bg-header` (`#0A0A0A`), padding horizontal 24px.

**Estructura izq → der:**
- Logo + product name + tagline muy pequeño (ej: `InsiteIQ · Field services control`).
- Nav items horizontal: `Cockpit · Intervenciones · Mapa · Sitios · Técnicos · Contratos · Finanzas · Admin` (scope por rol).
- Spacer.
- Contador global (ej: `142 WOs activas`).
- Dashboard badge con icono.
- Alertas badge con counter rojo circular.
- Avatar + nombre user + logout icon.

Text-on-dark color. Link activo: underline cyan accent 2px bottom. Hover: accent-dark text.

### 4.2 KPI strip (SKYPRO360 pattern enriquecido con icon cards OverWatch)

Fila horizontal de 4-6 KPI cards debajo del header en Cockpit + Compliance + Analytics.

**Anatomía de un KPI card:**
- Altura 92px, `bg-surface`, border `border-subtle`, radius md, padding 16px 20px.
- Grid 2-col: icon wrapper (40x40, radius sm, background color semántico + icono blanco) | stack (número gigante + label).
- Número: font-display 32px/semibold, `text-primary`.
- Label: font-body 13px/medium, `text-secondary`.
- Sub-label: font-body 12px/regular, `text-tertiary` (ej: "50% tasa éxito", "3 resueltas").

**Dominio InsiteIQ Cockpit:**
- WOs activas (verde brand)
- Programadas (azul stage-intake)
- Técnicos en campo (naranja stage-onsite)
- Shields OK (verde brand-dark)
- Briefings pendientes ack (violeta stage-preflight)
- Alertas SLA (rojo prio-urgent, si >0)

### 4.3 Sidebar izq (alternativa a header horizontal, para vista inmersiva)

Se usa **solo** dentro del Mapa Operacional (full-screen) y en PWA tech. Para Cockpit/Intervenciones/Compliance/Analytics se usa header horizontal.

Ancho 240px, `bg-surface`, border-right `border-subtle`. Icons Solar Linear (20px) + label. Item activo: `accent-subtle` fill + `accent` text + left border 3px accent.

### 4.4 Right contextual sidebar

Ancho 320px, `bg-surface`, border-left `border-subtle`. Contenido varía por vista:
- **Cockpit:** Alertas SLA (lista) + Meteo por zona tech + Shield status resumen.
- **Mapa:** Site detail al hacer click en pin (header site + metadata + alertas activas + CTA cross-module "Crear Intervención" + sparkline histórico).
- **Intervenciones Kanban:** oculto (espacio para el board).

---

## 5. Core components

### 5.1 WO Card (Kanban card, OverWatch pattern)

Anatomía de arriba hacia abajo:
- **Border-top 3px** color `stage-*` (firma visual).
- **Top row:** badge prio uppercase izq (`PRIO-*` text) + warning icon der si alerta SLA activa.
- **Title:** site name, font-display 16px/semibold, `text-primary`.
- **Subtitle:** cliente + city, font-body 13px, `text-secondary`.
- **Tag pill:** tipo intervención (correctivo / preventivo / rollout / etc.), pill pequeño `bg-surface-subtle`.
- **Shield pill:** a la derecha del tag, color `shield-*`.
- **Description:** 2 líneas truncadas, font-body 13px, `text-tertiary`.
- **Footer row:** tech asignado (o "Sin asignar" tertiary) izq + tiempo relativo der (hace 2h, hace 3 días).

Dimensiones: ancho 100% de columna, min-height 180px, padding 14px, radius md, `bg-surface`, border `border-subtle`, hover: shadow-sm + translateY(-1px).

Draggable entre columnas (Kanban). Click abre modal context-aware (§5.3).

### 5.2 Kanban column (OverWatch pattern)

Header de columna:
- Padding 12px 16px, font-display 14px/semibold uppercase, `text-primary`.
- **Sin icono.** La columna lleva título + counter + color en el sub-border-top de cada card. No glyph decorativo (regla §3.5 "iconos redundantes en columnas Kanban").
- Title izq (ej: "Solicitadas").
- Counter der pill pequeño `bg-surface-subtle` con número.

Body:
- Column background: `bg-surface-subtle`.
- Padding 12px.
- Gap entre cards 12px.
- Scroll vertical interno.
- Drop zone visible cuando drag activo (dashed border accent).

5 columnas default: **Solicitadas · Preparando · En campo · Cerrando · Cerradas**.
Canceladas: columna adicional hidden, toggle "Ver canceladas" en top-right de la vista.

### 5.3 Modal context-aware por stage (OverWatch pattern — LO MÁS IMPORTANTE)

Patrón que resuelve la complejidad de 9 stages con acciones distintas. **Mismo layout, contenido + CTAs varían por stage.**

**Estructura común:**
- Overlay `rgba(0,0,0,0.5)`.
- Panel centrado, width 560px, radius lg, `bg-surface`, shadow-xl.
- **Header:** badge stage izq (pill con color `stage-*` + label "Solicitadas"/"Asignadas"/etc) + badge prio al lado (solo texto color `prio-*`) + close X der.
- **Title:** nombre del site, font-display 26px/bold.
- **Subtitle:** city + shield + tipo, `text-secondary`.
- **Sections divididas** con label uppercase tracking-wide `text-tertiary` y contenido body:
  - DESCRIPCIÓN
  - ALCANCE
  - TIMELINE (solicitada / asignada / iniciada / completada — se rellenan progresivamente)
  - RESULTADO (solo si stage ≥ resolved)
  - NIVEL RIESGO (solo si stage == closed)
- **Footer CTAs:** primary color coherente con stage destino + secondary "Cancelar".

**CTAs por stage (tabla):**

| Stage actual | CTA primary | Acción | Color CTA |
|---|---|---|---|
| intake | Triagear → | `POST /workorders/:id/advance` stage=triage | `accent` cyan |
| triage | Ir a pre-flight → | advance stage=pre_flight | `stage-preflight` violeta |
| pre_flight | Dispatch → | advance stage=dispatched (requiere checklist all_green) | `stage-dispatched` violeta-dark |
| dispatched | Tech ack → en ruta | waits for tech ack briefing | `stage-enroute` ámbar (disabled hasta ack) |
| en_route | Check-in sitio | handshake check_in | `stage-onsite` naranja |
| on_site | Resolver → | requires tech_capture | `stage-resolved` verde-claro |
| resolved | Cerrar WO → | requires client sign-off (o override SRS) | `stage-closed` verde |
| closed | Descargar reporte PDF | dispatch emit channels | `stage-closed` verde |
| cancelled | (read-only con razón) | — | `text-tertiary` gris |

**CTA secondary** siempre "Cancelar cierre modal" (no cancelar WO). Cancelar WO es un destructive en menú overflow.

Esto reemplaza el patrón v1 de "botones inline en cards" que se saturaba.

### 5.4 Filter bar (Intervenciones + Compliance)

Fila horizontal arriba de la vista:
- **Izq:** filter tabs pill-shaped. Tab activo: `accent-subtle` bg + `accent` text. Inactivo: `text-secondary`. Counter entre paréntesis `(13)`.
- **Centro-izq:** search input con icon `solar:magnifer-linear`, `border-subtle`, radius pill.
- **Der:** dropdowns filtros (prio, cliente, shield, tech), cada uno pill con chevron. Botón CTA "+ Nueva Intake" cyan al extremo.

En Kanban no hay filter tabs (las columnas son el filter). Solo search + dropdowns + CTA.

### 5.5 Map view (merge OverWatch + SKYPRO360)

- **Base map:** Carto Positron o MapTiler Light (NO Mapbox Dark del intento 3).
- **Markers:** rectángulo dark con label `WO-2026-XXX` + dot `stage-*` color izq (patrón OverWatch, mata los SVG custom que fallaron).
- **Popup al click:** metadata compacta del WO (site, cliente, shield, tech, stage).
- **Left panel (collapsible):** Alertas activas, lista estilo OverWatch, badges de tipo (SLA / Escalation / No-show / Parts-blocked / Weather).
- **Right panel (on-demand):** al click en marker, slide-in con site detail + sparkline histórico (WOs/mes últimos 12m) + CTA "Crear Intervención" brand color + lista alertas activas + botones Reconocer / Resolver inline.
- **Top bar:** pills contadores (3 En campo · 12 Programadas · 8 Cerradas hoy · 5/7 Techs asignables).
- **Bottom legend:** dots con labels (patrón SKYPRO360).

### 5.6 Analytics dashboard (OverWatch pattern)

Grid de KPI cards con icono coloreado en cuadrado a la izquierda (superior a SKYPRO360 Analytics que tiene icon top-right sutil):
- 8 KPIs: WOs totales / Activas / Cerradas este mes / Tasa SLA hit / Horas campo MTD / Técnicos activos / Shields próximos a renovar / Reports pendientes emit.
- Gráfico barras apiladas "WOs por semana" con split Urgente/Alta/Normal/Baja.
- Donut "WOs por tipo" (correctivo / preventivo / rollout / otro).
- Top 5 bars "Sitios con más WOs activas" (horizontal).
- Progress bars "Estado operacional" (Pilotos certificados / Shields OK / SLA hit rate / Quality avg).

### 5.7 Compliance (SKYPRO360 pattern)

- 4 KPI cards top: Briefings pendientes ack / Approvals pendientes cliente / Reports pendientes emit / Shields próximos a vencer.
- Columna izq: Shield Status resumen + Próximos renewals.
- Columna der: Lista WOs con doc pendiente, cada row: código + badge stage + cliente + site + badges de secciones (Briefing / Capture / Report / Sign-off) a la derecha.

---

## 6. Per-role view scope

**Regla rectora v1.5:** el **modo visual** (Cockpit / War Room) lo determina la vista, no el espacio. El **scope de datos** lo determina el espacio del usuario. Un Client Coordinator entra al War Room y ve la misma shell dark con mapa y panel lateral que tú — solo que filtrada a SUS sites y con la "ropa en casa" oculta.

| Rol | Cockpit | Intervenciones | Mapa | Compliance | Analytics | Admin/Finance |
|---|---|---|---|---|---|---|
| SRS Coordinator | Full SRS-wide | Todas las WOs | Full global | Full | Full + finance | Full |
| SRS Supervisor (Sajid RO) | Full RO | Full RO | Full RO | Full RO | Full RO | RO |
| NOC | Filtro alertas SLA + ball-in-court activos | Filtro stages en_route/on_site | Filtro live en campo | Solo alertas live | Solo operacional | No acceso |
| Admin/Finance | KPIs financieros reemplazan operacionales | Scope RateCard/Invoices | No prioritario | Contratos + SLA breach | Full + márgenes | Full |
| Tech (mobile PWA) | Briefing Today (layout distinto, PWA) | Solo WOs asignadas a él | Solo sus sites pineados | Su Skill Passport | No aplica | No acceso |
| Cliente (Rackel) | Solo sus WOs + shields | Solo sus WOs | Solo sus sites | Solo su Shield + reports | Solo sus métricas | No acceso |

Tech PWA es la única excepción al patrón shell unificado (bottom nav 4 items, layout mobile-first). El resto comparte header horizontal + contenido por rol-scope.

---

## 7. Interaction patterns

### 7.1 Drag & drop (Kanban)

- Click + hold + drag card a otra columna.
- Drop zone visible (dashed border accent).
- Soltar en columna inválida (ej: skip stage sin guard): bounce back + toast error rojo con razón.
- Al soltar en columna válida: optimistic update + `POST /advance` + confirmación toast verde.
- Undo toast 5s con CTA "Deshacer".

### 7.2 Modal open/close

- Click card → modal abre fade+scale 280ms.
- Click overlay o X o ESC → cierra fade 180ms.
- CTA primary → ejecuta acción → modal cierra + toast + card actualizada.

### 7.3 Cross-module nav

- Desde Mapa click marker → right panel site detail → click "Crear Intervención" → modal intake pre-filled con site/cliente.
- Desde Alert en Cockpit click → scroll-to o abre modal WO afectada.
- Desde Tech Profile click WO activa → drawer con modal context-aware.

### 7.4 Live updates

- WebSocket (o polling 30s) actualiza contadores + state changes en Kanban.
- Badge pulsing dot en items que cambiaron hace <60s.
- Notificación toast si un WO del current user cambia de stage por otro actor.

---

## 8. Tipografía (se mantiene de v1)

Instrument Sans — display (title cards, KPI numbers, section headers).
DM Sans — body (descriptions, metadata).
JetBrains Mono — data (códigos WO-2026-XXX, timestamps técnicos, hex, IPs).

Scale:
- Display xl: 32px/600 (KPI numbers)
- Display lg: 26px/700 (modal title)
- Display md: 20px/600 (column header Kanban)
- Display sm: 16px/600 (card title)
- Body md: 14px/400 (default)
- Body sm: 13px/400 (meta)
- Label: 11px/500 uppercase tracking 0.06em (section labels en modal, column counters)

---

## 9. Blacklist (v2)

Prohibido explícitamente en InsiteIQ v2:
- Stone-950 warm black fondo global.
- Amber/copper como primary.
- "Accent bar izquierdo 3px" (v1 signature — reemplazado por border-top).
- Iconos SVG custom por site_type en mapa (intento 3 falló por ambigüedad).
- Mapbox Dark tiles (intento 3 falló).
- Card layouts sin border-top color semántico.
- Cockpit "hotel 5 estrellas minimalista" en Client space (no existe más — shell unificada).
- Cualquier inspiración "war-room / bunker de crisis". InsiteIQ es control room clean, no sala de guerra.
- **Emojis Unicode en cualquier parte del UI.** Ni en copy, ni en labels, ni en empty states, ni en notificaciones. Cero.
- **Iconos generalizados/decorativos sin función semántica.** Solo el catálogo cerrado de §3.6.
- **Mix de icon sets.** Un único set oficial: Solar Linear. Nada más.
- **Lucide, Heroicons, Material Icons, Font Awesome, Phosphor, Feather, Tabler** como set de InsiteIQ. Todos quedan prohibidos por genéricos / SaaS-default.
- **Iconos "playful" / "generic SaaS vibe":** caritas, estrellas, cohetes, rayos, confetti.
- **Iconos pintados con colores arbitrarios.** El color hereda del contexto (ver §3.5).
- **Defaults Shadcn/Tailwind sin customizar** (botón `bg-primary` sin override, card `rounded-lg border bg-card`, etc.). Cada componente pasa por el token system propio. Si sale un componente que se ve "igual que cualquier ejemplo de shadcn", se bota.
- **Gradientes blue-to-purple, "mesh backgrounds", "glow neon", noise textures.** Todo lo que apeste a landing de IA 2024-2026.
- **Landing-hero style "big gradient title + CTA centrado + 3 feature cards"** aplicado a vistas operacionales. InsiteIQ es cockpit, no landing.

---

## 10. Roadmap de adopción

0. **Decisión icon set §3.5b.** ✓ CERRADO 2026-04-24 · Solar Icon Set estilo Linear. Comparación visual completada (Solar Linear vs Solar Broken vs Iconoir) sobre WO card + KPI card + shield pill. Catálogo §3.6 actualizado con glyph names exactos.
1. **Extracción de tokens reales** vía Chrome DevTools de OverWatch + SKYPRO360 en PROD. Actualizar hex `[tbd]` con valores exactos. Verificación: el cyan accent de SKYPRO360 no es sky-500 Tailwind default — si lo fuera, shift 1 paso.
2. **Mock estático del Kanban de Intervenciones** (React + Tailwind, data seed, sin API, con icon set ya cerrado). Validación visual end-to-end. JuanCho firma "así es".
3. **Component library** shared extraída: `<WOCard>`, `<KanbanColumn>`, `<WOModal>`, `<KPIStrip>`, `<FilterBar>`, `<MapPanel>`, `<TopHeader>`. Exportada para reuso en otros espacios.
4. **Conexión a API real** del Kanban con WOs seed Foundation.
5. **Port del resto de vistas** (Cockpit, Mapa, Compliance, Analytics) reusando componentes.
6. **Deploy PROD** tras QA visual por JuanCho + Andros.
7. **Blueprint v1.2 formal** en `memory/blueprint_insiteiq_v2.md` que referencia este doc como design layer oficial.

Criterio de no-regresión: si alguna pantalla no puede expresarse con los componentes de §5, se para y se vuelve al doc antes de inventar componente nuevo.

---

## 11. Decisiones explícitas cerradas en v2

- **Kanban** es la vista default de Intervenciones. No grid cards con border-top (SKYPRO360 pattern queda para Cockpit snapshot).
- **5 columnas Kanban** (no 9). Sub-stage dentro de card vía badge. Canceladas como columna toggle.
- **Shell unificada** para todos los roles web desktop. Tech PWA es la única excepción.
- **Light-first** con header dark band. No war-room dark global.
- **Cyan primary + verde brand**. No amber.
- **Border-top 3px** es la firma visual. No left-accent bar.
- **Modales context-aware por stage** reemplazan botones inline saturados en cards.
- **No se inventa UI**. Se copia de OverWatch/SKYPRO360 y se mapea.

---

## 12. Changelog

- **2026-04-23 · Draft 1 · JuanCho + Claude** — Merge inicial OverWatch + SKYPRO360. Supersede Identity Sprint v1. Pendiente extracción tokens DevTools.
- **2026-04-23 · Draft 1.1 · JuanCho** — Paletas §3.1/3.2/3.3/3.4 aprobadas como base. Agregado §3.5 Iconography rules + §3.6 catálogo cerrado de iconos permitidos. Blacklist §9 reforzada: cero emojis, cero iconos generalizados decorativos, único set Lucide.
- **2026-04-23 · Draft 1.2 · JuanCho** — Lucide descartado por genérico. §3.5b agregado con evaluación de sets no-mainstream (Solar / Iconoir / Hugeicons / Streamline / custom). Recomendación: Solar Icon Set estilo Linear como default, pendiente validación visual. Catálogo §3.6 mantenido por función semántica (nombres de glyphs se rellenan al cerrar el set). OverWatch conserva su icon set actual — decisión InsiteIQ-only. Paso 0 nuevo en roadmap: decisión icon set bloquea mock estático.
- **2026-04-24 · Draft 1.3 · JuanCho + Claude** — Icon set cerrado: **Solar Linear**. Comparación visual ejecutada contra Solar Broken + Iconoir, Solar Linear gana por legibilidad a 12px y carácter propio sin vibe "SaaS genérico". §3.5b pasa de "opciones evaluadas" a "decisión cerrada" con motivos de descarte registrados. §3.6 expandido de 13 a 30+ entradas con glyph names exactos (`solar:*-linear`). Referencias a Lucide en §4.3/§5.2/§5.4 reemplazadas por Solar. §5.2 Kanban column sin icono de header (era contradicción con §3.5 "redundantes"). §9 Blacklist expandida: prohibición explícita de Phosphor/Feather/Tabler, defaults Shadcn sin customizar, gradientes blue-to-purple, mesh/glow/noise, landing-hero style en vistas operacionales. **Nueva Regla Dura #0 en §1: Anti-plantilla IA** — test explícito "si un observador externo puede decir 'esto lo generó Claude/V0/Lovable en 5 min', no se firma". §10 Roadmap paso 0 marcado completado. Desbloqueado paso 2 (mock estático Kanban).
- **2026-04-24 · Draft 1.4 · JuanCho + Claude** — Mock estático Kanban entregado con drag & drop funcional. Añadida §3.6b "Elementos funcionales de interacción" para documentar afordancias UI que no son glyphs Solar (drag handle 6-dots, scrollbars, drop zone outline, pulse dot, focus ring). Regla clara: estas excepciones no rompen §3.5 porque no transmiten semántica, solo señalan afordancia — y hay que listarlas explícitamente para evitar creep hacia libertad creativa. Drag handle 6-dots custom SVG (2×3 circles r=1.2 step 5.5px) en top-left de cada WO card. Estados: idle `#CBD5E1` / hover card `#64748B` / activo drag `#0EA5E9`. Checklist de extracción tokens (`tokens_extraction_checklist.md`) entregada por separado — pendiente ejecución en PROD por JuanCho.
- **2026-04-24 · Draft 1.5 · JuanCho + Claude** — **Arquitectura dual de modos visuales formalizada** tras clarificación del owner viendo la vista SRS dark en PROD (`insiteiq.systemrapid.io/srs`). Supera la propuesta inicial v1.3 de "light-first unificado cross-space". Nueva estructura: **Cockpit mode** (light, análisis, planificación, KPIs, meteo, equipos, horas, tendencias) + **War Room mode** (dark, operación en vivo, mapa con pines, popup referencia rápida, panel lateral detalle, amber como highlight de data). Regla nueva: el modo lo determina la vista, el scope lo determina el espacio. Rackel (Client) entra al War Room y ve la misma shell dark que SRS — solo filtrada a sus sites y con "ropa en casa" oculta (Principio #1). Añadidas §1.1 (arquitectura dual), §3.1b (paleta War Room con tokens `wr-*`). Actualizada §6 (view scope vs mode). Mocks entregados cubriendo ambos modos: `insiteiq_cockpit_v2_static.html` (Cockpit light · análisis gerencial) + `insiteiq_kanban_v2_static.html` (Cockpit light · operaciones Kanban) + `insiteiq_map_srs_dark_v2_static.html` (War Room dark · mapa + popup referencia rápida + panel lateral slide-in 520px con timeline · threads shared/internal · parts · briefing/capture/report · audit log · CTA escalar ball). **Bloquea Tailwind config:** necesita extender con ambos sets de tokens (base neutros cockpit + `wr-*` para war room) para que ThemeProvider elija según `view.mode`.
- **2026-04-24 · Draft 1.6 · JuanCho + Claude** — **Regla obligatoria §3.6a Timezone-aware personas añadida.** Implementación directa del Principio #8: si Rackel (Madrid) abre la tarjeta de Luis (Lima) a las 10:00 Madrid, el sistema debe mostrar 03:00 Lima con pill `NO MOLESTAR · DURMIENDO`. Sin excepciones. Estados definidos (`onduty` / `afterhours` / `starting` / `sleeping` / `weekend`) con colores semánticos. Dato mínimo: hora local tech + label zona + pill estado + hora viewer + offset + tiempo a fin de jornada si on-duty. Dato extendido en panel lateral: banner de escalación fuera de horario indicando camino correcto de contacto. `TECH_REGISTRY` con `tz` IANA + `workStart/workEnd` por tech. Implementación `Intl.DateTimeFormat` nativo, sin librerías timezone externas. Aplica cross-vista: popup mapa · panel lateral · card tech cockpit · thread messages · profile tech · widget cobertura global. Alcance del dato: hora + estado visibles en Client scope (operativo transparente, no "ropa en casa"); GPS exacto NO visible en Client scope. Mock War Room actualizado: bloque timezone en popup (11 líneas compactas) + sección dedicada en panel lateral (bloque prominente con hora grande en mono 28px + pill estado + offset + banner de escalación si durmiendo/weekend) + `popupopen` event regenera contenido para horas live. Icono permitido: `solar:moon-linear` para estado durmiendo.
- **2026-04-24 · Draft 1.7 · JuanCho + Claude** — **CORRECCIÓN ARQUITECTURAL CRÍTICA.** La dualidad Cockpit/War Room NO es de paleta (como v1.5 afirmaba erróneamente: "Cockpit light / War Room dark"). Es **estructural**. Owner valida con capturas SKYPRO360 OpsManager PROD: ambas vistas del espacio SRS son **dark**, comparten tokens `wr-*`, sidebar nav, tipografía mono dominante. La diferencia: Cockpit OPERACIONES es KPI cards + misiones activas + historial + sidebar widgets (alertas/shields/meteo/resumen) + bottom strip flota; War Room es mapa Positron (light tiles sobre shell dark) + pines pill + popup + panel detail slide-in. §1.1 reescrita con tabla comparativa estructural. §6 actualizada (scope filtra data, paleta dark se mantiene cross-role). Nuevo mock `insiteiq_cockpit_srs_dark_v2_static.html` sigue pattern 1:1 SKYPRO360. Mock War Room `insiteiq_map_srs_dark_v2_static.html` ajustado: tiles cambiados de Dark Matter → Positron (light map · shell dark), markers cambiados de shapes-por-site-type → pill horizontal (dot stage color + código short) replicando SKYPRO360. Legend inferior reformulada: estados de intervención en lugar de tipos de sitio. Mock `insiteiq_cockpit_v2_static.html` previo (Cockpit light) queda como referencia descartada — no borrar por ahora pero no es canónico. Aplica: los mocks firmados como canónicos para SRS space son cockpit dark + mapa war room dark-shell-light-map.
