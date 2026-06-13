"""Application configuration backed by environment variables."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 18000
    log_level: str = "INFO"

    paddlelabel_home: Path = Path.home() / ".paddlelabel"
    database_url: str | None = None

    jwt_secret: str = "change_this_in_prod"
    jwt_algorithm: str = "HS256"
    jwt_lifetime_seconds: int = 43200

    ml_backend_url: str = "http://127.0.0.1:18001"

    @property
    def home(self) -> Path:
        return self.paddlelabel_home

    @property
    def db_url(self) -> str:
        if self.database_url:
            return self.database_url
        self.paddlelabel_home.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{self.paddlelabel_home / 'paddlelabel.db'}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    s = Settings()
    s.paddlelabel_home.mkdir(parents=True, exist_ok=True)
    return s
