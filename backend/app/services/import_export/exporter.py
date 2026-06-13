"""Project export service."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.annotation import Annotation
from app.models.data import Data
from app.models.label import Label
from app.models.project import Project
from app.models.task import Task
from app.models.task_category import TaskCategory
from app.task import classification, detection, ocr, segmentation


async def export_project(
    db: AsyncSession,
    project: Project,
    *,
    export_dir: str,
    export_format: str | None = None,
    seg_mask_type: str | None = None,
):
    export_dir_path = Path(export_dir)
    export_dir_path.mkdir(parents=True, exist_ok=True)

    cat = await db.get(TaskCategory, project.task_category_id) if project.task_category_id else None
    if cat is None:
        raise ValueError("Project has no task category")

    # Load full project
    stmt = (
        select(Project)
        .where(Project.project_id == project.project_id)
        .options(
            selectinload(Project.labels),
            selectinload(Project.tasks).selectinload(Task.datas).selectinload(Data.annotations).selectinload(Annotation.label),
        )
    )
    res = await db.execute(stmt)
    project = res.scalar_one()

    labels = sorted(project.labels, key=lambda x: x.id or 0)
    label_name_to_id = {l.name: (l.id or i) for i, l in enumerate(labels)}

    image_root = Path(project.data_dir) if project.data_dir else None

    if cat.name == "classification":
        await _export_classification(db, project, labels, export_dir_path, image_root, export_format)
    elif cat.name == "detection":
        await _export_detection(db, project, labels, export_dir_path, image_root, export_format)
    elif cat.name == "semantic_segmentation":
        await _export_semantic_seg(db, project, labels, export_dir_path, image_root, export_format, seg_mask_type)
    elif cat.name == "instance_segmentation":
        await _export_instance_seg(db, project, labels, export_dir_path, image_root, export_format)
    elif cat.name == "optical_character_recognition":
        await _export_ocr(db, project, labels, export_dir_path, image_root, export_format)
    else:
        raise ValueError(f"Unsupported task category: {cat.name}")


# ─── helpers ────────────────────────────────────────────────────────────────


def _split_paths(project: Project) -> dict[int, set[str]]:
    splits: dict[int, set[str]] = {0: set(), 1: set(), 2: set()}
    for t in project.tasks:
        for d in t.datas:
            splits[t.set].add(d.path)
    return splits


def _flatten_items(project: Project):
    """Yield (data, label_name, ann_type, ann_result) tuples for non-mask annotations."""
    for t in project.tasks:
        for d in t.datas:
            for ann in d.annotations:
                if ann.label is None and not ann.result:
                    continue
                yield d, (ann.label.name if ann.label else None), ann.type, ann.result


# ─── classification ─────────────────────────────────────────────────────────


async def _export_classification(
    db, project, labels, export_dir: Path, image_root: Path | None, fmt: str | None
):
    fmt = fmt or "clsList"
    splits = _split_paths(project)
    image_to_labels: dict[str, list[str]] = defaultdict(list)
    seen: set[tuple[str, str]] = set()
    for t in project.tasks:
        for d in t.datas:
            for ann in d.annotations:
                if ann.label is None:
                    continue
                key = (d.path, ann.label.name)
                if key in seen:
                    continue
                seen.add(key)
                image_to_labels[d.path].append(ann.label.name)

    sub = "multiClass"
    if project.other_settings and project.other_settings.get("clasSubCatg"):
        sub = project.other_settings["clasSubCatg"]
    if fmt in ("voc", "yolo", "coco", "mask", "eiseg"):
        # fall back to clsList
        fmt = "clsList"
    if fmt == "imgClass":
        # Write to <export_dir>/<class>/<image>
        classification_sub = export_dir
        classification_sub.mkdir(parents=True, exist_ok=True)
        for rel, names in image_to_labels.items():
            for n in names:
                dst = classification_sub / n
                dst.mkdir(parents=True, exist_ok=True)
                if image_root is not None:
                    src = image_root / rel
                    if src.exists():
                        from shutil import copy2
                        copy2(src, dst / Path(rel).name)
    else:
        classification.write(
            project,
            labels,
            image_to_labels,
            splits,
            export_dir,
            image_root=image_root or Path("."),
            sub_category=sub,
        )


# ─── detection ──────────────────────────────────────────────────────────────


async def _export_detection(
    db, project, labels, export_dir: Path, image_root: Path | None, fmt: str | None
):
    fmt = fmt or "voc"
    if fmt not in {"voc", "yolo", "coco"}:
        raise ValueError(f"Unsupported detection export format: {fmt}")
    splits = _split_paths(project)

    voc_items: list[detection.VOCItem] = []
    yolo_items: list[detection.YOLOItem] = []
    coco_items: list[dict] = []

    label_id_to_idx = {l.id: i for i, l in enumerate(sorted(labels, key=lambda x: x.id or 0))}

    for t in project.tasks:
        for d in t.datas:
            boxes: list[tuple[str, float, float, float, float]] = []
            polys: list[tuple[str, list[list[float]]]] = []
            yolo_boxes: list[tuple[int, float, float, float, float]] = []
            coco_anns: list[dict] = []
            for ann in d.annotations:
                if ann.label is None or not ann.result:
                    continue
                if ann.type in ("rectangle",):
                    parsed = detection._parse_rect(ann.result)
                    if parsed is None:
                        continue
                    x, y, w, h = parsed
                    boxes.append((ann.label.name, x, y, w, h))
                    if fmt == "yolo" and ann.label.id in label_id_to_idx:
                        # We don't know image dims, so leave normalized=false, the exporter
                        # will store as raw and consumers should be aware. Better: assume dims from file.
                        yolo_boxes.append((label_id_to_idx[ann.label.id], x, y, w, h))
                    if fmt == "coco":
                        coco_anns.append(
                            {
                                "label_id": ann.label.id,
                                "bbox": [x, y, w, h],
                                "area": w * h,
                                "iscrowd": 0,
                            }
                        )
                elif ann.type in ("polygon",):
                    parsed = detection._parse_polygon(ann.result)
                    if parsed is None:
                        continue
                    pts = [list(p) for p in parsed]
                    polys.append((ann.label.name, pts))
                    if fmt == "coco":
                        xs = [p[0] for p in pts]
                        ys = [p[1] for p in pts]
                        x0, y0 = min(xs), min(ys)
                        x1, y1 = max(xs), max(ys)
                        w, h = x1 - x0, y1 - y0
                        coco_anns.append(
                            {
                                "label_id": ann.label.id,
                                "bbox": [x0, y0, w, h],
                                "area": w * h,
                                "iscrowd": 0,
                                "segmentation": [pts],
                            }
                        )
            voc_items.append(detection.VOCItem(image=d.path, boxes=boxes))
            yolo_items.append(detection.YOLOItem(image=d.path, boxes=yolo_boxes))
            coco_items.append(
                {
                    "file_name": d.path,
                    "annotations": coco_anns,
                }
            )

    if fmt == "voc":
        detection.write_voc(voc_items, labels, export_dir, image_root=image_root, splits=splits)
    elif fmt == "yolo":
        detection.write_yolo(yolo_items, labels, export_dir, image_root=image_root, splits=splits)
    else:
        detection.write_coco(coco_items, labels, export_dir, image_root=image_root, splits=splits)


# ─── semantic segmentation ─────────────────────────────────────────────────


async def _export_semantic_seg(
    db, project, labels, export_dir: Path, image_root: Path | None,
    fmt: str | None, seg_mask_type: str | None,
):
    fmt = fmt or "mask"
    splits = _split_paths(project)
    if fmt == "coco":
        coco_items: list[dict] = []
        for t in project.tasks:
            for d in t.datas:
                anns = []
                for ann in d.annotations:
                    if ann.label is None:
                        continue
                    if ann.type == "rectangle":
                        parsed = detection._parse_rect(ann.result or "")
                        if parsed is None:
                            continue
                        x, y, w, h = parsed
                        anns.append(
                            {"label_id": ann.label.id, "bbox": [x, y, w, h], "area": w * h, "iscrowd": 0}
                        )
                    elif ann.type == "polygon":
                        parsed = detection._parse_polygon(ann.result or "")
                        if parsed is None:
                            continue
                        pts = [list(p) for p in parsed]
                        xs = [p[0] for p in pts]
                        ys = [p[1] for p in pts]
                        x0, y0 = min(xs), min(ys)
                        x1, y1 = max(xs), max(ys)
                        w, h = x1 - x0, y1 - y0
                        anns.append(
                            {
                                "label_id": ann.label.id,
                                "bbox": [x0, y0, w, h],
                                "area": w * h,
                                "iscrowd": 0,
                                "segmentation": [pts],
                            }
                        )
                coco_items.append({"file_name": d.path, "annotations": anns})
        segmentation.write_coco_seg(coco_items, labels, export_dir, image_root=image_root, splits=splits)
        return

    # mask
    mask_items: list[segmentation.MaskItem] = []
    for t in project.tasks:
        for d in t.datas:
            # If a single mask annotation exists with type=mask and a result that points to a file,
            # just use it. Otherwise we'd have to compose from polygons - which is not trivial.
            for ann in d.annotations:
                if ann.type == "mask" and ann.result:
                    mask_items.append(
                        segmentation.MaskItem(image=d.path, label_path=ann.result)
                    )
                    break
            else:
                mask_items.append(
                    segmentation.MaskItem(image=d.path, label_path="")
                )
    segmentation.write_mask(mask_items, labels, export_dir, image_root=image_root, splits=splits)


# ─── instance segmentation ─────────────────────────────────────────────────


async def _export_instance_seg(
    db, project, labels, export_dir: Path, image_root: Path | None, fmt: str | None
):
    fmt = fmt or "eiseg"
    splits = _split_paths(project)
    if fmt == "coco":
        # reuse detection coco with polygons
        await _export_detection(db, project, labels, export_dir, image_root, "coco")
        return
    if fmt == "mask":
        # export one mask per object using polygons combined -> simplistic
        await _export_semantic_seg(db, project, labels, export_dir, image_root, "mask", None)
        return
    # eiseg
    eiseg_items: list[segmentation.EISegItem] = []
    for t in project.tasks:
        for d in t.datas:
            item = segmentation.EISegItem(image=d.path)
            for ann in d.annotations:
                if ann.label is None or ann.type not in ("polygon", "brush"):
                    continue
                if ann.type == "polygon":
                    parsed = detection._parse_polygon(ann.result or "")
                    if parsed is None:
                        continue
                    item.labels.append((ann.label.name, [list(p) for p in parsed]))
                elif ann.type == "brush" and ann.result:
                    # Try to convert RLE to polygon via simple alpha shape? Out of scope; emit empty polygon.
                    item.labels.append((ann.label.name, []))
            eiseg_items.append(item)
    segmentation.write_eiseg(eiseg_items, labels, export_dir, image_root=image_root, splits=splits)


# ─── OCR ────────────────────────────────────────────────────────────────────


async def _export_ocr(
    db, project, labels, export_dir: Path, image_root: Path | None, fmt: str | None
):
    items: list[ocr.OCRItem] = []
    for t in project.tasks:
        for d in t.datas:
            item = ocr.OCRItem(image=d.path)
            for ann in d.annotations:
                if not ann.result:
                    continue
                try:
                    data = json.loads(ann.result)
                except (ValueError, TypeError):
                    continue
                if isinstance(data, dict):
                    text = data.get("transcription", "")
                    pts = data.get("points", [])
                    item.transcriptions.append((text, pts))
            items.append(item)
    ocr.write(items, labels, export_dir, image_root=image_root)
