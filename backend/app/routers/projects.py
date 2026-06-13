"""Project router - all /api/projects/* endpoints."""

from __future__ import annotations

import json
import math
import random
import shutil
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import DbSession
from app.deps import check_request_id
from app.models.annotation import Annotation
from app.models.data import Data
from app.models.label import Label
from app.models.project import Project
from app.models.tag import Tag
from app.models.task import Task
from app.models.task_category import TaskCategory
from app.schemas.annotation import AnnotationRead
from app.schemas.label import LabelCreate
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.progress import ProgressRead
from app.schemas.tag import TagCreate, TagRead
from app.schemas.task import TaskRead
from app.services.import_export.exporter import export_project
from app.services.import_export.importer import import_project
from app.services.serializers import (
    annotation_to_dict,
    data_to_dict,
    label_to_dict,
    project_to_dict,
    task_to_dict,
)
from app.util.color import rand_hex_color
from app.util.filesystem import write_warning

router = APIRouter(prefix="/projects", tags=["Project"])


# ─── directory browser ────────────────────────────────────────────────────────


@router.get("/browse_directory")
async def browse_directory(path: str = Query(default="")) -> dict:
    target = Path(path).expanduser() if path else Path.home()
    target = target.resolve()
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    items: list[dict[str, Any]] = []
    for entry in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if entry.name.startswith("."):
            continue
        items.append({"name": entry.name, "path": str(entry), "isDir": entry.is_dir()})
    return {
        "currentPath": str(target),
        "parentPath": str(target.parent) if target.parent != target else None,
        "items": items,
    }


# ─── options ─────────────────────────────────────────────────────────────────


@router.get("/options/{im_or_export}/{project_type}")
async def get_options(im_or_export: str, project_type: str) -> list[dict]:
    from app.task.options import build_options

    return build_options(project_type, im_or_export)


# ─── CRUD ────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    order_by: str = Query(default="modified desc"),
    db: DbSession = None,
):
    from app.services.serializers import parse_order_by

    order = parse_order_by(order_by, Project)
    stmt = (
        select(Project)
        .options(
            selectinload(Project.labels),
            selectinload(Project.task_category),
        )
        .order_by(order)
    )
    res = await db.execute(stmt)
    return [project_to_dict(p) for p in res.scalars().all()]


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: int, db: DbSession):
    project = await _load_full_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    return project_to_dict(project)


@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(body: ProjectCreate, db: DbSession):
    check_request_id  # noqa - referenced in body validation
    from app.deps import check_request_id as _check_rid
    from fastapi import Header as _H

    data_dir = (body.data_dir or "").strip()
    if not Path(data_dir).is_absolute():
        raise HTTPException(status_code=409, detail="Dataset Path must be an absolute path")
    if not Path(data_dir).exists():
        raise HTTPException(status_code=404, detail=f"Dataset Path {data_dir} doesn't exist")

    res = await db.execute(select(Project).where(Project.data_dir == data_dir))
    if res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="A project with this data_dir already exists")
    res = await db.execute(select(Project).where(Project.name == body.name))
    if res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="A project with this name already exists")

    other_settings = body.other_settings or {}
    other_settings.setdefault("isSample", False)

    project = Project(
        name=body.name,
        description=body.description,
        data_dir=data_dir,
        task_category_id=body.task_category_id,
        other_settings=other_settings,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    if body.labels:
        max_id = 0
        for l in body.labels:
            max_id = max(max_id, l.id or 0)
            label = Label(
                project_id=project.project_id,
                id=l.id or 0,
                name=l.name,
                color=l.color or rand_hex_color(),
                comment=l.comment,
                super_category_id=l.super_category_id,
                type=l.type,
            )
            db.add(label)
        await db.commit()
    write_warning(data_dir)

    try:
        await import_project(
            db,
            project,
            options=body.all_options or {},
        )
    except Exception as exc:
        await db.rollback()
        # re-fetch and delete
        proj = await db.get(Project, project.project_id)
        if proj is not None:
            await db.delete(proj)
            await db.commit()
        raise HTTPException(status_code=500, detail=str(exc))

    project = await _load_full_project(db, project.project_id)
    return project_to_dict(project)


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(project_id: int, body: ProjectUpdate, db: DbSession):
    project = await _load_full_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    data = body.model_dump(exclude_unset=True)
    data.pop("all_options", None)
    if "other_settings" in data and data["other_settings"] is not None:
        # keep as dict (JSON column)
        pass
    for k, v in data.items():
        if k in ("project_id", "created"):
            continue
        if k == "labels":
            continue
        setattr(project, k, v)
    if body.labels is not None:
        await _replace_labels(db, project, body.labels)
    await db.commit()
    await db.refresh(project)
    return project_to_dict(project)


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: DbSession):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    data_dir = project.data_dir
    await db.delete(project)
    await db.commit()
    if data_dir:
        warning = Path(data_dir) / "paddlelabel.warning"
        if warning.exists():
            try:
                warning.unlink()
            except OSError:
                pass
    return {"message": f"Project {project_id} deleted"}


