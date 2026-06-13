from __future__ import annotations

from pydantic import Field, AliasChoices, model_validator

from app.schemas.base import CamelModel, TimestampedModel
from app.schemas.label import LabelRead
from app.schemas.task_category import TaskCategoryRead


class ProjectOtherSettings(CamelModel):
    """Embedded JSON; can hold arbitrary extra fields (e.g. mlBackendUrl, modelName, labelMapping)."""

    model_config = {"extra": "allow", "protected_namespaces": ()}

    ml_backend_url: str | None = None
    model_name: str | None = None
    label_mapping: list[dict] | None = None
    clas_sub_catg: str | None = None
    seg_mask_type: str | None = None
    is_sample: bool | None = None


class ProjectBase(CamelModel):
    name: str | None = None
    description: str | None = None
    data_dir: str | None = None
    task_category_id: int | None = None
    other_settings: dict | None = None
    all_options: dict | None = None


class ProjectCreate(ProjectBase):
    model_config = {"extra": "allow", "populate_by_name": True}

    name: str = Field(validation_alias=AliasChoices("name", "Name"))
    data_dir: str = Field(validation_alias=AliasChoices("dataDir", "data_dir"))
    task_category_id: int = Field(validation_alias=AliasChoices("taskCategoryId", "task_category_id"))
    labels: list[LabelRead] | None = None

    @model_validator(mode="before")
    @classmethod
    def _camel_to_snake(cls, data):
        if isinstance(data, dict):
            out = {}
            for k, v in data.items():
                ck = k
                if k not in ("name", "description", "data_dir", "task_category_id",
                              "other_settings", "all_options", "labels"):
                    ck = _camel_to_snake(k)
                out[ck] = v
            return out
        return data


class ProjectUpdate(ProjectBase):
    model_config = {"extra": "allow", "populate_by_name": True}


def _camel_to_snake(s: str) -> str:
    out = []
    for i, c in enumerate(s):
        if c.isupper() and i > 0:
            out.append("_")
        out.append(c.lower())
    return "".join(out)


class ProjectRead(ProjectBase, TimestampedModel):
    project_id: int | None = None
    task_category: TaskCategoryRead | None = None
    labels: list[LabelRead] = []
    upid: str | None = None
