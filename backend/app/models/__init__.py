"""Models package - import all modules here so SQLAlchemy registers them on Base."""

from app.models.annotation import Annotation  # noqa: F401
from app.models.data import Data  # noqa: F401
from app.models.label import Label  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.setting import Setting  # noqa: F401
from app.models.tag import Tag  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.task_category import TaskCategory  # noqa: F401
from app.models.user import User  # noqa: F401
