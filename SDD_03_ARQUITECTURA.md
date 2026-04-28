# SDD-03 · InsiteIQ v2 — Arquitectura técnica

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Depende de:** `SDD_02_ALCANCE.md`

---

## 1. Stack confirmado

Sin cambios vs v1. El stack del v1 no era el problema — el problema era producto. Se conserva porque está probado en PROD SRS (DroneHub, SA99, SKYPRO360, MOEVE-T, InsiteIQ v1).

| Capa | Tech | Motivo |
|---|---|---|
| Frontend web (cockpits SRS + Cliente) | React 19 + Vite 6 + React Router 7 + Tailwind 4 | Stack SRS estándar. Rápido, moderno, conocido. |
| Frontend móvil (Tech) | PWA misma base React + service worker + IndexedDB para offline | No app nativa en v1. PWA es suficiente para el job del tech. Menos fricción de distribución. |
| Backend API | FastAPI (Python 3.11) + Pydantic v2 + Motor async | Stack SRS estándar. Async-first. Pydantic v2 para validación dura. |
| Base de datos | MongoDB 7 | Stack SRS estándar. Schema flexible para plantillas por cliente (campos custom). |
| Cache + colas | Redis 7 | Sesiones, rate limit, background jobs. |
| Auth | PyJWT + bcrypt (passlib) | JWT con `space`, `role`, `tenant_id` en payload. |
| LLM (M1 intake) | OpenAI `gpt-4o-mini` via HTTPS | Aislado en `AIProvider` abstracto. Sustituible. Solo en parsing de email entrante. |
| Email IN | IMAP poll al buzón `wo@systemrapid.com` | Sin webhook. Poll cada N minutos. Suficiente para < 60s objetivo. |
| Email OUT | SMTP desde la misma cuenta | Reply con subject correcto + originales en CC. |
| Containerización | Docker Compose | Estándar SRS. 4 servicios: frontend, api, mongo, redis. |
| Reverse proxy | Nginx | `/` → frontend, `/api/` → API. SSL Certbot. |
| Deploy | VPS 1 PROD (72.62.41.234) | `/opt/apps/insiteiq/`. No staging (herramienta interna, flujo bleu → VPS 1). |

Desviación del stack = ADR explícito en SDD-05.

---

## 2. Puertos (offset +110, confirmado v1)

| Servicio | Puerto externo | Puerto interno |
|---|---|---|
| Frontend | `127.0.0.1:3110:80` | nginx :80 |
| API | `127.0.0.1:4110:8000` | uvicorn :8000 |
| MongoDB | `127.0.0.1:6110:27017` | mongo :27017 |
| Redis | `127.0.0.1:6111:6379` | redis :6379 |

Regla SRS inviolable: `127.0.0.1:PUERTO:INTERNO`, nunca `0.0.0.0`.

---

## 3. Separación de espacios (RBAC)

Tres espacios a nivel de frontend + cuatro roles efectivos a nivel de JWT.

| Espacio | Path frontend | Roles con acceso | Sub-rol |
|---|---|---|---|
| **SRS** | `/srs/*` | `srs_coordinator`, `srs_owner` (read-only), `srs_finance` | — |
| **Cliente** | `/client/*` | `client_supervisor`, `client_noc` | Sí, separa vistas |
| **Tech PWA** | `/tech/*` | `tech_field` | — |

- JWT payload: `{ user_id, tenant_id, space, role, subroles[] }`.
- Guard en frontend (`RequireSpace`) + decorator en backend (`require_space()`).
- Cross-space denied por defecto. Un usuario con múltiples memberships elige espacio al login.
- Multi-tenant en schema (`tenant_id` en cada documento). En v1 solo hay un tenant real: SRS. Margen para v2+ de negocio (Fractalia/Telefónica compran InsiteIQ).

---

## 4. Schema MongoDB de alto nivel

No es schema final por campo — eso se desglosa en SDD-04 (Modelo de datos). Aquí van las colecciones principales y su razón de existir.

### Core operación

| Colección | Qué guarda | Notas |
|---|---|---|
| `tenants` | SRS (y futuros). | Aísla por `tenant_id` en todo documento. |
| `users` | Andros, Adriana, Rackel, Agustín, etc. | Incluye `space_memberships[]` para cross-space. |
| `organizations` | SRS, Fractalia, Claro, Hitss, Telefónica, Arcos Dorados, Mission Foods, etc. | Rol por org: `client_direct`, `client_intermediate`, `client_final`, `paying_entity`. Una org puede tener varios roles con el mismo WO (ejemplo Hitss es `paying_entity` mientras Claro es `client_direct`). |
| `sites` | Dirección física + país + timezone + lat/lng + site_type + cliente dueño. | Base para compliance por país. |
| `work_orders` | WO como entidad central. | State machine, ball_in_court, timer, 3 refs cliente, bloqueadores externos, compliance checklist, proyecto padre si aplica. |
| `projects` | Rollouts + servicios recurrentes con reporting. | Agrega N WOs. Tipo `rollout` \| `recurring_reporting`. |
| `threads` | Thread shared (NOC cliente + tech SRS + coord) y thread interno (solo SRS). | Lazy creation. Linked a WO. |
| `thread_messages` | Cada mensaje del thread. | Incluye adjuntos, fotos, eventos sistema. |
| `intervention_reports` | Informe al cliente por WO. | Renderiza por plantilla del cliente. |
| `recurring_reports` | Daily/weekly reports para modo servicio recurrente. | Formato y nomenclatura por cliente. Histórico de envíos. |

