# SDD-04 · InsiteIQ v2 — Modelo de datos

**Fecha:** 2026-04-24 · **Owner:** JuanCho · **Depende de:** `SDD_03_ARQUITECTURA.md`

Schema por colección. Nivel de detalle: suficiente para empezar a escribir modelos Pydantic sin ambigüedad, sin entrar en cada campo opcional que se puede añadir después. Lo que está aquí es el contrato mínimo. Extensiones viven en `meta: dict` por documento (Mongo flex).

Convenciones:
- `_id` ObjectId en todas.
- `tenant_id: str` en todas (v1: `"srs"`).
- `created_at / updated_at` en todas. `created_by / updated_by` user_id.
- Fechas en UTC ISO. Conversión a timezone de usuario/sitio en frontend.
- Todos los modelos Pydantic: `model_config = ConfigDict(extra="ignore")` (flex Mongo).

---

## 1. `tenants`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "name": "System Rapid Solutions",
  "legal_entities": ["sr-uk", "sr-us", "sr-sa"],
  "status": "active",
  "created_at": "...",
  "updated_at": "..."
}
```

Índice único: `tenant_id`.

---

## 2. `users`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "email": "androsb@systemrapid.com",
  "display_name": "Andros Briceño",
  "password_hash": "bcrypt…",
  "must_change_password": false,
  "status": "active",
  "phone": "+1 239 829 6263",
  "timezone": "America/New_York",
  "employment_type": "plantilla | external_sub",
  "space_memberships": [
    { "space": "srs", "role": "srs_coordinator", "subroles": [] }
  ],
  "profile": {
    "home_base_site_id": "...",
    "skill_tags": ["meraki", "cisco", "pos", "cabling"],
    "languages": ["es", "en"]
  },
  "preferences": {
    "locale": "es",
    "date_format": "auto",
    "number_format": "auto"
  },
  "last_login_at": "...",
  "created_at": "...", "updated_at": "..."
}
```

Índices: `(tenant_id, email)` único · `(tenant_id, status)` · `(tenant_id, "space_memberships.role")`.

Roles válidos v1: `srs_coordinator`, `srs_owner_readonly`, `srs_finance`, `client_supervisor`, `client_noc`, `tech_field`, `admin`.

---

## 3. `organizations`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "name": "Fractalia",
  "legal_name": "Fractalia Systems SL",
  "short_code": "FRAC",
  "country": "ES",
  "org_types": ["client_direct"],
  "partner_relationships": [
    { "type": "intermediary_of", "target_org_id": "...telefonica..." }
  ],
  "contacts": [
    { "name": "Rackel Rocha", "email": "rackel.rocha@fractaliasystems.es", "role": "supervisor" }
  ],
  "report_template_id": "...",
  "service_endpoints": {
    "intake_email": "wo@systemrapid.com",
    "client_sharepoint_url": null
  },
  "payment": {
    "is_paying_entity": true,
    "ap_notes": "Paga directo, NET 60"
  },
  "created_at": "...", "updated_at": "..."
}
```

`org_types` enum: `client_direct`, `client_intermediate`, `client_final`, `paying_entity`, `srs_entity`, `provider_reference`, `broker_reference`, `subcontractor_reference`. Una org puede tener varios roles.

Ejemplo Hitss: `org_types = ["paying_entity"]` mientras Claro US es `["client_direct", "client_intermediate"]` para el mismo WO.

Índices: `(tenant_id, short_code)` único · `(tenant_id, "org_types")` · `(tenant_id, name)` text.

---

## 4. `sites`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "name": "McDonald's Panamá - Chorrera",
  "client_final_org_id": "...arcos-dorados...",
  "address": {
    "street": "...", "city": "La Chorrera", "state": "Panamá Oeste",
    "country": "PA", "postal_code": "...", "lat": 8.87, "lng": -79.78
  },
  "timezone": "America/Panama",
  "site_type": "retail_qsr | corporate_office | warehouse | datacenter | other",
  "contacts_on_site": [
    { "name": "...", "phone": "...", "role": "manager", "hours": "..." }
  ],
  "access_notes": "Entrada por callejón lateral. Pedir a manager.",
  "site_bible_notes": "Racks en oficina trasera. 2 APs Meraki MR33 existentes.",
  "compliance_pack_id": "...panama-meraki...",
  "created_at": "...", "updated_at": "..."
}
```

