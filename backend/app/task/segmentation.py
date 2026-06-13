"""Semantic / instance segmentation format IO.

Supports:
  - PNG mask export (palette) for semantic seg
  - COCO JSON for instance seg
  - EISeg JSON for interactive seg export (labelme-style points + polygons)
  - TIFF mask export for instance seg
"""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

from app.models.label import Label
from app.task._common import read_lines, write_lines


# ─── mask (semantic seg) ───────────────────────────────────────────────────


def detect_mask(data_dir: Path) -> bool:
    if not data_dir.exists():
        return False
    if (data_dir / "labels.txt").exists() and (data_dir / "Annotations").is_dir():
        return True
    return False


@dataclass
class MaskItem:
    image: str
    label_path: str
    # mask is loaded on demand
    _mask: np.ndarray | None = None

    def get_mask(self) -> np.ndarray | None:
        if self._mask is not None:
            return self._mask
        p = Path(self.label_path)
        if not p.exists():
            return None
        try:
            return np.array(Image.open(p))
        except Exception:
            return None


def read_mask(data_dir: Path) -> tuple[list[MaskItem], list[str], dict[int, set[str]]]:
    labels_path = data_dir / "labels.txt"
    label_names = read_lines(labels_path) if labels_path.exists() else []
    items: list[MaskItem] = []
    ann_dir = data_dir / "Annotations"
    if not ann_dir.exists():
        return items, label_names, {0: set(), 1: set(), 2: set()}
    for entry in sorted(ann_dir.iterdir()):
        if entry.suffix.lower() not in {".png", ".tif", ".tiff"}:
            continue
        image = entry.stem
        items.append(MaskItem(image=image, label_path=str(entry)))
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


def write_mask(
    items: list[MaskItem],
    labels: list[Label],
    export_dir: Path,
    *,
    image_root: Path | None = None,
    splits: dict[int, set[str]] | None = None,
    palette: list[tuple[int, int, int]] | None = None,
):
    export_dir.mkdir(parents=True, exist_ok=True)
    ann_dir = export_dir / "Annotations"
    ann_dir.mkdir(parents=True, exist_ok=True)
    img_dir = export_dir / "JPEGImages"
    img_dir.mkdir(parents=True, exist_ok=True)

    label_names = [l.name for l in sorted(labels, key=lambda x: x.id or 0)]
    write_lines(export_dir / "labels.txt", label_names)

    if palette is None:
        palette = [(0, 0, 0)]
        for i in range(1, len(label_names) + 1):
            # simple deterministic palette
            r = (i * 73) % 256
            g = (i * 137) % 256
            b = (i * 53) % 256
            palette.append((r, g, b))

    for item in items:
        mask = item.get_mask()
        if mask is None:
            continue
        out = np.zeros(mask.shape, dtype=np.uint8)
        for i in range(len(label_names)):
            out[mask == i] = i + 1
        img = Image.fromarray(out, mode="P")
        flat_palette = [c for color in palette for c in color]
        img.putpalette(flat_palette)
        out_path = ann_dir / f"{Path(item.image).stem}.png"
        img.save(out_path)
        if image_root is not None:
            src = image_root / item.image
            dst = img_dir / Path(item.image).name
            if src.exists() and not dst.exists():
                shutil.copy2(src, dst)

    splits = splits or {0: set(i.image for i in items), 1: set(), 2: set()}
    for set_idx, fname in [(0, "train_list.txt"), (1, "val_list.txt"), (2, "test_list.txt")]:
        write_lines(export_dir / fname, sorted(splits.get(set_idx, set())))


# ─── eiseg / labelme JSON (point + polygon) ─────────────────────────────────


def detect_eiseg(data_dir: Path) -> bool:
    if not data_dir.exists():
        return False
    if (data_dir / "label").is_dir():
        for f in (data_dir / "label").iterdir():
            if f.suffix == ".json":
                return True
    return False


@dataclass
class EISegItem:
    image: str
    labels: list[tuple[str, list[list[float]]]] = field(default_factory=list)  # (label, [[x,y],...])


def read_eiseg(data_dir: Path) -> tuple[list[EISegItem], list[str], dict[int, set[str]]]:
    label_dir = data_dir / "label"
    items: list[EISegItem] = []
    label_names: list[str] = []
    if not label_dir.exists():
        return items, label_names, {0: set(), 1: set(), 2: set()}
    for jp in sorted(label_dir.glob("*.json")):
        try:
            d = json.loads(jp.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        image = d.get("imagePath") or (jp.stem + ".jpg")
        item = EISegItem(image=image)
        for shape in d.get("shapes", []):
            lbl = shape.get("label", "object")
            pts = shape.get("points", [])
            if lbl not in label_names:
                label_names.append(lbl)
            item.labels.append((lbl, pts))
        items.append(item)
    splits = _read_split_files(data_dir)
    return items, label_names, splits


def write_eiseg(
    items: list[EISegItem],
    labels: list[Label],
    export_dir: Path,
    *,
    image_root: Path | None = None,
    splits: dict[int, set[str]] | None = None,
):
    export_dir.mkdir(parents=True, exist_ok=True)
    label_dir = export_dir / "label"
    label_dir.mkdir(parents=True, exist_ok=True)
    img_dir = export_dir / "JPEGImages"
    img_dir.mkdir(parents=True, exist_ok=True)
    label_names = [l.name for l in sorted(labels, key=lambda x: x.id or 0)]
    write_lines(export_dir / "labels.txt", label_names)

    for item in items:
        out: dict = {
            "version": "4.5.9",
            "flags": {},
            "shapes": [],
            "imagePath": item.image,
            "imageData": None,
            "imageHeight": 0,
            "imageWidth": 0,
        }
        for lbl, pts in item.labels:
            out["shapes"].append(
                {
                    "label": lbl,
                    "points": pts,
                    "group_id": None,
                    "shape_type": "polygon",
                    "flags": {},
                }
            )
        out_path = label_dir / f"{Path(item.image).stem}.json"
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        if image_root is not None:
            src = image_root / item.image
            dst = img_dir / Path(item.image).name
            if src.exists() and not dst.exists():
                shutil.copy2(src, dst)

    splits = splits or {0: set(i.image for i in items), 1: set(), 2: set()}
    for set_idx, fname in [(0, "train_list.txt"), (1, "val_list.txt"), (2, "test_list.txt")]:
        write_lines(export_dir / fname, sorted(splits.get(set_idx, set())))


# ─── COCO segmentation (instance + semantic) ────────────────────────────────


def write_coco_seg(
    coco_items: list[dict],
    labels: list[Label],
    export_dir: Path,
    *,
    image_root: Path | None = None,
    splits: dict[int, set[str]] | None = None,
):
    """`coco_items` is a list of dicts with keys:
        file_name, width, height, annotations=[{label_id, bbox, segmentation, area, iscrowd}]
    """
    from app.task.detection import write_coco  # reuse

    write_coco(coco_items, labels, export_dir, image_root=image_root, splits=splits)


def read_coco_seg(data_dir: Path) -> tuple[dict, dict[int, set[str]]]:
    from app.task.detection import read_coco

    return read_coco(data_dir)
