"""
InsiteIQ v1 — ProjectNote (Iter 2.7 · Sprint Rollouts v2).

Notas internas scoped a un Project (Modo 2 Rollout). Caso de uso primario
dictado por owner: anotar contexto operativo del rollout que NO debería
estar en el thread del WO ni escalar al cliente sin filtro.

Ejemplos:
  - "este lo cubre Andros, no escalar al cliente todavía"
  - "site re-cotización pendiente, esperar respuesta de Sajid"
  - "Fervimax pidió posponer Wave 2 hasta firma PA-1000067"

Visibility:
  - srs_internal · default · "ropa en casa" Principio #4 · NO visible client
  - shared      · visible para client coordinator (info compartida explícita)

RBAC:
  - SRS coordinators: read all (tenant), create, edit/delete own
  - Client coordinator: read solo visibility=shared, no escribe
  - Tech: 403

Soft delete via is_deleted flag (audit log preserva trazabilidad completa).
"""
from typing import Literal

from app.models.base import BaseMongoModel


NoteVisibility = Literal["srs_internal", "shared"]


class ProjectNote(BaseMongoModel):
    project_id: str
    author_user_id: str
    author_full_name: str  # snapshot al momento de creación
    body: str
    visibility: NoteVisibility = "srs_internal"
    is_deleted: bool = False
