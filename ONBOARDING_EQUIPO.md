# InsiteIQ · Guía de onboarding para el equipo SRS

> **Audiencia:** Andros, Adriana, Luis, Yunus (SRS desktop) · Agustin, Hugo, Arlindo (Tech PWA mobile) · Rackel y similar (Client desktop)
> **Updated:** 2026-05-10 (Iter 2.63b · post-i18n)
> **URL:** https://insiteiq.systemrapid.io

---

## 1 · Tu primer login (todos)

Te llegó (o te llegará) un email/WhatsApp del owner con tu **email** registrado en el sistema. La contraseña inicial para todos es:

```
InsiteIQ2026!
```

Al primer login el sistema te **forzará a cambiarla**. No podés entrar a ningún espacio hasta rotar.

Reglas de la nueva contraseña:
- Mínimo **10 caracteres**
- Distinta a la actual
- Vas a confirmarla escribiéndola dos veces

Después del cambio, el sistema te lleva automáticamente a tu espacio.

**Idioma:** arriba a la derecha hay un selector ES / EN. La preferencia se guarda en tu browser (`localStorage`), no se pierde entre sesiones.

---

## 2 · Si sos SRS Coordinator (Andros, Adriana, Luis, Yunus)

**Tu URL:** `https://insiteiq.systemrapid.io/srs`

### Navegación (sidebar izquierdo)

| Item | Qué hacés ahí |
|------|---------------|
| **Operaciones** | Cockpit war-room · mapa · cards de intervenciones activas |
| **Espacio OPS** | Mapa interactivo Leaflet con todos los sites + alertas operativas |
| **Intervenciones** | Kanban 5 columnas (requested / preparing / in_field / closing / closed) con drag&drop |
| **Proyectos / Rollouts** | Lista + detalle de proyectos multi-site (Arcos Panamá, etc) · BUMM dashboard · mapa con banderitas por status |
| **Sitios** | Directorio de sites con filtros + Site Bible |
| **Técnicos** | Tarjetas de los techs · clic abre Skill Passport (level/rating/jobs/skills/certs/coverage) |
| **Contratos** | Service Agreements + Shield catalog (Bronze/Bronze+/Silver/Gold) |
| **Inteligencia** | Insights SRS-wide · KPIs últimos 90 días · clients top · repeat sites · tech drift |
| **Finanzas** | 6 tabs · Invoices AR · Vendor payables AP · Recurring · Pre-invoice · Channel partners · Collections ball |
| **Admin** | Users · Organizations · Audit log (Adriana: write ops Fase 3 · hoy read-only) |

### Tu flujo del día (Andros · operaciones)

1. **Cockpit** apenas entrás · revisás KPIs + alertas operacionales del día
2. **Espacio OPS** o **Mapa** del rollout activo · ves dónde están los techs
3. **Intervenciones (Kanban)** · arrastrás cards entre columnas según avanzan
4. **Detalle de WO** · clic en cualquier card · acá hacés:
   - **Advance** (avanzar status 7 stages)
   - **Briefing** (assemble + edit notes · el tech tiene que ack antes de en_route)
   - **Capture review** (revisás lo que el tech subió desde campo)
   - **Parts approval** (si supera threshold del agreement va a aprobación del cliente)
   - **Threads** (shared con cliente + internal solo SRS)
5. **WO cierra** → backend auto-ensambla el Intervention Report → 5 canales emit (JSON/HTML/CSV/Email/Webhook)
6. **Dispatch report** al cliente · botón en `/srs/ops/{wo_id}/report` · email + webhook con backoff exponencial

### Tu flujo del día (Adriana · finanzas)

1. **Finanzas → Pre-invoice** · ves closed WOs sin billing_line · click "Generate invoice"
2. **Finanzas → Invoices (AR)** · cambias status (draft → sent → paid)
3. **Finanzas → Vendor payables (AP)** · subís facturas de techs externos (Agustin double-hat Alarmas Solutions, Fervimax, etc) · three-way match con PO + capture
4. **Finanzas → Recurring** · subscripciones mensuales/trimestrales · run/pause/resume/cancel
5. **Finanzas → Channel partners** · commission rules (Fervi 10% en Panamá)
6. **Finanzas → Collections ball** · ves dónde se duerme el dinero (overdue + ball_in_court)

---

## 3 · Si sos Tech Field (Agustin, Hugo, Arlindo)

**Tu URL:** `https://insiteiq.systemrapid.io/tech` (la app detecta tu rol y te lleva sola si tu único membership es tech_field)

### Instalar como app en tu celular (RECOMENDADO)

La PWA queda como ícono de app nativa en tu home screen. Sin barras del browser. Una vez instalada arranca directo.

**iPhone (Safari):**
1. Abrí `https://insiteiq.systemrapid.io` en **Safari** (no Chrome — iOS solo permite instalar desde Safari)
2. Tocá el botón **Compartir** (cuadrado con flecha arriba)
3. Scroll abajo → **"Añadir a pantalla de inicio"** / **"Add to Home Screen"**
4. Confirmá · ícono "InsiteIQ" aparece (fondo navy + "iQ" blanco + barrita amber)
5. Tocá el ícono → arranca en fullscreen

**Android (Chrome):**
1. Abrí `https://insiteiq.systemrapid.io` en Chrome
2. Te aparece banner "Add InsiteIQ to home screen" (o menú ⋮ → "Instalar app")
3. Confirmá · ícono queda en home screen + launcher

