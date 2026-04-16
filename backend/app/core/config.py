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


settings = Settings()
