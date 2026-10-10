# CadQuery assemblies, transformations, and STEP/STL exchange

## Keeping solids separate

For functional multipart construction, create **one variable per part** and generate them in a **shared assembled coordinate system**. Never fuse parts merely to make a pretty render. Assembly constraints and locations are useful, but explicit positions often make script-generated engineering parts simpler to validate.

```python
import cadquery as cq
base = cq.Workplane("XY").box(30, 20, 3)
lid = cq.Workplane("XY").box(30, 20, 2).translate((0, 0, 2.5))
# They meet at Z=1.5; validate true interface and final intended pose.
assy = cq.Assembly(name="two_piece_demo")
assy.add(base, name="base", color=cq.Color("gray"))
assy.add(lid, name="lid", color=cq.Color("orange"))
assy.export("demo_assembly.step")
```

The `Assembly` class supports named parts, colors, nested assemblies, `loc=cq.Location(...)`, and constraint-based placement with `.constrain(...).solve()`. Use constraints when parameter changes should drive pose; pay attention to under-constrained and over-constrained solutions and verify final coordinates, because the optimizer can move initial locations. Common constraint kinds include `Fixed`, `Point`, `Axis`, and `Plane`. See https://cadquery.readthedocs.io/en/latest/assy.html.

## Local assembly poses vs exploded render

- **Assembly pose:** the actual intended geometry at exact locations; run interference/clearance checks here.
- **Exploded pose:** visualization-only displacements for part identity; NEVER substitute this for fit tests.
- **Print pose:** orientation used for tessellation/printing; can be different, but document transforms. Export an STL for each printable part, not a combined STL with multiple separate floating shells unless requested.

## Export recommendations

```python
solid = base.solids().val()
solid.exportStep("base.step")  # analytic B-Rep surfaces
solid.exportStl("base.stl", tolerance=0.035,
                angularTolerance=0.12, relative=False)
# or Workplane.export('base.step')
```

- CadQuery typically interprets numerical lengths in millimeters by **model convention**; STEP exporters have explicit `unit` and `outputUnit` options in current releases. Avoid silently converting twice. Confirm imported part bounds, metadata/unit semantics and interface dimensions.
- `tolerance` on `Shape.exportStl` is **linear mesh deflection**, not mechanical clearance. `angularTolerance` controls angular segmentation. `relative=False` ensures absolute linear deflection in model units instead of scaling by local edges. Choose according to smallest curvature/visible radius and compare STEP vs STL after export. 0.035 mm is an **example meshing deflection**, not a universally correct setting.
- Use separate STEP/STL per physical part; optional `cq.Assembly.export` for named/color STEP. Use `cq.Compound.makeCompound([part_a, part_b])` for a simple 2-solid STEP where assembly names are not required.
- STEP typically preserves accurate B-Rep geometry and may carry assembly names/colors, but **not CadQuery's Python-level parametric feature history**. The `.py` script, parameter manifest, and documented environment are necessary for reproducible design changes.
- STL is a mesh, not B-Rep. It normally carries no meaningful units/feature tree. Re-import it with a clear mm convention; don't mistake small tessellation error for a part tolerance.
- CQ also supports DXF, SVG, AMF, 3MF and glTF workflows; check current exporter capabilities before using them. STEP + per-part STL covers most mechanical/model-printing tasks.

## Roundtrip and acceptance

```bash
python scripts/audit.py assembled.step --expected-solids 2 --check-intersections --json qa_step.json
python scripts/audit.py base.step base.stl --json qa_base.json
python scripts/render.py base.step lid.step --out-dir renders --explode 8
```

The audit can recognize matching STEP/STL stems and compare bounds/volume, but **only** with matching filenames. It does not prove clearance or wall thickness. Its pairwise common-volume threshold is *numeric noise* and must not be interpreted as a fit allowance. Before claiming assembly fit, check critical gap in common coordinates, motion, potential thin bridges and collisions along installation path.

Primary source: https://cadquery.readthedocs.io/en/latest/importexport.html and https://cadquery.readthedocs.io/en/latest/assy.html.
