"""Project import service - reads on-disk dataset and creates Project/Task/Data/Label/Annotation rows.

`options` mirrors what the frontend collects in the project creator:
    {
        "labelFormat": "voc" | "yolo" | "coco" | "mask" | "eiseg" | "imgClass" | "clsList" | "default",
        "clasSubCatg": "singleClass" | "multiClass",   # for classification
        "segMaskType": "indexed" | "grayscale",         # for semantic seg
        ...
    }
"""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.annotation import Annotation
from app.models.data import Data
from app.models.label import Label
from app.models.project import Project
from app.models.task import Task
from app.models.task_category import TaskCategory
from app.services.serializers import label_to_dict
from app.task import classification, detection, ocr, segmentation
from app.util.color import rand_hex_color
from app.util.filesystem import IMAGE_EXTENSIONS, listdir, listdir_top


def _backpop_task(task):
    """Synchronous helper to populate annotation.task_id after task.task_id is assigned.
    Use selectinload(Task.datas + Data.annotations) before calling this."""
    for d in task.datas:
        for ann in d.annotations:
            ann.task_id = task.task_id


async def import_project(
    db: AsyncSession,
    project: Project,
    *,
    data_dir: str | None = None,
    options: dict | None = None,
):
    options = options or {}
    if data_dir is None:
        data_dir = project.data_dir
    if not data_dir:
        raise ValueError("data_dir is required for import")
    root = Path(data_dir)
    if not root.exists():
        raise FileNotFoundError(f"Data directory {data_dir} doesn't exist")

    cat = await db.get(TaskCategory, project.task_category_id) if project.task_category_id else None
    if cat is None:
        raise ValueError(f"Project {project.project_id} has no valid task category")
    task_type = cat.name  # classification / detection / semantic_segmentation / ...

    label_format = options.get("labelFormat") or _auto_detect(root, task_type)
    label_format = _normalize_label_format(label_format, task_type)

    # Clear existing tasks+annotations
    await db.execute(delete(Task).where(Task.project_id == project.project_id))

    if task_type == "classification":
        await _import_classification(db, project, root, options, label_format)
    elif task_type == "detection":
        await _import_detection(db, project, root, options, label_format)
    elif task_type == "semantic_segmentation":
        await _import_segmentation(db, project, root, options, label_format)
    elif task_type == "instance_segmentation":
        await _import_instance_segmentation(db, project, root, options, label_format)
    elif task_type == "optical_character_recognition":
        await _import_ocr(db, project, root, options, label_format)
    else:
        # default: just enumerate images as tasks, no labels
        await _import_classification(db, project, root, {"labelFormat": "imgClass"}, "imgClass")
    await db.commit()


# ─── helpers ────────────────────────────────────────────────────────────────


def _auto_detect(root: Path, task_type: str) -> str:
    if task_type == "classification":
        if (root / "labels.txt").exists():
            return "clsList"
        return "imgClass"
    if task_type == "detection":
        if detection.detect_coco(root):
            return "coco"
        if detection.detect_yolo(root):
            return "yolo"
        if detection.detect_voc(root):
            return "voc"
        return "voc"
    if task_type == "semantic_segmentation":
        if segmentation.detect_coco_seg(root):
            return "coco"
        return "mask"
    if task_type == "instance_segmentation":
        if segmentation.detect_eiseg(root):
            return "eiseg"
        if detection.detect_coco(root):
            return "coco"
        return "mask"
    if task_type == "optical_character_recognition":
        return "default"
    return "default"


def _normalize_label_format(fmt: str, task_type: str) -> str:
    if not fmt:
        return _auto_detect(Path(), task_type)
    aliases = {
        "imgClass": "imgClass",
        "clsList": "clsList",
        "labelTxt": "clsList",
        "singleClassFolder": "imgClass",
        "multiClassList": "clsList",
        "singleClass": "imgClass",
        "multiClass": "clsList",
        "voc": "voc",
        "yolo": "yolo",
        "coco": "coco",
        "mask": "mask",
        "eiseg": "eiseg",
        "default": "default",
    }
    return aliases.get(fmt, fmt)


