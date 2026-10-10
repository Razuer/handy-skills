#!/usr/bin/env python3
"""CadQuery idioms exercised by tests; outputs STEP and optional STL in millimeters.

Run: python scripts/cadquery_recipes.py --out-dir /tmp/cq-recipes
All geometry is built with CadQuery, not mesh booleans.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cadquery as cq


def mounting_plate() -> cq.Workplane:
    """Workplane stack, stable directional selectors, pushPoints, holes."""
    width, depth, thick = 80.0, 50.0, 5.0
    dx, dy = 32.0, 17.0
    return (
        cq.Workplane("XY")
        .box(width, depth, thick)
        .edges("|Z").fillet(3.0)
        .faces(">Z").workplane()
        .pushPoints([(-dx, -dy), (dx, -dy), (-dx, dy), (dx, dy)])
        .hole(4.4)
    )


def revolved_ring() -> cq.Workplane:
    """A profile in the XZ workplane, revolved around the global Z axis."""
    return (
        cq.Workplane("XZ")
        .moveTo(10, 0).lineTo(12, 0)
        .threePointArc((13.5, 2.0), (12, 4))
        .lineTo(10, 4).close()
        .revolve(360, (0, 0), (0, 1))
    )


def lofted_transition() -> cq.Workplane:
    """Multiple cross-sections in a single Workplane chain."""
    return (
        cq.Workplane("XY")
        .rect(30, 20)
        .workplane(offset=12).rect(25, 18)
        .workplane(offset=12).circle(9)
        .loft(combine=True)
    )


def swept_tube() -> cq.Workplane:
    """Sweep a closed profile along a wire. Wire and profile are distinct objects."""
    path = cq.Workplane("XZ").spline([(0, 0), (6, 8), (14, 12), (22, 5)]).wire()
    return cq.Workplane("XY").circle(2.0).sweep(path, isFrenet=True)


def shelled_enclosure() -> cq.Workplane:
    """Remove top face while creating a negative-thickness inward shell."""
    return (
        cq.Workplane("XY").box(50, 35, 24)
        .edges("|Z").fillet(3)
        .faces(">Z").shell(-2)
    )


def circular_pattern() -> cq.Workplane:
    """A polar pattern of through-holes created relative to a selected face."""
    return (
        cq.Workplane("XY").circle(30).extrude(4)
        .faces(">Z").workplane()
        .polarArray(23, 0, 360, 8).hole(4)
    )


RECIPES = {
    "mounting_plate": mounting_plate,
    "revolved_ring": revolved_ring,
    "lofted_transition": lofted_transition,
    "swept_tube": swept_tube,
    "shelled_enclosure": shelled_enclosure,
    "circular_pattern": circular_pattern,
}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out-dir", type=Path, default=Path("recipes-output"))
    p.add_argument("--only", choices=[*RECIPES, "all"], default="all")
    args = p.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    for name, fn in RECIPES.items():
        if args.only not in ("all", name):
            continue
        obj = fn()
        solids = obj.solids().vals()
        if len(solids) != 1 or not solids[0].isValid() or solids[0].Volume() <= 0:
            raise RuntimeError(f"{name}: expected one valid positive-volume solid")
        solid = solids[0]
        solid.exportStep(str(args.out_dir / f"{name}.step"))
        solid.exportStl(str(args.out_dir / f"{name}.stl"),
                        tolerance=0.05, angularTolerance=0.12, relative=False)
        bb = solid.BoundingBox()
        report[name] = {
            "volume_mm3": round(solid.Volume(), 5),
            "bbox_mm": [round(v, 5) for v in (bb.xlen, bb.ylen, bb.zlen)],
            "cad_valid": True,
        }
    (args.out_dir / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
