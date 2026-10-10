---
name: cadquery-modeling
description: Design, modify, debug, validate, visualize and export precise parametric 3D CAD with Python CadQuery and the OCCT B-Rep kernel. Use for CadQuery scripts, STEP/STL, 3D-printable mechanical parts, snap fits, rosettes, enclosures, assemblies, lofts, sweeps, fillets and multi-view visual review. Always verify actual CAD and render the exported geometry before claiming success.
license: MIT
compatibility: Python 3.10+ with CadQuery/OCP; optional Trimesh for STL audits, VTK/Pillow for headless rendering. The bundled examples and tests were exercised with CadQuery 2.8.0.
metadata:
  version: "2.0.0"
  focus: "CadQuery Python, OCCT, engineering geometry, visual verification"
---

# CadQuery modeling — reproducible CAD, not just runnable code

**Use CadQuery (`import cadquery as cq`) as the default and only geometry authoring backend of this skill.** Its scripted Python source is the parametric source of truth; STEP is B-Rep exchange geometry, STL a tessellated manufacturing derivative. Do not substitute mesh booleans for exact CAD without an explicit reason. The target is an inspected, valid and reproducible model, not just a Python process that exits successfully.

## Mandatory workflow

1. **Translate intent into a CAD brief.** Read `assets/design-brief.yaml`; define mm units, XYZ directions, datum/origin, overall envelope, mating dimensions and surfaces, visibility, materials, manufacturing process, number of *independent* parts, and expected assembly motion. Distinguish **radial clearance, diametral clearance, bilateral gap, and measurement tolerance**. Write formulas from nominal sizes. Define acceptance tests *before* code.
2. **Choose a CadQuery construction strategy.** Start with `cq.Workplane("XY")`; favor sketches+extrude/revolve and simple boolean features; select loft/sweep when shape requires it. Keep each printable component separate and in a common assembled coordinate system. Read [CadQuery fundamentals](references/cadquery-fundamentals.md), [API cookbook](references/cadquery-api-cookbook.md), and [modeling tactics](references/modeling.md).
3. **Implement small named features in Python.** Store all design parameters in a dataclass or a validated configuration. Use semantic helper functions (`make_housing`, `make_pin`, `make_lid`), no hidden global workplane state. Inspect `.solids().vals()`, `Shape.isValid()`, volumes, and bounds after risky operations. Protect selector cardinality before cuts/fillets. Do not depend on edge index after topology changes.
4. **Verify assembled geometry.** Check exact intended solid count; nonzero volume; B-Rep validity; hole sizes using surfaces/sections rather than just bounding boxes; assembled pairwise intersection volume; selected minimum distances/thicknesses if required. Check insertion route and retention analytically where possible. See [validation](references/validation.md) and [manufacturing](references/manufacturing.md).
5. **Export and round-trip.** Write original `.py`, metadata/parameter manifest, one `.step` per part, assembled STEP/`cq.Assembly` when appropriate, one STL per printable solid. Export using explicit mesh tolerances. Re-import STEP and inspect each STL with `scripts/audit.py`; don't validate only the pre-export model. See [assemblies and export](references/cadquery-assemblies-exports.md).
6. **Render exported STEP and actually LOOK.** The bundled renderer assumes an XY wall plane and +Z visible front; adapt camera vectors in `scripts/render.py` for a different intended front/up convention. Use `scripts/render.py` to generate top/front/back/right/bottom/isometric/exploded imagery. Inspect `contact_sheet.png` with vision, then open individual images at resolution. Inspect visible silhouette, transitions, seams, bores, mating features, interference, disconnected parts, orientation and cosmetics. When internals matter, add a true sectional CAD analysis or section render. Fix issues, re-export and re-render until checks pass. Rendering command success != human/agent visual review. See [visual QA](references/visual-qa.md).
7. **Manufacturing and delivery.** Inspect slicer layer preview when available; check process-specific wall thickness, fit, overhang and orientation, and make test coupons for critical interfaces. Bundle `.py`, STEP(s), STL(s), actual renders, QA results, assembly notes and assumptions. Distinguish **script executed / CAD valid / visually reviewed / physically tested**. Do not claim print-fit success without a real printed test.

## CadQuery essentials (mental model)

