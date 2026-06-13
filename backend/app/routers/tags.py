"""Tag routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.database import DbSession
from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate
from app.util.color import rand_hex_color

router = APIRouter(prefix="/tags", tags=["Tag"])


def _tag_to_dict(t: Tag) -> dict:
    return {
        "tag_id": t.tag_id,
        "project_id": t.project_id,
        "name": t.name,
        "color": t.color,
        "comment": t.comment,
    }


@router.get("")
async def list_tags(db: DbSession):
    res = await db.execute(select(Tag).order_by(Tag.project_id))
    return [_tag_to_dict(t) for t in res.scalars().all()]


@router.post("", status_code=201)
async def create_tag(body: TagCreate, db: DbSession, projectId: int | None = None):
    project_id = projectId
    if project_id is None:
        raise HTTPException(status_code=400, detail="projectId query parameter is required")
    tag = Tag(
        project_id=project_id,
        name=body.name,
        color=body.color or rand_hex_color(),
        comment=body.comment,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return _tag_to_dict(tag)


@router.put("/{tag_id}")
async def update_tag(tag_id: int, body: TagUpdate, db: DbSession):
    t = await db.get(Tag, tag_id)
    if t is None:
        raise HTTPException(status_code=404, detail=f"No tag with tag_id {tag_id}")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return _tag_to_dict(t)


@router.delete("/{tag_id}")
async def delete_tag(tag_id: int, db: DbSession):
    t = await db.get(Tag, tag_id)
    if t is None:
        raise HTTPException(status_code=404, detail=f"No tag with tag_id {tag_id}")
    await db.delete(t)
    await db.commit()
    return {"message": f"Tag {tag_id} deleted"}
