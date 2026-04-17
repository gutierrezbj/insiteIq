# InsiteIQ — DESIGN.md

Handoff contract entre diseno y desarrollo. Toda decision visual canonica vive
aqui. Si algo en el codigo contradice este documento, es un design bug.

Source of truth ultimo: tokens estructurales en `frontend/tailwind.config.js` +
theme overrides per-space en `frontend/src/themes/{srs,client,tech}.js`.

---

## 1. Foundation — locked (shared across all 3 spaces)

Estas decisiones vienen del Nucleus v2.0 original del v0 y se preservan tal cual.
Cualquier override por espacio se hace ENCIMA de esta base, nunca la contradice.

### 1.1 Spacing (tailwind.config.js)

Scale fijo. `0 / px / 0.5 / 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 / 10 / 11 / 12`
mapeado a `0/1/2/4/8/12/16/24/32/40/48/64/80/96/128` px.

### 1.2 Radius

`none (0) / sm (4) / md (8) / lg (12) / xl (16) / 2xl (24) / full (9999)`.

### 1.3 Duration

`instant (100ms) / fast (180ms) / normal (280ms) / slow (400ms) / slower (600ms)`.

### 1.4 Easing Foundation set

| Token | Curve | Uso canonico |
|---|---|---|
| `linear` | `linear` | solo loops / pulse-dot |
| `out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | settle precision (primary SRS) |
| `out-back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | leve overshoot |
| `in-out-circ` | `cubic-bezier(0.85, 0, 0.15, 1)` | suave ambos lados (primary Client) |
| `spring` | `cubic-bezier(0.22, 1.2, 0.36, 1)` | haptic overshoot (primary Tech) |

### 1.5 Z-index

`base (0) / dropdown (100) / sticky (200) / overlay (300) / modal (400) / toast (500) / tooltip (600)`.

### 1.6 Breakpoints

`sm (640) / md (1024) / lg (1440)`.

### 1.7 Active feedback (universal)

`transform: scale(0.97)` on `:active` para todo elemento clickeable. Transicion
`180ms ease-out-expo`. Feedback tactil en toda la app.

### 1.8 Font families base (cargadas via Google Fonts en `index.html`)

- **Instrument Sans** (display family — both `Sans` and `Serif` siblings)
- **DM Sans** (body universal)
- **JetBrains Mono** (utility universal: refs, data, labels, code, timestamps)

### 1.9 Blacklist (nunca, en ningun espacio)

- Fonts: Inter, Poppins, Roboto, cualquier default Google "modern-sans"
- Color primary: Tailwind default blue, indigo, sky, teal
- Fondo: `#FFFFFF` puro, `#000000` puro (Client usa stone-50, Tech usa stone-950), gray-900 Tailwind
- Motion: `linear` easing en transitions, `ease-in` en enter animations
- Layout: generic "admin template" grids, centered single-column SaaS marketing
- Iconografia: mezclar sets (Heroicons + Lucide + Feather...). Un solo set.

---

## 2. Per-space specifications (Identity Sprint result)

Las 15 decisiones cerradas el 2026-04-17 Identity Sprint. Formato: 5 decisiones ×
3 espacios. Paso 6 Template Test diferido a Fase 4 visual design.

### 2.1 SRS Coordinators — "War room de portaaviones con acabados de relojeria suiza"

Audiencia: JuanCho, Sajid, Andros, Adriana, Luis, Agustin, Yunus. Nivel tecnico
alto. Contexto: oficina/remoto, sesiones largas (2-8h), decision rapida, data
densa, alertas criticas, context-switch multi-proyecto.

| Decision | Valor |
|---|---|
| Caracter | War room de portaaviones con acabados de relojeria suiza |
| Temperatura | Warm dark dominante — Stone-950 fondo + amber-600 primary; cold accents (steel blue/teal) solo en data tokens y metricas |
| Tipografia | Instrument **Sans** (display) + DM Sans (body, weight medium) + JetBrains Mono (refs/data, prominent). Escala compact para densidad |
| Motion | Primary `out-expo` `(0.16, 1, 0.3, 1)` · Patron: stagger-in 60ms en listas · Duraciones: fast 180ms default |
| Signature | Accent-bar 3px amber-600 left border + label-caps (uppercase mono tracking-widest-srs) + glow CTA (`0 0 20px rgba(217,119,6,0.25)`) + warm scrollbar (stone-900 track / stone-700 thumb) + **Refinamiento etching**: refs/serials en mono caps con inset 1px oscuro (`text-shadow: 0 1px 0 rgba(0,0,0,0.6)`) — etched-on-dial feel |

Device target: desktop 1280px+ primary, 1440px+ optimo. 768px fallback viable.

### 2.2 Client Coordinator — "Recepcion de hotel 5 estrellas donde todo funciona sin que veas el esfuerzo"

Audiencia: Rackel/Fractalia, Adrian/Claro, Laly/Claro US, Wilmer LCON, downstream
consumers. Nivel tecnico medio. Contexto: oficina corporativa, sesiones cortas
(5-15 min), consulta status, validar deliverable, aprobar, cero friccion. Ven
OUTPUT, nunca tripas.

