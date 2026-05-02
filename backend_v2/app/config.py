# -*- coding: utf-8 -*-
import os
from pathlib import Path


class Settings:
    def __init__(self):
        self.jwt_secret = os.environ.get("JWT_SECRET", "change_this")
        self.jwt_algorithm = os.environ.get("JWT_ALGORITHM", "HS256")
        self.jwt_lifetime_seconds = int(os.environ.get("JWT_LIFETIME_SECONDS", "43200"))
        self.jwt_issuer = os.environ.get("JWT_ISSUER", "paddlelabel")
        db_path = os.environ.get("DATABASE_URL", f"sqlite:///{Path.home()}/.paddlelabel/paddlelabel.db")
        self.database_url = db_path
        self.request_id_timeout = float(os.environ.get("REQUEST_ID_TIMEOUT", "2.0"))


_settings = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
