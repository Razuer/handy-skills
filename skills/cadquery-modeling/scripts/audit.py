#!/usr/bin/env python3
"""Report STEP B-Rep and/or STL mesh health; exit nonzero on observed failure.

Provides topology and export checks, not hole dimensions, wall-thickness,
mechanical strain, print accuracy, or guaranteed fit.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path


def report_step(path: Path) -> tuple[dict, list]:
    import cadquery as cq

    obj = cq.importers.importStep(str(path))
    bodies = obj.solids().vals()
    entry = {"file": str(path), "kind": "STEP", "solid_count": len(bodies), "solids": [],
             "errors": [], "warnings": []}
    if not bodies:
        entry["errors"].append("No solid bodies found")
    for index, shape in enumerate(bodies):
        box = shape.BoundingBox()
        rec = {"index": index, "valid_brep": bool(shape.isValid()),
               "volume_mm3": round(shape.Volume(), 5),
               "bbox_mm": [round(box.xlen, 5), round(box.ylen, 5), round(box.zlen, 5)]}
        if not rec["valid_brep"]:
            entry["errors"].append(f"Solid {index}: invalid B-Rep")
        if shape.Volume() <= 1.0e-8 or min(box.xlen, box.ylen, box.zlen) < 1.0e-6:
            entry["errors"].append(f"Solid {index}: degenerate volume or bounds")
        entry["solids"].append(rec)
    return entry, bodies


def report_stl(path: Path) -> dict:
    import trimesh

    loaded = trimesh.load(str(path), force="mesh", process=True)
    entry = {"file": str(path), "kind": "STL", "errors": [], "warnings": []}
    if not isinstance(loaded, trimesh.Trimesh) or loaded.is_empty:
        entry["errors"].append("No nonempty triangular mesh found")
        return entry
    bounds = loaded.bounds[1] - loaded.bounds[0]
    components = loaded.split(only_watertight=False)
    entry.update(vertices=int(len(loaded.vertices)), faces=int(len(loaded.faces)),
                 watertight=bool(loaded.is_watertight),
                 winding_consistent=bool(loaded.is_winding_consistent),
                 is_volume=bool(loaded.is_volume),
                 connected_components=len(components),
                 signed_volume_mm3=round(float(loaded.volume), 5),
                 bbox_mm=[round(float(v), 5) for v in bounds])
    for key in ("watertight", "winding_consistent", "is_volume"):
        if not entry[key]:
            entry["errors"].append(f"Mesh not {key}")
    if len(components) != 1:
        entry["warnings"].append(f"STL has {len(components)} connected pieces; verify intentional")
    if not math.isfinite(loaded.volume) or loaded.volume <= 0:
        entry["errors"].append("Nonpositive/invalid mesh volume")
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", type=Path, nargs="+", help=".step/.stp/.stl files")
    parser.add_argument("--expected-solids", type=int,
                        help="expected total STEP solid count across specified STEP files")
    parser.add_argument("--check-intersections", action="store_true",
                        help="detect B-Rep volume overlap in all STEP solids (assembled pose)")
    parser.add_argument("--collision-volume-mm3", type=float, default=1e-5,
                        help="numeric noise threshold for non-interfering assemblies")
    parser.add_argument("--max-volume-error-fraction", type=float, default=0.015,
                        help="max relative STL-vs-STEP volume difference for matching stems")
    parser.add_argument("--max-bbox-error-mm", type=float, default=0.25,
                        help="max STL-vs-STEP bounding size discrepancy in mm for matching stems")
    parser.add_argument("--json", type=Path, dest="json_path")
    args = parser.parse_args()
    results = {"units": "mm for STEP import and STL by project convention",
               "checks": [], "errors": [], "warnings": [],
               "limitations": "No local wall thickness, interface fit, path simulation, or print test"}
    solids = []
    for path in args.files:
        if not path.is_file():
            results["errors"].append(f"File missing: {path}")
            continue
        try:
            if path.suffix.lower() in (".stp", ".step"):
                check, bodies = report_step(path)
                solids.extend((path.name, i, shape) for i, shape in enumerate(bodies))
            elif path.suffix.lower() == ".stl":
                check = report_stl(path)
            else:
                results["errors"].append(f"Unsupported file extension: {path}")
                continue
            results["checks"].append(check)
            results["errors"].extend(f"{path.name}: {e}" for e in check["errors"])
            results["warnings"].extend(f"{path.name}: {e}" for e in check["warnings"])
        except Exception as exc:
            results["errors"].append(f"{path.name}: audit failed: {type(exc).__name__}: {exc}")
    # Compare independently re-imported STL and STEP with identical file stems.
    by_stem = {}
    for check in results["checks"]:
        stem = Path(check["file"]).stem
        by_stem.setdefault(stem, {})[check["kind"]] = check
    results["step_stl_comparisons"] = []
    for stem, pair in by_stem.items():
        if "STEP" not in pair or "STL" not in pair:
            continue
        step, stl = pair["STEP"], pair["STL"]
        if len(step["solids"]) != 1 or "signed_volume_mm3" not in stl:
            results["warnings"].append(f"{stem}: comparison requires one STEP solid and one nonempty STL")
            continue
        brep = step["solids"][0]
        sv, mv = brep["volume_mm3"], stl["signed_volume_mm3"]
        fraction = abs(sv - mv) / sv if sv > 0 else float("inf")
        bbox_delta = max(abs(x - y) for x, y in zip(brep["bbox_mm"], stl["bbox_mm"]))
        results["step_stl_comparisons"].append({
            "stem": stem, "relative_volume_error": round(fraction, 7),
            "max_bbox_delta_mm": round(bbox_delta, 5),
        })
        if fraction > args.max_volume_error_fraction:
            results["errors"].append(f"{stem}: STEP/STL relative volume difference {fraction:.2%} exceeds limit")
        if bbox_delta > args.max_bbox_error_mm:
            results["errors"].append(f"{stem}: STEP/STL bbox delta {bbox_delta:.4f} mm exceeds limit")

    if args.expected_solids is not None and len(solids) != args.expected_solids:
        results["errors"].append(f"Expected {args.expected_solids} STEP solids; found {len(solids)}")
    if args.check_intersections:
        results["pair_intersection_mm3"] = []
        for i in range(len(solids)):
            for j in range(i + 1, len(solids)):
                name1, n1, a = solids[i]
                name2, n2, b = solids[j]
                if name1 == name2 and n1 == n2:
                    continue
                ab, bb = a.BoundingBox(), b.BoundingBox()
                if any((getattr(ab, k+"max") < getattr(bb,k+"min") or
                        getattr(bb,k+"max") < getattr(ab,k+"min"))
                       for k in ("x", "y", "z")):
                    v = 0.0
                else:
                    try:
                        v = a.intersect(b).Volume()
                    except Exception as exc:
                        results["errors"].append(f"Intersection calculation failed for {name1}/{name2}: {exc}")
                        continue
                pair = {"a": f"{name1}:{n1}", "b": f"{name2}:{n2}",
                        "intersection_volume_mm3": round(v, 7)}
                results["pair_intersection_mm3"].append(pair)
                if v > args.collision_volume_mm3:
                    results["errors"].append(f"Overlapping solids: {pair['a']} and {pair['b']} = {v:.6g} mm3")
    results["status"] = "FAIL" if results["errors"] else "PASS_WITH_WARNINGS" if results["warnings"] else "PASS"
    output = json.dumps(results, indent=2)
    print(output)
    if args.json_path:
        args.json_path.parent.mkdir(parents=True, exist_ok=True)
        args.json_path.write_text(output + "\n", encoding="utf-8")
    return 1 if results["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
