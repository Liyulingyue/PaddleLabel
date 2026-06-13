"""Schemas package."""

from app.schemas.annotation import (  # noqa: F401
    AnnotationCreate,
    AnnotationRead,
    AnnotationUpdate,
)
from app.schemas.base import CamelModel  # noqa: F401
from app.schemas.data import DataCreate, DataRead, DataUpdate  # noqa: F401
from app.schemas.label import LabelCreate, LabelRead, LabelUpdate  # noqa: F401
from app.schemas.project import (  # noqa: F401
    ProjectCreate,
    ProjectOtherSettings,
    ProjectRead,
    ProjectUpdate,
)
from app.schemas.progress import ProgressRead  # noqa: F401
from app.schemas.tag import TagCreate, TagRead, TagUpdate  # noqa: F401
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate  # noqa: F401
from app.schemas.task_category import TaskCategoryRead  # noqa: F401
from app.schemas.user import (  # noqa: F401
    LoginRequest,
    UserCreate,
    UserRead,
)
