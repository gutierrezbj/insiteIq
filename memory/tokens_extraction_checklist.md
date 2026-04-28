# Token Extraction Checklist — OverWatch + SKYPRO360 → InsiteIQ v2

> **Objetivo:** cerrar los hex `[tbd]` de `design_system_insiteiq_v2.md` §3.1/§3.2/§3.3/§3.4 con valores reales de producción. No inventamos, capturamos.
>
> **Tiempo estimado:** 15 min DevTools. No requiere código.
>
> **Output esperado:** rellenar tabla al final de este doc, luego find-and-replace `[tbd]` en el design system v2.

---

## Cómo capturar (método)

1. Abre la URL objetivo en Chrome.
2. `F12` → pestaña **Elements**.
3. Click en el elemento que te indica la checklist.
4. En el panel derecho (Styles/Computed), busca la propiedad (`background-color`, `color`, `border-color`).
5. Click en el swatch de color → Chrome muestra el hex exacto.
6. Copia el hex a la tabla de este doc.
7. Si el valor viene de una CSS var (ej `var(--ow-bg-canvas)`), abre el `:root` o `<html>` en el tree, busca las custom properties definidas, copia el valor raíz también.

---

## OverWatch — capturas a tomar

URL: `https://overwatch.systemrapid.io` (login con tu usuario SRS).

### A. Header dark band
- Ir al Cockpit o cualquier vista con header.
- Click en el elemento `<header>` o banda negra superior.
- Capturar:
  - `background-color` → **OW_HEADER_BG** (debería ser cerca de `#0A0A0A` o `#111`).
  - Color de texto de nav items (activo e inactivo) → **OW_HEADER_TEXT_ACTIVE**, **OW_HEADER_TEXT_IDLE**.
  - Color del underline del item activo si existe → **OW_HEADER_UNDERLINE**.

### B. Canvas global
- Fuera del header, sobre fondo general de la página (Kanban o Cockpit).
- Capturar:
  - `background-color` del `<body>` o contenedor principal → **OW_BG_CANVAS**.
  - `background-color` de las columnas Kanban (fondo gris claro) → **OW_BG_SURFACE_SUBTLE**.
  - `background-color` de las WO cards individuales → **OW_BG_SURFACE** (debería ser blanco puro o casi).

### C. Stage colors (border-top de cards)
Capturar el `border-top-color` de una card en cada stage visible. Si no están todos los stages disponibles, captura los que veas:
- Solicitadas → **OW_STAGE_INTAKE**
- Preparando → **OW_STAGE_PREFLIGHT**
- En campo → **OW_STAGE_ENROUTE / OW_STAGE_ONSITE**
- Cerrando → **OW_STAGE_RESOLVED**
- Cerradas → **OW_STAGE_CLOSED**
- Cancelada (si hay) → **OW_STAGE_CANCELLED**

### D. Priority badges
En una card, capturar el color de texto del badge uppercase `PRIO-*`:
- URGENTE → **OW_PRIO_URGENT**
- ALTA → **OW_PRIO_HIGH**
- NORMAL → **OW_PRIO_NORMAL**
- BAJA → **OW_PRIO_LOW**

### E. Borders + texto
- Border estándar de una card → **OW_BORDER_SUBTLE**.
- Border de hover (si cambia) → **OW_BORDER_STRONG**.
- Color de texto título de card → **OW_TEXT_PRIMARY**.
- Color de texto metadata (tech asignado, tiempo relativo) → **OW_TEXT_SECONDARY** / **OW_TEXT_TERTIARY**.

### F. Modal context-aware (abre una card)
- `background-color` del overlay → **OW_OVERLAY** (debería ser `rgba(0,0,0,0.5)` o similar).
- `background-color` del panel del modal → **OW_MODAL_BG**.
- Color del badge stage en header del modal → confirma que matchea **OW_STAGE_***.
- Color del CTA primary → **OW_CTA_PRIMARY** (anota si coincide con el stage destino o es un accent único).

---

## SKYPRO360 OpsManager — capturas a tomar

URL: `https://skp360mgr.systemrapid.io` (login con tu usuario SRS).

### G. Cyan accent (primary)
- Ir a una vista con CTA primary cyan (ej: botón "Nueva misión" o similar).
- Capturar `background-color` del botón → **SKP_ACCENT_PRIMARY**.
- `background-color` del botón en hover (usa el simulador de estados en DevTools: `:hov` toggle) → **SKP_ACCENT_HOVER**.
- Si hay un accent-subtle fill (ej: tab activo con background color suave), capturar → **SKP_ACCENT_SUBTLE**.
- Color de focus ring de inputs si aparece → **SKP_ACCENT_RING**.

### H. Verde brand (SRS logo)
- Si aparece el logo o algún badge/pill verde de brand.
- Capturar → **SKP_BRAND_GREEN**.
- Si hay variante dark (hover o dot live) → **SKP_BRAND_GREEN_DARK**.

### I. KPI card icon wrappers
Por cada KPI card del dashboard, capturar:
- `background-color` del wrapper cuadrado 40x40 del icono → anotar junto al label del KPI.
- Esto nos dice qué color semántico está usando SKYPRO360 para cada categoría (operacional / financiero / compliance / etc).
- Lo usaremos para validar que nuestro mapping InsiteIQ (WOs activas = brand, Programadas = stage-intake, etc) no rompe coherencia cross-ecosystem.

### J. Canvas + surfaces
- `background-color` del canvas global → **SKP_BG_CANVAS**.
- `background-color` de cards → **SKP_BG_SURFACE**.
- `background-color` de fondos secundarios (filter bars, sidebars) → **SKP_BG_SUBTLE**.

