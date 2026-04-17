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
from app.routes import auth as auth_routes
from app.routes import health as health_routes
from app.routes import service_agreements as service_agreements_routes
from app.routes import sites as sites_routes
from app.routes import ticket_threads as ticket_threads_routes
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
app.include_router(health_routes.router)
app.include_router(auth_routes.router, prefix="/api")
app.include_router(sites_routes.router, prefix="/api")
app.include_router(service_agreements_routes.router, prefix="/api")
app.include_router(work_orders_routes.router, prefix="/api")
app.include_router(ticket_threads_routes.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
