"""
InsiteIQ — Notification (Sprint Afinar · 2026-08-31)

Notificación in-app por usuario. Nace del dolor verbalizado por el owner
al cierre de la primera vuelta Modo 1: "somos muchos y no sabemos ni nos
notifican · eso es fundamental".

Cada evento operativo relevante (tech resolvió · briefing nuevo · mensaje
en thread · WO cerrada) genera un doc por DESTINATARIO. El frontend las
consume vía GET /api/notifications (polling hoy · WebSocket en iter B4).

`ball_to_me=True` marca las que requieren acción del destinatario — son
las que alimentan el bloque "Pendiente de ti" (path cristal clear).

Retention: no se borran (auditables) · el badge cuenta solo unread.
"""
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models.base import BaseMongoModel

NotificationEvent = Literal[
    "wo_en_route",        # tech salió hacia el sitio
    "wo_on_site",         # tech llegó al sitio
    "wo_resolved",        # tech terminó · coord debe cerrar
    "wo_closed",          # WO cerrada · finance puede facturar
    "wo_cancelled",       # WO cancelada
    "briefing_assembled", # briefing nuevo · tech debe leer + ack
    "briefing_acked",     # tech ackeó el briefing
    "capture_submitted",  # tech subió evidencia
    "thread_message",     # mensaje nuevo en thread del WO
    "wo_created",         # WO nueva creada (intake)
]


class Notification(BaseMongoModel):
    user_id: str                      # destinatario
    event_type: NotificationEvent
    entity_type: str = "work_order"   # work_order | briefing | thread
    entity_id: str
    title: str                        # "Iduber Montes terminó TOUS Pembroke"
    body: str | None = None           # 1 frase de contexto
    ball_to_me: bool = False          # True = requiere acción del destinatario
    cta_url: str | None = None        # /srs/ops/<wo_id> · destino del click
    read_at: datetime | None = None   # null = no leída
    actor_user_id: str | None = None  # quién disparó el evento
