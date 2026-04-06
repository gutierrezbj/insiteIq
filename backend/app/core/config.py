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

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
