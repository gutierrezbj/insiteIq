# Per-space theme files

Three theme files export the per-space token overrides on top of the
**Foundation** defined in `frontend/tailwind.config.js` (spacing, radius,
duration, easing curves, z-index, breakpoints — locked across the 3 spaces).

These files are **scaffolds** for now — the runtime wiring happens in Fase 4
visual design. The pattern will be:

```jsx
// Future wiring (Fase 4):
<body data-space="srs">   /* SRS Coord web */
<body data-space="client"> /* Client portal */
<body data-space="tech">   /* Tech PWA */
```

CSS variables swap theme tokens based on `data-space`. Tailwind utilities
read the vars. See `DESIGN.md` section 2 for the full spec per space.

## Files

- `srs.js` — War room + relojeria suiza (desktop, warm dark)
- `client.js` — Hotel 5 estrellas (desktop, warm neutral light, Instrument Serif)
- `tech.js` — Cirujano de campo (mobile PWA, alto contraste dark + amber saturated)

## Shared base (Foundation — do NOT override)

- spacing / radius / duration / easing / z-index / breakpoints
- Font families available: Instrument Sans, Instrument Serif, DM Sans, JetBrains Mono
- Active feedback: scale(0.97) on :active universal
