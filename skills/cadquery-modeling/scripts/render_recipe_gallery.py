#!/usr/bin/env python3
"""Render an isometric six-model CadQuery gallery from *exported STEP*, no guessed images."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from render import load_models, render_one


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()
    steps = sorted(args.input_dir.glob("*.step"))
    if not steps:
        parser.error("No STEP files found")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    width, height, caption = 560, 450, 44
    rendered = []
    for file in steps:
        models = load_models([file])
        target = args.out_dir / f"{file.stem}.png"
        render_one(models, "iso", target, width, height, [np.zeros(3) for _ in models])
        rendered.append((file.stem, target))
    cols = 3
    rows = (len(rendered) + cols - 1) // cols
    gap = 12
    sheet = Image.new("RGB", (cols * (width + gap) + gap,
                              rows * (height + caption + gap) + gap), (16, 23, 32))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 24)
    except OSError:
        font = ImageFont.load_default()
    for i, (name, file) in enumerate(rendered):
        x = gap + (i % cols)*(width + gap)
        y = gap + (i // cols)*(height + caption + gap)
        with Image.open(file) as preview:
            sheet.paste(preview.convert("RGB"), (x, y))
        draw.text((x + 14, y + height + 8), name.replace("_", " "), font=font, fill=(226,238,247))
    sheet.save(args.out_dir / "recipe_gallery.png")
    (args.out_dir / "gallery_report.json").write_text(json.dumps({
        "source": "STEP imports", "models": [name for name, _ in rendered],
        "note": "Images generated; an agent/human must inspect them for visual acceptance"
    }, indent=2) + "\n")
    print(f"Wrote {len(rendered)} model views and recipe_gallery.png to {args.out_dir}")


if __name__ == "__main__":
    main()
