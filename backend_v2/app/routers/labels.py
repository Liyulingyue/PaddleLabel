# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db, Label
from app.schemas.label import LabelCreate, LabelUpdate, LabelRead
from app.deps import check_request_id

router = APIRouter(prefix="/labels", tags=["Label"])


@router.get("", response_model=list[LabelRead])
def list_labels(db: Session = Depends(get_db)):
    labels = db.query(Label).order_by(Label.modified.desc()).all()
    return [_label_to_dict(l) for l in labels]


@router.post("", response_model=list[LabelRead], status_code=201)
def create_label(
    labels_in: list[LabelCreate],
    db: Session = Depends(get_db),
    request_id: str | None = Header(None),
    remove_duplicate_by_name: str | None = Header(None),
):
    check_request_id(request_id)
    created = []
    for label_in in labels_in:
        if remove_duplicate_by_name:
            existing = db.query(Label).filter(Label.name == label_in.name).first()
            if existing:
                created.append(existing)
                continue

        label_id_val = label_in.id if label_in.id is not None else 0
        label = Label(
            project_id=label_in.project_id,
            id=label_id_val,
            name=label_in.name,
            color=label_in.color,
            comment=label_in.comment,
            super_category_id=label_in.super_category_id,
        )
        db.add(label)
        created.append(label)
    db.commit()
    for l in created:
        db.refresh(l)
    return [_label_to_dict(l) for l in created]


@router.get("/{label_id}")
def get_label(label_id: int, db: Session = Depends(get_db)):
    label = db.query(Label).filter(Label.label_id == label_id).first()
    if label is None:
        raise HTTPException(status_code=404, detail=f"No label with label_id {label_id}")
    return _label_to_dict(label)


@router.put("/{label_id}", response_model=LabelRead)
def update_label(label_id: int, label_in: LabelUpdate, db: Session = Depends(get_db)):
    label = db.query(Label).filter(Label.label_id == label_id).first()
    if label is None:
        raise HTTPException(status_code=404, detail=f"No label with label_id {label_id}")
    for k, v in label_in.model_dump(exclude_unset=True).items():
        setattr(label, k, v)
    db.commit()
    db.refresh(label)
    return _label_to_dict(label)


@router.delete("/{label_id}")
def delete_label(label_id: int, db: Session = Depends(get_db)):
    label = db.query(Label).filter(Label.label_id == label_id).first()
    if label is None:
        raise HTTPException(status_code=404, detail=f"No label with label_id {label_id}")
    db.delete(label)
    db.commit()
    return {"message": f"Label {label_id} deleted"}


def _label_to_dict(l: Label) -> dict:
    return {
        "label_id": l.label_id,
        "project_id": l.project_id,
        "id": l.id,
        "name": l.name,
        "color": l.color,
        "comment": l.comment,
        "super_category_id": l.super_category_id,
        "created": l.created,
        "modified": l.modified,
    }