### K. Map view (si aplica)
- Si SKYPRO360 tiene mapa, captura:
  - URL de tiles (mirar Network tab filtrando por `tiles` o `png`) → **SKP_MAP_TILES_URL**.
  - Esto nos dice si es Carto Positron, MapTiler Light, o custom. Lo necesitamos para paso 5 roadmap (port map view).

---

## Tabla para rellenar

| Token InsiteIQ v2 | Valor actual `[tbd]` | Captura OW | Captura SKP | Hex final InsiteIQ | Notas |
|---|---|---|---|---|---|
| `bg-canvas` | `#F9FAFB` | `OW_BG_CANVAS:` | `SKP_BG_CANVAS:` | | |
| `bg-surface` | `#FFFFFF` | `OW_BG_SURFACE:` | `SKP_BG_SURFACE:` | | |
| `bg-surface-subtle` | `#F3F4F6` | `OW_BG_SURFACE_SUBTLE:` | `SKP_BG_SUBTLE:` | | |
| `bg-header` | `#0A0A0A` | `OW_HEADER_BG:` | — | | Solo OW define esto |
| `border-subtle` | `#E5E7EB` | `OW_BORDER_SUBTLE:` | — | | |
| `border-strong` | `#D1D5DB` | `OW_BORDER_STRONG:` | — | | |
| `text-primary` | `#0F172A` | `OW_TEXT_PRIMARY:` | — | | |
| `text-secondary` | `#475569` | `OW_TEXT_SECONDARY:` | — | | |
| `text-tertiary` | `#94A3B8` | `OW_TEXT_TERTIARY:` | — | | |
| `text-on-dark` | `#F1F5F9` | `OW_HEADER_TEXT_ACTIVE:` | — | | |
| `accent` | `#0EA5E9` | — | `SKP_ACCENT_PRIMARY:` | | **Validar si es sky-500 Tailwind. Si sí, shift 1 paso.** |
| `accent-hover` | `#0284C7` | — | `SKP_ACCENT_HOVER:` | | |
| `accent-subtle` | `#E0F2FE` | — | `SKP_ACCENT_SUBTLE:` | | |
| `brand` | `#10B981` | — | `SKP_BRAND_GREEN:` | | **Validar si es emerald-500 Tailwind. Si sí, shift 1 paso.** |
| `brand-dark` | `#059669` | — | `SKP_BRAND_GREEN_DARK:` | | |
| `stage-intake` | `#3B82F6` | `OW_STAGE_INTAKE:` | — | | |
| `stage-preflight` | `#8B5CF6` | `OW_STAGE_PREFLIGHT:` | — | | |
| `stage-dispatched` | `#7C3AED` | (deriva de preflight +1 paso) | — | | |
| `stage-enroute` | `#F59E0B` | `OW_STAGE_ENROUTE:` | — | | |
| `stage-onsite` | `#EA580C` | `OW_STAGE_ONSITE:` | — | | |
| `stage-resolved` | `#22C55E` | `OW_STAGE_RESOLVED:` | — | | |
| `stage-closed` | `#16A34A` | `OW_STAGE_CLOSED:` | — | | |
| `stage-cancelled` | `#6B7280` | `OW_STAGE_CANCELLED:` | — | | |
| `prio-urgent` | `#DC2626` | `OW_PRIO_URGENT:` | — | | |
| `prio-high` | `#F59E0B` | `OW_PRIO_HIGH:` | — | | |
| `prio-normal` | `#475569` | `OW_PRIO_NORMAL:` | — | | |
| `prio-low` | `#60A5FA` | `OW_PRIO_LOW:` | — | | |
| `shield-bronze` | `#B45309` | — | — | | Solo InsiteIQ, no captura — confirma manualmente |
| `shield-bronze-plus` | `#D97706` | — | — | | Idem |
| `shield-silver` | `#64748B` | — | — | | Idem |
| `shield-gold` | `#CA8A04` | — | — | | Idem |

---

## Checks de distinctiveness post-captura

Una vez tengas los hex, verifica:

1. **`accent` cyan ≠ `#0EA5E9` exacto de Tailwind sky-500.** Si lo fuera, el doc pide shift 1 paso (ej `#0891B2` cyan-600 o `#06B6D4` cyan-500). Motivo: Regla Dura #0 Anti-plantilla IA §1.
2. **`brand` verde ≠ `#10B981` exacto de Tailwind emerald-500.** Mismo criterio.
3. **`bg-canvas` ≠ `#F9FAFB` exacto (gray-50 Tailwind).** Shift acceptable: `#FAFAF9` (stone-50) o `#F8FAFC` (slate-50) si OW/SKP usan variantes con personalidad.
4. **Todos los stage colors distinguibles a 3px de border-top.** Test: imprime un row de 9 cards con los 9 stages lado a lado, mira de lejos. Si `intake` y `dispatched` se parecen, separamos más.
5. **Contraste AA mínimo** de text-primary sobre bg-surface (calcula con webaim contrast checker).

---

## Siguiente acción

Una vez rellenada la tabla:
1. Juan (o Claude si se le pasa el output) hace find-and-replace `[tbd]` en `design_system_insiteiq_v2.md` con los hex finales.
2. Se cierra `Draft 1.4` en §12 Changelog con nota "tokens capturados PROD".
3. Paso 1 Roadmap queda completado → Paso 3 (component library) queda desbloqueado (el mock del Paso 2 puede arrancar en paralelo con los hex `[tbd]` actuales porque son aproximaciones razonables).
