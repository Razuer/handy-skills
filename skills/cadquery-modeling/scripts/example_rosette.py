#!/usr/bin/env python3
"""A parametric, two-solid demonstration model with separate STEP and STL parts.

Registration pins are intentionally NOT snap-fits. Values are millimeters.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import cadquery as cq


@dataclass(frozen=True)
class Params:
    outer_diameter_mm: float = 60.0
    pipe_diameter_mm: float = 18.0
    radial_clearance_mm: float = 0.1
    thickness_mm: float = 4.0
    front_fillet_mm: float = 0.8
    seam_width_mm: float = 0.2
    alignment_pin_radius_mm: float = 0.9
    pin_radial_clearance_mm: float = 0.15
    pin_protrusion_mm: float = 2.6
    hole_depth_mm: float = 3.2
    pin_y_offset_mm: float = 20.0


def make_parts(p: Params) -> tuple[cq.Shape, cq.Shape]:
    radius = p.outer_diameter_mm / 2.0
    bore_radius = p.pipe_diameter_mm / 2.0 + p.radial_clearance_mm
    ring = (cq.Workplane("XY").circle(radius).circle(bore_radius)
            .extrude(p.thickness_mm))
    # First round the visible, upward-facing annular edges; then split the shell.
    ring = ring.edges(">Z").fillet(p.front_fillet_mm)
    half_gap = p.seam_width_mm / 2.0
    # Boxes are deliberately larger than the part; intersections yield exact halves.
    left_box = (cq.Workplane("XY")
                .box(100, 100, 20, centered=(True, True, True))
                .translate((-50 - half_gap, 0, p.thickness_mm / 2)))
    right_box = (cq.Workplane("XY")
                 .box(100, 100, 20, centered=(True, True, True))
                 .translate((50 + half_gap, 0, p.thickness_mm / 2)))
    left = ring.intersect(left_box)
    right = ring.intersect(right_box)

    for y in (-p.pin_y_offset_mm, p.pin_y_offset_mm):
        pin = cq.Solid.makeCylinder(
            p.alignment_pin_radius_mm, 3 + p.pin_protrusion_mm,
            cq.Vector(-3 - half_gap, y, p.thickness_mm / 2),
            cq.Vector(1, 0, 0),
        )
        pocket = cq.Solid.makeCylinder(
            p.alignment_pin_radius_mm + p.pin_radial_clearance_mm,
            p.hole_depth_mm + 0.35,
            cq.Vector(-0.25, y, p.thickness_mm / 2),
            cq.Vector(1, 0, 0),
        )
        left = left.union(pin)
        right = right.cut(pocket)

    a, b = left.val(), right.val()
    for name, shape in (("left", a), ("right", b)):
        if not shape.isValid() or len(shape.Solids()) != 1 or shape.Volume() <= 0:
            raise RuntimeError(f"Invalid or disconnected {name} solid")
    if a.intersect(b).Volume() > 1.0e-5:
        raise RuntimeError("Left/right parts overlap in assembled coordinates")
    return a, b


def export_parts(out_dir: Path, p: Params) -> None:
    a, b = make_parts(p)
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, shape in (("rosette_left", a), ("rosette_right", b)):
        shape.exportStep(str(out_dir / f"{name}.step"))
        # Use ABSOLUTE linear deflection to avoid size-scaled faceting.
        shape.exportStl(str(out_dir / f"{name}.stl"), tolerance=0.035,
                        angularTolerance=0.12, relative=False)
    assembly = cq.Compound.makeCompound([a, b])
    assembly.exportStep(str(out_dir / "rosette_assembly.step"))
    bbox = assembly.BoundingBox()
    manifest = {
        "units": "mm", "coordinate_frame": "XY wall plane, +Z front visible",
        "parameters": asdict(p),
        "derived": {"nominal_bore_diameter_mm": p.pipe_diameter_mm + 2 * p.radial_clearance_mm},
        "parts": ["rosette_left", "rosette_right"],
        "expected_independent_solids": 2,
        "assembly_bbox_mm": [round(bbox.xlen, 5), round(bbox.ylen, 5), round(bbox.zlen, 5)],
        "known_limitations": ["Alignment keys do not provide verified snap retention",
                               "Clearances not physically print-tested"],
    }
    (out_dir / "design.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(out_dir), "design": manifest}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", type=Path, default=Path("example-output"))
    parser.add_argument("--seam-width", type=float, default=0.2,
                        help="total XY gap between two halves, mm")
    args = parser.parse_args()
    if not 0.05 <= args.seam_width <= 1.5:
        parser.error("--seam-width should be in [0.05, 1.5] mm")
    export_parts(args.out_dir, Params(seam_width_mm=args.seam_width))


if __name__ == "__main__":
    main()
