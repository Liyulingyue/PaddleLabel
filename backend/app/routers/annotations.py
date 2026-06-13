"""Annotation routes (top-level /annotations/*)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import DbSession
from app.deps import check_request_id
from app.models.annotation import Annotation
from app.models.data import Data
from app.models.label import Label
from app.models.task import Task
from app.schemas.annotation import AnnotationCreate, AnnotationUpdate
from app.services.serializers import annotation_to_dict

router = APIRouter(prefix="/annotations", tags=["Annotation"])


@router.get("", response_model=list[dict])
async def list_annotations(db: DbSession):
    stmt = select(Annotation).options(selectinload(Annotation.label)).order_by(Annotation.modified.desc())
    res = await db.execute(stmt)
    return [annotation_to_dict(a) for a in res.scalars().all()]


@router.post("", response_model=list[dict])
async def create_annotations(
    annotations: list[AnnotationCreate],
    db: DbSession,
    deduplicate: bool = False,
):
    check_request_id  # signature-only hook; actual check is on individual routers
    out: list[Annotation] = []
    for ann_in in annotations:
        task_id = ann_in.task_id
        project_id = ann_in.project_id
        if task_id is None:
            res = await db.execute(select(Data).where(Data.data_id == ann_in.data_id))
            d = res.scalar_one_or_none()
            if d is None:
                raise HTTPException(
                    status_code=404, detail=f"Data with data_id {ann_in.data_id} not found"
                )
            task_id = d.task_id

        if project_id is None:
            res = await db.execute(select(Task).where(Task.task_id == task_id))
            t = res.scalar_one_or_none()
            if t is None:
                raise HTTPException(status_code=404, detail=f"Task with task_id {task_id} not found")
            project_id = t.project_id

        if deduplicate:
            res = await db.execute(
                select(Annotation).where(
                    Annotation.data_id == ann_in.data_id,
                    Annotation.label_id == ann_in.label_id,
                    Annotation.result == ann_in.result,
                    Annotation.type == ann_in.type,
                )
            )
            existing = res.scalar_one_or_none()
            if existing is not None:
                out.append(existing)
                continue

        ann = Annotation(
            frontend_id=ann_in.frontend_id,
            result=ann_in.result,
            type=ann_in.type,
            label_id=ann_in.label_id,
            data_id=ann_in.data_id,
            task_id=task_id,
            project_id=project_id,
            predicted_by=ann_in.predicted_by,
        )
        db.add(ann)
        out.append(ann)
    await db.commit()
    # re-fetch with label
    ids = [a.annotation_id for a in out if a.annotation_id is not None]
    if ids:
        stmt = select(Annotation).where(Annotation.annotation_id.in_(ids)).options(selectinload(Annotation.label))
        res = await db.execute(stmt)
        out = list(res.scalars().all())
    return [annotation_to_dict(a) for a in out]


@router.get("/{annotation_id}")
async def get_annotation(annotation_id: int, db: DbSession):
    stmt = select(Annotation).where(Annotation.annotation_id == annotation_id).options(selectinload(Annotation.label))
    res = await db.execute(stmt)
    a = res.scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail=f"No annotation with annotation_id {annotation_id}")
    return annotation_to_dict(a)


@router.put("/{annotation_id}")
async def update_annotation(annotation_id: int, body: AnnotationUpdate, db: DbSession):
    a = await db.get(Annotation, annotation_id)
    if a is None:
        raise HTTPException(status_code=404, detail=f"No annotation with annotation_id {annotation_id}")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    await db.commit()
    await db.refresh(a)
    return annotation_to_dict(a)


@router.delete("/{annotation_id}")
async def delete_annotation(annotation_id: int, db: DbSession):
    a = await db.get(Annotation, annotation_id)
    if a is None:
        raise HTTPException(status_code=404, detail=f"No annotation with annotation_id {annotation_id}")
    await db.delete(a)
    await db.commit()
    return {"message": f"Annotation {annotation_id} deleted"}