# ─── labels (sub-resource) ───────────────────────────────────────────────────


@router.get("/{project_id}/labels", response_model=list[dict])
async def list_labels(project_id: int, db: DbSession):
    project = await _load_full_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    return [label_to_dict(l) for l in project.labels]


@router.post("/{project_id}/labels", response_model=list[dict])
async def set_labels(project_id: int, labels: list[LabelCreate], db: DbSession):
    project = await _load_full_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    await _replace_labels(db, project, labels)
    await db.commit()
    res = await db.execute(select(Label).where(Label.project_id == project_id))
    return [label_to_dict(l) for l in res.scalars().all()]


@router.delete("/{project_id}/labels")
async def delete_labels(project_id: int, db: DbSession):
    res = await db.execute(select(Label).where(Label.project_id == project_id))
    for l in res.scalars().all():
        await db.delete(l)
    await db.commit()
    return {"message": "OK"}


# ─── tasks (sub-resource) ────────────────────────────────────────────────────


@router.get("/{project_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    project_id: int,
    order_by: str = Query(default="modified desc"),
    db: DbSession = None,
):
    from app.services.serializers import parse_order_by

    project = await _load_full_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    order = parse_order_by(order_by, Task)
    stmt = select(Task).where(Task.project_id == project_id).order_by(order)
    res = await db.execute(stmt)
    return [task_to_dict(t) for t in res.scalars().all()]


@router.post("/{project_id}/tasks", response_model=TaskRead)
async def create_task(project_id: int, body: dict, db: DbSession):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    data_paths = body.get("data_paths") or []
    set_idx = body.get("set", 0)
    if not data_paths:
        raise HTTPException(status_code=400, detail="data_paths is required")
    task = Task(project_id=project_id, set=set_idx)
    for p in data_paths:
        task.datas.append(Data(path=p))
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task_to_dict(task)


# ─── tags (sub-resource) ─────────────────────────────────────────────────────


@router.get("/{project_id}/tags", response_model=list[TagRead])
async def list_tags(project_id: int, db: DbSession):
    res = await db.execute(select(Tag).where(Tag.project_id == project_id))
    return [
        {
            "tag_id": t.tag_id,
            "project_id": t.project_id,
            "name": t.name,
            "color": t.color,
            "comment": t.comment,
        }
        for t in res.scalars().all()
    ]