Índices: `(tenant_id, client_final_org_id)` · `(tenant_id, "address.country")` · geo `(tenant_id, "address.lat", "address.lng")` 2dsphere si se justifica.

---

## 5. `work_orders` (colección central)

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "wo_number": "IIQ-2026-00042",
  "external_refs": [
    { "type": "client_ticket", "value": "CS0540150", "source": "Fractalia" },
    { "type": "client_ticket", "value": "USC 882839", "source": "Telefónica" },
    { "type": "client_po", "value": "PO-12345" }
  ],
  "operation_mode": "reactive | rollout_item | recurring_reporting_visit",
  "parent_project_id": null,
  "client_direct_org_id": "...",
  "client_intermediate_org_id": "...",
  "client_final_org_id": "...",
  "paying_entity_org_id": "...",
  "site_id": "...",
  "scope_summary": "Instalación AP Meraki MR46 + cableado punto nuevo",
  "scope_detail": "...markdown largo...",
  "equipment_planned": [
    { "type": "AP", "model": "Meraki MR46", "serial_expected": null, "quantity": 1 }
  ],
  "scheduled_at": "2026-04-28T23:30:00Z",
  "scheduled_timezone_note": "Horario local solicitado por cliente: 18:30 PA",
  "night_surcharge_agreed": true,
  "assigned_tech_user_id": "...",
  "state": "assigned",
  "state_history": [
    { "from": "draft", "to": "assigned", "at": "...", "by_user_id": "...", "reason": "..." }
  ],
  "ball_in_court": {
    "actor": "srs_coordinator | tech | client_direct | client_intermediate | client_noc",
    "since": "2026-04-24T10:15:00Z",
    "red_threshold_days": 7
  },
  "compliance_requirements_status": [
    { "requirement_id": "...duvri-italia...", "status": "validated", "evidence_submission_id": "..." }
  ],
  "external_blockers": [
    { "type": "hardware_pending", "note": "Fervimax tracking ABC123", "eta": "2026-05-10", "resolved_at": null }
  ],
  "thread_shared_id": "...",
  "thread_internal_id": "...",
  "briefing_for_tech": "...markdown...",
  "tech_capture": {
    "arrived_at": "...", "completed_at": "...",
    "photos": ["attachment_id..."],
    "activity_notes": "...",
    "equipment_installed": [{ "type": "AP", "model": "Meraki MR46", "serial": "Q2XX-...", "mac": "..." }],
    "signature_data": {"signer_name": "...", "signed_at": "..."}
  },
  "intervention_report_id": "...",
  "financials": {
    "price_quoted": 180.0, "currency": "USD",
    "pay_to_provider_amount": 110.0,
    "invoice_id": null,
    "payment_to_provider_id": null
  },
  "validation_visits": [
    { "wo_id_of_validation": "...", "label": "courtesy | qa | extra_scope" }
  ],
  "meta": {},
  "created_at": "...", "updated_at": "...",
  "created_by": "...", "updated_by": "..."
}
```

Índices:
- `(tenant_id, wo_number)` único
- `(tenant_id, state)`
- `(tenant_id, "ball_in_court.actor", "ball_in_court.since")` (para cockpit rojo)
- `(tenant_id, assigned_tech_user_id, state)` (para PWA tech)
- `(tenant_id, parent_project_id)`
- `(tenant_id, scheduled_at)`
- `(tenant_id, "external_refs.value")` para match de intake por referencia
- `(tenant_id, client_direct_org_id, state)`

Enum `state`: `draft`, `assigned`, `briefed`, `in_transit`, `on_site`, `work_complete`, `closed`, `cancelled`, `disputed`.

Transiciones válidas definidas en código (módulo `work_orders/state_machine.py`). Cada transición escribe `state_history` + `audit_log`.

---

## 6. `projects`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "name": "Gruma Foods Cisco Meraki Rollout",
  "project_type": "rollout | recurring_reporting",
  "client_direct_org_id": "...",
  "paying_entity_org_id": "...",
  "project_lead_user_id": "...yunush...",
  "start_date": "2025-11-01",
  "target_end_date": "2026-06-30",
  "status": "active | paused | closed",
  "sites": [
    { "site_id": "...", "wo_id": "...", "status": "ready | blocked | dispatched | completed", "notes": "..." }
  ],
  "recurring_config": {
    "enabled": false,
    "cadence": "daily | weekly",
    "report_template_id": "...miramar-audit-daily...",
    "delivery_method": "email | sharepoint_upload | portal",
    "filename_pattern": "WH Audit_XXXXX {mm-dd-yyyy}.xlsx",
    "next_due_at": "..."
  },
  "external_refs": [
    { "type": "broker_hardware", "value": "Fervimax PO 12345" }
  ],
  "meta": {},
  "created_at": "...", "updated_at": "..."
}
```

