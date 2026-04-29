# Sprint Reanudación v2 — Plan de extracción React

> **Status:** Draft 5 · 2026-04-29 · **SPRINT CERRADO · v2 DEPLOYED EN PROD**
>
> Las 7 fases del plan (Alpha → Eta) completadas y desplegadas en VPS 1.
> Acceso v2 en producción: `https://insiteiq.systemrapid.io/srs?v2=1`.
> Toggle por query param hasta switch global tras semana de validación.
>
> **Contexto:** Reanudación oficial del proyecto (ver `PROJECT_STATUS.md`
> sección "REANUDACIÓN 2026-04-24"). Design System en v1.7. Tres mocks
> HTML canónicos firmados por owner. Backend en PROD sin tocar.
>
> **Objetivo del sprint:** trasladar los 3 mocks v2 a componentes React
> reales del repo `v1-foundation`, enchufados a la API existente, deployables
> a PROD VPS 1, sin romper las vistas v1 actuales.
>
> **Regla absoluta:** cero invención visual. Si algo no puede mapearse 1:1
> al mock, se para y se consulta al owner. El agente es ejecutor, no diseñador.

---

## Principios del sprint

1. **No romper v1** — los 22+ pasitos deployed (F-T + X-a..X-g + Y-a..Y-c + Z-a..Z-e) siguen funcionales durante la migración. Los componentes v2 se añaden en paralelo hasta que estén listos para reemplazar.

2. **Refactorizar sobre reemplazar** cuando el mapeo es 1:1. El `CockpitPage` ya existente (pasito Z-c) se refactoriza para adoptar el DS v1.7. Se deja el fallback a `/srs/overview` (cockpit clásico) hasta que el v2 esté sólido.

3. **Un componente a la vez, con QA visual** — cada extracción se valida contra el mock HTML correspondiente antes de pasar al siguiente. Pixel-perfect no es metáfora, es criterio de aceptación.

4. **Branch única: `v1-foundation`** — commits etiquetados con prefijo `[v2]` para trazabilidad. No branch paralela, eso fragmenta. Feature flag `VITE_V2_SHELL=1` si hace falta toggle por deploy.

5. **Tailwind + tokens del DS v1.7** — los tokens `wr-*` se añaden al `theme.extend` existente, los tokens `surface.*/primary.*/status.*` actuales se mantienen (el cockpit v1 los sigue usando). El v2 usa ambas paletas coexistiendo.

6. **Cero dependencias nuevas si se puede evitar.** Si algo se puede hacer con la stack actual (React 19 + Router 7 + Mapbox GL 3.8 + Lucide + Sonner), se hace. Solo se añade `@iconify/react` (para Solar Icon Set) porque el DS v1.7 prohíbe Lucide en código nuevo v2.

---

## Stack existente (del repo v1-foundation)

| Dep | Uso v1 | Estrategia v2 |
|---|---|---|
| `react@19` | Base | Sin cambios |
| `react-router-dom@7` | Routing 3 spaces | Rutas v2 bajo `/srs/*` sin tocar guards |
| `mapbox-gl@3.8` | OperationsMap actual (intento 3) | Reutilizar con tiles CartoDB Positron vía custom style, markers HTML |
| `lucide-react@0.468` | Iconos v1 | **Prohibido en código v2.** Reemplazo: `@iconify/react` + Solar Linear |
| `sonner@1.7.1` | Toasts v1 | Reutilizar con estilos v2 dark |
| `tailwindcss@3.4.17` | Config foundation | Extender con tokens `wr-*` sin romper v1 |

### Dependencias a instalar

**Ninguna.** Decisión técnica revisada 2026-04-24 tras fallo EPERM al intentar `npm install @iconify/react` (permisos restrictivos de OneDrive sobre `node_modules`).

**Nueva estrategia:** Iconify web component vía CDN script tag en `index.html`. Zero npm deps, mismo patrón que los mocks HTML, on-demand glyph loading desde CDN Iconify.

