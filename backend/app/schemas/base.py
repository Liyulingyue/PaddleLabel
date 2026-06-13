"""Pydantic base models - all responses go in snake_case, the frontend converts to camelCase."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CamelModel(BaseModel):
    """All schemas accept both snake_case and camelCase field names on input,
    and emit snake_case on output (frontend client.ts converts to camelCase)."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class TimestampedModel(CamelModel):
    created: datetime | None = None
    modified: datetime | None = None
