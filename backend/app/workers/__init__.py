"""
InsiteIQ outbox workers — drenadores async que corren en lifespan del FastAPI.

Implementan Principio #1 (emit outward): cuando un dispatch encola en
email_outbox / webhook_outbox, estos workers lo entregan al cliente.

Status flow por documento outbox:
  queued → sending → delivered             (éxito al primer intento)
  queued → sending → retrying → ... → delivered  (éxito tras backoff)
  queued → sending → retrying → ... → failed     (5 intentos quemados)

Si la MCU no está configurada (SMTP_HOST vacío para email, sin workers
enabled), el worker logea pero no envía. Doc queda en queued indefinido.
"""
from app.workers.email_worker import email_worker_loop  # noqa: F401
from app.workers.webhook_worker import webhook_worker_loop  # noqa: F401
