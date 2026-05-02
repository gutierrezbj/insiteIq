---
name: Sprint Rollouts v2 — Roadmap formal
description: Roadmap del sprint Rollouts v2 (Modo 2 dictado por owner 30-abr) construido on-the-fly sin doc formal hasta 2026-05-02. Documenta iters cerradas (2.1/2.2/2.3 deployed PROD) + iters propuestas pendientes con orden de prioridad y mi opinión firmada como navegante. NO es backend roadmap; es UX/feature roadmap de la vista RolloutDetailPage + RolloutsListPage.
type: project
---

# Sprint Rollouts v2 — Roadmap formal

> **Status del sprint:** 3 iters cerradas en PROD VPS 1 (`https://insiteiq.systemrapid.io`). Roadmap pendiente formalizado 2026-05-02 tras pedido del owner ("vamos a seguir el roadmap que desarrollamos y si no hay hacemos uno"). Documento canónico para no improvisar entre iters.

## Origen del sprint

**Dictado del owner** (sesión café 30-abr-2026, transcrito literal en
`frontend/src/spaces/srs/v2/RolloutDetailPage.jsx` líneas 4-13):

> *"el mapa de la evolución, sitios completados, sitios por completar e impedimentos"*
>
> *"sería genial, algo como un mapa, con su banderita, verde hecho o en
>  marcha, rojo con problemas, bombillo azul en calendario, un kanban
>  también sería muy útil, y un cuadro de mando :) área de rollouts con 3
>  sub pestañas, algo práctico fácil de ver y poder sacar un reporte con
>  3 clicks"*

**Decisiones cerradas con owner durante la construcción:**

1. Reporte simple primero (no master CMDB-ready) — PDF + XLSX
2. Drag&drop activo en Kanban
3. Timeline gantt sí (4ª pestaña, no las 3 sub-pestañas originales)
4. Modal "Programar desde Mapa" sí (CTA en pin con status `intake`)

**Project canónico de prueba:** Arcos Dorados SDWAN Off-Net LATAM
(`ARCOS-CLARO-SDWAN-OFFNET`, id `69f27ec25b0e57c1f2677487`, 90 WOs sobre
101 sites target, dataset Claro CES SOW V1.1 + PA-1000055 + PA-1000066).

## Iters cerradas (deployed en PROD VPS 1)