### Intake de email

| Colección | Qué guarda |
|---|---|
| `email_intake_log` | Cada email entrante al buzón. Raw + parsed + clasificación (nuevo vs seguimiento) + link a WO generada. |
| `email_templates_by_client` | Hints por cliente para el parser LLM (Fractalia narrativo, Claro estructurado, etc.). |

### Compliance + bloqueadores

| Colección | Qué guarda |
|---|---|
| `compliance_requirements` | Checklists por país/cliente (DUVRI, Visura, EPP, etc.). |
| `compliance_submissions` | Doc entregado para un requisito + estado (pendiente/validado/vencido). |
| `external_blockers` | Banderas por WO (hardware-pendiente, regulatorio-pendiente, acceso-sitio-pendiente) con ETA y texto libre. |

### Finance (Adriana)

| Colección | Qué guarda |
|---|---|
| `invoices` | Pre-facturas generadas desde WO cerrada o ciclo recurrente. Estado: draft / sent / partially-paid / paid / disputed. |
| `payments_to_providers` | Pre-pagos a techs/subs por WO firmada. Similar estado. |

### Plataforma

| Colección | Qué guarda |
|---|---|
| `audit_log` | Append-only. Toda mutación. Actor, timestamp, acción, entidad, diff. |
| `attachments_meta` | Metadata de adjuntos. Binario en filesystem o S3 según SDD-04. |

---

## 5. Patrón de audit log (middleware, inviolable)

Heredado intacto del v1. Es el corazón del sistema.

- Middleware FastAPI (`AuditLogMiddleware`) intercepta toda request con método ≠ GET.
- Para cada mutación genera entry en `audit_log`: `{ tenant_id, actor_user_id, timestamp, method, path, entity_type, entity_id, before, after, ip, user_agent }`.
- **Append-only.** Ningún endpoint puede borrar ni editar entries pasadas. Ni admin puede.
- Excepciones al middleware: `/health`, `/auth/login`, refresco de token, llamadas a LLM (se loguean en colección separada `llm_calls`).
- `audit_log` es consultable desde Admin Space (vista filtrada por actor / entity / date range). Caso de uso: defensa en pelea comercial ("Laly pidió visita el 23-mar, respondimos el 7-abr").

---

## 6. State machine del WorkOrder

Base del v1 (7 stages) se conserva como punto de partida. Revisión fina en SDD-04.

```
draft → assigned → briefed → in_transit → on_site → work_complete → closed
                                                   ↘ cancelled (desde cualquier punto antes de closed)
                                                   ↘ disputed (desde closed, reversible a closed)
```

Cada transición:
- Genera entry de `audit_log`.
- Actualiza `ball_in_court` y `ball_since` (timer).
- Dispara notificaciones al actor que recibe la pelota (email + push PWA al tech).
- Valida precondiciones (ejemplo: no `in_transit` si `compliance_requirements` no están todos verdes).

---

## 7. Intake de email — flujo técnico

```
[IMAP poll cada 60s]
        │
        ▼
[EmailIngestor]
    │ (lee headers + body + adjuntos)
    ▼
[Classifier]
    │ ¿subject contiene referencia conocida (CS…, FM…, USC…, NSR…)?
    │   SÍ  → append a thread del WO existente, stop
    │   NO  → continúa
    ▼
[LLMParser · gpt-4o-mini]
    │ prompt con hints de email_templates_by_client según sender domain
    │ extrae: sitio, país, fecha/hora pedida, scope, contacto, equipos, referencia
    ▼
[WO draft created]
    │ ball_in_court = "srs_coordinator"
    │ audit_log entry
    │ notificación a coordinador correspondiente (Fractalia → Luis, Claro → Andros, etc.)
    ▼
[Coordinator UI]
    │ < 60s: completa campos, asigna tech, confirma.
    ▼
[WO assigned]
```

Idempotencia: un mismo email (por `Message-ID` + `In-Reply-To`) no se procesa dos veces. Si el LLM falla o timeouts, el email queda en `email_intake_log` con estado `pending_manual` y notifica al coordinador.

