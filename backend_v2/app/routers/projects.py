# -*- coding: utf-8 -*-
import json
import math
import random
import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Header, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, Project, Task, Data, Annotation, Label, Tag, TagTask, TaskCategory
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectRead
from app.schemas.label import LabelCreate
from app.schemas.annotation import AnnotationRead
from app.schemas.tag import TagRead
from app.schemas.task import TaskRead, AnnotationSchema, DataSchema
from app.deps import check_request_id
from app.task.import_export import run_import, run_export

router = APIRouter(prefix="/projects", tags=["Project"])


def _project_to_read(project: Project, db: Session) -> dict:
    other_settings = {}
    if project.other_settings:
        try:
            other_settings = json.loads(project.other_settings)
        except:
            other_settings = {}
    sault = hashlib.md5(f"{project.data_dir}{project.created}".encode()).hexdigest()[:20]
    task_category = None
    if project.task_category_id:
        tc = db.query(TaskCategory).filter(TaskCategory.task_category_id == project.task_category_id).first()
        if tc:
            task_category = {
                "task_category_id": tc.task_category_id,
                "name": tc.name,
                "handler": tc.handler,
                "created": tc.created,
                "modified": tc.modified,
            }
    labels = []
    for l in project.labels:
        labels.append({
            "label_id": l.label_id,
            "project_id": l.project_id,
            "id": l.id,
            "name": l.name,
            "color": l.color,
            "comment": l.comment,
            "super_category_id": l.super_category_id,
            "created": l.created,
            "modified": l.modified,
        })
    return {
        "project_id": project.project_id,
        "name": project.name,
        "description": project.description,
        "data_dir": project.data_dir,
        "task_category_id": project.task_category_id,
        "task_category": task_category,
        "other_settings": other_settings,
        "created": project.created,
        "modified": project.modified,
        "upid": sault,
        "labels": labels,
    }


def _parse_order_by(order_by: str, model):
    if not order_by:
        return model.created.desc()
    parts = order_by.split(" ")
    key = parts[0]
    sort_dir = "desc" if len(parts) > 1 and parts[1].lower() in ("desc", "acs") else "asc"
    key = _camel2snake(key)
    col = getattr(model, key, None)
    if col is None:
        return model.created.desc()
    return getattr(col, sort_dir)()


def _camel2snake(name: str) -> str:
    result = []
    for i, c in enumerate(name):
        if c.isupper() and i > 0:
            result.append("_")
        result.append(c.lower())
    return "".join(result)