| Decision | Valor |
|---|---|
| Caracter | Recepcion de hotel 5 estrellas donde todo funciona sin que veas el esfuerzo |
| Temperatura | Warm neutral LIGHT — fondos cream/stone-50 (`#FAFAF9`) y stone-100 (`#F5F5F4`) · amber RESERVADO solo a CTA primario y status ok · sin dark mode v1 |
| Tipografia | Instrument **Serif** (display — twist editorial) + DM Sans (body, weight light-medium) + JetBrains Mono (reservado, solo data points especificos). Escala respirada (generous line-height, 65ch max-width) |
| Motion | Primary `in-out-circ` `(0.85, 0, 0.15, 1)` · Patron: fade-up 400ms gentle (12-16px lift + opacity) · Duraciones: slow 400ms default |
| Signature | **Hairline serif dividers** — 1px stone-300 (`#D6D3D1`) horizontal rules con 2x whitespace alrededor. Estilo papeleria de hotel premium / libro impreso |

Device target: desktop 1280px+ primary, 768px secondary, 375px fallback.

### 2.3 Tech Field PWA — "Herramienta de cirujano de campo: todo a la mano, nada sobra, vida o muerte"

Audiencia: Osdaher, Arlindo, Agustin, subs locales por pais. Nivel tecnico alto
en campo, bajo en software. Contexto: rack room, techo, exterior, luz directa,
una mano ocupada, guantes posibles, 3AM. PWA offline-capable, camara integrada,
GPS.

| Decision | Valor |
|---|---|
| Caracter | Herramienta de cirujano de campo: todo a la mano, nada sobra, vida o muerte |
| Temperatura | Alto contraste dark + amber saturado — Stone-950 fondo (preserve SRS) · amber primary mas saturado para visibilidad solar · semantic colors extra saturated (success `#16A34A`, danger `#DC2626`) · escala tipografica grande por default |
| Tipografia | Instrument Sans (display, larger) + DM Sans (body, **weight bold default** para legibilidad con luz/guantes/movimiento) + JetBrains Mono prominente para WO refs/status/timestamps |
| Motion | Primary `spring` `(0.22, 1.2, 0.36, 1)` · Patron: instant-on + micro-spring 100ms en press/release. No fades en nav (direct state swap). Haptic-feedback-like sin necesidad de Vibration API |
| Signature | **Bottom status hairline 4px persistente** coloreado por WO state: intake/triage=stone-500, dispatched=cyan, en_route=amber, on_site=violet, resolved=success, closed=stone-700, cancelled=danger. Siempre visible en footer. + Mono-caps prominente para WO refs en todo card header |

Device target: mobile 375px primary, 768px tablet landscape para briefings extensos. Touch targets 44x44px minimum (WCAG AA).

---

## 3. Handoff rules (heredadas + reforzadas por Identity Sprint)

1. **No hex literal en codigo de componente** — siempre tokens en tailwind.config.js
   o CSS variables del theme file del espacio.
2. **No inline `style={{}}`** para spacing/color — siempre utility classes.
3. **No motion sin easing y duracion del Foundation set** (sections 1.3 + 1.4).
4. **Cada pantalla tiene los 5 estados:** default · empty · loading (skeleton) · error · success.
5. **Distinctiveness Audit (12 puntos, Notion UX/UI checklist) obligatorio pre-prod.**
   Paso 6 Template Test es parte de este audit — se hace con persona externa.
6. **Foundation (section 1) inmutable** — cualquier desviacion requiere ADR en SDD-04.
   Los theme files (section 2) son la capa libre de overrides por espacio.
7. **Iconografia** — un solo set por espacio. Sugerido: **Lucide** (ya en bundle) para SRS
   y Tech; Client puede usar Lucide o pictograms custom editoriales si Fase 4 lo pide.

---

## 4. Pendientes antes de cerrar Identity Sprint completo

- [ ] Paso 6 Template Test — post Fase 4 visual mocks (persona externa verifica
      que los 3 espacios NO se parecen a Tailwind UI / shadcn / admin template).
- [ ] Moodboard de referencias NO-DIGITALES per espacio (10-15 imagenes c/u).
      Se curara cuando haya ventana creativa. No bloquea Fase 4.
- [ ] Fase 2 Foundation del protocolo UX/UI — implementar theme files runtime
      (CSS variables + swap por `data-space` atribbute en body segun route).
- [ ] Fase 3 Wireframes low-fidelity de flujos criticos per espacio.
- [ ] Fase 4 Visual design alta fidelidad — pantallas criticas por espacio con
      los 5 estados. Bloquea el arranque de frontend development.

---

## 5. References

- Notion: [SRS Design System v2.0](https://www.notion.so/3397981f08ef81d7bd6cf83da8dba729)
- Notion: [Checklist UX/UI — InsiteIQ v1](https://www.notion.so/3437981f08ef81af928fc929b1b6f2a5)
- Repo: `frontend/tailwind.config.js` (Foundation tokens)
- Repo: `frontend/src/themes/{srs,client,tech}.js` (per-space overrides)
- Repo: `frontend/src/index.css` (base CSS: accent-bar, label-caps, stagger)

---

## 6. Changelog

- **v1.1 (2026-04-17)** — Identity Sprint 5 pasos cerrados per espacio.
  Caracter phrases locked, color temperature per-space, typography con serif
  twist en Client (Instrument Serif), motion per-space (out-expo / in-out-circ
  / spring), signature details per-space (etching / hairline divider /
  status hairline). Template Test diferido a Fase 4. Moodboard pendiente.
- **v1.0 (2026-04-16)** — Stub inicial con base Nucleus v2.0 + placeholders
  per espacio pendientes de Identity Sprint.
