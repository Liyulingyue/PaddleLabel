from __future__ import annotations

from app.schemas.base import CamelModel


class ProgressRead(CamelModel):
    finished: int = 0
    total: int = 0
