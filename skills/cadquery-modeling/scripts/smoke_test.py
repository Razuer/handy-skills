#!/usr/bin/env python3
"""End-to-end checks, including negative controls for corrupted STL and collisions."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run(*args: str, succeeds: bool = True) -> subprocess.CompletedProcess:
    process = subprocess.run([sys.executable, *args], text=True,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if (process.returncode == 0) != succeeds:
        raise AssertionError(f"Command unexpected result ({process.returncode}): {args}\n"
                             f"stdout: {process.stdout[-1600:]}\nstderr: {process.stderr[-1600:]}")
    return process


def main() -> None:
    import cadquery as cq
    import trimesh
    from OCP.BRepAdaptor import BRepAdaptor_Surface

    with tempfile.TemporaryDirectory(prefix="cad-skill-qa-") as tmp:
        path = Path(tmp)
        run(str(ROOT / "example_rosette.py"), "--out-dir", str(path))
        manifest = json.loads((path / "design.json").read_text())
        assert manifest["derived"]["nominal_bore_diameter_mm"] == 18.2

        step = path / "rosette_assembly.step"
        a_step, b_step = path / "rosette_left.step", path / "rosette_right.step"
        result = run(str(ROOT / "audit.py"), str(step), "--expected-solids", "2",
                     "--check-intersections", "--json", str(path / "qa.json"))
        report = json.loads(result.stdout)
        assert report["status"] == "PASS"
        assert len(report["pair_intersection_mm3"]) == 1
        assert report["pair_intersection_mm3"][0]["intersection_volume_mm3"] == 0.0

        for one_step in (a_step, b_step):
            solid = cq.importers.importStep(str(one_step)).solids().val()
            cylinder_radii = [BRepAdaptor_Surface(face.wrapped).Cylinder().Radius()
                              for face in solid.Faces() if face.geomType() == "CYLINDER"]
            assert any(abs(r - 9.1) < 1e-6 for r in cylinder_radii), cylinder_radii
            assert solid.isValid()
            stl = one_step.with_suffix(".stl")
            m = trimesh.load_mesh(stl)
            assert m.is_volume and m.is_watertight
            relative_error = abs(m.volume - solid.Volume()) / solid.Volume()
            assert relative_error < 0.01, relative_error
            # Geometry volume and mesh volume agree within tessellation error.

        run(str(ROOT / "audit.py"), str(path / "rosette_left.stl"),
            str(path / "rosette_right.stl"))

        # CadQuery API cookbook: generate every recipe, re-import each STEP,
        # and audit the matching tessellated printable STL.
        recipe_dir = path / "recipes"
        run(str(ROOT / "cadquery_recipes.py"), "--out-dir", str(recipe_dir))
        manifest_recipes = json.loads((recipe_dir / "manifest.json").read_text())
        assert len(manifest_recipes) == 6, manifest_recipes
        for name in manifest_recipes:
            sfile = recipe_dir / (name + ".step")
            tfile = recipe_dir / (name + ".stl")
            shape = cq.importers.importStep(str(sfile)).solids().val()
            assert shape.isValid() and shape.Volume() > 0
            audit = json.loads(run(str(ROOT / "audit.py"), str(sfile), str(tfile)).stdout)
            assert audit["status"] == "PASS", (name, audit)
        assert len(cq.importers.importStep(str(recipe_dir / "mounting_plate.step")).solids().vals()) == 1
        # A hole(d=4.4) has radius 2.2 mm, unlike circle(r=...) API.
        plated = cq.importers.importStep(str(recipe_dir / "mounting_plate.step")).solids().val()
        mount_radii = [BRepAdaptor_Surface(face.wrapped).Cylinder().Radius()
                       for face in plated.Faces() if face.geomType() == "CYLINDER"]
        assert sum(abs(r-2.2) < 1e-5 for r in mount_radii) == 4, mount_radii

        # Negative control 1: make a mesh non-watertight by deleting one triangle.
        mesh = trimesh.load_mesh(str(path / "rosette_left.stl"))
        broken = trimesh.Trimesh(vertices=mesh.vertices, faces=mesh.faces[:-1], process=False)
        broken.export(path / "broken.stl")
        out = run(str(ROOT / "audit.py"), str(path / "broken.stl"), succeeds=False)
        assert "Mesh not watertight" in out.stdout

        # Negative control 2: overlap independent B-Rep boxes: collision audit must fail.
        x = cq.Workplane("XY").box(10, 10, 10).val()
        y = cq.Workplane("XY").box(10, 10, 10).translate((5, 0, 0)).val()
        compound = cq.Compound.makeCompound([x, y])
        colliding = path / "overlap.step"
        compound.exportStep(str(colliding))
        out = run(str(ROOT / "audit.py"), str(colliding),
                  "--check-intersections", succeeds=False)
        assert "Overlapping solids" in out.stdout

        # The rasterized contact sheet is checked for nontrivial pixel variation.
        renders = path / "renders"
        run(str(ROOT / "render.py"), str(a_step), str(b_step),
            "--out-dir", str(renders), "--explode", "8", "--width", "600", "--height", "480")
        from PIL import Image, ImageStat
        files = list(renders.glob("*.png"))
        assert len(files) == 8, files
        with Image.open(renders / "front.png") as im:
            stat = ImageStat.Stat(im.convert("RGB"))
            assert max(stat.stddev) > 15, stat.stddev
        print(json.dumps({
            "status": "PASS", "positive": ["two STEP solids", "zero B-Rep intersection",
                "bore radius 9.1 mm from imported STEP surfaces", "STL watertight and volume",
                "STEP/STL volume delta < 1%", "7 camera views + contact sheet",
                "6 tested CadQuery recipes and their STEP/STL exports", "4 mounting holes of radius 2.2 mm"],
            "negative": ["missing STL triangle detected", "overlapping B-Reps detected"],
        }, indent=2))


if __name__ == "__main__":
    main()
