import json
from functools import lru_cache
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


def normalize_database_url(database_url: str) -> str:
    """Normalize provider URLs for SQLAlchemy compatibility."""
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "BuildPro"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://buildpro:buildpro_dev_password@localhost:5432/buildpro_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    ALLOWED_ORIGINS: List[str] | str = "http://localhost:5173"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 52428800  # 50MB
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_EXTENSIONS: List[str] = [
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",
        ".jpg", ".jpeg", ".png", ".gif",
        ".dwg", ".dxf", ".zip", ".rar"
    ]
    
    # Cloud Storage (Cloudflare R2 / AWS S3)
    USE_CLOUD_STORAGE: bool = False  # Set to True in production with R2 credentials
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "buildpro-documents"
    R2_ENDPOINT_URL: str = ""  # e.g., https://<account_id>.r2.cloudflarestorage.com
    R2_PUBLIC_URL: str = ""  # Public URL for accessing files

    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10
    
    # Email (optional)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@example.com"
    
    # SMS (optional)
    AFRICAS_TALKING_USERNAME: str = ""
    AFRICAS_TALKING_API_KEY: str = ""
    SMS_SENDER_ID: str = "BuildPro"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def normalized_database_url(self) -> str:
        return normalize_database_url(self.DATABASE_URL)

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, list):
            return value

        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []

            if raw.startswith("["):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass

            return [item.strip() for item in raw.split(",") if item.strip()]

        return value

    @model_validator(mode="after")
    def validate_cors_configuration(self):
        normalized = [origin.strip().rstrip("/") for origin in self.ALLOWED_ORIGINS if origin.strip()]
        self.ALLOWED_ORIGINS = normalized

        if self.ENVIRONMENT.lower() == "production" and "*" in self.ALLOWED_ORIGINS:
            raise ValueError(
                "ALLOWED_ORIGINS cannot contain '*' in production when allow_credentials=True."
            )

        if self.ENVIRONMENT.lower() == "production":
            insecure_defaults = {
                "",
                "change-this-in-production",
                "dev-secret-key-change-in-production-min-32-chars",
            }
            if self.SECRET_KEY in insecure_defaults or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be set to a strong value (>= 32 chars) in production."
                )

        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

