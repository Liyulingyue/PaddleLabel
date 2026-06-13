"""Task and Data endpoints (matching legacy api/controller/task.py & data.py)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import DbSession
from app.models.data import Data
from app.models.task import Task
from app.services.serializers import annotation_to_dict, data_to_dict, task_to_dict

router = APIRouter(tags=["Task / Data"])


@router.get("/tasks/{task_id}")
async def get_task(task_id: int, db: DbSession):
    stmt = select(Task).where(Task.task_id == task_id).options(selectinload(Task.datas))
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    return task_to_dict(t)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: DbSession):
    t = await db.get(Task, task_id)
    if t is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    await db.delete(t)
    await db.commit()
    return {"message": f"Task {task_id} deleted"}


@router.get("/tasks/{task_id}/datas", response_model=list[dict])
async def list_datas(task_id: int, db: DbSession):
    res = await db.execute(
        select(Data).where(Data.task_id == task_id).options(selectinload(Data.annotations))
    )
    out = []
    for d in res.scalars().all():
        dd = data_to_dict(d)
        dd["annotations"] = [annotation_to_dict(a) for a in d.annotations]
        out.append(dd)
    return out


@router.get("/datas/{data_id}", response_model=dict)
async def get_data(data_id: int, db: DbSession):
    stmt = select(Data).where(Data.data_id == data_id).options(selectinload(Data.annotations))
    res = await db.execute(stmt)
    d = res.scalar_one_or_none()
    if d is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")
    dd = data_to_dict(d)
    dd["annotations"] = [annotation_to_dict(a) for a in d.annotations]
    return dd


@router.put("/datas/{data_id}")
async def update_data(data_id: int, body: dict, db: DbSession):
    d = await db.get(Data, data_id)
    if d is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")
    for k, v in body.items():
        if k in ("data_id", "created", "task_id"):
            continue
        setattr(d, k, v)
    await db.commit()
    await db.refresh(d)
    return data_to_dict(d)


@router.get("/datas/{data_id}/annotations", response_model=list[dict])
async def list_data_annotations(data_id: int, db: DbSession):
    res = await db.execute(select(Data).where(Data.data_id == data_id).options(selectinload(Data.annotations)))
    d = res.scalar_one_or_none()
    if d is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")
    return [annotation_to_dict(a) for a in d.annotations]


@router.post("/datas/{data_id}/annotations")
async def set_data_annotations(data_id: int, annotations: list[dict], db: DbSession):
    """Bulk replace annotations of a given data row."""
    from app.models.annotation import Annotation
    from app.models.label import Label
    from sqlalchemy import delete

    d = await db.get(Data, data_id)
    if d is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")

    await db.execute(delete(Annotation).where(Annotation.data_id == data_id))
    await db.flush()

    for ann in annotations:
        label_id = ann.get("label_id")
        if label_id is None and ann.get("label_name"):
            # auto create label by name (look up in same project)
            res = await db.execute(
                select(Label).where(Label.name == ann["label_name"])
            )
            lab = res.scalar_one_or_none()
            if lab is None:
                lab = Label(
                    project_id=d.task.project_id if d.task else None,
                    name=ann["label_name"],
                    color="#" + "0" * 6,
                )
                db.add(lab)
                await db.flush()
            label_id = lab.label_id
        db.add(
            Annotation(
                frontend_id=ann.get("frontend_id"),
                result=ann.get("result", ""),
                type=ann.get("type"),
                label_id=label_id,
                data_id=data_id,
                task_id=d.task_id,
                project_id=d.task.project_id if d.task else None,
            )
        )
    await db.commit()
    res = await db.execute(
        select(Data).where(Data.data_id == data_id).options(selectinload(Data.annotations))
    )
    d = res.scalar_one()
    return [annotation_to_dict(a) for a in d.annotations]
