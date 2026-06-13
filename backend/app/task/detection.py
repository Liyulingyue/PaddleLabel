"""Detection - VOC (XML), YOLO (txt), COCO (JSON) format IO."""

from __future__ import annotations

import json
import os.path as osp
import shutil
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from app.models.label import Label
from app.task._common import read_lines, write_lines


# ─── result string parsing ──────────────────────────────────────────────────
# result is stored as a JSON string with format:
#   "rectangle": {"x": x, "y": y, "width": w, "height": h}
#   "polygon":   {"points": [[x, y], [x, y], ...]}
#   "brush":     {"rle": [start, length, start, length, ...]}


def _parse_rect(result: str) -> tuple[float, float, float, float] | None:
    if not result:
        return None
    try:
        d = json.loads(result)
    except (ValueError, TypeError):
        return None
    if not isinstance(d, dict):
        return None
    if all(k in d for k in ("x", "y", "width", "height")):
        return float(d["x"]), float(d["y"]), float(d["width"]), float(d["height"])
    return None


def _parse_polygon(result: str) -> list[tuple[float, float]] | None:
    if not result:
        return None
    try:
        d = json.loads(result)
    except (ValueError, TypeError):
        return None
    if not isinstance(d, dict):
        return None
    pts = d.get("points")
    if not isinstance(pts, list):
        return None
    out: list[tuple[float, float]] = []
    for p in pts:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            out.append((float(p[0]), float(p[1])))
    return out or None


# ─── VOC (XML) ──────────────────────────────────────────────────────────────


def detect_voc(data_dir: Path) -> bool:
    if not data_dir.exists():
        return False
    if (data_dir / "Annotations").is_dir():
        return True
    if (data_dir / "labels.txt").exists() and (
        (data_dir / "ImageSets").is_dir() or (data_dir / "JPEGImages").is_dir()
    ):
        return True
    return False


@dataclass
class VOCItem:
    image: str
    boxes: list[tuple[str, float, float, float, float]] = field(default_factory=list)


def read_voc(data_dir: Path) -> tuple[list[VOCItem], list[str], dict[int, set[str]]]:
    """Read VOC-style detection dataset.

    Layout:
        Annotations/*.xml
        labels.txt (optional)
        ImageSets/Main/{train,val,test}_list.txt (optional, derived from filenames if missing)
    """
    label_names: list[str] = []
    labels_path = data_dir / "labels.txt"
    if labels_path.exists():
        label_names = read_lines(labels_path)

    ann_dir = data_dir / "Annotations"
    items: list[VOCItem] = []
    if not ann_dir.exists():
        return items, label_names, {0: set(), 1: set(), 2: set()}

    for xml_path in sorted(ann_dir.glob("*.xml")):
        try:
            tree = ET.parse(xml_path)
        except ET.ParseError:
            continue
        root = tree.getroot()
        filename_el = root.find("filename")
        image_name = filename_el.text if filename_el is not None else xml_path.stem
        item = VOCItem(image=image_name)
        for obj in root.findall("object"):
            name_el = obj.find("name")
            if name_el is None or name_el.text is None:
                continue
            label_name = name_el.text.strip()
            if label_name not in label_names:
                label_names.append(label_name)
            bndbox = obj.find("bndbox")
            if bndbox is None:
                continue
            try:
                xmin = float(bndbox.findtext("xmin", "0"))
                ymin = float(bndbox.findtext("ymin", "0"))
                xmax = float(bndbox.findtext("xmax", "0"))
                ymax = float(bndbox.findtext("ymax", "0"))
            except ValueError:
                continue
            item.boxes.append((label_name, xmin, ymin, xmax - xmin, ymax - ymin))
        items.append(item)

    splits = _read_split_files(data_dir)
    return items, label_names, splits


def _read_split_files(data_dir: Path) -> dict[int, set[str]]:
    out: dict[int, set[str]] = {0: set(), 1: set(), 2: set()}
    for set_idx, fname in [(0, "train_list.txt"), (1, "val_list.txt"), (2, "test_list.txt")]:
        p = data_dir / fname
        if p.exists():
            for line in read_lines(p):
                parts = line.split()
                if parts:
                    out[set_idx].add(parts[0])
    return out


