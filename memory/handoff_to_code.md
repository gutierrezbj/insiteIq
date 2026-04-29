# Handoff a Claude Code — InsiteIQ v2

> **Para Claude Code:** este documento es tu prompt-introductor. Antes de tocar
> nada, léelo entero junto con `CLAUDE.md` (raíz del repo) y
> `memory/design_system_insiteiq_v2.md`. El owner es JuanCho (Navegante).
>
> El sprint de reanudación v2 (Alpha → Eta) ya está **deployed en PROD**. Lo que
> queda son ajustes finos sobre código vivo, no construcción de cero.
>
> **Migración Cowork → Code** decidida 2026-04-29 por friction acumulada de
> OneDrive sandbox (no podía ejecutar git/npm/ssh nativo, cada cambio requería
> copy-paste del owner en Terminal). Tu corres localmente, sin esa restricción.

---

## Estado real del proyecto

**Repo:** `~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS/InsiteIQ/` en Mac local del Navegante. Branch activa: `v1-foundation`. Convención de commits: `[v2] <tema>`.

**Acceso v2 PROD:** `https://insiteiq.systemrapid.io/srs?v2=1` y `/client?v2=1`. Sin `?v2=1` se ve la v1 legacy. Las rutas `/srs/espacio-ops`, `/srs/intervenciones`, `/client/espacio-ops`, `/client/intervenciones` son v2-only — el shell v2 dark se activa automáticamente sin requerir el query param (hotfix último).

**Vistas v2 deployed:**
- Cockpit Operaciones: KPI strip filter accionable + 3 cards horizontales misiones activas + 8 minicards historial reciente + sidebar widgets (Alertas / Shields / Meteorología real Open-Meteo / Resumen).
- Espacio OPS: mapa Leaflet light Positron sobre shell dark + pines pill estilo SKYPRO360 + popup quick reference con bloque timezone live + panel lateral derecho 520px slide-in con timeline + threads shared/internal + parts + briefing/capture/report + audit log + CTA escalar ball.
- Kanban Intervenciones: drag&drop nativo HTML5 + drag handle 6-dots SVG + modal context-aware con CTAs por stage + filter dropdowns multi-select (Prioridad/Cliente/Shield/Técnico) + toggle Canceladas + búsqueda libre.

**Todas las vistas:** scope-aware (`scope="srs"` o `scope="client"`). Client filtra wos/sites/alerts/agreements por `organization_id` del membership · oculta threads_internal · oculta audit log SRS-internal · oculta Facturado MTD · sidebar reducido a 6 items. Principio #1 refinado: ropa-en-casa SRS-only, operativo transparente para cliente.

**Backend intacto.** Cero modificaciones a endpoints, schemas, rutas FastAPI durante todo el sprint v2. `wo.organization_id`, `user.memberships[].organization_id`, etc. son campos reales del backend. El RBAC backend ya filtra a Rackel a Fractalia + frontend hace doble-check redundante.

---

## Stack y convenciones