# ─── classification ─────────────────────────────────────────────────────────


async def _import_classification(
    db: AsyncSession, project: Project, root: Path, options: dict, fmt: str
):
    # Recreate labels (preserve user-defined ones in this project)
    label_name_to_obj: dict[str, Label] = {l.name: l for l in project.labels}
    sub_cat = options.get("clasSubCatg", "multiClass")

    if fmt == "imgClass":
        # <root>/<class>/<image>
        class_dirs = [d for d in root.iterdir() if d.is_dir() and not d.name.startswith(".")]
        if not class_dirs:
            # No subdirs — treat all images in root as unlabeled single task
            items = []
            for img in sorted(root.iterdir()):
                if img.is_file() and img.suffix.lower() in IMAGE_EXTENSIONS:
                    items.append((str(img.relative_to(root)), []))
            if items:
                await _add_classification_task(db, project, items, 0, label_name_to_obj)
        else:
            for class_dir in sorted(class_dirs):
                label = await _ensure_label(db, project, class_dir.name, label_name_to_obj)
                for img in sorted(class_dir.iterdir()):
                    if img.is_file() and img.suffix.lower() in IMAGE_EXTENSIONS:
                        rel = str(img.relative_to(root))
                        await _add_classification_task(db, project, [(rel, [label.name])], 0, label_name_to_obj)
    else:  # clsList
        result = classification.read(root)
        # Add labels
        for name in result.label_names:
            await _ensure_label(db, project, name, label_name_to_obj)
        for set_idx, paths in result.splits.items():
            items = [(p, result.image_label_pairs_lookup(p)) for p in sorted(paths)]
            items = [(p, names) for p, names in items if names or sub_cat == "multiClass"]
            await _add_classification_task(db, project, items, set_idx, label_name_to_obj)
        # if no splits were present, fall back
        if not any(result.splits.values()) and result.image_label_pairs:
            items = [(p, names) for p, names in result.image_label_pairs]
            await _add_classification_task(db, project, items, 0, label_name_to_obj)


def _lookup_pair(pairs, path):
    for p, names in pairs:
        if p == path:
            return names
    return []


# Monkeypatch helper into classification result object
def _attach_lookup(result):
    pairs = result.image_label_pairs
    result.image_label_pairs_lookup = lambda path: _lookup_pair(pairs, path)
    return result


# Wrap read() to attach helper
_orig_read = classification.read


def _read_classification(root: Path):
    result = _orig_read(root)
    return _attach_lookup(result)


classification.read = _read_classification


async def _ensure_label(
    db: AsyncSession, project: Project, name: str, cache: dict[str, Label]
) -> Label:
    if name in cache:
        return cache[name]
    existing = await db.execute(
        select(Label).where(Label.project_id == project.project_id, Label.name == name)
    )
    label = existing.scalar_one_or_none()
    if label is None:
        used_ids = {l.id for l in project.labels}
        nid = max([0] + list(used_ids)) + 1
        while nid in used_ids:
            nid += 1
        label = Label(
            project_id=project.project_id,
            id=nid,
            name=name,
            color=rand_hex_color([l.color for l in project.labels if l.color]),
        )
        db.add(label)
        await db.flush()
        project.labels.append(label)
    cache[name] = label
    return label


