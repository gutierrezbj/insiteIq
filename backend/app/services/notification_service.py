import logging

logger = logging.getLogger(__name__)


async def notify_technician_assigned(tech_email: str, intervention_ref: str, site_name: str):
    """Placeholder — will send email + push notification in production."""
    logger.info(f"[NOTIFY] Technician {tech_email} assigned to {intervention_ref} at {site_name}")


async def notify_sla_warning(coordinator_id: str, intervention_ref: str, minutes_remaining: int):
    """Placeholder — SLA warning alert."""
    logger.info(f"[SLA] Warning for {intervention_ref}: {minutes_remaining}min remaining")


async def notify_sla_breach(coordinator_id: str, intervention_ref: str):
    """Placeholder — SLA breach alert."""
    logger.info(f"[SLA] BREACH for {intervention_ref}")