```python
import cadquery as cq

# All numeric lengths are model units: use mm by convention.
outer_d = 60.0
pipe_d = 18.0
radial_clearance = 0.1
bore_d = pipe_d + 2 * radial_clearance  # 18.2 mm

# Workplane = local coordinate frame + selection stack + history/context solid.
body = (cq.Workplane("XY")
        .circle(outer_d / 2).circle(bore_d / 2).extrude(4)
        .edges(">Z").fillet(0.8))

assert len(body.solids().vals()) == 1
assert body.val().isValid() and body.val().Volume() > 0
body.val().exportStep("rosette.step")
body.val().exportStl("rosette.stl", tolerance=0.035,
                     angularTolerance=0.12, relative=False)
```

- **`Workplane` vs `Shape`:** `Workplane` is a fluent, context-aware operation/selection stack; `.val()` picks one object, `.vals()` returns the selected stack. `cq.Shape` / `cq.Solid` exposes direct B-Rep methods. `.val()` may not mean the full assembly or all solids: assert count first.
- **Selection:** `.faces(">Z")`, `.edges("|Z")`, `.vertices(...)`, `.workplane()`. `>X/<X` means extreme in a direction, `|Z` parallel to Z, `#Z` perpendicular to Z; these are selectors, not stable face IDs. For intricate parts use geometric filtering plus expected selection counts. [selectors](references/cadquery-fundamentals.md#selectors-and-topological-stability)
- **Context solid:** `.extrude()` and `.hole()` usually combine/cut the current parent solid. Use `combine=False` or separate `cq.Workplane`/`cq.Solid` instances when a **separate part** is intended. Know when `.add()`, `.union()`, `.cut()`, `.intersect()` work on a selection or accumulated context. Never assume parts remain independent after chaining.
- **Profiles:** `.polyline(...).close().extrude()`, `.revolve()`, `.sweep()`, `.loft()`; split complicated parts into simple checked intermediate solids. Fillet/chamfer late or build bevel into a revolved profile when needed for stability.
- **Location and parts:** `cq.Location`, `.translate()`, `.rotate()` for posed solids; `cq.Assembly()` for names, colors, hierarchy and optional constraints/solver. Keep assembled and exploded poses distinct.

## Executable starter commands (from this skill directory)

```bash
python -c 'import cadquery as cq; print(cq.__version__)'
python scripts/cadquery_recipes.py --out-dir /tmp/cq-recipes
python scripts/example_rosette.py --out-dir /tmp/cq-rosette
python scripts/audit.py /tmp/cq-rosette/rosette_assembly.step --expected-solids 2 --check-intersections --json /tmp/cq-rosette/qa.json
python scripts/audit.py /tmp/cq-rosette/rosette_left.stl /tmp/cq-rosette/rosette_right.stl
python scripts/render.py /tmp/cq-rosette/rosette_left.step /tmp/cq-rosette/rosette_right.step --out-dir /tmp/cq-rosette/renders --explode 8
python scripts/smoke_test.py
```

**Open the generated `contact_sheet.png`; do not stop when the renderer prints `success`.** The rosette example has *passive registration pins*, NOT validated snap retention; see [worked example](references/examples.md).

## Fast reference routing

| You need to… | Read / run |
|---|---|
| Learn CadQuery's stack, axes, objects, selectors and idioms | [fundamentals](references/cadquery-fundamentals.md) |
| Copy correct sketches, holes, revolve, loft, sweep, shell, patterns | [API cookbook](references/cadquery-api-cookbook.md), `scripts/cadquery_recipes.py` |
| Build independent multi-part parts / export accurately | [assemblies & exports](references/cadquery-assemblies-exports.md) |
| Debug fillets, booleans, selector failures, slow builds | [debugging](references/cadquery-debugging.md) |
| Test CAD solids/meshes and collisions | [validation](references/validation.md), `scripts/audit.py` |
| Inspect real CAD with consistent images | [visual QA](references/visual-qa.md), `scripts/render.py` |
| Design FDM fit, wall thickness, snap/interlocking joints | [manufacturing](references/manufacturing.md) |
| Read primary sources, check version-sensitive behavior | [sources](references/sources.md) |

## Hard-stop conditions

- A fillet or boolean failed, a `Workplane` contains unexpected solids, geometry is invalid, or actual STEP/STL exports differ from expected → **fix before approval**.
- Only top view inspected, no back/inside view of hidden joint, or no image access → **mark visuals unverified**; do not assert the aesthetics are good.
- Geometry appears assembled in a pretty exploded render but mating clearances/insertion were never checked → **mark fit unverified**.
- Critical nominal clearance was guessed or an external component never measured → **state assumption and make a calibration/test coupon**.
- Any external editor or CAD service failed → **report accurately**, do not claim an Onshape/FreeCAD native document exists if only STEP was generated.