Índices: `(tenant_id, status)` · `(tenant_id, client_direct_org_id)` · `(tenant_id, "recurring_config.next_due_at")` si enabled.

---

## 7. `threads` + `thread_messages`

### `threads`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "work_order_id": "...",
  "kind": "shared | internal",
  "participants_user_ids": ["...", "..."],
  "participant_orgs": ["...fractalia...", "...srs..."],
  "sealed_at": null,
  "last_message_at": "...",
  "unread_by_user_ids": ["..."]
}
```

Un WO tiene lazy creation de threads — se crea cuando llega el primer mensaje. Máximo uno `shared` y uno `internal` por WO.

### `thread_messages`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "thread_id": "...",
  "author_user_id": "...",
  "author_display": "Luis Sánchez (SRS)",
  "body": "texto markdown",
  "attachments": [{ "attachment_id": "...", "kind": "photo | doc | email_raw" }],
  "source": "app | email_reply | system_event",
  "email_meta": {
    "message_id": "...",
    "in_reply_to": "...",
    "subject": "Re: CS0540150 - Confirm visit Thu 23:30"
  },
  "created_at": "..."
}
```

Índices: `(tenant_id, thread_id, created_at)` · `(tenant_id, "email_meta.message_id")` único sparse.

---

## 8. `intervention_reports`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "work_order_id": "...",
  "report_template_id": "...",
  "render_payload": {
    "client_fields": { "Ticket": "CS0540150", "Date": "2026-04-24", "Technician": "Agustín C.", "Summary": "...", "Before photos": ["..."], "After photos": ["..."] }
  },
  "rendered_outputs": [
    { "format": "pdf", "attachment_id": "...", "generated_at": "..." },
    { "format": "html", "attachment_id": "..." }
  ],
  "deliveries": [
    { "channel": "email", "target": "rackel.rocha@fractaliasystems.es", "sent_at": "...", "message_id": "..." },
    { "channel": "sharepoint_upload", "target": "https://...", "uploaded_at": "..." }
  ],
  "created_at": "...", "updated_at": "..."
}
```

Índices: `(tenant_id, work_order_id)` único.

---

## 9. `report_templates`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "name": "Fractalia Intervention Report",
  "owner_org_id": "...fractalia...",
  "scope": "wo_report | recurring_daily | recurring_weekly",
  "engine": "docx_template | xlsx_template | html_jinja",
  "template_file_attachment_id": "...",
  "field_mapping": {
    "Ticket": "work_order.external_refs[type=client_ticket].value",
    "Technician": "assigned_tech_user.display_name"
  },
  "filename_pattern": "WH Audit_{report_id} {scheduled_at:mm-dd-yyyy}.xlsx",
  "headers_required": ["Date", "Scanning Date", "SN", "PN", "Manufacturer", "PO"],
  "date_format": "mm-dd-yyyy",
  "notes": "Laly exige color salmón para revalidar, verde para intangibles",
  "created_at": "...", "updated_at": "..."
}
```

Índices: `(tenant_id, owner_org_id, scope)`.

---

## 10. `recurring_reports`

Instancias generadas por `projects.recurring_config`.

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "project_id": "...",
  "report_template_id": "...",
  "period_start": "...", "period_end": "...",
  "filename": "WH Audit_00042 04-24-2026.xlsx",
  "rendered_attachment_id": "...",
  "delivery": {
    "channel": "sharepoint_upload | email",
    "status": "pending | delivered | failed",
    "sent_at": "...", "evidence_url": "..."
  },
  "generated_by_user_id": "...",
  "created_at": "..."
}
```

Índices: `(tenant_id, project_id, period_start)` único.

---

## 11. `compliance_requirements` + `compliance_submissions`

### `compliance_requirements`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "name": "DUVRI",
  "country": "IT",
  "applies_when": { "site_type": ["corporate_office", "retail_qsr"], "client_final_org_id": null },
  "validity_days": 365,
  "description": "Documento unico di valutazione dei rischi. Requerido para acceso.",
  "evidence_requirements": ["pdf_document", "valid_signature_date"],
  "blocking": true
}
```

