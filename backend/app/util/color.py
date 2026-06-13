"""Random color generator and color name <-> hex helpers."""

from __future__ import annotations

import colorsys
import hashlib
import random


NAME_TO_HEX = {
    "red": "#e74c3c",
    "blue": "#3498db",
    "green": "#2ecc71",
    "yellow": "#f1c40f",
    "purple": "#9b59b6",
    "orange": "#e67e22",
    "pink": "#ff7ab6",
    "cyan": "#1abc9c",
    "brown": "#8b4513",
    "black": "#000000",
    "white": "#ffffff",
    "gray": "#7f8c8d",
    "magenta": "#d63384",
    "lime": "#cddc39",
    "teal": "#008080",
    "navy": "#001f3f",
    "olive": "#808000",
    "maroon": "#800000",
}


def name_to_hex(name: str) -> str:
    return NAME_TO_HEX.get(name.lower(), "#" + hashlib.md5(name.encode()).hexdigest()[:6])


def rand_hex_color(exclude: Iterable[str] | None = None) -> str:
    exclude_set = {c.lower() for c in (exclude or [])}
    for _ in range(200):
        h = random.random()
        s = 0.6 + random.random() * 0.4
        v = 0.7 + random.random() * 0.3
        r, g, b = colorsys.hsv_to_rgb(h, s, v)
        hex_ = "#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255))
        if hex_.lower() not in exclude_set:
            return hex_
    return "#" + hashlib.md5(str(random.random()).encode()).hexdigest()[:6]


def rgb_to_hex(rgb: list[int] | tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)
