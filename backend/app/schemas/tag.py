from __future__ import annotations

from app.schemas.base import CamelModel, TimestampedModel


class TagBase(CamelModel):
    name: str
    color: str | None = None
    comment: str | None = None


class TagCreate(TagBase):
    pass


class TagUpdate(TagBase):
    name: str | None = None


class TagRead(TagBase, TimestampedModel):
    tag_id: int | None = None
    project_id: int | None = None
