from __future__ import annotations

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")
    FIREBASE_PROJECT_ID: str = Field(..., description="Firebase project id")
    FIREBASE_SERVICE_ACCOUNT_JSON: str | None = Field(
        default=None, description="Optional JSON for Firebase service account"
    )
    FRONTEND_ORIGINS: str = Field(
        default="http://localhost:5173",
        description="Comma separated list of allowed CORS origins",
    )
    CAMPUS_NAMES: str | None = Field(
        default=None,
        description="Optional comma separated campus names for seeding",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]

    def database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://") and "+psycopg" not in url:
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


settings = Settings()
