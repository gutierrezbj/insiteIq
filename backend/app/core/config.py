from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "InsiteIQ"
    DEBUG: bool = False

    # MongoDB
    MONGO_URL: str = "mongodb://mongo:27017"
    MONGO_DB: str = "insiteiq"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 1440  # 24h
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    # Uploads
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_MB: int = 10

    # Admin seed
    ADMIN_EMAIL: str = "admin@insiteiq.io"
    ADMIN_PASSWORD: str = "change-me"
    ADMIN_NAME: str = "Admin"

    # LiteLLM gateway
    LITELLM_BASE_URL: str = "http://litellm:4000"
    LITELLM_MASTER_KEY: str = "sk-insiteiq-dev"
    LLM_TIER_EMAIL_PARSE: str = "iiq-l0"
    LLM_TIER_KB_SUGGEST: str = "iiq-l0"
    LLM_TIER_REPORT_DRAFT: str = "iiq-l1"
    LLM_TIER_REPORT_PREMIUM: str = "iiq-l4"
    LLM_TIER_CLIENT_EMAIL: str = "iiq-l2"

    # Microsoft Graph (email intake) — pendiente provisioning
    GRAPH_TENANT_ID: str = ""
    GRAPH_CLIENT_ID: str = ""
    GRAPH_CLIENT_SECRET: str = ""
    GRAPH_INTAKE_MAILBOX: str = "wo@systemrapid.com"
    EMAIL_INTAKE_ENABLED: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
