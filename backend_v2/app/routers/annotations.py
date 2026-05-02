# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db, Annotation, Label
from app.schemas.annotation import AnnotationCreate, AnnotationUpdate, AnnotationRead
from app.deps import check_request_id

router = APIRouter(prefix="/annotations", tags=["Annotation"])


@router.get("", response_model=list[AnnotationRead], include_in_schema=True)
def list_annotations(
    db: Session = Depends(get_db),
):
    annotations = db.query(Annotation).order_by(Annotation.modified.desc()).all()
    return [_annotation_to_dict(a, db) for a in annotations]


@router.get("/", response_model=list[AnnotationRead], include_in_schema=False)
def list_annotations_slash(
    db: Session = Depends(get_db),
):
    return list_annotations(db)


@router.post("", response_model=list[AnnotationRead], status_code=201)
def create_annotation(
    annotations_in: list[AnnotationCreate],
    db: Session = Depends(get_db),
    request_id: str | None = Header(None),
    deduplicate: bool = Header(False),
):
    check_request_id(request_id)
    from app.database import Data, Task
    created = []
    for ann_in in annotations_in:
        task_id = ann_in.task_id
        if task_id is None:
            data = db.query(Data).filter(Data.data_id == ann_in.data_id).first()
            if data is None:
                raise HTTPException(status_code=404, detail=f"Data with data_id {ann_in.data_id} not found")
            task_id = data.task_id

        project_id = ann_in.project_id
        if project_id is None:
            task = db.query(Task).filter(Task.task_id == task_id).first()
            if task is None:
                raise HTTPException(status_code=404, detail=f"Task with task_id {task_id} not found")
            project_id = task.project_id

        if deduplicate:
            existing = db.query(Annotation).filter(
                Annotation.data_id == ann_in.data_id,
                Annotation.label_id == ann_in.label_id,
                Annotation.result == ann_in.result,
                Annotation.type == ann_in.type,
            ).first()
            if existing:
                created.append(existing)
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
        created.append(ann)
    db.commit()
    return [_annotation_to_dict(a, db) for a in created]


@router.get("/{annotation_id}")
def get_annotation(annotation_id: int, db: Session = Depends(get_db)):
    ann = db.query(Annotation).filter(Annotation.annotation_id == annotation_id).first()
    if ann is None:
        raise HTTPException(status_code=404, detail=f"No annotation with annotation_id {annotation_id}")
    return _annotation_to_dict(ann, db)


@router.put("/{annotation_id}", response_model=AnnotationRead)
def update_annotation(annotation_id: int, ann_in: AnnotationUpdate, db: Session = Depends(get_db)):
    ann = db.query(Annotation).filter(Annotation.annotation_id == annotation_id).first()
    if ann is None:
        raise HTTPException(status_code=404, detail=f"No annotation with annotation_id {annotation_id}")
    for k, v in ann_in.model_dump(exclude_unset=True).items():
        setattr(ann, k, v)
    db.commit()
    db.refresh(ann)
    return _annotation_to_dict(ann, db)


@router.delete("/{annotation_id}")
def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    ann = db.query(Annotation).filter(Annotation.annotation_id == annotation_id).first()
    if ann is None:
        raise HTTPException(status_code=404, detail=f"No annotation with annotation_id {annotation_id}")
    db.delete(ann)
    db.commit()
    return {"message": f"Annotation {annotation_id} deleted"}


def _annotation_to_dict(a: Annotation, db: Session) -> dict:
    label = db.query(Label).filter(Label.label_id == a.label_id).first()
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
        "created": a.created,
        "modified": a.modified,
        "label": {
            "label_id": label.label_id,
            "project_id": label.project_id,
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "comment": label.comment,
            "super_category_id": label.super_category_id,
            "created": label.created,
            "modified": label.modified,
        } if label else None,
    }
