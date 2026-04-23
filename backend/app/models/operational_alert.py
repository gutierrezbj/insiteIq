"""
InsiteIQ v1 — OperationalAlert (Pasito Z-b · Cockpit de Operaciones).

El widget "Alertas Operativas" del cockpit es ORO: el coordinador del
cliente (Rackel Fractalia, Adrian Arcos, Yunus GRUMA) abre el tablero y
ve de un vistazo QUÉ está pasando HOY que afecta la ejecución de sus
intervenciones — sin tener que preguntar.

Fuente de alertas:
  - manual    · ingresada por coord SRS o sistema interno
  - external  · feed futuro (Google Traffic, OpenWeather, civic APIs)
  - auto      · detectada por rules engine (Fase 3) · ej. ETA drift

Scope visual:
  - global    · aplica a toda la operación (ej. paro nacional)
  - client    · solo al cliente X (ej. Inditex cerró todas las tiendas MX)
  - site      · solo un site (ej. supervisor no llegó a Tenancingo)
  - tech      · solo un tech (ej. Agustin en tráfico severo)
  - wo        · solo una WO (ej. WO-123 bloqueada por permiso)

Categorías (ORO per Juan):
  - traffic          · ETA drift, tráfico, cierre vial
  - no_show          · supervisor/contacto no llegó al site
  - accident         · accidente en ruta
  - site_closed      · almacén/tienda cerrada, permiso pendiente
  - weather          · meteorología severa (opcional)
  - access_denied    · permiso/guardia bloqueando
  - fleet            · tech sin batería/señal, vehículo en pana
  - other

Severity:
  - info     · awareness
  - warning  · acción recomendada
  - critical · requiere intervención ya

Ball-in-court:
  - srs       · responsable SRS (dispatch, replan)
  - client    · responsable cliente (aprobar ventana, autorizar acceso)
  - tech      · responsable tech (salir antes, llamar)
  - external  · fuera de control (tráfico, clima)
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import BaseMongoModel


AlertKind = Literal[
    "traffic",
    "no_show",
    "accident",
    "site_closed",
    "weather",
    "access_denied",
    "fleet",
    "other",
]

AlertSeverity = Literal["info", "warning", "critical"]
AlertScope = Literal["global", "client", "site", "tech", "wo"]
AlertSource = Literal["manual", "external", "auto"]
AlertStatus = Literal["active", "acknowledged", "resolved", "dismissed"]
AlertBall = Literal["srs", "client", "tech", "external"]


class AlertScopeRef(BaseModel):
    """Narrowing references — populated based on `scope`."""

    model_config = ConfigDict(extra="ignore")

    organization_id: str | None = None  # when scope in [client, site, wo]
    site_id: str | None = None          # when scope in [site, wo]
    tech_user_id: str | None = None     # when scope == tech
    work_order_id: str | None = None    # when scope == wo


class OperationalAlert(BaseMongoModel):
    kind: AlertKind
    severity: AlertSeverity = "info"
    scope: AlertScope = "global"
    scope_ref: AlertScopeRef = Field(default_factory=AlertScopeRef)

    source: AlertSource = "manual"
    ball_in_court: AlertBall = "srs"

    title: str                    # "Supervisor no llego a tienda"
    message: str                  # 1-2 frases, contexto práctico
    action_hint: str | None = None  # "Llamar a Luis +56 9..., replanificar 14:00"

    # Opcional: impacto cuantificable
    eta_drift_minutes: int | None = None  # tráfico
    affected_wo_count: int | None = None  # si es scope client

    status: AlertStatus = "active"
    expires_at: datetime | None = None    # auto-dismiss

    acknowledged_at: datetime | None = None
    acknowledged_by_user_id: str | None = None
    resolved_at: datetime | None = None
    resolved_by_user_id: str | None = None
    resolution_note: str | None = None
