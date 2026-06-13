"""Common helpers for reading/writing files."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from app.util.filesystem import IMAGE_EXTENSIONS


def read_lines(path: str | Path) -> list[str]:
    return [ln.strip() for ln in Path(path).read_text(encoding="utf-8").splitlines() if ln.strip()]


def write_lines(path: str | Path, lines: Iterable[str]) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")


def is_image(path: str | Path) -> bool:
    return Path(path).suffix.lower() in IMAGE_EXTENSIONS


def list_images(root: str | Path) -> list[str]:
    """Return image file paths (relative to root) under root, non-recursive."""
    root = Path(root)
    if not root.exists():
        return []
    out: list[str] = []
    for entry in sorted(root.iterdir()):
        if entry.is_file() and entry.suffix.lower() in IMAGE_EXTENSIONS:
            out.append(entry.name)
    return out


def list_images_recursive(root: str | Path) -> list[str]:
    """Return image file paths (relative to root) under root, recursive."""
    root = Path(root)
    if not root.exists():
        return []
    out: list[str] = []
    for entry in sorted(root.rglob("*")):
        if entry.is_file() and entry.suffix.lower() in IMAGE_EXTENSIONS:
            out.append(str(entry.relative_to(root)))
    return out


def safe_join(*parts: str | Path) -> Path:
    """Join and create parent dir."""
    p = Path(*parts)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p
