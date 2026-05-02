# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db, Tag
from app.schemas.tag import TagCreate, TagUpdate, TagRead
from app.deps import check_request_id

router = APIRouter(prefix="/tags", tags=["Tag"])


@router.get("", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.modified.desc()).all()
    return [_tag_to_dict(t) for t in tags]


@router.post("", response_model=TagRead, status_code=201)
def create_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    request_id: str | None = Header(None),
):
    check_request_id(request_id)
    tag = Tag(
        project_id=tag_in.project_id,
        name=tag_in.name,
        color=tag_in.color,
        comment=tag_in.comment,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return _tag_to_dict(tag)


@router.get("/{tag_id}")
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail=f"No tag with tag_id {tag_id}")
    return _tag_to_dict(tag)


@router.put("/{tag_id}", response_model=TagRead)
def update_tag(tag_id: int, tag_in: TagUpdate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail=f"No tag with tag_id {tag_id}")
    for k, v in tag_in.model_dump(exclude_unset=True).items():
        setattr(tag, k, v)
    db.commit()
    db.refresh(tag)
    return _tag_to_dict(tag)


@router.delete("/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail=f"No tag with tag_id {tag_id}")
    db.delete(tag)
    db.commit()
    return {"message": f"Tag {tag_id} deleted"}


def _tag_to_dict(t: Tag) -> dict:
    return {
        "tag_id": t.tag_id,
        "project_id": t.project_id,
        "name": t.name,
        "color": t.color,
        "comment": t.comment,
        "created": t.created,
        "modified": t.modified,
    }