async def _add_classification_task(
    db: AsyncSession,
    project: Project,
    items: list[tuple[str, list[str]]],
    set_idx: int,
    label_cache: dict[str, Label],
):
    if not items:
        return
    task = Task(project_id=project.project_id, set=set_idx)
    for rel, names in items:
        d = Data(path=rel)
        task.datas.append(d)
        for n in names:
            label = await _ensure_label(db, project, n, label_cache)
            d.annotations.append(
                Annotation(
                    project_id=project.project_id,
                    task_id=None,
                    label_id=label.label_id,
                    result="",
                    type="classification",
                )
            )
    db.add(task)
    await db.flush()
    stmt = select(Task).where(Task.task_id == task.task_id).options(
        selectinload(Task.datas).selectinload(Data.annotations)
    )
    res = await db.execute(stmt)
    reloaded = res.scalar_one()
    for d in reloaded.datas:
        for ann in d.annotations:
            ann.task_id = task.task_id


# ─── detection ──────────────────────────────────────────────────────────────


async def _import_detection(
    db: AsyncSession, project: Project, root: Path, options: dict, fmt: str
):
    label_cache: dict[str, Label] = {l.name: l for l in project.labels}

    if fmt == "voc":
        items, names, splits = detection.read_voc(root)
        for n in names:
            await _ensure_label(db, project, n, label_cache)
        await _import_voc_items(db, project, items, splits, label_cache)
    elif fmt == "yolo":
        items, names, splits = detection.read_yolo(root)
        # Re-read yolo with project labels
        await _import_yolo_items(db, project, items, names, splits, label_cache)
    elif fmt == "coco":
        coco, splits = detection.read_coco(root)
        for cat in coco.get("categories", []):
            await _ensure_label(db, project, cat.get("name", f"class_{cat.get('id')}"), label_cache)
        await _import_coco_items(db, project, coco, splits, label_cache)
    else:
        raise ValueError(f"Unknown detection format: {fmt}")


async def _import_voc_items(db, project, items, splits, label_cache):
    name_to_label = {l.name: l for l in project.labels}
    # Build image_path -> set map
    img_to_set: dict[str, int] = {}
    for set_idx, paths in splits.items():
        for p in paths:
            img_to_set[Path(p).stem] = set_idx
    for item in items:
        set_idx = img_to_set.get(Path(item.image).stem, 0)
        task = Task(project_id=project.project_id, set=set_idx)
        d = Data(path=item.image)
        for label_name, x, y, w, h in item.boxes:
            lab = name_to_label.get(label_name)
            if lab is None:
                continue
            d.annotations.append(
                Annotation(
                    project_id=project.project_id,
                    label_id=lab.label_id,
                    result=json.dumps({"x": x, "y": y, "width": w, "height": h}),
                    type="rectangle",
                )
            )
        task.datas.append(d)
        db.add(task)
    await db.flush()
    stmt = select(Task).where(Task.task_id == task.task_id).options(
        selectinload(Task.datas).selectinload(Data.annotations)
    )
    res = await db.execute(stmt)
    reloaded = res.scalar_one()
    for d in reloaded.datas:
        for ann in d.annotations:
            ann.task_id = task.task_id


async def _import_yolo_items(db, project, items, names, splits, label_cache):
    # names = full ordered list of class names (read from classes.names)
    # If a class name is missing in project labels, create it.
    id_to_label: dict[int, Label] = {}
    for i, n in enumerate(names):
        lab = await _ensure_label(db, project, n, label_cache)
        id_to_label[i] = lab

    img_to_set: dict[str, int] = {}
    for set_idx, paths in splits.items():
        for p in paths:
            img_to_set[Path(p).stem] = set_idx

    for item in items:
        set_idx = img_to_set.get(Path(item.image).stem, 0)
        task = Task(project_id=project.project_id, set=set_idx)
        d = Data(path=item.image)
        for cls, cx, cy, w, h in item.boxes:
            lab = id_to_label.get(cls)
            if lab is None:
                continue
            # convert YOLO cxcywh-normalized to VOC xywh (assume image size unknown; we keep it as xywh assuming
            # image dims are 1.0x1.0 normalized — caller can post-process).
            # Better: store as normalized bbox in result so the canvas can draw it.
            d.annotations.append(
                Annotation(
                    project_id=project.project_id,
                    label_id=lab.label_id,
                    result=json.dumps(
                        {
                            "x": (cx - w / 2),
                            "y": (cy - h / 2),
                            "width": w,
                            "height": h,
                            "normalized": True,
                        }
                    ),
                    type="rectangle",
                )
            )
        task.datas.append(d)
        db.add(task)
    await db.flush()
    stmt = select(Task).where(Task.task_id == task.task_id).options(
        selectinload(Task.datas).selectinload(Data.annotations)
    )
    res = await db.execute(stmt)
    reloaded = res.scalar_one()
    for d in reloaded.datas:
        for ann in d.annotations:
            ann.task_id = task.task_id


