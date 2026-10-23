# Shared print preparation

Use `scripts/prepare_prints.py` from this skill for repeatable mesh audits,
explicit orientation, bed placement, quantities, and plate layout. Do not copy
the utility or write a project-specific replacement. Keep only the manifest and
design-specific validation in the project.

This is independent export processing, not CLI fallback modeling: it can follow
a normal MCP build without changing the live CAD document.

## Workflow

1. Export each printable part to its own mesh. Leave the source exports intact.
2. Choose a print orientation deliberately using overhangs, contact area, joints,
   layer strength, and desired surfaces. The utility does not find a best pose
   or prove that a part needs no supports.
3. Create a project-local `print-manifest.json`. Paths resolve relative to the
   manifest. All coordinates, mesh units, and CAD volumes must already be mm
   and mm³; STL has no intrinsic units and this utility does not guess them.
4. Run the shared utility into a separate generated output folder. Use an
   existing suitable Python environment or `uv run --script`, which reads the
   script's bundled dependency metadata and uses an isolated environment.
   Do not install libraries into system Python.
5. Read the report, inspect the plate, and review it in the intended slicer.
   Mesh PASS does not establish printability, tolerances, fit, or strength.

```sh
uv run --script /absolute/path/to/solidcraft/scripts/prepare_prints.py \
  /absolute/project/print-manifest.json --out /absolute/project/print/prepared
```

Resolve the installed skill path rather than assuming a particular account.

## Manifest example

```json
{
  "version": 1,
  "units": "mm",
  "bed_mm": [220, 220],
  "gap_mm": 5,
  "margin_mm": 5,
  "volume_tolerance_percent": 0.05,
  "parts": [
    {
      "name": "bracket",
      "input": "exports/bracket.stl",
      "quantity": 1,
      "rotation_deg": [90, 0, 0],
      "expected_solids": 1,
      "expected_volume_mm3": 12500
    },
    {
      "name": "spacer",
      "input": "exports/spacer.stl",
      "quantity": 4,
      "rotation_deg": [0, 0, 0],
      "expected_solids": 1
    }
  ]
}
```

- `rotation_deg` is required, including `[0,0,0]` to explicitly keep the export
  orientation. Extrinsic rotations about fixed world X, then Y, then Z are
  applied about the origin, followed by translation of the rotated bounds to
  X=Y=Z=0. This places the lowest point on the bed; it does not ensure a flat,
  stable contact face. There is no scaling or automatic rotation.
- `quantity` and `expected_solids` default to 1. Quantity duplicates a whole
  input mesh; connected-solid count is checked before duplication. Multiple
  solids can be intentional, but exporting one printable body per file is preferred.
- Supply fresh `expected_volume_mm3` from CAD measurement or analytic geometry
  whenever possible. Without it, volume comparison is explicitly UNVERIFIED.
  The percentage tolerance defaults to 0.05; adjust only with an explained
  tessellation reason, not to hide defective geometry.
- Names must be unique lowercase filename identifiers. The plate name
  `all-parts-flat` is reserved. Bed size excludes no automatic skirt/brim;
  choose sufficient margin for your slicer settings.

## Outputs and safety

Outputs are one normalized STL per unique part, `all-parts-flat.stl`, and
`report.json` (including per-part checks and copy placements). Shelf packing
reserves axis-aligned bounding rectangles and the configured gap, so it is
conservative rather than a nesting optimizer. An oversized part or a layout
that does not fit stops with an error; split the manifest into plates or adjust
the bed. Do not shrink mating parts merely to fit.

The script does not repair meshes or overwrite inputs. Existing named outputs
are refused unless `--overwrite` is explicit; output symlinks and source-path
collisions are refused even then. Other files in the output directory are left
alone. Prefer a fresh output folder for a changed manifest: `--overwrite` does
not clean old outputs, and a failed audit does not remove older plates.

Exit codes: **0** mesh checks passed and outputs written; **1** mesh audit
failed (report written, no new STLs); **2** manifest, fit, I/O, or other input
error. Non-watertight, inconsistently wound, nonpositive-volume, degenerate,
unexpectedly disconnected, or volume-mismatched meshes fail the audit.

Manufacturing stays **UNVERIFIED**, including after a mesh PASS, until the
separate slicer/physical checks required by the main skill have been completed.
Watertightness does not rule out self-intersections; this utility does not test
triangle self-intersections or minimum wall thickness.

## Tool regression tests

```sh
uv run --with numpy --with trimesh --with scipy python -m unittest discover \
  -s /absolute/path/to/solidcraft/scripts/tests -v
```