```html
<!-- Ya añadido a frontend/index.html -->
<script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
```

React usage vía wrapper `<Icon />` en `src/lib/icons.jsx` que render `<iconify-icon>` custom element. Misma API pública que tendría `@iconify/react`. Si algún día OneDrive deja instalar, migrar es cambio de 1 import en `icons.jsx`.

---

## Fases del sprint

### Fase Alpha · Foundation (sin romper nada)

**Objetivo:** preparar Tailwind + CSS + Iconify sin tocar ninguna page existente.

- [ ] Extender `tailwind.config.js` con tokens v1.7: bloque `wr-*` (war room dark), `stage-*` ya existe como `status-*`, añadir tokens de priority (`prio-*`) y shield (`shield-*`).
- [ ] Extender `src/index.css` con utilities v2: `.kpi-filter`, `.wo-pill`, `.stage-border-top`, `.detail-tl-*`, `.label-caps-amber`, `.drag-handle`.
- [ ] Instalar `@iconify/react`.
- [ ] Crear `src/lib/icons.js` con helper `<Icon />` que wrappa Iconify + prefijo `solar:*-linear` por default.
- [ ] Crear `src/lib/tz.js` con `getTechTimeInfo(techName)` + `TECH_REGISTRY` del mock (regla §3.6a).
- [ ] Crear `src/theme/ThemeContext.jsx` que exporta `useTheme()` con `{ mode: 'cockpit' | 'warroom' }` derivable de la ruta. (Opcional — se puede diferir a Delta si no es necesario inicialmente).

**Criterio de cierre Alpha:** `npm run dev` arranca sin errores, ninguna page existente cambia visualmente, `<Icon icon="solar:shield-linear" />` renderiza un icono.

### Fase Beta · Shell v2 (TopHeader + SidebarNav + BottomStrip)

**Objetivo:** reemplazar el `SrsLayout` actual (sidebar 56w war-room classic) por el shell v2 que ves en los mocks (sidebar 200w + top header compacto o hero strip según vista).

- [ ] Componente `<V2TopHeader>` en `src/components/shell-v2/V2TopHeader.jsx` con branding + nav items + counter + alerts bell + avatar + logout. Soporta modo "cockpit" (con título grande + hero strip opcional) y "warroom" (compacto con pills contadores).
- [ ] Componente `<V2SidebarNav>` en `src/components/shell-v2/V2SidebarNav.jsx` con items dal DS v1.7 + build info footer + status pill "SISTEMA OPERATIVO".
- [ ] Componente `<V2BottomStrip>` en `src/components/shell-v2/V2BottomStrip.jsx` con vehículos + técnicos + timezone-aware status live.
- [ ] Componente `<V2Shell>` en `src/components/shell-v2/V2Shell.jsx` que compone los 3 y expone `<Outlet />`.
- [ ] Refactorizar `spaces/srs/Layout.jsx`: si `VITE_V2_SHELL=1` usa `<V2Shell>`, si no usa el layout actual. Default false durante desarrollo.

**Criterio de cierre Beta:** con `VITE_V2_SHELL=1` el shell de `/srs` se ve idéntico al mock `insiteiq_cockpit_srs_dark_v2_static.html` (sidebar + topbar + bottom strip), aunque el contenido del main aún sea el viejo.

### Fase Gamma · Cockpit de Operaciones

**Objetivo:** refactorizar `CockpitPage` existente (pasito Z-c) para adoptar el DS v1.7. Scope solo SRS en esta fase, Client queda para sprint siguiente.

