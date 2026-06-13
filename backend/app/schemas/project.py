from __future__ import annotations

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
    name: str
    data_dir: str
    task_category_id: int
    labels: list[LabelRead] | None = None
    all_options: dict | None = None


class ProjectUpdate(ProjectBase):
    pass


class ProjectRead(ProjectBase, TimestampedModel):
    project_id: int | None = None
    task_category: TaskCategoryRead | None = None
    labels: list[LabelRead] = []
    upid: str | None = None
