"""
InsiteIQ v1 Foundation — Configuration
Settings loaded from environment. All secrets live in .env, never in code.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "InsiteIQ"
    APP_VERSION: str = "1.0.0-foundation"
    APP_ENV: str = "development"  # development | production
    DEBUG: bool = True

    # MongoDB
    MONGO_URL: str = "mongodb://mongo:27017"
    MONGO_DB: str = "insiteiq"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Security / JWT
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-ENV"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60 * 8  # 8h working day
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3110",
        "http://localhost:5173",  # vite dev
        "https://insiteiq.systemrapid.io",
    ]

    # Tenant default (v1 = single SRS tenant, prep for Ghost Tech)
    DEFAULT_TENANT_CODE: str = "SRS"

    # ─── Outbox workers (email + webhook) ─────────────────────────
    # Drena email_outbox + webhook_outbox.
    # Si SMTP_HOST está vacío, el email worker logea pero no envía
    # (modo NoOp seguro para dev local sin credenciales).
    WORKERS_ENABLED: bool = True
    WORKER_POLL_INTERVAL_SECONDS: int = 30
    WORKER_BATCH_SIZE: int = 20
    WORKER_MAX_ATTEMPTS: int = 5

    # SMTP (configurar en .env del VPS)
    SMTP_HOST: str = ""             # ej: smtp.gmail.com / smtp-relay.brevo.com
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "InsiteIQ <noreply@systemrapid.io>"
    SMTP_USE_TLS: bool = True       # True = STARTTLS port 587 · False = SSL port 465

    # Webhook (timeout + signing opcional)
    WEBHOOK_TIMEOUT_SECONDS: int = 15
    WEBHOOK_SIGNING_SECRET: str = ""  # si está set: header X-InsiteIQ-Signature HMAC-SHA256


settings = Settings()
