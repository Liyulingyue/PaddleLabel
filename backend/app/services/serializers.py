"""Project / Task / Annotation helpers used by routers."""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Iterable, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.annotation import Annotation
from app.models.data import Data
from app.models.label import Label
from app.models.project import Project
from app.models.task import Task


def project_upid(project: Project) -> str:
    seed = f"{project.data_dir or ''}{project.created.isoformat() if project.created else ''}"
    return hashlib.md5(seed.encode()).hexdigest()[:20]


def task_to_dict(t: Task, ann_count: int | None = None) -> dict:
    return {
        "task_id": t.task_id,
        "project_id": t.project_id,
        "set": t.set,
        "data_paths": [d.path for d in (t.datas or [])],
        "annotation_count": ann_count if ann_count is not None else len(t.annotations or []),
        "created": t.created.isoformat() if t.created else None,
        "modified": t.modified.isoformat() if t.modified else None,
    }


def project_to_dict(project: Project) -> dict:
    task_category_dict = None
    if project.task_category is not None:
        tc = project.task_category
        task_category_dict = {
            "task_category_id": tc.task_category_id,
            "name": tc.name,
            "handler": tc.handler,
            "label_format": tc.label_format,
        }
    return {
        "project_id": project.project_id,
        "name": project.name,
        "description": project.description,
        "data_dir": project.data_dir,
        "task_category_id": project.task_category_id,
        "task_category": task_category_dict,
        "other_settings": project.other_settings or {},
        "labels": [
            {
                "label_id": l.label_id,
                "project_id": l.project_id,
                "id": l.id,
                "name": l.name,
                "color": l.color,
                "comment": l.comment,
                "super_category_id": l.super_category_id,
                "type": l.type,
                "active": l.active,
                "created": l.created.isoformat() if l.created else None,
                "modified": l.modified.isoformat() if l.modified else None,
            }
            for l in (project.labels or [])
        ],
        "created": project.created.isoformat() if project.created else None,
        "modified": project.modified.isoformat() if project.modified else None,
        "upid": project_upid(project),
    }


def data_to_dict(d: Data) -> dict:
    return {
        "data_id": d.data_id,
        "task_id": d.task_id,
        "path": d.path,
        "size": d.size,
        "predicted": d.predicted,
        "sault": d.sault,
        "created": d.created.isoformat() if d.created else None,
        "modified": d.modified.isoformat() if d.modified else None,
    }


def label_to_dict(l: Label) -> dict:
    return {
        "label_id": l.label_id,
        "project_id": l.project_id,
        "id": l.id,
        "name": l.name,
        "color": l.color,
        "comment": l.comment,
        "super_category_id": l.super_category_id,
        "type": l.type,
        "active": l.active,
        "created": l.created.isoformat() if l.created else None,
        "modified": l.modified.isoformat() if l.modified else None,
    }


def annotation_to_dict(a: Annotation) -> dict:
    label_dict = None
    if a.label is not None:
        label_dict = label_to_dict(a.label)
    return {
        "annotation_id": a.annotation_id,
        "frontend_id": a.frontend_id,
        "result": a.result,
        "type": a.type,
        "label_id": a.label_id,
        "data_id": a.data_id,
        "task_id": a.task_id,
        "project_id": a.project_id,
        "predicted_by": a.predicted_by,
        "created": a.created.isoformat() if a.created else None,
        "modified": a.modified.isoformat() if a.modified else None,
        "label": label_dict,
    }


async def load_project(db: AsyncSession, project_id: int, *, with_relations: bool = True) -> Project | None:
    stmt = select(Project).where(Project.project_id == project_id)
    if with_relations:
        stmt = stmt.options(
            selectinload(Project.labels),
            selectinload(Project.tags),
            selectinload(Project.tasks),
            selectinload(Project.task_category),
        )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


def parse_order_by(order_by: str | None, model, default_column: str = "modified"):
    """Parse a frontend-style `created desc` ordering string and return an SQLAlchemy expression."""
    from sqlalchemy import asc, desc

    col = getattr(model, default_column, None)
    expr = desc(col) if col is not None else desc(getattr(model, "created", None) or col)
    if not order_by:
        return expr
    parts = order_by.split()
    if not parts:
        return expr
    attr = _camel_to_snake(parts[0])
    col = getattr(model, attr, None)
    if col is None:
        return expr
    direction = (parts[1].lower() if len(parts) > 1 else "desc")
    if direction in ("asc", "ascending"):
        return asc(col)
    return desc(col)


def _camel_to_snake(name: str) -> str:
    out = []
    for i, c in enumerate(name):
        if c.isupper() and i > 0:
            out.append("_")
        out.append(c.lower())
    return "".join(out)


def now_iso() -> str:
    return datetime.utcnow().isoformat()