| Iter | Commit | Entregable | Validación |
|---|---|---|---|
| **2.0** | `99eb255` | Vista RolloutDetailPage con 4 tabs (Mapa+Kanban+Cuadro+Timeline). Chasis funcional sin pulir. | Owner firmó por screenshot. |
| **2.1** | `68d2ed8` | Modal "Programar desde Mapa" — CTA amber en popup de pin con status `intake`, dispara flow `intake→triage` con tech + fecha. | Owner firmó por screenshot. |
| **2.2** | `9750aff` | Pin teardrop (gota) con halo Stone-950 + Solar `flag-bold` dentro coloreado por status. Anchor en punta inferior `[16,38]`. `LegendPin` reutilizable para consistencia mapa↔leyenda. | Validación live preview + screenshot owner-aprobado. |
| **2.3** | `1a95c43` | Export Report client-side — dropdown CSV/XLSX (Blob UTF-8 BOM, Excel-ready) + Print PDF (A4 landscape via `window.print()`). 100% client-side, NO toca backend (regla #5). | CSV validado live (91 líneas), PDF validado vía `window.__printCalled`. PROD smoke HTTP 200. |
| **2.4** | `0a1549e` | Timeline polish: rango selector (1m/3m/6m/Todo) + línea HOY amber + tooltip enriquecido (site+WO+status+duración) + sin límite de 100 rows + EmptyState con sublabel accionable. | Filter rango validado (1m=88, 3m=90, all=90) + screenshot. |
| **2.5** | `431b8b7` | RolloutsListPage upgrade: search libre + filter status (3 chips con counts) + sort selector (6 opciones) + cliente/end-client/PO en card + skeleton states + border-left rojo si incidentes>0. Bug fix: `display_name`/`legal_name` en orgs. | 3 cards visibles con cliente resuelto · screenshot. |
| **2.6** | `2ec7bd5` | State persistence en localStorage: `activeTab` + `filter` per project_id, `rangeKey` global cross-rollouts. Cosmético: status del header como pill consistente con cards. | Verificado reload preserva tab=Kanban + filter=Problemas. |
| **2.7** | `65654b1` | Notas internas del Rollout · backend (model `ProjectNote` + 4 routes RBAC enforced) + frontend (`RolloutNotesPanel` slide-in con composer + visibility toggle + edit/delete propias). Owner firmó "backend > localStorage" por anti-deuda técnica. | Backend smoke OK (POST/GET/PATCH/DELETE) + UI live verified. |
| **2.8** | `_pending_` | Switch default v2 + deprecate v1: removido toggle `VITE_V2_SHELL`, simplificados Layouts (siempre V2Shell), removido `mapbox-gl` + `OperationsMap.jsx` + cockpit v1 + HomePage v1 + WorkOrdersListPage v1. **Bundle 2.39MB → 556kB (75% reducción)**. Páginas v1 sin reemplazo (Projects/Sites/Techs/Agreements/Finance/Insights/Admin) siguen funcionando dentro del V2Shell. | `/srs` directo a v2 sin query param · MAPBOX TOKEN AUSENTE error eliminado. |

## Iters propuestas (mi opinión firmada como navegante)

Ordenadas por **valor operativo / esfuerzo**, no por escolaridad.

### Iter 2.4 · Timeline polish (cierre de "Iteración 1")

**Por qué primero:** el código del tab Timeline tiene 2 marcas explícitas
de deuda (`Iteración 1` en línea 860 + `paginar en próxima iter` línea 914)
y el Cuadro de Mando muestra "ETA 100% semanas restantes" pero el Timeline
no muestra dónde está el día de hoy ni permite zoom temporal. Cierra el
último stub visible del chasis.

**Scope acotado:**
- Selector de rango temporal (botones: "Últ. mes" / "3M" / "6M" / "Todo").
- Línea vertical "HOY" amber a través de la grilla (orientación visual).
- Tooltip hover sobre barra: site name + WO code + status + duración días.
- Quitar el límite hard de 100 filas (mostrar todas, scroll vertical).
- Quitar copy "Iteración 1" del subheader.

**Sin scope** (postergar a 2.5 si se ocurre):
- Drag para arrastrar fechas (mover WO).
- Zoom con scroll wheel.
- Resource lanes (agrupar por tech).

**Riesgo:** bajo. 100% frontend, sin backend. Mismo archivo
`RolloutDetailPage.jsx`, función `TimelineTab`.

### Iter 2.5 · RolloutsListPage upgrade

**Por qué:** la `RolloutsListPage.jsx` existe (4.19 kB) pero no se sabe
qué muestra. El owner mencionó "área de rollouts" — implica que la lista
debe ser navegable y útil. Si está pelada, no escala más allá de Arcos
Panamá.

**Scope acotado:**
- Cards o filas con: code · title · status · progress % · sites count · health pill.
- Filter bar: status (active/closed), country, client.
- Click → navega a `/srs/rollouts/{id}` (ya wired).
- Empty state si no hay rollouts.

**Verificación previa obligatoria:** leer `RolloutsListPage.jsx` antes de
proponer cambios concretos. Quizá ya está OK y la iter es solo "validar +
agregar 1 filter".

### Iter 2.6 · Filter persistence + cosméticos del header Rollout

**Por qué:** los filtros del header del Rollout (Todos/Problemas/Programados)
se resetean al recargar. Misma deuda que el Kanban grande
(`/srs/intervenciones`) ya documentada en `donde_la_cagamos.md`.

**Scope acotado:**
- localStorage `rollout-{project_id}-filter` con TTL 1h.
- Restore on mount.
- Cosméticos del header del Rollout: alineación stats, balance del
  amber/colors, fix de wrapping del título largo en viewports estrechos.

### Iter 2.7 · Notas internas en SideDetail del Rollout (Principio #4 "ropa en casa")

**Por qué:** cuando un rollout tiene 88 con problemas, el owner necesita
anotar "este lo cubre Andros, no escalar a cliente todavía" o "este es
re-cotización pendiente". Hoy no hay lugar para eso scoped al rollout,
solo a WO individual.

**Scope:**
- Campo notes_internal en project (backend opcional o solo en localStorage
  por ahora — preferir localStorage para evitar firma backend regla #5).
- Sidebar derecho del Rollout con textarea + auto-save.
- Visible solo SRS scope (no client).

**Decisión pendiente firma owner:** ¿localStorage local-only o backend
con persistencia cross-device? Si backend → necesita firma + endpoint
nuevo en `/projects/{id}/notes`.

### Iter 2.8 · Switch default v2 (cierre del feature flag)

**Por qué:** el plan post-validación de una semana del Sprint v2
(documentado en `PROJECT_STATUS.md` línea 40) era cambiar default de v1 →
v2. Ya pasaron >7 días desde el deploy 29-abr. Toggle: `VITE_V2_SHELL=1`
ya está default-true en Dockerfile, pero el v1 sigue compilándose.

**Scope:**
- Eliminar `VITE_V2_SHELL` del código (siempre v2).
- Marcar páginas v1 como `__legacy/` o eliminarlas (decisión del owner).
- Quitar Mapbox GL del bundle (~2MB savings) si v1 muere.
- Update doc CLAUDE.md + PROJECT_STATUS.md.

**Decisión pendiente firma owner:** ¿deprecar v1 o mantener para rollback?
Mi opinión: deprecar. La v1 ya tiene 8+ días en PROD sin issues y nadie
la usa.

## Orden de ejecución que voy a seguir (sin re-preguntar)

```
2.4 Timeline polish ──▶ 2.5 RolloutsListPage ──▶ 2.6 Filter persist
                                                      │
                                          ┌───────────┘
                                          ▼
                       2.7 Notas internas (con firma backend opcional)
                                          │
                                          ▼
                       2.8 Switch default v2 (con firma deprecar v1)
```

**Regla de cierre de iter:** cada iter termina con commit + push +
deploy a PROD VPS 1. El owner valida en PROD, no en preview local. Si
algo no firma, se reverta o se itera in-place antes de pasar a la
siguiente.

**Cuándo paro a preguntar:**
- Antes de tocar backend (regla #5).
- Cuando la iter no tenga scope claro y necesite dictado operativo.
- Cuando una decisión cambie el alcance del sprint (no detalle interno).

**Cuándo NO paro a preguntar (mi opinión):**
- Detalles operativos dentro del scope ya dictado (color, layout, nombre
  de campo) — propongo y ejecuto, owner corrige si quiere.
- Commit, push, deploy de iters ya validadas en preview local.
- Refactor menor / cleanup de TODOs explícitos en el código.

## Comandos canon del sprint

```bash
# Stack local
docker compose ps   # debe mostrar 4 containers up

# Vite dev (HMR para iter más rápida)
cd frontend && npm run dev   # http://localhost:5273 si .claude/launch.json

# Build sanity
cd frontend && npm run build

# Deploy frontend a PROD VPS 1
ssh root@72.62.41.234 'cd /opt/apps/insiteiq && git pull origin v1-foundation && \
  docker compose build frontend && docker compose up -d --force-recreate frontend && \
  git log --oneline -1'

# Smoke PROD
curl -s -o /dev/null -w "HTTP %{http_code} · %{time_total}s\n" https://insiteiq.systemrapid.io/

# URL del rollout Arcos Panamá
https://insiteiq.systemrapid.io/srs/rollouts/69f27ec25b0e57c1f2677487
```

## Cierre del sprint

El Sprint Rollouts v2 cierra cuando:
1. Las 5 iters propuestas (2.4 → 2.8) estén deployed en PROD.
2. Owner valide en PROD que el flow Rollout cubre el dictado original
   end-to-end (mapa + kanban + cuadro + timeline + reporte 3 clicks +
   programar desde mapa).
3. Update final de este doc con commits + fecha de cierre.

Después: pivot a próximo sprint según dictado del owner. Candidatos
naturales (no comprometidos): Cosméticos SideDetailPanel del Espacio
OPS (6 items pendientes en `donde_la_cagamos.md`), Tech PWA refactor v2,
Client space polish.