Índices: `(tenant_id, country, blocking)`.

### `compliance_submissions`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "requirement_id": "...",
  "scope": "wo | site | tech",
  "scope_ref": "...wo_id | site_id | user_id...",
  "evidence_attachments": ["attachment_id..."],
  "valid_from": "...", "valid_until": "...",
  "status": "pending | validated | expired | rejected",
  "reviewed_by_user_id": "...",
  "reviewed_at": "..."
}
```

Índices: `(tenant_id, requirement_id, scope_ref, status)` · `(tenant_id, "valid_until")` para alertas de vencimiento.

---

## 12. `external_blockers`

Denormalizado dentro de `work_orders.external_blockers[]` (ver §5). No colección propia en v1 — evita join. Si se dispara reporting cross-WO de bloqueadores, se promueve a colección en v2.

---

## 13. `invoices` (Adriana: cobros)

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "invoice_number": "SRS-INV-2026-00124",
  "trigger_type": "wo_closed | recurring_cycle | manual",
  "source_refs": {
    "work_order_ids": ["..."],
    "project_id": null,
    "recurring_period": { "start": "...", "end": "..." }
  },
  "client_direct_org_id": "...",
  "paying_entity_org_id": "...",
  "cost_center_client": "...",
  "currency": "USD",
  "line_items": [
    { "description": "Visita técnica WO IIQ-2026-00042", "quantity": 1, "unit_price": 180.0, "total": 180.0 }
  ],
  "subtotal": 180.0, "tax": 0.0, "total": 180.0,
  "status": "draft | sent | partially_paid | paid | disputed | cancelled",
  "issued_at": null, "due_at": null, "paid_at": null,
  "follow_ups": [
    { "at": "...", "by_user_id": "...", "channel": "email", "note": "Primer recordatorio" }
  ],
  "ball_in_court": { "actor": "client | srs_finance", "since": "..." },
  "attachments": ["attachment_id...pdf_invoice..."],
  "created_at": "...", "updated_at": "..."
}
```

Índices: `(tenant_id, invoice_number)` único · `(tenant_id, status, "ball_in_court.since")` · `(tenant_id, client_direct_org_id)`.

---

## 14. `payments_to_providers`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "payment_number": "SRS-PAY-2026-00089",
  "provider_user_id": "...agustinc...",
  "provider_org_id": "...",
  "trigger_type": "wo_completed",
  "source_refs": { "work_order_ids": ["..."] },
  "currency": "USD",
  "amount": 110.0,
  "status": "draft | approved | paid | rejected",
  "approved_by_user_id": "...",
  "paid_at": null,
  "bank_ref": null,
  "created_at": "...", "updated_at": "..."
}
```

Índices: `(tenant_id, provider_user_id, status)` · `(tenant_id, payment_number)` único.

---

## 15. `email_intake_log`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "inbox": "wo@systemrapid.com",
  "message_id": "<...>", "in_reply_to": "<...>", "references": ["<...>"],
  "from": "laly.castro@usclaro.com", "to": ["wo@systemrapid.com"], "cc": [],
  "subject": "RE: Weekly Inventory Audit Closure | Claro US Warehouse – Miramar Park",
  "received_at": "...",
  "raw_body_attachment_id": "...",
  "classification": "new | follow_up | ambiguous | spam",
  "match_work_order_id": "...",
  "match_reason": "subject contains external_ref USC 882839",
  "parser": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "extracted": {
      "client_direct_hint": "Claro US", "site_hint": "...", "date_requested": "...",
      "equipment": [], "scope_summary": "..."
    },
    "confidence": 0.78,
    "raw_response_attachment_id": "..."
  },
  "result": {
    "action_taken": "wo_draft_created | thread_message_appended | pending_manual",
    "target_ref_id": "..."
  },
  "processed_at": "...", "processed_by": "system | user_id"
}
```

Índices: `(tenant_id, message_id)` único · `(tenant_id, classification, processed_at)` · `(tenant_id, "parser.confidence")`.

---

