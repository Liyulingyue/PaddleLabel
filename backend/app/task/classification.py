"""Classification format - simple image-folder layout.

Train/val/test subfolders + per-image single or multi labels.

Directory layout (export):
    <export_dir>/
        labels.txt
        train_list.txt      img_path label_id [label_id ...]
        val_list.txt
        test_list.txt
        images/             <all images here or beside the lists>

Or with sub-categories:
    singleClass: each image has exactly 1 label
    multiClass : each image has 0..N labels
"""

from __future__ import annotations

import shutil
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from app.models.label import Label
from app.models.project import Project
from app.task._common import read_lines, write_lines


@dataclass
class ClassificationResult:
    """Intermediate result of parsing/importing classification data."""

    image_label_pairs: list[tuple[str, list[str]]]   # (relative_image_path, [label_name, ...])
    label_names: list[str]
    splits: dict[int, set[str]]                       # set_index -> set of paths


def _find_lists(data_dir: Path) -> tuple[Path | None, list[Path]]:
    train = data_dir / "train_list.txt"
    val = data_dir / "val_list.txt"
    test = data_dir / "test_list.txt"
    has_train_val_test = train.exists() or val.exists() or test.exists()
    if has_train_val_test:
        return None, [train, val, test]
    # Otherwise look in <data_dir>/<subset>/<class>/<image> style
    return None, []


def detect(data_dir: Path) -> bool:
    """True if data_dir looks like a classification dataset."""
    if not data_dir.exists():
        return False
    if (data_dir / "labels.txt").exists():
        return True
    for name in ("train_list.txt", "val_list.txt", "test_list.txt"):
        if (data_dir / name).exists():
            return True
    # ImageFolder style: at least one subdir containing images
    for child in data_dir.iterdir():
        if child.is_dir():
            for sub in child.iterdir():
                if sub.is_dir() and any(p.suffix.lower() in {".jpg", ".png", ".jpeg", ".bmp"} for p in sub.iterdir()):
                    return True
    return False


def read(data_dir: Path) -> ClassificationResult:
    """Read a classification dataset. Supports:
    1) labels.txt + train/val/test_list.txt
    2) ImageFolder: <split?>/<class>/<image>
    """
    image_label_pairs: list[tuple[str, list[str]]] = []
    label_names: list[str] = []
    splits: dict[int, set[str]] = {0: set(), 1: set(), 2: set()}

    labels_file = data_dir / "labels.txt"
    if labels_file.exists():
        label_names = read_lines(labels_file)

    train_file = data_dir / "train_list.txt"
    val_file = data_dir / "val_list.txt"
    test_file = data_dir / "test_list.txt"

    def _consume_list(p: Path, set_idx: int):
        if not p.exists():
            return
        for line in read_lines(p):
            parts = line.split()
            if not parts:
                continue
            img_path = parts[0]
            label_idxs = []
            for tok in parts[1:]:
                try:
                    label_idxs.append(int(tok))
                except ValueError:
                    continue
            names = []
            for idx in label_idxs:
                if 0 <= idx < len(label_names):
                    names.append(label_names[idx])
            if not names and len(parts) == 2:
                # Maybe a path-with-class? Already handled.
                pass
            image_label_pairs.append((img_path, names))
            splits[set_idx].add(img_path)

    _consume_list(train_file, 0)
    _consume_list(val_file, 1)
    _consume_list(test_file, 2)

    if not image_label_pairs:
        # Fallback: scan imageFolder
        # First-level dir = split (train/val/test) OR class.
        # We try the ImageFolder convention: <class>/<image> at root.
        for entry in sorted(data_dir.iterdir()):
            if not entry.is_dir() or entry.name.startswith("."):
                continue
            label_name = entry.name
            if label_name not in label_names:
                label_names.append(label_name)
            for img in sorted(entry.iterdir()):
                if img.is_file() and img.suffix.lower() in {".jpg", ".png", ".jpeg", ".bmp"}:
                    rel = str(img.relative_to(data_dir))
                    image_label_pairs.append((rel, [label_name]))
                    splits[0].add(rel)
    return ClassificationResult(image_label_pairs, label_names, splits)


def write(
    project: Project,
    labels: list[Label],
    images_to_labels: dict[str, list[str]],
    splits: dict[int, set[str]] | None,
    export_dir: Path,
    *,
    image_root: Path,
    sub_category: str = "multiClass",
):
    """Write a classification dataset in PaddleLabel style.

    `images_to_labels`: relative path -> list of label names
    `splits`:          set_index -> set of relative paths (0=train, 1=val, 2=test)
    `image_root`:      base path of the source images (used for copy/rel-path)
    `sub_category`:    'singleClass' or 'multiClass'
    """
    export_dir.mkdir(parents=True, exist_ok=True)
    images_dir = export_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    label_names = [l.name for l in sorted(labels, key=lambda x: x.id or 0)]
    write_lines(export_dir / "labels.txt", label_names)

    name_to_id = {l.name: (l.id or i) for i, l in enumerate(sorted(labels, key=lambda x: x.id or 0))}
    for rel_path, names in images_to_labels.items():
        src = image_root / rel_path
        dst = images_dir / Path(rel_path).name
        if src.exists() and not dst.exists():
            shutil.copy2(src, dst)
        # We use the basename within the images dir.
        short_name = Path(rel_path).name

    splits = splits or {0: set(images_to_labels.keys()), 1: set(), 2: set()}
    for set_idx, fname in [(0, "train_list.txt"), (1, "val_list.txt"), (2, "test_list.txt")]:
        lines: list[str] = []
        for rel_path in sorted(splits.get(set_idx, set())):
            names = images_to_labels.get(rel_path, [])
            short_name = Path(rel_path).name
            if sub_category == "singleClass" and not names:
                continue
            label_ids = [str(name_to_id.get(n, -1)) for n in names if n in name_to_id]
            if sub_category == "singleClass":
                if not label_ids:
                    continue
                lines.append(f"images/{short_name} {label_ids[0]}")
            else:
                if not label_ids:
                    lines.append(f"images/{short_name}")
                else:
                    lines.append(f"images/{short_name} " + " ".join(label_ids))
        write_lines(export_dir / fname, lines)
