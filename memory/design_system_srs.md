# SRS Design System — Context for InsiteIQ

## Source
Notion: SRS Design System (Nucleus v2.0)

## Key Rules
- Every SRS project needs its own visual identity (Identity Sprint)
- Blacklisted fonts: Inter, Space Grotesk, Poppins, Montserrat, Raleway, Outfit, Nunito, Roboto, Open Sans, Lato
- Blacklisted colors: Tailwind defaults (#6366F1, #8B5CF6, #3B82F6, #10B981), blue-to-purple gradients, black + neon green
- Blacklisted layouts: generic sidebar + content without character, AdminLTE-style dashboards
- Foundation tokens are FIXED: spacing (4px base), radius, z-index, durations, easings
- 4 custom easing curves: ease-out-expo, ease-out-back, ease-in-out-circ, ease-spring
- Duration scale: instant 100ms, fast 180ms, normal 280ms, slow 400ms, slower 600ms
- Motion: active = scale(0.97), never use linear, small elements move fast / large ones slow
- Rule 60-30-10 for color: 60% background, 30% text/neutral, 10% accent
- Typography must create tension between two contrasting families
- Every clickable element gets scale(0.97) on active
- Labels ALWAYS visible (never placeholder-only)
- Max 1 Primary button per view
- Skeleton > spinner for loading states

## InsiteIQ Identity Sprint
- **Character:** "Centro de operaciones de mision critica para ingenieros de campo — precision militar con calor latinoamericano"
- **Color temperature:** Neutral dark + warm accent (amber/copper)
- **Primary color:** Amber/copper (#D97706 range) — NOT Tailwind blue
- **Typography:** Instrument Sans (headlines) + DM Sans (body) + JetBrains Mono (data)
- **Signature motion:** ease-out-expo + Stagger Wave for lists/dashboards
- **Signature detail:** 3px left accent bar on cards, uppercase tracking-wide labels, pulse dot for live states
- **Background:** NOT #0F172A — needs custom dark with warmth

## Distinctiveness Audit Checklist
- [ ] Fonts NOT in blacklist
- [ ] Primary color NOT a Tailwind/Bootstrap/Material default
- [ ] Background has personality (not pure #000, #FFF, #111827, #0F172A)
- [ ] Signature detail repeats across app
- [ ] Primary easing curve chosen and documented
- [ ] Motion uses max 2-3 patterns consistently
- [ ] Typography creates tension (different families)
- [ ] External person doesn't say "looks like [product X]"
- [ ] All structural tokens from Foundation unchanged
- [ ] Components follow defined anatomy
- [ ] Passes Template Test
- [ ] Identity Sprint documented