async def _import_coco_items(db, project, coco, splits, label_cache):
    id_to_label: dict[int, Label] = {}
    for cat in coco.get("categories", []):
        n = cat.get("name", f"class_{cat.get('id')}")
        lab = await _ensure_label(db, project, n, label_cache)
        cid = cat.get("id")
        if cid is not None:
            id_to_label[cid] = lab

    img_id_to_meta: dict[int, dict] = {img["id"]: img for img in coco.get("images", [])}
    # build image path -> set
    img_to_set: dict[str, int] = {}
    for set_idx, paths in splits.items():
        for p in paths:
            img_to_set[Path(p).name] = set_idx
            img_to_set[p] = set_idx

    # group annotations by image
    img_to_anns: dict[int, list[dict]] = {}
    for ann in coco.get("annotations", []):
        img_to_anns.setdefault(ann["image_id"], []).append(ann)

    for img_id, meta in img_id_to_meta.items():
        path = meta.get("file_name", "")
        set_idx = img_to_set.get(Path(path).name, img_to_set.get(path, 0))
        task = Task(project_id=project.project_id, set=set_idx)
        d = Data(path=path)
        for ann in img_to_anns.get(img_id, []):
            lab = id_to_label.get(ann.get("category_id"))
            if lab is None:
                continue
            x, y, w, h = ann.get("bbox", [0, 0, 0, 0])
            seg = ann.get("segmentation")
            if seg and isinstance(seg, list) and len(seg) > 0 and isinstance(seg[0], list):
                d.annotations.append(
                    Annotation(
                        project_id=project.project_id,
                        label_id=lab.label_id,
                        result=json.dumps(
                            {"points": [[float(p[0]), float(p[1])] for p in seg[0]]}
                        ),
                        type="polygon",
                    )
                )
            else:
                d.annotations.append(
                    Annotation(
                        project_id=project.project_id,
                        label_id=lab.label_id,
                        result=json.dumps({"x": x, "y": y, "width": w, "height": h}),
                        type="rectangle",
                    )
                )
        task.datas.append(d)
        db.add(task)
    await db.flush()
    stmt = select(Task).where(Task.task_id == task.task_id).options(
        selectinload(Task.datas).selectinload(Data.annotations)
    )
    res = await db.execute(stmt)
    reloaded = res.scalar_one()
    for d in reloaded.datas:
        for ann in d.annotations:
            ann.task_id = task.task_id


# ─── semantic segmentation ─────────────────────────────────────────────────


async def _import_segmentation(
    db: AsyncSession, project: Project, root: Path, options: dict, fmt: str
):
    label_cache: dict[str, Label] = {l.name: l for l in project.labels}
    if fmt == "coco":
        coco, splits = segmentation.read_coco_seg(root)
        for cat in coco.get("categories", []):
            await _ensure_label(db, project, cat.get("name", f"class_{cat.get('id')}"), label_cache)
        await _import_coco_items(db, project, coco, splits, label_cache)
        return
    # mask
    items, names, splits = segmentation.read_mask(root)
    for n in names:
        await _ensure_label(db, project, n, label_cache)
    name_to_label = {l.name: l for l in project.labels}
    img_to_set: dict[str, int] = {}
    for set_idx, paths in splits.items():
        for p in paths:
            img_to_set[Path(p).stem] = set_idx
    for item in items:
        set_idx = img_to_set.get(Path(item.image).stem, 0)
        task = Task(project_id=project.project_id, set=set_idx)
        d = Data(path=item.image)
        # We treat the mask as the per-image annotation by recording the file path;
        # the frontend can fetch the mask via /files/{data_id} using this path.
        d.annotations.append(
            Annotation(
                project_id=project.project_id,
                label_id=None,
                result=item.label_path,
                type="mask",
            )
        )
        task.datas.append(d)
        db.add(task)
    await db.flush()
    stmt = select(Task).where(Task.task_id == task.task_id).options(
        selectinload(Task.datas).selectinload(Data.annotations)
    )
    res = await db.execute(stmt)
    reloaded = res.scalar_one()
    for d in reloaded.datas:
        for ann in d.annotations:
            ann.task_id = task.task_id


