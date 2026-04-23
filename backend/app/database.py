"""
InsiteIQ v1 Foundation — MongoDB connection + index bootstrap
Clean, aligned to Blueprint v1.1 Foundation entities only.
Business-domain indexes come with their respective phases.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB]
    await ensure_indexes()


async def ensure_indexes() -> None:
    assert db is not None

    # --- Identity & Tenancy ---
    await db.tenants.create_index("code", unique=True)

    await db.srs_entities.create_index("code", unique=True)

    await db.organizations.create_index([("tenant_id", 1), ("legal_name", 1)])
    await db.organizations.create_index([("tenant_id", 1), ("partner_relationships.type", 1)])
    await db.organizations.create_index([("country", 1)])

    await db.users.create_index("email", unique=True)
    await db.users.create_index([("tenant_id", 1), ("is_active", 1)])
    await db.users.create_index([("space_memberships.space", 1)])

    # --- Modo 1 Reactive (Fase 1) ---
    await db.sites.create_index([("tenant_id", 1), ("organization_id", 1)])
    await db.sites.create_index([("tenant_id", 1), ("code", 1)])
    await db.sites.create_index([("country", 1)])

    await db.service_agreements.create_index([("tenant_id", 1), ("organization_id", 1)])
    await db.service_agreements.create_index([("tenant_id", 1), ("contract_ref", 1)], unique=True)
    await db.service_agreements.create_index([("tenant_id", 1), ("shield_level", 1)])

    await db.work_orders.create_index([("tenant_id", 1), ("reference", 1)], unique=True)
    await db.work_orders.create_index([("tenant_id", 1), ("status", 1), ("created_at", -1)])
    await db.work_orders.create_index([("tenant_id", 1), ("organization_id", 1), ("status", 1)])
    await db.work_orders.create_index([("tenant_id", 1), ("site_id", 1)])
    await db.work_orders.create_index([("tenant_id", 1), ("assigned_tech_user_id", 1), ("status", 1)])
    await db.work_orders.create_index([("tenant_id", 1), ("ball_in_court.side", 1), ("ball_in_court.since", 1)])

    # --- Equipment Plan + Reconciliation (Modo 2 Decision #4) ---
    await db.equipment_plan_entries.create_index(
        [("tenant_id", 1), ("project_id", 1), ("status", 1)]
    )
    await db.equipment_plan_entries.create_index(
        [("project_id", 1), ("serial_number", 1)]
    )
    await db.equipment_plan_entries.create_index(
        [("project_id", 1), ("site_id", 1), ("status", 1)]
    )

    # --- Modo 2 Rollout (projects + cluster_groups + bulk_uploads) ---
    await db.projects.create_index([("tenant_id", 1), ("code", 1)], unique=True)
    await db.projects.create_index([("tenant_id", 1), ("type", 1), ("status", 1)])
    await db.projects.create_index([("tenant_id", 1), ("client_organization_id", 1)])
    await db.projects.create_index([("tenant_id", 1), ("cluster_lead_user_id", 1)])

    await db.cluster_groups.create_index([("tenant_id", 1), ("project_id", 1), ("status", 1)])
    await db.cluster_groups.create_index([("tenant_id", 1), ("project_id", 1), ("code", 1)], unique=True)
    await db.cluster_groups.create_index([("assigned_tech_user_id", 1), ("status", 1)])

    await db.bulk_upload_events.create_index([("tenant_id", 1), ("project_id", 1), ("received_at", -1)])

    # work_order gains project_id / cluster_group_id indexes for dashboards
    await db.work_orders.create_index([("tenant_id", 1), ("project_id", 1), ("status", 1)])
    await db.work_orders.create_index([("tenant_id", 1), ("cluster_group_id", 1), ("status", 1)])

    # --- Skill Passport + Tech Ratings (Modo 1, Decision #4) ---
    # 1 passport per user (unique)
    await db.skill_passports.create_index([("tenant_id", 1), ("user_id", 1)], unique=True)
    await db.skill_passports.create_index([("tenant_id", 1), ("level", 1)])
    await db.skill_passports.create_index([("tenant_id", 1), ("countries_covered", 1)])

    # 1 rating per (work_order, rated_user) — unique
    await db.tech_ratings.create_index(
        [("work_order_id", 1), ("rated_user_id", 1)], unique=True
    )
    await db.tech_ratings.create_index([("tenant_id", 1), ("rated_user_id", 1), ("created_at", -1)])

    # --- Budget Approval Request (Modo 1, Decision #5 ball-in-court parts) ---
    await db.budget_approval_requests.create_index(
        [("tenant_id", 1), ("work_order_id", 1), ("created_at", -1)]
    )
    await db.budget_approval_requests.create_index(
        [("tenant_id", 1), ("status", 1), ("ball_in_court.since", 1)]
    )
    await db.budget_approval_requests.create_index([("ball_in_court.side", 1)])

    # --- Intervention Report (Modo 1, Principle #1 emit-not-integrate) ---
    await db.intervention_reports.create_index(
        [("work_order_id", 1), ("status", 1)]
    )
    await db.intervention_reports.create_index([("tenant_id", 1), ("generated_at", -1)])

    # Outboxes (queues drained by future workers)
    await db.email_outbox.create_index([("tenant_id", 1), ("status", 1), ("enqueued_at", 1)])
    await db.email_outbox.create_index([("work_order_id", 1)])
    await db.webhook_outbox.create_index([("tenant_id", 1), ("status", 1), ("enqueued_at", 1)])
    await db.webhook_outbox.create_index([("work_order_id", 1)])

    # --- Tech Capture (Modo 1, Domain 10.4) ---
    await db.tech_captures.create_index(
        [("work_order_id", 1), ("status", 1)]
    )
    await db.tech_captures.create_index([("tenant_id", 1), ("status", 1)])
    await db.tech_captures.create_index([("submitted_by", 1), ("submitted_at", -1)])

    # --- Copilot Briefing (Modo 1, Domain 10.5) ---
    # Only ONE active (non-superseded) briefing per work_order
    await db.copilot_briefings.create_index(
        [("work_order_id", 1), ("status", 1)]
    )
    await db.copilot_briefings.create_index([("tenant_id", 1), ("status", 1)])

    # --- Ticket Thread (Modo 1, Decision #8 WhatsApp kill) ---
    # 1 thread per (work_order, kind) — unique enforced
    await db.ticket_threads.create_index(
        [("work_order_id", 1), ("kind", 1)], unique=True
    )
    await db.ticket_threads.create_index([("tenant_id", 1), ("sealed_at", 1)])

    # Messages sorted by thread+ts for paginated reads
    await db.ticket_messages.create_index([("thread_id", 1), ("ts", 1)])
    await db.ticket_messages.create_index([("tenant_id", 1), ("work_order_id", 1), ("ts", 1)])
    await db.ticket_messages.create_index([("mentions", 1)])

    # --- Domain 11 Asset ---
    await db.assets.create_index(
        [("organization_id", 1), ("serial_number", 1)], unique=True
    )
    await db.assets.create_index([("tenant_id", 1), ("status", 1)])
    await db.assets.create_index([("tenant_id", 1), ("lifecycle_stage", 1)])
    await db.assets.create_index([("current_site_id", 1)])

    await db.asset_events.create_index([("asset_id", 1), ("ts", -1)])
    await db.asset_events.create_index([("tenant_id", 1), ("event_type", 1)])
    await db.asset_events.create_index([("tenant_id", 1), ("visibility", 1)])

    # --- audit_log (append-only) ---
    # Compound index supports the dominant forensic query: tenant + time-range + actor/action.
    await db.audit_log.create_index([("tenant_id", 1), ("ts", -1)])
    await db.audit_log.create_index([("tenant_id", 1), ("actor_user_id", 1), ("ts", -1)])
    await db.audit_log.create_index([("tenant_id", 1), ("action", 1), ("ts", -1)])
    await db.audit_log.create_index([("tenant_id", 1), ("source", 1), ("ts", -1)])

    # --- Operational Alerts (Z-b · Cockpit) ---
    # Cockpit queries by (tenant, status) + recent order. Scope narrowing uses
    # scope_ref subfields; compound index covers the common "active + tenant".
    await db.operational_alerts.create_index(
        [("tenant_id", 1), ("status", 1), ("created_at", -1)]
    )
    await db.operational_alerts.create_index(
        [("tenant_id", 1), ("severity", 1), ("status", 1)]
    )
    await db.operational_alerts.create_index(
        [("scope_ref.organization_id", 1), ("status", 1)]
    )
    await db.operational_alerts.create_index(
        [("scope_ref.site_id", 1), ("status", 1)]
    )
    await db.operational_alerts.create_index(
        [("scope_ref.tech_user_id", 1), ("status", 1)]
    )
    await db.operational_alerts.create_index(
        [("scope_ref.work_order_id", 1), ("status", 1)]
    )


async def close_db() -> None:
    global client
    if client is not None:
        client.close()


def get_db() -> AsyncIOMotorDatabase | None:
    return db
