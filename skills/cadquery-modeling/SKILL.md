---
name: cadquery-modeling
description: CadQuery-first engineering of parametric 3D models and FDM parts. Use for CAD construction, reverse engineering imported STEP assemblies, printable mechanisms, enclosures, fits, assembly motion, STEP/STL round-trip audits, slicer checks, automated renders and evidence-based engineering reviews.
license: MIT
compatibility: Python with available CadQuery/OCP wheels; Trimesh, VTK, Pillow, NumPy for audits/rendering. Try scripts/env_check.py before any modeling.
metadata:
  version: "2.1.0"
  focus: "CadQuery Python + OCCT, engineering evidence, assembly and FDM-first validation"
---

# CadQuery modeling — engineering before and after CAD

**Use CadQuery (`import cadquery as cq`) as the geometry-authoring backend.** The editable `.py` with explicit parameters is the model's source of truth. STEP is exact boundary representation (B-Rep); STL is a tessellated manufacturing export, not original CAD. Tool execution, solid validity and a beautiful render are separate milestones, **not product-readiness evidence**.

## Mandatory phase-gated workflow

1. **Define the physical task and evidence before modeling.** Copy `assets/design-brief.yaml` and `assets/project-manifest.json`. Define global assembly XYZ, component origin/datum, dimensions and units, loads, relevant reference geometry, materials, mechanical function, assembly motion, acceptance limits, and manufacturing process. Make every important requirement traceable to an actual check/evidence. Distinguish radial vs diametral clearances and CAD dimensions vs FDM fit. Read [engineering validation](references/engineering-validation.md).
2. **Select a build orientation for EVERY printed component now**, before placing bosses, tabs, fillets, or lugs. Consider first-layer contact, unsupported geometry, strength anisotropy, surface cosmetics, tolerances, and accessible support removal. Specify an assembly-to-print pose transform. Reject obvious underside obstacles; redesign before adding supports when function permits. See [FDM-first](references/fdm-first.md).
3. **Inspect incoming CAD references.** For imported STEP, run `scripts/step_inspect.py` and create labeled reference renders. Preserve its source coordinate frame, classify cylindrical faces and mounting planes cautiously, and measure real interfaces. Do not assume a candidate cylindrical surface is a screw hole. See [STEP reverse engineering](references/imported-step.md).
4. **Model with CadQuery in small semantic operations.** Parameterize dimensions; choose sketches/extrude/revolve, loft/sweep when justified; keep independent printable components independent. Prefer feature-level helpers (e.g. `make_mounting_plate`). Check `Shape.isValid()`, `.Volume()`, `.solids()` and bounds after risky topology operations. Stabilize selections by geometrical invariants, not by fragile face/edge indices. See [fundamentals](references/cadquery-fundamentals.md), [API cookbook](references/cadquery-api-cookbook.md), [debugging](references/cadquery-debugging.md).
5. **Verify assembly mechanics and function.** Use *global assembly-pose STEP solids* for B-Rep collision checks. Evaluate minimum gaps and actual insertion paths, fastener/tool access, cable routing, retention, articulated states, and required service behavior. For ducts inspect aim, channels and area; do NOT claim optimized flow without CFD/measurements. `scripts/engineering_checks.py` implements selected measurable checks, but finite path samples do not prove continuous motion. See [engineering validation](references/engineering-validation.md).
6. **Export paired geometry in distinct frames.** For each part, export exactly one manufacturing-pose STEP and matching-stem STL using selected mesh deflection. Separately export one *global-pose* STEP per component (and optionally a named `cq.Assembly` STEP). Record pose transforms; the STL print bed is `min Z`. Import and validate the **exports**, not just the source objects. See [assemblies/exports](references/cadquery-assemblies-exports.md).
7. **Run the SINGLE project validation entry point.** Execute `python scripts/project_validate.py --manifest project.json --json validation_report.json`. This enforces paired STEP/STL audits per part, connected printable STL, global assembly collision checks, explicit print orientations/printability reports, and external evidence requirements. No matching STEP/STL comparison → FAIL. Local manufacturing STLs must **never** be used as global assembled solids. See [validation](references/validation.md).
8. **Render the exported CAD and personally inspect each image.** `scripts/render.py` supports `--preset wall|desk`, custom cameras, part IDs, transparent reference context, and explicit multi-axis explode vectors. Inspect silhouette, hidden joints, underside, internals, tool access, seams, and design quality; screenshots are evidence only if actually viewed. Fix visible issues, re-export, revalidate and re-render. See [visual QA](references/visual-qa.md).
9. **Manufacturing verification.** Run `scripts/printability.py --candidates` for each printable part; inspect candidate orientations and decide intentionally. If OrcaSlicer CLI and real printer/process/filament settings exist, run `scripts/slice_verify.py`, inspect first and critical layers, walls, supports, islands and toolpaths, and record evidence. No slicer review → manufacturing `UNVERIFIED`. Test fit coupons for critical clearances; no physical testing → no guaranteed print fit or durability claim.
10. **Deliver honest independent statuses.** Report **geometry / assembly / function / manufacturing** as `PASS`, `FAIL`, or `UNVERIFIED`. A category becomes PASS only for demonstrably checked requirements, not inferred behavior. An overall result with any UNVERIFIED gate is UNVERIFIED; do not call it production ready. Deliver Python source, manifest, manufacturing and global-pose STEP exports, print STL, QA JSON, visual contact sheets, functional test evidence, instructions and limitations.

