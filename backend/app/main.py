"""
InsiteIQ v1 Foundation — FastAPI application entry
Clean shell: CORS + audit_log middleware + health + auth.
Business routers added per-phase as the Blueprint v1.1 roadmap advances.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import close_db, connect_db
from app.middleware.audit_log import AuditLogMiddleware
from app.routes import audit_log as audit_log_routes
from app.routes import auth as auth_routes
from app.routes import health as health_routes
from app.routes import budget_approvals as budget_approvals_routes
from app.routes import copilot_briefings as copilot_briefings_routes
from app.routes import equipment as equipment_routes
from app.routes import intervention_reports as intervention_reports_routes
from app.routes import organizations as organizations_routes
from app.routes import projects as projects_routes
from app.routes import service_agreements as service_agreements_routes
from app.routes import sites as sites_routes
from app.routes import skill_passports as skill_passports_routes
from app.routes import tech_captures as tech_captures_routes
from app.routes import ticket_threads as ticket_threads_routes
from app.routes import uploads as uploads_routes
from app.routes import users as users_routes
from app.routes import work_orders as work_orders_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema operativo interno SRS para field services IT internacional.",
    lifespan=lifespan,
)

# CORS — permissive in dev, tight in prod (per settings.CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# audit_log — EVERY mutation stamped. Principle #7.
app.add_middleware(AuditLogMiddleware)

# Routers
app.include_router(health_routes.router)                # /health (docker/local)
app.include_router(health_routes.router, prefix="/api") # /api/health (via nginx)
app.include_router(auth_routes.router, prefix="/api")
app.include_router(users_routes.router, prefix="/api")
app.include_router(organizations_routes.router, prefix="/api")
app.include_router(audit_log_routes.router, prefix="/api")
app.include_router(sites_routes.router, prefix="/api")
app.include_router(service_agreements_routes.router, prefix="/api")
app.include_router(work_orders_routes.router, prefix="/api")
app.include_router(ticket_threads_routes.router, prefix="/api")
app.include_router(copilot_briefings_routes.router, prefix="/api")
app.include_router(tech_captures_routes.router, prefix="/api")
app.include_router(intervention_reports_routes.router, prefix="/api")
app.include_router(budget_approvals_routes.router, prefix="/api")
app.include_router(skill_passports_routes.router, prefix="/api")
app.include_router(projects_routes.router, prefix="/api")
app.include_router(equipment_routes.router, prefix="/api")
app.include_router(uploads_routes.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
