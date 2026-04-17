"""
InsiteIQ v1 Modo 2 — Project (rollout regional) + cluster_group + bulk_upload_event

Modo 2 es una CAPA de orquestacion sobre Modo 1, no un flujo paralelo. Un
work_order que pertenece a un project sigue sus 7 etapas igual que un
reactivo standalone.

Project types:
  - reactive      — single break-fix (project_id opcional en WO)
  - rollout       — instalacion en N sitios (el unicornio Arcos Dorados)
  - engagement    — Modo 4 audit/inventory (single location, long-running)
  - survey        — Modo 5 multi-site survey con deliverable canonico cliente
  - dc_migration  — Modo 6 multi-vendor migration con time-windows

Key decisions (project_modo2_rollout_decisions.md):
  #1 Plantilla cliente gana (intake via alias email + upload + LLM parsing)
  #2 cluster_lead = ROL, no ubicacion — Agustin en Venezuela lidera Panama remoto.
     field_senior_user_id opcional separado (tech senior "ojo en la cancha")
  #3 end_client_organization_id = metadata puro, NO usuario
  #4 Equipment caos upstream aceptado, reconciliacion en campo
  #5 KPI set estandar (7 exec-facing + burndown)
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

ProjectType = Literal[
    "reactive",     # Modo 1
    "rollout",      # Modo 2 (this file's primary focus)
    "engagement",   # Modo 4
    "survey",       # Modo 5
    "dc_migration", # Modo 6
]
DeliveryPattern = Literal["single_job", "rollout"]
ProjectStatus = Literal["draft", "active", "on_hold", "closed", "cancelled"]


class DeliveryChainTier(BaseModel):
    """
    For Modo 3 apilable (GRUMA -> Claro -> Fervi -> SRS -> sub italiano).
    In Modo 2 this is usually 2-3 tiers (end_client -> client_contractual -> SRS).
    """
    model_config = ConfigDict(extra="ignore")
    tier_index: int   # 0 at the top (end-client), ascending toward SRS
    organization_id: str
    role: str         # "end_client_metadata" | "prime_contractor" | "client" | "channel_partner" | "srs" | "sub_local"
    notes: str | None = None


class Project(BaseMongoModel):
    # Identity
    type: ProjectType
    delivery_pattern: DeliveryPattern = "single_job"
    code: str = Field(..., description="Internal SRS code (e.g. 'ARCOS-PA-95' or client's PO)")
    title: str
    description: str | None = None

    # Contractual + billing
    client_organization_id: str                         # direct contractual client
    service_agreement_id: str                           # Shield + SLA + pricing
    srs_entity_id: str | None = None                    # which SR-UK/US/SA entity
    po_number: str | None = None                        # client's Purchase Order ref

    # Metadata (Decision #3 — end-clients NO son usuarios)
    end_client_organization_id: str | None = None       # Arcos Dorados, GRUMA, Inditex...
    delivery_chain: list[DeliveryChainTier] = Field(default_factory=list)

    # Roles (Decision #2 — cluster_lead es ROL, ubicacion irrelevante)
    cluster_lead_user_id: str | None = None
    field_senior_user_id: str | None = None             # optional eye-on-ground
    srs_coordinator_user_id: str | None = None

    # Rollout-specific
    total_sites_target: int | None = None
    playbook_template: str | None = None                # e.g. "SDWAN-install-v1"

    # Lifecycle
    status: ProjectStatus = "draft"
    start_date: datetime | None = None
    target_end_date: datetime | None = None
    actual_end_date: datetime | None = None

    # Exec summary / notes
    summary: str | None = None
    metadata: dict = Field(default_factory=dict)


# ---------------- Cluster Groups ----------------

class ClusterGroup(BaseMongoModel):
    """
    Agrupacion de sites (por semana, por ruta geografica, por tech asignado).
    El cluster_lead orquesta el cluster; el tech ejecuta sitio a sitio.
    Active-per-wave: cliente activa un cluster cuando los sites estan listos
    para desplegarse (activation_events abajo).
    """
    project_id: str
    code: str                      # "W1-NORTH", "W2-SOUTH"...
    title: str
    cluster_lead_user_id: str | None = None
    field_senior_user_id: str | None = None
    assigned_tech_user_id: str | None = None

    # Target sites + dates
    site_ids: list[str] = Field(default_factory=list)
    target_start_date: datetime | None = None
    target_end_date: datetime | None = None

    status: Literal[
        "proposed",   # SRS drafted, client hasn't activated yet
        "activated",  # client approved; cluster is go
        "in_progress",
        "completed",
        "cancelled",
    ] = "proposed"

    activated_at: datetime | None = None
    activated_by: str | None = None  # user who activated (SRS or client)
    completed_at: datetime | None = None


# ---------------- Bulk upload events ----------------

BulkUploadSource = Literal["excel_client", "email_alias", "portal_upload", "clipboard_paste"]


class BulkUploadEvent(BaseMongoModel):
    """
    Cada vez que llega data de sites/equipment desde el cliente se graba aqui.
    Excel cliente es AUTORITATIVO (regla dura Modo 2). Cambios posteriores
    vienen con changelog de sub-upload visible.
    """
    project_id: str
    source: BulkUploadSource
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    received_by: str | None = None    # user_id who uploaded / triggered parsing

    original_filename: str | None = None
    raw_content_ref: str | None = None      # storage ref (S3/disk) for audit
    raw_content_inline: str | None = None   # if small paste/csv, keep verbatim

    # Parsed outcome
    rows_parsed: int = 0
    sites_created: int = 0
    sites_updated: int = 0
    equipment_entries: int = 0
    parsing_notes: list[str] = Field(default_factory=list)

    # Changelog if this event REPLACES/SUPPLEMENTS a previous upload
    supersedes_event_id: str | None = None
    changelog: list[dict] = Field(default_factory=list)  # {field, site_code, from, to}

    status: Literal["parsed", "applied", "rolled_back", "error"] = "parsed"
    error_message: str | None = None