### Navegación (bottom nav · 4 tabs)

| Tab | Qué hacés |
|-----|-----------|
| **Jobs** | Lista de tus WOs activos asignados · cards con severity + status + deadline |
| **Briefing** | Briefings del día · estado de cada uno (sin briefing / pendiente ack / acked) |
| **Profile** | Tu Skill Passport · level + rating + jobs + certs + countries + languages |
| **Sign out** | Cerrá sesión |

### Tu flujo del día

1. **Jobs** apenas entrás · ves los WOs asignados activos
2. **Briefing** · si el SRS te assignó algo, revisás la nota del coord y tocás **Ack** (necesario antes de poder avanzar a en_route)
3. **Tocás un WO** → entra al detalle del WO mobile-friendly:
   - **Avanzá status** (acepto → en_route → on_site → working → resolved)
   - **Capture** desde campo (qué encontraste · qué hiciste · tiempo on-site · devices touched · fotos · follow-up needed)
   - **Threads** con el SRS (shared con cliente solo si el SRS lo abrió)
4. WO cierra · SRS recibe tu capture · auto-genera el report al cliente

### Si tu password no funciona después de cambiarla

- Limpiá el cache del browser (Safari: Ajustes → Safari → Borrar historial y datos)
- Si seguís sin entrar, pedile al owner que te resetee desde Admin

---

## 4 · Si sos Cliente (Rackel Fractalia, etc.)

**Tu URL:** `https://insiteiq.systemrapid.io/client`

### Navegación

Vista limpia tipo "hotel 5 estrellas" · cero ruido interno SRS:
- **Snapshot** arriba: proyectos activos · intervenciones activas · acciones pendientes (esperando tu sign-off)
- **Proyectos** · lista con status
- **Intervenciones recientes** · 10 últimas con status

### Tu flujo

1. Entrás · ves snapshot y lista de intervenciones
2. Click en una intervención → detalle scoped (NO ves audit log, NO ves internal threads, NO ves márgenes ni costos internos · Principio "la ropa se lava en casa")
3. Si el SRS te abrió un **shared thread**, podés responder ahí
4. Si hay un **budget approval pending**, te llega notificación → aprobás o rechazás
5. Cuando un WO cierra, el **Intervention Report** queda visible en el portal · podés bajarlo HTML/CSV o recibirlo por email si el SRS lo despacha

---

## 5 · Convenciones del sistema (todos)

| Concepto | Qué significa |
|----------|---------------|
| **Tenant** | SRS (single tenant hoy · Ghost Tech multi-tenant en futuro) |
| **WO status** | 7 stages · intake → triage → en_route → on_site → working → resolved → closed (+ cancelled) |
| **Ball-in-court** | Quién tiene "la pelota" para el próximo paso: SRS, Tech, o Client |
| **Shield level** | Tier del contrato · Bronze (1NBD) · Bronze+ (1/2/3 NBD) · Silver (8h) · Gold (4h+24x7) · define el SLA del WO al intake |
| **Severity** | low · normal · high · critical · escala interna, distinta del shield |
| **Audit log** | Cada mutación queda registrada (quién + qué + cuándo + IP + path). Append-only · solo SRS lo ve · Principio #7 |
| **Briefing** | Nota del coord para el tech, leída + ack antes de en_route · Decision #8 (mata WhatsApp) |
| **Capture** | Lo que el tech sube desde campo · qué encontró, qué hizo, tiempo on-site, devices, fotos, follow-up |
| **Intervention Report** | Documento canónico que se emite al cierre · 5 canales (JSON/HTML/CSV/Email/Webhook) |

---

## 6 · Cosas que no funcionan todavía (pendientes conocidos)

| Item | Status |
|------|--------|
| **Email dispatch** | Worker activo pero en NoOp mode hasta que el owner configure `SMTP_HOST` en el `.env` del VPS · cuando se active los reportes salen automático |
| **Webhook dispatch** | Activo ✓ · POST JSON al url del cliente con backoff exponencial |
| **Admin Fase 3 edit** | Hoy crear users/orgs/sites funciona · **editar/disable** todavía no · si necesitás cambiar algo pedíselo al owner |
| **Edit Agreements** | Read-only hoy · edición vía Admin Fase 3 |
| **Edit Projects** | Read-only hoy · edición vía Admin Fase 3 |
| **TECH_REGISTRY (tz/role)** | Hardcoded en `lib/tz.js` · pendiente migrar a `users.tzLabel/role/workStart/workEnd` |

---

## 7 · Soporte y feedback

- **Bugs / cosas raras:** mandá screenshot + URL + qué intentabas hacer al owner
- **Feature requests:** anotalas · el owner las prioriza con el roadmap
- **Acceso bloqueado:** el owner es el único que puede crear cuentas hoy
- **Audit log:** todo lo que hacés queda registrado · es para defensa de SRS, no para vigilancia · si dudás de algo preguntá

---

> *"InsiteIQ sirve para arreglar las cagadas de cualquier compañía que nos hace sufrir."* — JuanCho · 2026-04-15
>
> Esto es **herramienta interna SRS**, no producto comercial. Lo que el cliente ve es el OUTPUT (reportes, threads compartidos, dashboard scoped), nunca el software completo. Si dudás si algo es "ropa de casa" o "vista cliente", el default es **ropa de casa**.
