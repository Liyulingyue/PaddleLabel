"""OCR format IO.

Default layout (export):
    <export_dir>/
        Label.txt              (single line: "image\\tjson_path" or just list of images)
        images/<image>         (copies of source images)
        txt/<image>.json       (list of {"transcription": "...", "points": [[x,y]...]})
"""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from app.models.label import Label
from app.task._common import read_lines, write_lines


@dataclass
class OCRItem:
    image: str
    transcriptions: list[tuple[str, list[list[float]]]] = field(default_factory=list)
    # each entry is (text, [[x,y], ...])


def detect(data_dir: Path) -> bool:
    if not data_dir.exists():
        return False
    if (data_dir / "Label.txt").exists() and (data_dir / "txt").is_dir():
        return True
    if (data_dir / "txt").is_dir():
        for f in (data_dir / "txt").iterdir():
            if f.suffix == ".json":
                return True
    return False


def read(data_dir: Path) -> tuple[list[OCRItem], dict[int, set[str]]]:
    items: list[OCRItem] = []
    splits: dict[int, set[str]] = {0: set(), 1: set(), 2: set()}

    label_path = data_dir / "Label.txt"
    if not label_path.exists():
        return items, splits

    image_to_json: dict[str, str] = {}
    for line in read_lines(label_path):
        parts = line.split("\t")
        if len(parts) >= 1:
            img = parts[0]
            jpath = parts[1] if len(parts) > 1 else None
            image_to_json[img] = jpath or f"txt/{Path(img).stem}.json"

    txt_dir = data_dir / "txt"
    for img, jpath in image_to_json.items():
        full = data_dir / jpath
        if not full.exists():
            items.append(OCRItem(image=img))
            splits[0].add(img)
            continue
        try:
            d = json.loads(full.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            items.append(OCRItem(image=img))
            splits[0].add(img)
            continue
        item = OCRItem(image=img)
        # The OCR transcriptions can be in:
        #  - a flat list of dicts (PaddleOCR style)
        #  - a list of lists (groups of points)
        if isinstance(d, list):
            for entry in d:
                if isinstance(entry, dict):
                    text = entry.get("transcription", "")
                    pts = entry.get("points", [])
                elif isinstance(entry, list):
                    text = ""
                    pts = entry
                else:
                    continue
                item.transcriptions.append((text, pts))
        items.append(item)
        splits[0].add(img)
    return items, splits


def write(
    items: list[OCRItem],
    labels: list[Label],  # noqa: ARG001 - OCR has no labels
    export_dir: Path,
    *,
    image_root: Path | None = None,
    splits: dict[int, set[str]] | None = None,
):
    export_dir.mkdir(parents=True, exist_ok=True)
    img_dir = export_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    txt_dir = export_dir / "txt"
    txt_dir.mkdir(parents=True, exist_ok=True)

    label_lines: list[str] = []
    for item in items:
        out_data = []
        for text, pts in item.transcriptions:
            out_data.append({"transcription": text, "points": pts})
        out_path = txt_dir / f"{Path(item.image).stem}.json"
        out_path.write_text(json.dumps(out_data, ensure_ascii=False, indent=2), encoding="utf-8")
        label_lines.append(f"{item.image}\ttxt/{Path(item.image).stem}.json")
        if image_root is not None:
            src = image_root / item.image
            dst = img_dir / Path(item.image).name
            if src.exists() and not dst.exists():
                shutil.copy2(src, dst)
    write_lines(export_dir / "Label.txt", label_lines)