@router.get("", response_model=list[ProjectRead])
def list_projects(
    order_by: str = Query("modified desc"),
    db: Session = Depends(get_db),
    request_id: str | None = Header(None),
):
    check_request_id(request_id)
    order = _parse_order_by(order_by, Project)
    projects = db.query(Project).order_by(order).all()
    return [_project_to_read(p, db) for p in projects]


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    request_id: str | None = Header(None),
):
    check_request_id(request_id)
    data_dir = project_in.data_dir
    if not data_dir or not Path(data_dir).is_absolute():
        raise HTTPException(status_code=409, detail="Dataset Path must be an absolute path")
    if not Path(data_dir).exists():
        raise HTTPException(status_code=404, detail=f"Dataset Path {data_dir} doesn't exist")

    existing = db.query(Project).filter(Project.data_dir == data_dir).first()
    if existing:
        raise HTTPException(status_code=409, detail="A project with this data_dir already exists")

    existing_name = db.query(Project).filter(Project.name == project_in.name).first()
    if existing_name:
        raise HTTPException(status_code=409, detail="A project with this name already exists")

    other_settings = project_in.other_settings
    if other_settings is None:
        other_settings = {}
    other_settings["isSample"] = False

    project = Project(
        name=project_in.name,
        data_dir=data_dir,
        task_category_id=project_in.task_category_id,
        description=project_in.description,
        other_settings=json.dumps(other_settings),
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    if project_in.labels:
        for l in project_in.labels:
            label = Label(
                project_id=project.project_id,
                id=l.id or 0,
                name=l.name,
                color=l.color,
                comment=l.comment,
                super_category_id=l.super_category_id,
            )
            db.add(label)
        db.commit()

    db.refresh(project)

    try:
        run_import(project.project_id, data_dir, project_in.all_options or {})
    except Exception as e:
        db.delete(project)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    return _project_to_read(project, db)



@router.get("/browse_directory")
def browse_directory(path: str = Query(default="", description="Directory path to browse")):
    """Browse server directories for dataset path selection."""
    import os
    
    if not path:
        path = str(Path.home())
    
    try:
        p = Path(path).resolve()
        if not p.exists():
            raise HTTPException(status_code=404, detail="Path not found")
        if not p.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        items = []
        for item in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            if item.name.startswith('.'):
                continue
            items.append({
                "name": item.name,
                "path": str(item),
                "isDir": item.is_dir(),
            })
        
        return {
            "currentPath": str(p),
            "parentPath": str(p.parent) if p.parent != p else None,
            "items": items,
        }
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    return _project_to_read(project, db)


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")

    update_data = project_in.model_dump(exclude_unset=True)
    if "other_settings" in update_data and update_data["other_settings"] is not None:
        update_data["other_settings"] = json.dumps(update_data["other_settings"])
    update_data.pop("all_options", None)

    for k, v in update_data.items():
        if k not in ["project_id", "created"]:
            setattr(project, k, v)
    db.commit()
    db.refresh(project)
    return _project_to_read(project, db)


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    db.delete(project)
    db.commit()
    warning_path = Path(project.data_dir) / "paddlelabel.warning"
    if warning_path.exists():
        try:
            warning_path.unlink()
        except:
            pass
    return {"message": f"Project {project_id} deleted"}


@router.get("/{project_id}/tasks")
def list_tasks(
    project_id: int,
    order_by: str = Query("modified desc"),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    result = []
    for t in tasks:
        data_paths = [d.path for d in t.datas]
        ann_count = db.query(Annotation).filter(Annotation.task_id == t.task_id).count()
        result.append({
            "task_id": t.task_id,
            "project_id": t.project_id,
            "set": t.set,
            "data_paths": data_paths,
            "annotations": [],
            "annotation_count": ann_count,
            "created": t.created,
            "modified": t.modified,
        })
    return result


@router.put("/{project_id}/tasks")
def set_tasks_predicted(project_id: int, body: dict, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")

    data_predicted = body.get("data_predicted", False)
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    for task in tasks:
        for data in task.datas:
            data.predicted = data_predicted
    db.commit()
    return {"message": "OK"}


@router.get("/{project_id}/labels")
def list_labels(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")
    return [
        {
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
        for l in project.labels
    ]


@router.post("/{project_id}/labels")
def set_labels(project_id: int, labels_in: list[LabelCreate], db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail=f"No project with project_id {project_id}")

    db.query(Label).filter(Label.project_id == project_id).delete()
    for l in labels_in:
        label = Label(
            project_id=project_id,
            id=l.id or 0,
            name=l.name,
            color=l.color,
            comment=l.comment,
            super_category_id=l.super_category_id,
        )
        db.add(label)
    db.commit()
    return [
        {
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
        for l in db.query(Label).filter(Label.project_id == project_id).all()
    ]


@router.delete("/{project_id}/labels")
def delete_labels(project_id: int, db: Session = Depends(get_db)):
    db.query(Label).filter(Label.project_id == project_id).delete()
    db.commit()
    return {"message": "OK"}


@router.get("/{project_id}/annotations")
def list_annotations(project_id: int, db: Session = Depends(get_db)):
    db.query(Project).filter(Project.project_id == project_id).first()
    annotations = db.query(Annotation).filter(Annotation.project_id == project_id).all()
    return [_annotation_to_dict(a, db) for a in annotations]


@router.get("/{project_id}/tags")
def list_tags(project_id: int, db: Session = Depends(get_db)):
    db.query(Project).filter(Project.project_id == project_id).first()
    tags = db.query(Tag).filter(Tag.project_id == project_id).all()
    return [
        {
            "tag_id": t.tag_id,
            "project_id": t.project_id,
            "name": t.name,
            "color": t.color,
            "comment": t.comment,
            "created": t.created,
            "modified": t.modified,
        }
        for t in tags
    ]


@router.get("/{project_id}/progress")
def get_progress(project_id: int, db: Session = Depends(get_db)):
    db.query(Project).filter(Project.project_id == project_id).first()
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    total = len(tasks)
    finished = 0
    for task in tasks:
        if len(task.datas) > 0 and len(task.annotations) > 0:
            finished += 1
    return {"finished": finished, "total": total}


@router.post("/{project_id}/split")
def split_dataset(project_id: int, body: dict, db: Session = Depends(get_db)):
    db.query(Project).filter(Project.project_id == project_id).first()
    split = body
    if list(split.keys()) != ["train", "val", "test"]:
        raise HTTPException(status_code=500, detail="Request should provide train, validation and test percentage")
    if split["train"] + split["val"] + split["test"] != 100:
        raise HTTPException(status_code=500, detail="The three percentages don't sum to 100")

    split_num = [0.0, 0.0, 0.0]
    split_num[0] = split["train"] / 100
    split_num[1] = split["val"] / 100
    split_num[2] = split["test"] / 100

    for idx in range(1, 3):
        split_num[idx] += split_num[idx - 1]

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    split = [math.ceil(s * len(tasks)) for s in split_num]
    split.append(len(tasks))

    random.shuffle(tasks)
    for set_idx in range(3):
        for idx in range(split[set_idx], split[set_idx + 1]):
            tasks[idx].set = set_idx
    db.commit()
    return {
        "train": split[1],
        "val": split[2] - split[1],
        "test": split[3] - split[2],
    }


@router.post("/{project_id}/export")
def export_dataset(
    project_id: int,
    body: dict,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    db.query(Project).filter(Project.project_id == project_id).first()
    export_dir = body.get("export_dir")
    export_format = body.get("export_format")
    seg_mask_type = body.get("seg_mask_type")

    if not export_dir:
        raise HTTPException(status_code=500, detail="export_dir is required")
    if not Path(export_dir).is_absolute():
        raise HTTPException(status_code=500, detail="Only supports absolute paths")

    try:
        run_export(project_id, export_dir, export_format, seg_mask_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "Export completed"}


@router.post("/{project_id}/import")
def import_dataset(project_id: int, body: dict, db: Session = Depends(get_db)):
    db.query(Project).filter(Project.project_id == project_id).first()
    import_dir = body.get("import_dir")
    import_format = body.get("import_format")

    if not import_dir:
        raise HTTPException(status_code=500, detail="import_dir is required")
    if not Path(import_dir).is_absolute():
        raise HTTPException(status_code=500, detail="Only supports absolute paths")

    try:
        run_import(project_id, import_dir, {"labelFormat": import_format} if import_format else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "Import completed"}


@router.post("/{project_id}/predict")
def predict(project_id: int, body: dict, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{project_id}/toEasydata")
def to_easydata(project_id: int, body: dict, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/options/{im_or_export}/{project_type}")
def get_options(im_or_export: str, project_type: str, db: Session = Depends(get_db)):
    from paddlelabel.api.util import camel2snake
    project_type = camel2snake(project_type)
    all_catgs = db.query(TaskCategory).all()
    catg_names = [c.name for c in all_catgs]
    if project_type not in catg_names:
        raise HTTPException(status_code=500, detail=f"Project type {project_type} isn't supported")

    module_name = f"paddlelabel.task.{project_type}"
    module = __import__(module_name, fromlist=["ProjectSubtypeSelector"])
    selector = module.ProjectSubtypeSelector()

    questions = selector.import_questions if im_or_export == "import" else selector.export_questions
    return questions


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