- **Frontend:** React 19 + Vite 6 + Tailwind 3.4 + React Router 7 + Sonner.
- **Iconography:** Solar Icon Set estilo Linear vía Iconify web component (CDN en `index.html`). Wrapper en `lib/icons.jsx` con catálogo cerrado `ICONS.search`, `ICONS.shield`, etc. Lucide queda solo en código v1 legacy — no usar en código nuevo.
- **Mapas:** Leaflet 1.9.4 vía CDN (no npm install · OneDrive bloquea symlinks). Tiles CartoDB Positron light sobre shell dark. Mapbox GL aún en deps por código v1 viejo, pero v2 usa Leaflet.
- **Drag & drop:** HTML5 nativo (sin react-beautiful-dnd, sin @dnd-kit).
- **Timezone:** `lib/tz.js` con `TECH_REGISTRY` + `getTechTimeInfo` · regla §3.6a obligatoria cross-vista (cuando hay un tech, mostrar hora local + estado laboral + offset · Principio #8 "dejen de joder al personal").
- **Refresh indicator:** `RefreshContext` compartido · pill verde del header pulsa amber durante fetch, vuelve a verde tras `markFresh()`.

**Rutas v2:**
```
/srs?v2=1                      → V2CockpitPage scope="srs"
/srs/espacio-ops               → V2EspacioOpsPage (auto-v2)
/srs/intervenciones            → V2InterventionsKanbanPage (auto-v2)
/client?v2=1                   → V2CockpitPage scope="client"
/client/espacio-ops            → V2EspacioOpsPage scope="client" (auto-v2)
/client/intervenciones         → V2InterventionsKanbanPage scope="client" (auto-v2)
```

**Estructura de archivos clave:**
```
frontend/src/
  components/
    cockpit-v2/        — KpiStripV2, InterventionCardFull, InterventionCardMini, SidebarWidgets
    warroom-v2/        — SideDetailPanel
    kanban-v2/         — WoKanbanCard, KanbanColumn, WoStageModal, MultiSelectDropdown
    shell-v2/          — V2Shell, V2TopHeader, V2SidebarNav, V2BottomStrip
    v2-shared/         — Skeleton, EmptyState, ErrorBoundary
  contexts/
    AuthContext.jsx    — existente (memberships con organization_id)
    RefreshContext.jsx — nuevo (polling indicator)
  lib/
    icons.jsx          — Icon wrapper + ICONS catálogo Solar Linear
    tz.js              — TECH_REGISTRY + getTechTimeInfo (Principio #8)
    woCode.js          — formatWoCode (UUID→WO-XXXXXXXX legible)
    weather.js         — fetchWeatherFor (Open-Meteo público sin token)
    scope.js           — getClientOrgId + 4 predicates de filter por scope
  spaces/
    srs/v2/            — CockpitPage, EspacioOpsPage, InterventionsKanbanPage
    srs/Layout.jsx     — toggle ?v2=1 + auto-v2 en rutas v2-only
    client/Layout.jsx  — toggle ?v2=1 + auto-v2 en rutas v2-only
```

---

## Lo que falta y necesita hacerse en Code

### Inmediato (no urgente, pero pendiente)

1. **Hotfix del header v2 en /client/espacio-ops** (último cambio en este chat, sin commitear ni deployed). El owner tiene 9 archivos pending en working tree:
   - `spaces/srs/Layout.jsx` y `spaces/client/Layout.jsx` con detección de rutas v2-only.
   - `spaces/srs/v2/EspacioOpsPage.jsx` con popup fallbacks `—` cuando CLI/BALL/TAG vienen vacíos.
   - Más los archivos del paquete B completo que tampoco están deployed (lib/scope.js, V2SidebarNav scope-aware, SideDetailPanel viewerScope, etc.).
   - **Primera acción:** `cd ~/Library/CloudStorage/OneDrive-Personal/02.SR\ docs/SRS/InsiteIQ && git status` para ver qué hay pending. Decidir si commitear como un solo commit "[v2] B + hotfix Client space" o dos commits separados.

2. **Build local + deploy:**
   ```bash
   cd ~/Library/CloudStorage/OneDrive-Personal/02.SR\ docs/SRS/InsiteIQ/frontend && npm run build && cd ..
   git add -A && git commit -m "..." && git push origin v1-foundation
   ssh root@72.62.41.234 'cd /opt/apps/insiteiq && git pull origin v1-foundation && \
     docker compose build frontend && docker compose up -d --force-recreate frontend && \
     git log --oneline -1'
   ```

### Pendientes funcionales conocidos

- **Cliente_organization_id en agreements**: el modelo backend tiene `starts_at` pero no `expires_at`. El widget Shields ya muestra breakdown por nivel cuando no hay data de vencimiento (manejado). Si en el futuro se añade `expires_at` al modelo, el widget mostrará la lista próximos a vencer automáticamente.
- **Furgonetas / Fleet**: el bottom strip ya no muestra furgonetas hardcoded. Cuando el backend tenga `/api/fleet`, reincorporar `<VehicleCard>` en `V2BottomStrip.jsx` (comentario en el archivo indica el spot).
- **Filter persistence**: los filtros del Kanban se resetean al recargar. Para persistir, guardar `filterPrio/filterClient/filterShield/filterTech` en localStorage con key `kanban-v2-filters-{userId}`.
- **Dropdowns Cockpit Cliente filter**: el Cockpit no tiene filter bar (solo el Kanban lo tiene). El Cockpit usa KPI-as-filter. No falta nada ahí.
- **Cockpit v1 Mapbox token**: el cockpit v1 viejo (sin `?v2=1`) muestra `MAPBOX TOKEN AUSENTE` rojo en el centro porque `.env` PROD no tiene `VITE_MAPBOX_TOKEN`. Solución limpia: a) deprecar el v1 cuando v2 sea default, b) añadir el token al `.env.production` si se quiere mantener funcional.
- **Switch default a v2**: el plan post-validación de una semana es cambiar default de v1 → v2. Se hace seteando `VITE_V2_SHELL=1` en el build env (Dockerfile o `.env.production`) y redeployando.

### Decisiones que necesitan firma del owner antes de tocar

- **Code splitting más agresivo**: el chunk principal sigue en 2.39 MB porque Mapbox GL del v1 viejo + React + Router viven ahí. Se puede separar con `manualChunks` en `vite.config.js`. Mejora cold-load pero requiere validar que el split no rompe v1.
- **Notion sync**: integrar Notion API para postear el estado del sprint v2 a la página correspondiente. Owner decide si vale la pena.
- **Tech PWA refactor**: el espacio Tech Field actual (mobile) usa el shell v1 viejo. Refactor a v2 mobile-first es trabajo separado, no parte del sprint v2 actual.

---

## Reglas rectoras (NO inventar)

