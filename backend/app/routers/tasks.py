# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session

from app.database import get_db, Task, Data, Tag, TagTask, Annotation, Label
from app.schemas.task import TaskCreate, TaskUpdate, TaskRead
from app.schemas.tag import TagRead
from app.schemas.annotation import AnnotationRead
from app.schemas.data import DataRead

router = APIRouter(prefix="/tasks", tags=["Task"])


@router.get("", response_model=list[TaskRead])
def list_tasks(
    order_by: str = Query("modified desc"),
    db: Session = Depends(get_db),
):
    tasks = db.query(Task).order_by(Task.modified.desc()).all()
    result = []
    for t in tasks:
        ann_count = db.query(Annotation).filter(Annotation.task_id == t.task_id).count()
        result.append({
            "task_id": t.task_id,
            "project_id": t.project_id,
            "set": t.set,
            "data_paths": [d.path for d in t.datas],
            "annotations": [],
            "annotation_count": ann_count,
            "created": t.created,
            "modified": t.modified,
        })
    return result


@router.post("", response_model=TaskRead, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(project_id=task_in.project_id, set=task_in.set or 0)
    db.add(task)
    db.commit()
    db.refresh(task)
    return {
        "task_id": task.task_id,
        "project_id": task.project_id,
        "set": task.set,
        "data_paths": [],
        "annotations": [],
        "created": task.created,
        "modified": task.modified,
    }


@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    annotations = db.query(Annotation).filter(Annotation.task_id == task_id).all()
    ann_list = []
    for a in annotations:
        label = db.query(Label).filter(Label.label_id == a.label_id).first()
        ann_list.append({
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
    return {
        "task_id": task.task_id,
        "project_id": task.project_id,
        "set": task.set,
        "data_paths": [d.path for d in task.datas],
        "annotations": ann_list,
        "created": task.created,
        "modified": task.modified,
    }


@router.put("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    for k, v in task_in.model_dump(exclude_unset=True).items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    return {
        "task_id": task.task_id,
        "project_id": task.project_id,
        "set": task.set,
        "data_paths": [d.path for d in task.datas],
        "annotations": [],
        "created": task.created,
        "modified": task.modified,
    }


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    db.delete(task)
    db.commit()
    return {"message": f"Task {task_id} deleted"}


@router.get("/{task_id}/tags")
def list_task_tags(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    tag_tasks = db.query(TagTask).filter(TagTask.task_id == task_id).all()
    result = []
    for tt in tag_tasks:
        tag = db.query(Tag).filter(Tag.tag_id == tt.tag_id).first()
        if tag:
            result.append({
                "tag_id": tag.tag_id,
                "project_id": tag.project_id,
                "name": tag.name,
                "color": tag.color,
                "comment": tag.comment,
                "created": tag.created,
                "modified": tag.modified,
            })
    return result


@router.post("/{task_id}/tags")
def add_tag_to_task(task_id: int, body: dict, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    tag_id = body.get("tag_id")
    if tag_id is None:
        raise HTTPException(status_code=500, detail="tag_id is required")

    existing = db.query(TagTask).filter(TagTask.task_id == task_id, TagTask.tag_id == tag_id).first()
    if existing:
        return {"message": "Tag already exists"}

    tag_task = TagTask(project_id=task.project_id, task_id=task_id, tag_id=tag_id)
    db.add(tag_task)
    db.commit()
    return {"message": "Tag added"}


@router.get("/{task_id}/datas")
def list_task_datas(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail=f"No task with task_id {task_id}")
    from app.routers.datas import _get_sault
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
        for d in task.datas
    ]


@router.get("/{task_id}/annotations")
def list_task_annotations(task_id: int, db: Session = Depends(get_db)):
    db.query(Task).filter(Task.task_id == task_id).first()
    annotations = db.query(Annotation).filter(Annotation.task_id == task_id).all()
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
