#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy>=1.26", "trimesh>=4.4", "scipy>=1.11"]
# ///
"""Audit meshes and prepare a flat plate from an explicit millimetre manifest."""
import argparse
import json
import math
import re
from pathlib import Path

import numpy as np
import trimesh


def number(value, label, minimum=0, inclusive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label}: expected a number")
    if not math.isfinite(value) or value < minimum:
        raise ValueError(f"{label}: invalid number")
    if not inclusive and value == minimum:
        raise ValueError(f"{label}: must exceed {minimum}")
    return float(value)


def vector(value, label, length, minimum=0, inclusive=False):
    if not isinstance(value, list) or len(value) != length:
        raise ValueError(f"{label}: expected {length} numbers")
    return [number(v, label, minimum, inclusive) for v in value]


def validate_part(part, base):
    if not isinstance(part, dict):
        raise ValueError("Each part must be an object")
    name = part["name"]
    if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", name):
        raise ValueError("Part names must be lowercase filename-safe identifiers")
    if name == "all-parts-flat":
        raise ValueError("all-parts-flat is a reserved part name")
    for key in ("quantity", "expected_solids"):
        value = part.get(key, 1)
        if type(value) is not int or not 1 <= value <= 1000:
            raise ValueError(f"{name}.{key}: expected an integer from 1 to 1000")
        part[key] = value
    part["rotation_deg"] = vector(
        part["rotation_deg"], f"{name}.rotation_deg", 3, -1e9, True
    )
    if "expected_volume_mm3" in part:
        number(part["expected_volume_mm3"], f"{name}.expected_volume_mm3")
    part["input"] = (base / part["input"]).resolve(strict=True)
    if not part["input"].is_file():
        raise ValueError(f"{name}: input must be a file")
    return part


def validate_header(data):
    if not isinstance(data, dict):
        raise ValueError("Manifest must be an object")
    if type(data.get("version")) is not int or data.get("version") != 1 or data.get("units") != "mm":
        raise ValueError('Manifest requires version: 1 and units: "mm"')


def validate_layout(data):
    data["bed_mm"] = vector(data["bed_mm"], "bed_mm", 2)
    data["gap_mm"] = number(data.get("gap_mm", 5), "gap_mm")
    data["margin_mm"] = number(data.get("margin_mm", 5), "margin_mm", inclusive=True)
    data["volume_tolerance_percent"] = number(
        data.get("volume_tolerance_percent", 0.05), "volume_tolerance_percent",
        inclusive=True,
    )
    if any(2 * data["margin_mm"] >= side for side in data["bed_mm"]):
        raise ValueError("Margins consume the whole bed")


def load_manifest(path):
    data = json.loads(path.read_text())
    validate_header(data)
    validate_layout(data)
    parts = data["parts"]
    if not isinstance(parts, list) or not parts:
        raise ValueError("parts must be a nonempty list")
    data["parts"] = [validate_part(p, path.parent) for p in parts]
    if len({p["name"] for p in parts}) != len(parts):
        raise ValueError("Part names must be unique")
    return data


def audit_mesh(part, tolerance):
    mesh = trimesh.load_mesh(part["input"])
    if not isinstance(mesh, trimesh.Trimesh) or mesh.is_empty:
        raise ValueError(f"{part['name']}: expected a nonempty triangle mesh")
    if not np.isfinite(mesh.vertices).all():
        raise ValueError(f"{part['name']}: nonfinite vertices")
    components = mesh.split(only_watertight=False, repair=False)
    solids = len(components)
    checks = {
        "watertight": bool(mesh.is_watertight),
        "consistent_winding": bool(mesh.is_winding_consistent),
        "positive_volume": all(component.volume > 0 for component in components),
        "expected_solids": solids == part["expected_solids"],
        "nondegenerate_faces": bool((mesh.area_faces > 0).all()),
    }
    discrepancy = None
    expected = part.get("expected_volume_mm3")
    if expected is not None:
        discrepancy = abs(float(mesh.volume) - expected) / expected * 100
        checks["volume_agreement"] = discrepancy <= tolerance
    rotation = np.radians(part["rotation_deg"])
    mesh.apply_transform(trimesh.transformations.euler_matrix(*rotation, axes="sxyz"))
    mesh.apply_translation(-mesh.bounds[0])
    report = {
        "name": part["name"], "input": str(part["input"]),
        "quantity": part["quantity"], "rotation_deg": part["rotation_deg"],
        "checks": checks, "connected_solids": solids,
        "volume_mm3": float(mesh.volume), "expected_volume_mm3": expected,
        "volume_discrepancy_percent": discrepancy,
        "volume_comparison": "UNVERIFIED" if expected is None else "CHECKED",
        "size_mm": mesh.extents.tolist(), "status": "PASS" if all(checks.values()) else "FAIL",
    }
    return mesh, report