## 16. `audit_log`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "ts": "2026-04-24T10:15:33Z",
  "actor_user_id": "...",
  "actor_display": "Luis Sánchez",
  "ip": "...", "user_agent": "...",
  "method": "POST",
  "path": "/api/work_orders/{id}/advance",
  "entity_type": "work_order",
  "entity_id": "...",
  "action": "transition_state",
  "before": { "state": "assigned" },
  "after": { "state": "briefed" },
  "context": { "reason": "briefing sent to tech" }
}
```

Índices: `(tenant_id, ts)` descendente · `(tenant_id, entity_type, entity_id, ts)` · `(tenant_id, actor_user_id, ts)`. Append-only enforzado a nivel de código — no hay endpoint de delete ni update.

---

## 17. `attachments_meta`

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "filename_original": "IMG_4312.jpg",
  "mime_type": "image/jpeg",
  "size_bytes": 3421889,
  "storage_backend": "fs | s3",
  "storage_key": "srs/2026/04/24/a1b2c3...",
  "sha256": "...",
  "uploaded_by_user_id": "...",
  "scope": { "entity_type": "work_order", "entity_id": "...", "purpose": "tech_photo_on_site" },
  "is_public_to_client": true,
  "created_at": "..."
}
```

Storage binario en v1: filesystem del contenedor API montado en volumen dedicado. Migración a S3/MinIO si escala (SDD-07).

Índices: `(tenant_id, "scope.entity_id")` · `(tenant_id, sha256)` para dedupe.

---

## 18. `llm_calls` (colección aparte, fuera de audit_log)

```json
{
  "_id": "...",
  "tenant_id": "srs",
  "provider": "openai", "model": "gpt-4o-mini",
  "purpose": "email_intake_parse",
  "input_tokens": 1240, "output_tokens": 410,
  "latency_ms": 980,
  "cost_usd_est": 0.0004,
  "prompt_hash": "...",
  "related_entity": { "type": "email_intake_log", "id": "..." },
  "error": null,
  "created_at": "..."
}
```

Índices: `(tenant_id, created_at)` · `(tenant_id, purpose, created_at)`.

---

## 19. Reglas de integridad

1. **Nunca borrar documentos.** Soft-delete con campo `archived_at` si se requiere ocultar. Audit log persiste siempre.
2. **Todos los queries filtran `tenant_id` primero.** Decorator/dependency en API valida. Tests de regresión obligatorios.
3. **Referencias denormalizadas controladas.** Ejemplo: `audit_log.actor_display` se congela al momento de la acción, no se re-deriva. Si el user cambia nombre, el audit log histórico mantiene el nombre de cuando sucedió.
4. **Enums en código, no en BBDD.** Se validan en Pydantic. Cambio de enum = migración controlada.
5. **Fechas UTC en persistencia, timezone en presentación.** El frontend conoce `timezone` del sitio, del user y del evento y renderiza lo útil.
6. **Mongo sessions/transacciones** solo donde importa (transición de state de WO + audit log + notificación). No en todo.

---

## 20. Seeds mínimos v2

Para arrancar F3 (flujo end-to-end) se necesita seed con:

- Tenant `srs`.
- SRS entity + 3 SRS users (1 coord, 1 finance, 1 owner_readonly).
- 2 orgs cliente (Fractalia + Claro US) con `report_template_id` apuntando a plantilla placeholder.
- 2 orgs intermedias (Telefónica Tech + Claro Enterprise).
- 1 org `paying_entity` distinta (Hitss) linkable a WOs de Claro US.
- 3 sites (1 España Fractalia, 1 Panamá Arcos Dorados, 1 Miami warehouse).
- 2 techs (1 plantilla Agustín, 1 sub Arlindo).
- 1 usuario Supervisor cliente (Rackel) + 1 usuario NOC cliente ficticio.
- 1 WO reactiva Fractalia en `assigned`.
- 1 proyecto rollout con 2 sites.
- 1 proyecto recurring_reporting (Miramar audit) con config daily + template xlsx.
- `compliance_requirements` mínimo: DUVRI Italia, EPP genérico.

Sin seed masivo tipo v1 (4 entities + 16 orgs + 10 users + 19 sites + 14 WOs). Seed mínimo viable para demo end-to-end.

---

**Siguiente SDD:** SDD-05 · Decisiones arquitecturales (ADRs) con trade-offs formales.