@router.post("/{project_id}/tags", response_model=TagRead)
async def create_tag(project_id: int, body: TagCreate, db: DbSession):
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    tag = Tag(
        project_id=project_id,
        name=body.name,
        color=body.color or rand_hex_color(),
        comment=body.comment,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return {
        "tag_id": tag.tag_id,
        "project_id": tag.project_id,
        "name": tag.name,
        "color": tag.color,
        "comment": tag.comment,
    }


# ─── annotations (sub-resource) ──────────────────────────────────────────────


@router.get("/{project_id}/annotations", response_model=list[dict])
async def list_annotations(project_id: int, db: DbSession):
    res = await db.execute(select(Annotation).where(Annotation.project_id == project_id))
    return [annotation_to_dict(a) for a in res.scalars().all()]


# ─── progress ────────────────────────────────────────────────────────────────


@router.get("/{project_id}/progress", response_model=ProgressRead)
async def get_progress(project_id: int, db: DbSession):
    from sqlalchemy.orm import selectinload

    stmt = (
        select(Task)
        .where(Task.project_id == project_id)
        .options(selectinload(Task.datas).selectinload(Data.annotations))
    )
    res = await db.execute(stmt)
    tasks = res.scalars().all()
    total = len(tasks)
    finished = 0
    for t in tasks:
        if t.datas and any(d.annotations for d in t.datas):
            finished += 1
    return ProgressRead(finished=finished, total=total)


# ─── split ───────────────────────────────────────────────────────────────────


@router.post("/{project_id}/split")
async def split_dataset(project_id: int, body: dict, db: DbSession):
    expected = {"train", "val", "test"}
    if set(body.keys()) != expected:
        raise HTTPException(
            status_code=500,
            detail="Request should provide train, val and test percentage",
        )
    train, val, test = body["train"], body["val"], body["test"]
    if train + val + test != 100:
        raise HTTPException(status_code=500, detail="The three percentages don't sum to 100")

    res = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = list(res.scalars().all())
    random.shuffle(tasks)
    n = len(tasks)
    if n == 0:
        return {"train": 0, "val": 0, "test": 0}

    cut_train = math.ceil(train / 100 * n)
    cut_val = math.ceil((train + val) / 100 * n)

    for i, t in enumerate(tasks):
        if i < cut_train:
            t.set = 0
        elif i < cut_val:
            t.set = 1
        else:
            t.set = 2
    await db.commit()
    return {
        "train": cut_train,
        "val": cut_val - cut_train,
        "test": n - cut_val,
    }


# ─── export / import / predict / set_all / browse / to_easydata ──────────────


@router.post("/{project_id}/export")
async def export_dataset(
    project_id: int,
    body: dict,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    project = await _load_full_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    export_dir = body.get("export_dir")
    export_format = body.get("export_format")
    seg_mask_type = body.get("seg_mask_type")
    if not export_dir:
        raise HTTPException(status_code=500, detail="export_dir is required")
    if not Path(export_dir).is_absolute():
        raise HTTPException(status_code=500, detail="Only supports absolute paths")
    warning = Path(export_dir) / "paddlelabel.warning"
    if warning.exists():
        raise HTTPException(
            status_code=500,
            detail="This folder is actively used as file store for PaddleLabel. Pick another folder.",
        )
    try:
        await export_project(
            db,
            project,
            export_dir=export_dir,
            export_format=export_format,
            seg_mask_type=seg_mask_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"message": "Export completed"}


@router.post("/{project_id}/import")
async def import_dataset(project_id: int, body: dict, db: DbSession):
    project = await _load_full_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    import_dir = body.get("import_dir")
    import_format = body.get("import_format")
    if not import_dir:
        raise HTTPException(status_code=500, detail="import_dir is required")
    if not Path(import_dir).is_absolute():
        raise HTTPException(status_code=500, detail="Only supports absolute paths")
    try:
        await import_project(
            db,
            project,
            data_dir=import_dir,
            options={"labelFormat": import_format} if import_format else {},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"message": "Import completed"}


@router.post("/{project_id}/predict")
async def predict(project_id: int, body: dict, db: DbSession):
    from app.services.predict import predict_project

    return await predict_project(db, project_id, body)


@router.post("/{project_id}/set_all")
async def set_all(project_id: int, body: dict, db: DbSession):
    """Mark every data row in a project as predicted/un-predicted."""
    res = await db.execute(select(Data).join(Task).where(Task.project_id == project_id))
    predicted = bool(body.get("data_predicted", False))
    for d in res.scalars().all():
        d.predicted = predicted
    await db.commit()
    return {"message": "OK"}


@router.post("/{project_id}/to_easydata")
async def to_easydata(project_id: int, body: dict, db: DbSession):
    raise HTTPException(status_code=501, detail="to_easydata not implemented in v2")


# ─── helpers ─────────────────────────────────────────────────────────────────


async def _load_full_project(db: DbSession, project_id: int) -> Project | None:
    stmt = (
        select(Project)
        .where(Project.project_id == project_id)
        .options(
            selectinload(Project.labels),
            selectinload(Project.tags),
            selectinload(Project.tasks),
            selectinload(Project.task_category),
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def _replace_labels(db: DbSession, project: Project, labels: list[LabelCreate]) -> None:
    res = await db.execute(select(Label).where(Label.project_id == project.project_id))
    for old in res.scalars().all():
        await db.delete(old)
    await db.flush()
    used_ids = set()
    for l in labels:
        label_id = l.id or 0
        while label_id in used_ids:
            label_id += 1
        used_ids.add(label_id)
        db.add(
            Label(
                project_id=project.project_id,
                id=label_id,
                name=l.name,
                color=l.color or rand_hex_color(),
                comment=l.comment,
                super_category_id=l.super_category_id,
                type=l.type,
                active=l.active if l.active is not None else True,
            )
        )