## Core CadQuery mental model

```python
import cadquery as cq

# Model lengths are mm by project convention.
outer_d, measured_pipe_d, radial_clearance = 60., 18., .1
bore_d = measured_pipe_d + 2 * radial_clearance  # 18.2 mm
body = (cq.Workplane('XY')
        .circle(outer_d / 2).circle(bore_d / 2).extrude(4)
        .edges('>Z').fillet(.8))
assert len(body.solids().vals()) == 1
solid = body.val()
assert solid.isValid() and solid.Volume() > 0
solid.exportStep('rosette.step')
solid.exportStl('rosette.stl', tolerance=.035, angularTolerance=.12, relative=False)
```

- `Workplane` is a stack, local frame and context history, not necessarily one solid. `.val()` selects one object; `.vals()` can contain several. Check cardinality.
- Selectors like `.faces('>Z')`, `.edges('|Z')`, `#Z` query geometry, NOT persistent face IDs. Limit selection count before destructive operations. [selector guide](references/cadquery-fundamentals.md).
- `.extrude()`, `.hole()` and other Workplane methods may combine/cut a context solid. Use separate solids or `combine=False` when designing independent parts.
- Use `.revolve()` for rotational profiles, `.loft()` for changing sections, `.sweep()` for constant paths, `.shell()` for open cavities, `.fillet()`/`.chamfer()` late after topology stabilizes.
- `cq.Assembly` represents named/placed components but is not inherently a motion simulator, contact solver or proof of insertion. Use `cq.Location`, `.rotate()` and `.translate()` with explicit transforms.

## Quick commands (from this folder)

```bash
python scripts/env_check.py
python scripts/step_inspect.py existing.step --json inventory.json
python scripts/cadquery_recipes.py --out-dir /tmp/cq-recipes
python scripts/example_rosette.py --out-dir /tmp/cq-rosette
python scripts/audit.py /tmp/cq-rosette/rosette_left.step /tmp/cq-rosette/rosette_left.stl --expected-pairs 1 --expected-components-per-stl 1
python scripts/printability.py /tmp/cq-rosette/rosette_left.stl --candidates --json /tmp/cq-rosette/printability.json
python scripts/render.py /tmp/cq-rosette/rosette_left.step /tmp/cq-rosette/rosette_right.step --out-dir /tmp/cq-rosette/renders --preset wall --explode 8 --labels
python scripts/project_validate.py --manifest project.json --json validation_report.json
python scripts/smoke_test.py
```

`project.json` is project-specific and must declare all part files and requirement evidence (use the template in `assets/`). It will not magically consider the example a completed engineering product.

## Tool reference

| Task | File |
|---|---|
| Setup/environment/bootstrap | `references/setup.md`, `scripts/env_check.py`, `requirements.txt` |
| Parametric CadQuery source patterns | `references/cadquery-fundamentals.md`, `references/cadquery-api-cookbook.md` |
| Operations/selectors/debug | `references/modeling.md`, `references/cadquery-debugging.md` |
| Import STEP assembly analysis | `references/imported-step.md`, `scripts/step_inspect.py` |
| Export and frames | `references/cadquery-assemblies-exports.md` |
| Exact/mesh checks | `references/validation.md`, `scripts/audit.py`, `scripts/project_validate.py` |
| Engineering checks | `references/engineering-validation.md`, `scripts/engineering_checks.py` |
| FDM-first orientation and slicer | `references/fdm-first.md`, `scripts/printability.py`, `scripts/slice_verify.py` |
| Visual, exploded, contextual QA | `references/visual-qa.md`, `scripts/render.py` |
| Templates / actual examples | `assets/`, `scripts/example_rosette.py`, `scripts/cadquery_recipes.py` |

## Hard stops

- Broken topology, unexpected body count, missing STEP/STL pairing, disconnected STL when one printable solid expected, mismatched dimensions/exports → **FAIL**.
- Manufacturing STEP printed in a different coordinate system from assembled STEP, with no documented transform → **do not claim assembly check is meaningful**.
- Obstructed install path, screws cannot be reached, moving mechanism untested, duct centerline points away, critical mating clearance unverified → fail relevant quantitative requirement or mark broader function UNVERIFIED.
- No personally inspected images → visual quality UNVERIFIED; successful renderer exit alone is not review.
- No slicer profile/layer review or print coupon for important fits → manufacturing/physical fit UNVERIFIED; geometry can still PASS independently.
- Do not report “optimized”, “guaranteed fit”, “production ready” or “tested on printer” without supporting measurements.
