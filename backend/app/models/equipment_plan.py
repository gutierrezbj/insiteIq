"""
InsiteIQ v1 Modo 2 — EquipmentPlanEntry (Decision #4, Blueprint v1.1)

"Aceptar caos upstream, reconciliar en campo."
El cliente declara equipos por site via multiple sources (Excel/email/portal/
paste). Tech llega al site, escanea lo que realmente esta. Sistema reconcilia.

Status outcomes post-reconciliation (Decision #4):
- `match`        — serial planeado == serial escaneado + mismo site
- `substituted`  — serial planeado NO escaneado, pero hay escaneo de device
                   equivalente (mismo make+model) en el site (cliente cambio pieza)
- `missing`      — planeado pero jamas escaneado (se perdio en entrega o tech
                   no llego al site correcto)
- `sin_plan`     — serial escaneado en site sin entry planeada (arrive unplanned)
- `conflicto`    — serial planeado para site A escaneado en site B (error logistico)
                   O duplicados en el plan

El canonical final (serial -> site) vive en la coleccion `assets` (Domain 11).
EquipmentPlanEntry es el "upstream desorden" separado del asset canonical.
CMDB export al cierre consulta assets, no plan.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel

PlanSource = Literal[
    "excel_client", "email_alias", "portal_upload", "clipboard_paste"
]
PlanStatus = Literal[
    "planned",      # initial state after upload
    "match",        # reconciled: serial matched + right site
    "substituted",  # reconciled: equivalent device replaced the planned one
    "missing",      # reconciled: planned but not scanned anywhere
    "conflicto",    # reconciled: planned for site A, scanned at B (or dupe)
    "cancelled",    # manually cancelled (change_order reduced scope)
]


class EquipmentPlanEntry(BaseMongoModel):
    project_id: str
    site_id: str | None = None   # optional: client may declare project-wide pool
    serial_number: str | None = None  # may be missing at plan time
    asset_tag: str | None = None
    make: str | None = None
    model: str | None = None
    category: str | None = None  # display | network | pos | server | security | cabling | other

    source: PlanSource
    bulk_upload_event_id: str | None = None

    status: PlanStatus = "planned"
    reconciled_at: datetime | None = None
    reconciled_with_asset_id: str | None = None
    reconciliation_note: str | None = None
    notes: str | None = None