---

## 8. Deploy y DevOps

- Mac Mini `bleu` local → build → push a GitHub → pull en VPS 1 → `docker compose up -d --force-recreate`. Igual que v1.
- Sin staging. Flujo directo bleu → PROD.
- Backups Mongo a cron diario (agregar a `backup-mongo.sh` SRS estándar).
- Healthcheck a todos los contenedores vía `healthcheck.sh` (registro obligatorio proyectos SRS).
- Registrar el proyecto en SA99 InfraService (MongoDB `servers` collection + seed data en `/Users/juanguti/dev/sa99/SA99/backend/app/modules/infra/service.py`).
- Certificado SSL Certbot, dominio `insiteiq.systemrapid.io` (reutilizar cuando v1 quede apagado).
- Logs: stdout de containers → docker logs. Nada fancy en v1. Si hace falta, Loki+Grafana se añade en SDD-07.

---

## 8.5. i18n UI (ES + EN mínimo desde v1)

- Frontend: `react-i18next` con diccionarios `es.json` / `en.json` en `/frontend/src/i18n/`.
- Ningún texto UI hardcoded. Todo pasa por `t('key')`. Regla de lint en CI.
- Preferencia de idioma en `users.preferences.locale` (ver SDD-04). Fallback: `es`.
- Fechas, números y monedas vía `Intl.DateTimeFormat` / `Intl.NumberFormat` con locale del usuario.
- DB almacena UTC + valores canónicos (amount + currency ISO). Render con locale solo en frontend.
- Backend responde errores y notificaciones con claves i18n, no strings — el frontend las traduce.
- Emails transaccionales del sistema (no reports al cliente): plantillas en `es` y `en`, enviadas según locale del destinatario.
- **Reports al cliente** no son UI i18n — son data multi-idioma (M6 + report_templates). Se escriben en el idioma que el cliente pide, independiente de quién los genere.

---

## 9. Multi-tenant ready (sin activar en v1)

- Cada colección lleva `tenant_id`.
- Todos los índices llevan `tenant_id` como prefijo.
- Todos los queries del API filtran por `tenant_id` del JWT antes de cualquier otro filtro.
- En v1 solo existe el tenant `srs`. Los tests de regresión validan que ningún query lo omita.
- Esto habilita sin reescribir: si algún día Fractalia o Telefónica compran InsiteIQ para sí mismos, se crean tenants nuevos y el código no cambia. Eso es v2+ de negocio, pero la preparación técnica es hoy.

---

## 10. Decisiones arquitecturales clave (ADRs-en-resumen)

Cada una se desarrolla en SDD-05 con trade-offs formales. Aquí el titular:

1. **MongoDB sobre PostgreSQL.** Schema flexible para plantillas de cliente con campos custom. Pérdida aceptada: joins menos cómodos.
2. **FastAPI sobre Node.** Pydantic v2 + type safety vs ecosistema JS. Stack SRS estándar.
3. **PWA sobre app nativa.** Tiempo al mercado y mantenimiento. Offline con service worker + IndexedDB. Re-evaluar si la app nativa se justifica por adopción del tech.
4. **Email IMAP poll sobre webhook.** No depende de proveedor. Funciona con cualquier buzón SMTP/IMAP. Trade-off: latencia 60s vs instantánea.
5. **LLM solo en M1 intake.** Evita scope creep AI. Aislado en `AIProvider` abstracto. `gpt-4o-mini` por coste.
6. **Audit log en Mongo, no en servicio dedicado.** Simplicidad. Si escala a millones de entries, se migra a timeseries o servicio dedicado (SDD-07 escalabilidad).
7. **Sin staging.** Herramienta interna. Flujo directo bleu → PROD. Rollback por git revert + compose. Trade-off aceptado.
8. **No integración bidireccional con ticketing cliente (ServiceNow/SOHO/Remedy).** SRS es último mono. Input por email, output por email + adjunto. Principio arquitectural, no limitación técnica.

---

## 11. Lo que NO entra en v2 (out of architecture)

- **Microservicios.** Monolito FastAPI + colecciones Mongo. Se puede partir si escala, pero no ahora.
- **GraphQL.** REST suficiente. Frontend conoce el schema.
- **Event sourcing formal.** Audit log es la línea de verdad, pero no reconstruimos estado desde events. Estado en documentos + audit como referencia.
- **Kubernetes.** Docker Compose hasta que se justifique.
- **Observabilidad completa** (Prometheus + Grafana + Loki). Si hace falta, se añade. Hoy no.
- **Search motor dedicado** (Elastic/Meili). Mongo text indexes suficientes para v1.

---

**Siguiente SDD:** SDD-04 · Modelo de datos (schema por colección con campos, índices, validaciones Pydantic, state machines detalladas).
