# -*- coding: utf-8 -*-
import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db, Data, Task, Annotation, Label, Project
from app.schemas.data import DataCreate, DataUpdate, DataRead
from app.schemas.annotation import AnnotationCreate, AnnotationRead

router = APIRouter(prefix="/datas", tags=["Data"])


def _get_sault(data: Data) -> str:
    return hashlib.md5(f"{data.path}{data.created}".encode()).hexdigest()[:20]


@router.get("", response_model=list[DataRead])
def list_datas(
    db: Session = Depends(get_db),
):
    datas = db.query(Data).order_by(Data.modified.desc()).all()
    return [
        {
            "data_id": d.data_id,
            "task_id": d.task_id,
            "path": d.path,
            "size": d.size,
            "predicted": d.predicted,
            "created": d.created,
            "modified": d.modified,
            "sault": _get_sault(d),
        }
        for d in datas
    ]


@router.get("/", response_model=list[DataRead], include_in_schema=False)
def list_datas_slash(db: Session = Depends(get_db)):
    return list_datas(db)


@router.post("", response_model=DataRead, status_code=201)
def create_data(data_in: DataCreate, db: Session = Depends(get_db)):
    data = Data(
        task_id=data_in.task_id,
        path=data_in.path,
        size=data_in.size,
        predicted=data_in.predicted,
    )
    db.add(data)
    db.commit()
    db.refresh(data)
    return {
        "data_id": data.data_id,
        "task_id": data.task_id,
        "path": data.path,
        "size": data.size,
        "predicted": data.predicted,
        "created": data.created,
        "modified": data.modified,
        "sault": _get_sault(data),
    }


@router.get("/{data_id}/")
def get_data(data_id: int, db: Session = Depends(get_db)):
    data = db.query(Data).filter(Data.data_id == data_id).first()
    if data is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")
    return {
        "data_id": data.data_id,
        "task_id": data.task_id,
        "path": data.path,
        "size": data.size,
        "predicted": data.predicted,
        "created": data.created,
        "modified": data.modified,
        "sault": _get_sault(data),
    }


@router.put("/{data_id}/", response_model=DataRead)
def update_data(data_id: int, data_in: DataUpdate, db: Session = Depends(get_db)):
    data = db.query(Data).filter(Data.data_id == data_id).first()
    if data is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")
    for k, v in data_in.model_dump(exclude_unset=True).items():
        setattr(data, k, v)
    db.commit()
    db.refresh(data)
    return {
        "data_id": data.data_id,
        "task_id": data.task_id,
        "path": data.path,
        "size": data.size,
        "predicted": data.predicted,
        "created": data.created,
        "modified": data.modified,
        "sault": _get_sault(data),
    }


@router.delete("/{data_id}/")
def delete_data(data_id: int, db: Session = Depends(get_db)):
    data = db.query(Data).filter(Data.data_id == data_id).first()
    if data is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")
    db.delete(data)
    db.commit()
    return {"message": f"Data {data_id} deleted"}


@router.get("/{data_id}/image")
def get_image(data_id: int, sault: str | None = None, db: Session = Depends(get_db)):
    data = db.query(Data).filter(Data.data_id == data_id).first()
    if data is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")

    task = db.query(Task).filter(Task.task_id == data.task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail=f"No task for data {data_id}")

    project = db.query(Project).filter(Project.project_id == task.project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project for data {data_id}")

    file_path = Path(project.data_dir) / data.path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    return FileResponse(str(file_path))


@router.get("/{data_id}/mask")
def get_mask(data_id: int, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{data_id}/annotations")
def get_data_annotations(data_id: int, db: Session = Depends(get_db)):
    db.query(Data).filter(Data.data_id == data_id).first()
    annotations = db.query(Annotation).filter(Annotation.data_id == data_id).all()
    result = []
    for a in annotations:
        label = db.query(Label).filter(Label.label_id == a.label_id).first()
        result.append({
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
        })
    return result


@router.post("/{data_id}/annotations")
def set_data_annotations(
    data_id: int,
    annotations_in: list[AnnotationCreate],
    db: Session = Depends(get_db),
):
    data = db.query(Data).filter(Data.data_id == data_id).first()
    if data is None:
        raise HTTPException(status_code=404, detail=f"No data with data_id {data_id}")

    db.query(Annotation).filter(Annotation.data_id == data_id).delete()

    for ann_in in annotations_in:
        task_id = ann_in.task_id or data.task_id
        project_id = ann_in.project_id
        if project_id is None:
            task = db.query(Task).filter(Task.task_id == task_id).first()
            if task is None:
                raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
            project_id = task.project_id
        ann = Annotation(
            frontend_id=ann_in.frontend_id,
            result=ann_in.result,
            type=ann_in.type,
            label_id=ann_in.label_id,
            data_id=data_id,
            task_id=task_id,
            project_id=project_id,
            predicted_by=ann_in.predicted_by,
        )
        db.add(ann)
    db.commit()

    annotations = db.query(Annotation).filter(Annotation.data_id == data_id).all()
    result = []
    for a in annotations:
        label = db.query(Label).filter(Label.label_id == a.label_id).first()
        result.append({
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
        })
    return result


@router.delete("/{data_id}/annotations")
def delete_data_annotations(data_id: int, db: Session = Depends(get_db)):
    db.query(Data).filter(Data.data_id == data_id).first()
    db.query(Annotation).filter(Annotation.data_id == data_id).delete()
    db.commit()
    return {"message": "Annotations deleted"}