1. **No se inventa visual nuevo.** Fuente canónica: `memory/design_system_insiteiq_v2.md` (v1.8) y los 3 mocks HTML en `mocks/`. Si una pantalla no se puede construir con referencia 1:1 al mock, se para y se pregunta al owner antes de inventar.

2. **No se toca backend sin firma explícita del owner.** Si una pantalla v2 necesita un campo que la API no expone, pausar y reportar — no modificar schemas ni rutas FastAPI.

3. **Anti-plantilla IA (DS v1.7 §1).** Cero defaults Shadcn, cero Lucide en código nuevo, cero gradientes blue-to-purple, cero "vibe SaaS genérico". Test: si un observador externo puede decir "esto lo generó Claude/V0/Lovable en 5 minutos", no se firma.

4. **Solar Icon Set Linear** es el único set oficial. Catálogo cerrado en `lib/icons.jsx` `ICONS`. Si falta un glyph, se documenta en `design_system_insiteiq_v2.md` §3.6 antes de añadirlo.

5. **Timezone-aware obligatorio cross-vista.** Cuando aparezca un tech, debe mostrar hora local + estado laboral + offset (regla §3.6a). Implementación de Principio #8.

6. **Principio #1 refinado.** SRS scope ve todo · Client scope ve operativo + oculta ropa-en-casa (threads internos, números cross-cliente, audit log SRS, GPS exacto, finanzas internas).

---

## Cómo arrancar en Code

```bash
# Clonar fuera de OneDrive si quieres bypass de los issues de symlinks/permisos
mkdir -p ~/Code/srs && cd ~/Code/srs
git clone https://github.com/gutierrezbj/insiteIq.git insiteiq
cd insiteiq && git checkout v1-foundation
cd frontend && npm install
npm run dev  # http://localhost:5173

# O sigue trabajando desde OneDrive (donde ya están los cambios pending del owner)
cd ~/Library/CloudStorage/OneDrive-Personal/02.SR\ docs/SRS/InsiteIQ
git status   # te muestra qué hay sin commitear
```

**Credentials:**
- VPS PROD: `ssh root@72.62.41.234` (SSH key del owner ya configurada en Mac).
- GitHub: configurado en Mac del owner (HTTPS o SSH key).
- Login PROD: `juang@systemrapid.io` con password rotada que el owner sabe. Para client testing: `rackel.rocha@fractaliasystems.es` (Fractalia).

**Comandos útiles:**
```bash
# Dev server local
cd frontend && npm run dev

# Build production check
cd frontend && npm run build

# Deploy completo
ssh root@72.62.41.234 'cd /opt/apps/insiteiq && \
  git fetch origin && git checkout v1-foundation && git pull origin v1-foundation && \
  docker compose build frontend && docker compose up -d --force-recreate frontend && \
  echo "--- Last commit deployed ---" && git log --oneline -1'

# Ver logs container PROD
ssh root@72.62.41.234 'docker logs insiteiq-frontend --tail 50'

# Reset MongoDB user must_change_password (en PROD si se quiere desactivar rotación forzada)
ssh root@72.62.41.234 'cd /opt/apps/insiteiq && \
  docker compose exec -T mongo mongosh insiteiq --eval \
  "db.users.updateMany({}, { \$set: { must_change_password: false } })"'
```

---

## Documentos canónicos (leer en este orden)

1. `CLAUDE.md` (raíz) — overview del proyecto, stack, deploy, seed users.
2. `PROJECT_STATUS.md` (raíz) — estado actual, sección "DEPLOY v2 · 2026-04-29" arriba.
3. `memory/design_system_insiteiq_v2.md` — DS v1.8 con §3.6a timezone, §3.6b drag handle, §1.1 arquitectura SRS dark.
4. `memory/sprint_reanudacion_v2.md` — log de las 7 fases del sprint con cada commit y decisión.
5. `memory/glossary.md` — vocabulario interno SRS (Site Bible, Shield, Ball-in-court, BUMM, etc.).
6. `memory/context/company.md` — contexto SRS company (servidores, puertos, deploy convention, proyectos hermanos).
7. `mocks/insiteiq_*_v2_static.html` — los 3 mocks canónicos como referencia visual 1:1.

---

## Tono y comunicación con JuanCho (Navegante)

- Lo llamas Navegante. Él te llama Navegante también.
- Español (Venezuela/España jerga OK). Sin emojis, sin tono formal excesivo.
- Recomendación concreta firmada — no listas de opciones abiertas.
- No repetir lo que él ya dijo, no resúmenes de cortesía al final.
- Cuando hay drama técnico (errores, bloqueos), dilo directo sin disculpas excesivas. Reconocer el problema y dar 1 path concreto.
- En decisiones de diseño visual, recordarle el principio Anti-plantilla IA si vas a inventar algo.

---

**Cierre del handoff:** todo el código fuente está en `frontend/src/`. Lee primero, escribe después. Cuando hagas el primer commit en Code, etiquétalo `[v2-code]` para distinguir del trabajo de Cowork. Buena suerte.
