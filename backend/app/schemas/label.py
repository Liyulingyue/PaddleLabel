from __future__ import annotations

from pydantic import AliasChoices, Field

from app.schemas.base import CamelModel, TimestampedModel


class LabelBase(CamelModel):
    name: str = Field(validation_alias=AliasChoices('name', 'Name'))
    color: str | None = None
    comment: str | None = None
    super_category_id: int | None = None
    type: str | None = None
    active: bool | None = True


class LabelCreate(LabelBase):
    project_id: int | None = None
    id: int | None = None


class LabelUpdate(LabelBase):
    name: str | None = None


class LabelRead(LabelBase, TimestampedModel):
    label_id: int | None = None
    project_id: int | None = None
    id: int | None = 0