def write_voc(
    items: list[VOCItem],
    labels: list[Label],
    export_dir: Path,
    *,
    image_root: Path | None = None,
    splits: dict[int, set[str]] | None = None,
):
    export_dir.mkdir(parents=True, exist_ok=True)
    ann_dir = export_dir / "Annotations"
    ann_dir.mkdir(parents=True, exist_ok=True)
    img_dir = export_dir / "JPEGImages"
    img_dir.mkdir(parents=True, exist_ok=True)
    name_to_id = {l.name: (l.id or i) for i, l in enumerate(sorted(labels, key=lambda x: x.id or 0))}
    label_names = [l.name for l in sorted(labels, key=lambda x: x.id or 0)]
    write_lines(export_dir / "labels.txt", label_names)

    for item in items:
        stem = Path(item.image).stem
        xml_path = ann_dir / f"{stem}.xml"
        root = ET.Element("annotation")
        ET.SubElement(root, "folder").text = "JPEGImages"
        ET.SubElement(root, "filename").text = Path(item.image).name
        ET.SubElement(root, "path").text = f"JPEGImages/{Path(item.image).name}"
        size = ET.SubElement(root, "size")
        ET.SubElement(size, "width").text = "0"
        ET.SubElement(size, "height").text = "0"
        ET.SubElement(size, "depth").text = "3"
        for label_name, x, y, w, h in item.boxes:
            obj = ET.SubElement(root, "object")
            ET.SubElement(obj, "name").text = label_name
            ET.SubElement(obj, "pose").text = "Unspecified"
            ET.SubElement(obj, "truncated").text = "0"
            ET.SubElement(obj, "difficult").text = "0"
            bnd = ET.SubElement(obj, "bndbox")
            ET.SubElement(bnd, "xmin").text = str(int(x))
            ET.SubElement(bnd, "ymin").text = str(int(y))
            ET.SubElement(bnd, "xmax").text = str(int(x + w))
            ET.SubElement(bnd, "ymax").text = str(int(y + h))
        tree = ET.ElementTree(root)
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        if image_root is not None:
            src = image_root / item.image
            dst = img_dir / Path(item.image).name
            if src.exists() and not dst.exists():
                shutil.copy2(src, dst)

    splits = splits or {0: set(i.image for i in items), 1: set(), 2: set()}
    for set_idx, fname in [(0, "train_list.txt"), (1, "val_list.txt"), (2, "test_list.txt")]:
        write_lines(export_dir / fname, sorted(splits.get(set_idx, set())))


# ─── YOLO (txt) ─────────────────────────────────────────────────────────────


def detect_yolo(data_dir: Path) -> bool:
    if not data_dir.exists():
        return False
    if (data_dir / "classes.txt").exists() or (data_dir / "classes.names").exists():
        return True
    if (data_dir / "Annotations").is_dir():
        # could be YOLO if .txt files
        for f in (data_dir / "Annotations").iterdir():
            if f.suffix == ".txt":
                return True
    return False


@dataclass
class YOLOItem:
    image: str
    boxes: list[tuple[int, float, float, float, float]] = field(default_factory=list)
    # (class_id, cx, cy, w, h) - all normalized [0,1]


def read_yolo(data_dir: Path) -> tuple[list[YOLOItem], list[str], dict[int, set[str]]]:
    label_names: list[str] = []
    classes_path = data_dir / "classes.names"
    if not classes_path.exists():
        classes_path = data_dir / "classes.txt"
    if classes_path.exists():
        label_names = read_lines(classes_path)

    ann_dir = data_dir / "Annotations"
    items: list[YOLOItem] = []
    if not ann_dir.exists():
        return items, label_names, {0: set(), 1: set(), 2: set()}
    for txt_path in sorted(ann_dir.glob("*.txt")):
        if txt_path.name in {"classes.txt", "classes.names"}:
            continue
        item = YOLOItem(image=txt_path.stem + ".jpg")
        for line in read_lines(txt_path):
            parts = line.split()
            if len(parts) < 5:
                continue
            try:
                cls = int(parts[0])
                cx, cy, w, h = map(float, parts[1:5])
            except ValueError:
                continue
            item.boxes.append((cls, cx, cy, w, h))
        items.append(item)

    splits = _read_split_files(data_dir)
    return items, label_names, splits