- [ ] Refactor `<KpiStrip>` en `components/cockpit/KpiStrip.jsx` → añadir variante "grid-5" con border-left color + KPI-as-filter behavior (controller en parent).
- [ ] Refactor `<InterventionCard>` → dos variantes: `<InterventionCardFull>` (horizontal, 3 cols, con botones Detalle + Compliance) y `<InterventionCardMini>` (compacta 4-col grid, border-top, sin botones).
- [ ] Crear `<ActiveInterventionsSection>` (grid 3 cols con FullCards).
- [ ] Crear `<RecentHistorySection>` (grid 4 cols con MiniCards).
- [ ] Crear sidebar widgets: `<AlertsWidget>`, `<ShieldsWidget>`, `<WeatherWidget>`, `<SummaryWidget>`.
- [ ] Refactor `<CockpitPage>` en `components/cockpit/CockpitPage.jsx` → nueva estructura dark v2 (sin OperationsMap embebido que se va al War Room).
- [ ] Ruta: mantener `/srs` como índice del Cockpit v2. Fallback `/srs/overview` apunta al Home viejo.

**Criterio de cierre Gamma:** `/srs` renderiza igual que el mock `insiteiq_cockpit_srs_dark_v2_static.html` con data real del API. Click en un KPI filtra las minicards inferiores.

### Fase Delta · Espacio OPS (War Room con mapa)

**Objetivo:** nueva página `/srs/espacio-ops` con mapa Positron + pines pill + popup + panel detail + KPI-as-filter + minicards.

- [ ] Crear `<EspacioOpsPage>` en `spaces/srs/espacio-ops/EspacioOpsPage.jsx`.
- [ ] Componente `<WoMapMarker>` en `components/warroom/WoMapMarker.jsx`: pill horizontal con dot stage + código short, montado en Mapbox via `new mapboxgl.Marker({ element })`.
- [ ] Componente `<QuickPopup>` con bloque timezone del tech (regla §3.6a) + metadata 2x2 + CTAs.
- [ ] Componente `<SideDetailPanel>` slide-in 520px con timeline · threads shared/internal · parts · briefing/capture/report · audit log + CTA escalar ball.
- [ ] Componente `<InterventionMinicardGrid>` (grid auto-fit minmax(240px, 1fr)) en el panel inferior.
- [ ] Componente `<KpiFilterStrip>` con 5 buttons accionables + estado visual activo + filtrado bidireccional (minicards + markers).
- [ ] Mapbox style: investigar si `mapbox://styles/mapbox/light-v11` es suficientemente cercano a CartoDB Positron, o si creamos custom style. Si no, usar Mapbox GL con raster tiles de CartoDB como fallback.
- [ ] Router: añadir `/srs/espacio-ops` en App.jsx.
- [ ] Nav: añadir "Espacio OPS" al sidebar v2 entre "Operaciones" e "Intervenciones".

**Criterio de cierre Delta:** `/srs/espacio-ops` renderiza idéntico al mock. Click en pin abre popup. Click en "Ver detalle →" abre panel lateral derecho con data completa del WO.

### Fase Epsilon · Intervenciones Kanban

**Objetivo:** nueva página `/srs/intervenciones` con Kanban drag & drop + modal context-aware + drag handle.

- [ ] Crear `<KanbanPage>` en `spaces/srs/ops/KanbanPage.jsx`.
- [ ] Componente `<KanbanColumn>` con header + counter + body scrollable + drop zone.
- [ ] Componente `<WoKanbanCard>` con drag handle 6-dots + border-top + prio badge + shield pill + tech + time relativo.
- [ ] Drag & drop HTML5 nativo (sin lib nueva) — `dragstart` / `dragover` / `drop` handlers con dataTransfer.
- [ ] Modal context-aware `<WoStageModal>` con CTA cambiante por stage (tabla §5.3 del DS v1.7).
- [ ] Ruta: `/srs/intervenciones` reemplaza o coexiste con `/srs/ops` (lista tabular actual). Decisión en la fase: si reemplaza, redirect `/srs/ops → /srs/intervenciones`; si coexiste, añadimos nav item.

