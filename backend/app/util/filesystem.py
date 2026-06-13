"""File / path utility helpers."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp", ".gif",
}


def expand_home(path: str) -> str:
    if path.startswith("~"):
        return str(Path(path).expanduser())
    return path


def listdir(path: str | Path, *, include_postfix: set[str] | None = None,
            exclude_prefix: tuple[str, ...] = (".",)) -> list[str]:
    p = Path(path)
    if not p.exists():
        return []
    out = []
    for entry in sorted(p.rglob("*")):
        if not entry.is_file():
            continue
        name = entry.name
        if any(name.startswith(pre) for pre in exclude_prefix):
            continue
        if include_postfix is not None and entry.suffix.lower() not in include_postfix:
            continue
        out.append(str(entry.relative_to(p)))
    return out


def listdir_top(path: str | Path, *, include_postfix: set[str] | None = None,
                exclude_prefix: tuple[str, ...] = (".",)) -> list[str]:
    """Non-recursive listing."""
    p = Path(path)
    if not p.exists():
        return []
    out = []
    for entry in sorted(p.iterdir()):
        if not entry.is_file():
            continue
        name = entry.name
        if any(name.startswith(pre) for pre in exclude_prefix):
            continue
        if include_postfix is not None and entry.suffix.lower() not in include_postfix:
            continue
        out.append(name)
    return out


def create_dir(path: str | Path) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def remove_dir(path: str | Path) -> None:
    p = Path(path)
    if p.exists():
        shutil.rmtree(p, ignore_errors=True)


def copy(src: str | Path, dst: str | Path, *, make_dir: bool = False) -> None:
    src, dst = Path(src), Path(dst)
    if make_dir:
        dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def write_warning(path: str | Path) -> None:
    p = Path(path) / "paddlelabel.warning"
    if not p.exists():
        p.write_text(
            "PP Label is using files stored under this folder!\n"
            "Changing file in this folder may cause issues."
        )


def remove_warning(path: str | Path) -> None:
    p = Path(path) / "paddlelabel.warning"
    if p.exists():
        p.unlink()


def is_image(path: str | Path) -> bool:
    return Path(path).suffix.lower() in IMAGE_EXTENSIONS