def write_yolo(
    items: list[YOLOItem],
    labels: list[Label],
    export_dir: Path,
    *,
    image_root: Path | None = None,
    splits: dict[int, set[str]] | None = None,
):
    export_dir.mkdir(parents=True, exist_ok=True)
    ann_dir = export_dir / "Annotations"
    ann_dir.mkdir(parents=True, exist_ok=True)
    img_dir = export_dir / "JPEGImages"
    img_dir.mkdir(parents=True, exist_ok=True)
    name_to_id = {l.name: i for i, l in enumerate(sorted(labels, key=lambda x: x.id or 0))}
    id_to_idx = {l.id or i: i for i, l in enumerate(sorted(labels, key=lambda x: x.id or 0))}
    label_names = [l.name for l in sorted(labels, key=lambda x: x.id or 0)]
    write_lines(export_dir / "classes.names", label_names)

    for item in items:
        stem = Path(item.image).stem
        txt_path = ann_dir / f"{stem}.txt"
        lines: list[str] = []
        for cls, cx, cy, w, h in item.boxes:
            lines.append(f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
        write_lines(txt_path, lines)
        if image_root is not None:
            src = image_root / item.image
            dst = img_dir / Path(item.image).name
            if src.exists() and not dst.exists():
                shutil.copy2(src, dst)

    splits = splits or {0: set(i.image for i in items), 1: set(), 2: set()}
    for set_idx, fname in [(0, "train_list.txt"), (1, "val_list.txt"), (2, "test_list.txt")]:
        write_lines(export_dir / fname, sorted(splits.get(set_idx, set())))


# ─── COCO (JSON) ────────────────────────────────────────────────────────────


def detect_coco(data_dir: Path) -> bool:
    if not data_dir.exists():
        return False
    for f in ("train.json", "val.json", "test.json", "annotations.json"):
        if (data_dir / f).exists():
            return True
    return False


def read_coco(data_dir: Path) -> tuple[dict, dict[int, set[str]]]:
    """Returns (coco_dict, splits). The dict is in COCO format with images/categories/annotations."""
    coco = {"images": [], "categories": [], "annotations": []}
    splits: dict[int, set[str]] = {0: set(), 1: set(), 2: set()}
    for set_idx, fname in [(0, "train.json"), (1, "val.json"), (2, "test.json")]:
        p = data_dir / fname
        if not p.exists():
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for img in d.get("images", []):
            fn = img.get("file_name")
            if fn:
                splits[set_idx].add(fn)
        for cat in d.get("categories", []):
            if cat not in coco["categories"]:
                coco["categories"].append(cat)
        coco["images"].extend(d.get("images", []))
        coco["annotations"].extend(d.get("annotations", []))
    return coco, splits


def write_coco(
    coco_items: list[dict],
    labels: list[Label],
    export_dir: Path,
    *,
    image_root: Path | None = None,
    splits: dict[int, set[str]] | None = None,
):
    """`coco_items` is a list of dicts with keys:
        file_name, width, height, annotations=[{category_id, bbox, segmentation, ...}]
    """
    export_dir.mkdir(parents=True, exist_ok=True)
    img_dir = export_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)

    categories = []
    for i, l in enumerate(sorted(labels, key=lambda x: x.id or 0)):
        categories.append({"id": i + 1, "name": l.name, "supercategory": "none"})

    name_to_catid = {c["name"]: c["id"] for c in categories}
    id_to_name = {l.id or i: l.name for i, l in enumerate(sorted(labels, key=lambda x: x.id or 0))}

    def _build_for_set(set_idx: int) -> dict:
        images: list[dict] = []
        annotations: list[dict] = []
        ann_id = 1
        for it in coco_items:
            fn = it["file_name"]
            split_set = splits.get(set_idx) if splits else None
            if split_set is not None and fn not in split_set:
                continue
            img_id = len(images) + 1
            images.append(
                {
                    "id": img_id,
                    "file_name": fn,
                    "width": it.get("width", 0),
                    "height": it.get("height", 0),
                }
            )
            for ann in it.get("annotations", []):
                cat_name = id_to_name.get(ann.get("label_id")) or ann.get("category_name")
                if cat_name is None or cat_name not in name_to_catid:
                    continue
                annotations.append(
                    {
                        "id": ann_id,
                        "image_id": img_id,
                        "category_id": name_to_catid[cat_name],
                        "bbox": ann.get("bbox", [0, 0, 0, 0]),
                        "area": ann.get("area", 0),
                        "iscrowd": ann.get("iscrowd", 0),
                        "segmentation": ann.get("segmentation", []),
                    }
                )
                ann_id += 1
        return {"images": images, "categories": categories, "annotations": annotations}

    for set_idx, fname in [(0, "train.json"), (1, "val.json"), (2, "test.json")]:
        coco_set = _build_for_set(set_idx)
        (export_dir / fname).write_text(json.dumps(coco_set, ensure_ascii=False, indent=2), encoding="utf-8")
        if image_root is not None:
            for img in coco_set["images"]:
                src = image_root / img["file_name"]
                dst = img_dir / Path(img["file_name"]).name
                if src.exists() and not dst.exists():
                    shutil.copy2(src, dst)