def arrange_plate(parts, meshes, bed, gap, margin):
    """Conservative shelf packing, no automatic rotation or support inference."""
    placed, placements = [], []
    x = y = margin
    row_height = 0
    for part in parts:
        mesh = meshes[part["name"]]
        width, height = mesh.extents[:2]
        if width > bed[0] - 2 * margin or height > bed[1] - 2 * margin:
            raise ValueError(f"{part['name']}: part exceeds usable bed")
        for copy in range(part["quantity"]):
            if x + width > bed[0] - margin + 1e-8:
                x, y, row_height = margin, y + row_height + gap, 0
            if y + height > bed[1] - margin + 1e-8:
                raise ValueError("Shelf layout exceeds bed; enlarge bed or split the manifest")
            instance = mesh.copy()
            instance.apply_translation([x, y, 0])
            placed.append(instance)
            placements.append({"part": part["name"], "copy": copy + 1, "origin_mm": [x, y, 0]})
            x += width + gap
            row_height = max(row_height, height)
    return trimesh.util.concatenate(placed), placements


def output_paths(out, parts):
    return [out / f"{p['name']}.stl" for p in parts] + [
        out / "all-parts-flat.stl", out / "report.json"
    ]


def protect_outputs(paths, protected, overwrite):
    for path in paths:
        if points_to_source(path, protected):
            raise ValueError(f"Refusing to overwrite source: {path}")
        if path.is_symlink():
            raise ValueError(f"Refusing output symlink: {path}")
        if path.exists() and not overwrite:
            raise ValueError(f"Output exists (use --overwrite deliberately): {path}")
        if path.exists() and not path.is_file():
            raise ValueError(f"Output is not a regular file: {path}")


def points_to_source(path, protected):
    if path.resolve() in protected:
        return True
    return path.exists() and any(path.samefile(source) for source in protected)


def write_file(path, content, overwrite):
    with path.open("wb" if overwrite else "xb") as handle:
        handle.write(content)


def prepare(manifest, out, overwrite=False):
    manifest, out = Path(manifest).resolve(), Path(out).resolve()
    data = load_manifest(manifest)
    paths = output_paths(out, data["parts"])
    protected = {manifest, *(p["input"] for p in data["parts"])}
    protect_outputs(paths, protected, overwrite)
    meshes, reports = {}, []
    for part in data["parts"]:
        mesh, report = audit_mesh(part, data["volume_tolerance_percent"])
        meshes[part["name"]] = mesh
        reports.append(report)
    report = {
        "version": 1, "units": "mm", "parts": reports,
        "mesh_status": "PASS" if all(p["status"] == "PASS" for p in reports) else "FAIL",
        "manufacturing_status": "UNVERIFIED",
        "limitations": "No self-intersection, support, strength, fit, slicer, or physical-print validation. Orientation is user-specified.",
        "bed_mm": data["bed_mm"], "gap_mm": data["gap_mm"],
        "margin_mm": data["margin_mm"],
        "volume_tolerance_percent": data["volume_tolerance_percent"],
    }
    if report["mesh_status"] == "PASS":
        plate, placements = arrange_plate(
            data["parts"], meshes, data["bed_mm"], data["gap_mm"], data["margin_mm"]
        )
        report["placements"] = placements
        report["plate_size_mm"] = plate.extents.tolist()
        report["plate_expected_solids"] = sum(p["quantity"] * p["expected_solids"] for p in data["parts"])
        out.mkdir(parents=True, exist_ok=True)
        for name, mesh in meshes.items():
            write_file(out / f"{name}.stl", mesh.export(file_type="stl"), overwrite)
        write_file(out / "all-parts-flat.stl", plate.export(file_type="stl"), overwrite)
    out.mkdir(parents=True, exist_ok=True)
    write_file(out / "report.json", (json.dumps(report, indent=2) + "\n").encode(), overwrite)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--overwrite", action="store_true", help="Replace named outputs, never sources")
    args = parser.parse_args()
    try:
        report = prepare(args.manifest, args.out, args.overwrite)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(2, f"error: {error}\n")
    print(f"Mesh checks: {report['mesh_status']}; manufacturing: UNVERIFIED")
    print(f"Report: {args.out / 'report.json'}")
    return 0 if report["mesh_status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
