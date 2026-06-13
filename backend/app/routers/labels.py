"""Label routes (top-level /labels/*)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import DbSession
from app.models.label import Label
from app.schemas.label import LabelCreate, LabelUpdate
from app.services.serializers import label_to_dict
from app.util.color import rand_hex_color

router = APIRouter(prefix="/labels", tags=["Label"])


@router.get("", response_model=list[dict])
async def list_labels(db: DbSession):
    stmt = select(Label).order_by(Label.project_id, Label.id)
    res = await db.execute(stmt)
    return [label_to_dict(l) for l in res.scalars().all()]


@router.post("", response_model=list[dict])
async def create_labels(
    labels: list[LabelCreate],
    db: DbSession,
    deduplicate: bool = False,
):
    out: list[Label] = []
    for l in labels:
        project_id = l.project_id
        if deduplicate and project_id is not None:
            stmt = select(Label).where(Label.project_id == project_id, Label.name == l.name)
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing is not None:
                out.append(existing)
                continue
        label = Label(
            project_id=project_id,
            id=l.id or 0,
            name=l.name,
            color=l.color or rand_hex_color(),
            comment=l.comment,
            super_category_id=l.super_category_id,
            type=l.type,
            active=l.active if l.active is not None else True,
        )
        db.add(label)
        out.append(label)
    await db.commit()
    for l in out:
        await db.refresh(l)
    return [label_to_dict(l) for l in out]


@router.put("/{label_id}")
async def update_label(label_id: int, body: LabelUpdate, db: DbSession):
    l = await db.get(Label, label_id)
    if l is None:
        raise HTTPException(status_code=404, detail=f"No label with label_id {label_id}")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(l, k, v)
    await db.commit()
    await db.refresh(l)
    return label_to_dict(l)


@router.delete("/{label_id}")
async def delete_label(label_id: int, db: DbSession):
    l = await db.get(Label, label_id)
    if l is None:
        raise HTTPException(status_code=404, detail=f"No label with label_id {label_id}")
    await db.delete(l)
    await db.commit()
    return {"message": f"Label {label_id} deleted"}