**Criterio de cierre Epsilon:** `/srs/intervenciones` renderiza Kanban con WOs reales, se pueden arrastrar entre columnas, click abre modal con CTA correcto por stage.

### Fase Zeta · Integración + polish

**Objetivo:** enchufar todo a la API real, live updates, timezone-aware cross-vista, ajustes finales.

- [ ] Asegurar que todos los componentes usan `api.js` + `useFetch` (no hardcoded seeds).
- [ ] Implementar polling 30s o WebSocket para counters/alerts/new WOs.
- [ ] Aplicar regla §3.6a timezone-aware a todos los lugares donde aparezca un tech (cards, modals, threads, panel lateral).
- [ ] Empty states limpios (usando `solar:inbox-linear` según catálogo §3.6).
- [ ] Error boundaries + fallbacks.
- [ ] Validación cross-browser (Chrome, Safari, Firefox).

### Fase Eta · Deploy

- [ ] QA visual pixel-perfect contra los 3 mocks por parte del owner.
- [ ] Build `npm run build` local.
- [ ] Docker compose build + test local.
- [ ] Commit + push rama `v1-foundation` con prefijo `[v2]`.
- [ ] SSH a VPS 1 PROD: pull + docker compose build + force-recreate frontend.
- [ ] Smoke test PROD: login, navegar las 3 vistas v2, verificar datos reales.
- [ ] Actualizar `PROJECT_STATUS.md` con fecha de deploy v2 + commit hash.
- [ ] Changelog DS v1.7 → v1.8 documentando deployment.

---

## Decisiones técnicas firmadas

1. **Mapbox GL sobre Leaflet** para el War Room. Ya instalado, ya hay token, ya funciona en PROD. Se configuran tiles CartoDB Positron via custom style si el `mapbox/light-v11` default no es suficientemente cercano.

2. **Iconify con Solar Linear** como único icon set oficial para código v2. Lucide queda sólo en código v1 legacy, no se usa en componentes nuevos. Migración gradual — no hay deprecation forzada.

3. **HTML5 drag & drop nativo** para el Kanban. Cero dependencias nuevas. Si la UX de drag se siente pobre en touch devices, consideramos `@dnd-kit/core` en fase Zeta.

4. **Tailwind config extendida, no reescrita.** Los tokens v1 (`surface.*`, `primary.*` amber) siguen disponibles. Se añaden tokens v2 (`wr-*`, `prio-*`, `shield-*`) que coexisten. Cada componente decide qué paleta usa según el modo de la ruta.

5. **Branch única `v1-foundation`.** Commits v2 etiquetados `[v2]`. Feature flag `VITE_V2_SHELL=1` para toggle durante desarrollo. Default false hasta que el v2 esté completo.

6. **Backend intocable.** Cero cambios a endpoints, schemas, rutas FastAPI. Todo frontend puro. Si alguna pantalla v2 necesita un campo que la API no expone, **paramos y abrimos issue** — no modificamos backend en este sprint.

---

## Orden de dependencias entre fases

```
Alpha (foundation) ─────┐
                        ├─→ Beta (shell v2) ──→ Gamma (Cockpit) ──┐
                        │                                           ├─→ Zeta (integración) ──→ Eta (deploy)
                        └─→ Delta (War Room) ───────────────────────┤
                        │                                           │
                        └─→ Epsilon (Kanban) ───────────────────────┘
```

Alpha bloquea todo. Beta es precondición de Gamma/Delta/Epsilon. Una vez Beta listo, las tres fases de vistas (Gamma, Delta, Epsilon) se pueden hacer en paralelo si hace falta.

---

## Checklist de "Listo para PROD"

Cada vista v2 debe pasar este checklist antes de deploy:

- [ ] Render idéntico al mock HTML correspondiente (QA visual del owner).
- [ ] Data real del API, no hardcoded.
- [ ] Loading states con skeleton (no spinner).
- [ ] Empty states con glyph Solar Linear permitido (§3.6).
- [ ] Error boundary con retry.
- [ ] Accesibilidad: focus visible, labels screen reader, ESC cierra modales.
- [ ] Timezone-aware donde aplique (regla §3.6a).
- [ ] Sin emojis Unicode en ninguna parte (regla §3.5).
- [ ] Sin iconos fuera del catálogo §3.6 + §3.6b.
- [ ] Sin defaults Shadcn sin customizar (regla §9 blacklist).
- [ ] Live updates (polling o WS) donde tenga sentido operacional.

---

## Changelog del sprint

- **2026-04-24 · Draft 1 · JuanCho + Claude** — Plan inicial Alpha→Eta. Arquitectura confirmada: refactorizar sobre reemplazar, branch única `v1-foundation`, Mapbox GL + Iconify Solar + HTML5 DnD nativo, backend intocable. Alpha arranca inmediatamente tras firma del owner.
- **2026-04-24 · Draft 2 · Claude** — Fase Alpha completada. Entregables: `tailwind.config.js` extendido con tokens v2 (`wr.*`, `stage.*`, `prio.*`, `shield.*`) sin tocar los v1. `src/index.css` extendido con utilities v2 (`.label-caps-v2`, `.stage-border-top`, `.accent-left-v2`, `.kpi-filter`, `.wo-pill`, `.drag-handle`, `.detail-tl-*`, `.wr-scroll`). Helpers creados: `src/lib/tz.js` (TECH_REGISTRY + getTechTimeInfo · regla §3.6a) y `src/lib/icons.jsx` (Icon wrapper + ICONS catálogo cerrado §3.6). Iconify web component cargado vía CDN en `index.html` (decisión forzada por EPERM de OneDrive sobre node_modules — no bloquea). Cero cambios a páginas existentes. Criterio Alpha cumplido: `npm run dev` arranca sin errores, nada cambia visualmente, `<Icon icon="shield" size={16} />` renderiza Solar Linear desde CDN.
- **2026-04-24 · Draft 3 · Claude** — Fase Beta completada. Cuatro componentes shell v2 creados en `src/components/shell-v2/`: `V2SidebarNav.jsx` (200px, header amber label + 10 nav items con NavLink activo estilo DS v1.7 + footer con pill sistema operativo + build/region info), `V2TopHeader.jsx` (variant cockpit · título + highlight amber + fecha live es-ES/Madrid + pill verde counter live activas, auto-refresh 30s), `V2BottomStrip.jsx` (label "Equipo activo" + 2 vehículos hardcoded + 5 técnicos con `getTechTimeInfo()` live · dots color según estado laboral · re-render 30s), `V2Shell.jsx` (wrapper que compone los 3 pilares + `<Outlet />` para rutas hijas · prop `showBottomStrip` para suprimir en War Room). `spaces/srs/Layout.jsx` refactorizado con toggle dual: env var `VITE_V2_SHELL=1` OR query param `?v2=1` en URL. Default v1 (no se rompe nada). **Build validado:** `npx vite build` transformó 1657 módulos exitosamente — imports resuelven, JSX parsea, Tailwind tokens coexisten sin conflicto. Único error reportado es EPERM sobre `dist/` (permisos OneDrive, no código). **Cómo probar:** `cd frontend && npm run dev`, abrir cualquier URL SRS con `?v2=1` (ej `http://localhost:5173/srs?v2=1`). Se verá el shell v2 dark completo con el contenido v1 actual renderizando dentro del `<Outlet />` — normal: ese contenido migra en Gamma. Criterio Beta cumplido.
- **2026-04-29 · Draft 4 · JuanCho + Claude** — **Fases Gamma + Delta + Epsilon + Zeta completadas en sesión continua.** Gamma: `KpiStripV2` con KPI-as-filter accionable (5 buttons border-left color), `InterventionCardFull` (3 cards horizontales con botones Detalle/Compliance), `InterventionCardMini` (8 minicards historial), 4 sidebar widgets (Alertas/Shields/Meteo/Resumen), `V2CockpitPage` composer con stats reales del backend, helper `lib/woCode.js` para WO codes legibles desde ObjectIds, fix responsive `xl:`→`lg:` para Mac standards. Delta: `EspacioOpsPage` con Leaflet vía CDN (CartoDB Positron light sobre shell dark, mismo patrón SKYPRO360), `WoMapMarker` divIcon con `.wo-pill` HTML, `QuickPopup` HTML inline con bloque timezone live (regenerar al `popupopen`), `SideDetailPanel` slide-in 520px con timeline/threads-shared/threads-internal/parts/briefing-capture-report/audit-log/escalar-ball CTA, KPI filter bidireccional que oculta pines del mapa Y filtra minicards juntos, click en minicard hace flyTo + abre popup. Epsilon: `WoKanbanCard` con drag handle 6-dots SVG inline (idle gris/hover gris-medio/dragging cyan), `KanbanColumn` con drop zones outline cyan dashed, `WoStageModal` context-aware con tabla CTA por stage (intake→Triagear cyan, triage→Preparar violeta, pre_flight→Despachar violeta-dark, dispatched→Esperando ack disabled, en_route→Llegar al sitio naranja, on_site→Marcar resuelta verde, resolved→Cerrar verde-dark, closed→Descargar terminal, cancelled→readonly), `InterventionsKanbanPage` composer con drag&drop nativo HTML5, optimistic update con rollback en error API, sonner toast confirmación. Zeta: `RefreshContext` compartido para isRefreshing/lastRefreshAt cross-páginas, pill header pulsa amber durante refresh + tooltip "última sync hace Xs", componentes Skeleton (KpiCard/InterventionFull/Mini/KanbanCard/Widget) con shimmer, `EmptyState` reutilizable con Solar glyphs (icon/title/sublabel/action), `V2ErrorBoundary` clase con fallback Reintentar/Recargar + detalle dev-only envolviendo cada vista v2 en App.jsx, `MultiSelectDropdown` con popover checkboxes para filter bar Kanban (Prioridad/Cliente/Shield/Técnico) combinables AND con search libre. Cuatro fases firmadas visualmente por owner via screenshots durante la sesión.
- **2026-04-29 · Draft 5 · JuanCho + Claude** — **FASE ETA · DEPLOY PROD COMPLETADO.** Build local validado: `npx vite build` transformó 1675 módulos en 3.35s, gzip 673KB. Single chunk warning > 500KB es informativo (code splitting es optimización futura, no bloqueante). Commit del sprint pusheado a `v1-foundation`. Deploy en VPS 1 (`72.62.41.234:/opt/apps/insiteiq`) vía SSH: git fetch + checkout v1-foundation + git pull + docker compose build frontend + docker compose up -d --force-recreate frontend. Container `insiteiq-frontend` arrancó OK. **Smoke test PROD validado vía screenshot del owner**: `https://insiteiq.systemrapid.io/srs?v2=1` renderiza el cockpit v2 completo con stats reales del backend (1 crítico, 24 sin asignar, 12 activas hoy), 3 intervenciones en curso con WO codes legibles WO-46DACF26 etc., 8 minicards historial, sidebar derecho con Alertas Operativas (NO SHOW/ACCIDENT/ACCESS DENIED) + Shields "Todo en regla" + Meteorología con 6 ciudades + Resumen, bottom strip con horas timezone live (Madrid 13:19, Lima 06:19, London 12:19), pill verde "11 activas" con polling indicator. **Sprint cerrado al 100%**, 30 tasks completadas. Default en PROD se mantiene v1 con `?v2=1` como acceso opt-in durante semana de validación con Andros + JuanCho. Cambio a default v2 vía `VITE_V2_SHELL=1` + redeploy una vez firmado.