# ─── instance segmentation ─────────────────────────────────────────────────


async def _import_instance_segmentation(
    db: AsyncSession, project: Project, root: Path, options: dict, fmt: str
):
    label_cache: dict[str, Label] = {l.name: l for l in project.labels}
    if fmt == "eiseg":
        items, names, splits = segmentation.read_eiseg(root)
        for n in names:
            await _ensure_label(db, project, n, label_cache)
        name_to_label = {l.name: l for l in project.labels}
        img_to_set: dict[str, int] = {}
        for set_idx, paths in splits.items():
            for p in paths:
                img_to_set[Path(p).stem] = set_idx
        for item in items:
            set_idx = img_to_set.get(Path(item.image).stem, 0)
            task = Task(project_id=project.project_id, set=set_idx)
            d = Data(path=item.image)
            for lbl, pts in item.labels:
                lab = name_to_label.get(lbl)
                if lab is None:
                    continue
                d.annotations.append(
                    Annotation(
                        project_id=project.project_id,
                        label_id=lab.label_id,
                        result=json.dumps({"points": pts}),
                        type="polygon",
                    )
                )
            task.datas.append(d)
            db.add(task)
        await db.flush()
        stmt = select(Task).where(Task.project_id == project.project_id).options(selectinload(Task.datas).selectinload(Data.annotations))
        res = await db.execute(stmt)
        for t in res.scalars().all():
            for d in t.datas:
                for ann in d.annotations:
                    ann.task_id = t.task_id
    elif fmt == "coco":
        coco, splits = segmentation.read_coco_seg(root)
        for cat in coco.get("categories", []):
            await _ensure_label(db, project, cat.get("name", f"class_{cat.get('id')}"), label_cache)
        await _import_coco_items(db, project, coco, splits, label_cache)
    else:
        await _import_segmentation(db, project, root, options, "mask")


# ─── OCR ────────────────────────────────────────────────────────────────────


async def _import_ocr(
    db: AsyncSession, project: Project, root: Path, options: dict, fmt: str
):
    items, splits = ocr.read(root)
    img_to_set: dict[str, int] = {}
    for set_idx, paths in splits.items():
        for p in paths:
            img_to_set[Path(p).name] = set_idx
    for item in items:
        set_idx = img_to_set.get(Path(item.image).name, 0)
        task = Task(project_id=project.project_id, set=set_idx)
        d = Data(path=item.image)
        for text, pts in item.transcriptions:
            d.annotations.append(
                Annotation(
                    project_id=project.project_id,
                    label_id=None,
                    result=json.dumps({"transcription": text, "points": pts}),
                    type="ocr_polygon" if (pts and len(pts) > 2) else "ocr_rectangle",
                )
            )
        task.datas.append(d)
        db.add(task)
    await db.flush()
    stmt = select(Task).where(Task.task_id == task.task_id).options(
        selectinload(Task.datas).selectinload(Data.annotations)
    )
    res = await db.execute(stmt)
    reloaded = res.scalar_one()
    for d in reloaded.datas:
        for ann in d.annotations:
            ann.task_id = task.task_id
