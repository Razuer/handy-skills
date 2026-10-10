# CadQuery-focused skill QA — 2026-10-10

## Tested environment

- Python 3.13.5
- CadQuery 2.8.0 with OCP / OpenCascade bindings
- Trimesh and VTK (headless offscreen) + Pillow
- All geometry generation uses **CadQuery**; OCP is used to inspect exported analytic surfaces; Trimesh/VTK are used only for audits/renders.

## Passing executable gates

`python scripts/smoke_test.py` reported `status: PASS`, covering:

- Original split-rosette example: two valid separate STEP solids, correctly sized cylindrical pipe bore **R9.1 mm**, assembled intersection volume **0 mm³**.
- Separate exported STL files: watertight, nonzero outward volume and matching STEP shape within 1% volume deviation.
- Six new CadQuery recipe bodies: `mounting_plate`, `revolved_ring`, `lofted_transition`, `swept_tube`, `shelled_enclosure`, `circular_pattern`. Each creates **one valid, positive-volume imported STEP solid** and a matching audited STL.
- Mounted plate: four STEP cylinders of radius **2.2 mm** validate `.hole(4.4)` diameter interpretation.
- Rendering: the original rosette has six standard views, an exploded view and a populated contact sheet.
- Negative controls: one deliberately damaged STL is rejected as not watertight; two overlapping solids are rejected by the assembled STEP collision audit.

`python scripts/render_recipe_gallery.py ...` generated six real isometric PNGs **from re-imported STEP geometry**, plus the gallery contact sheet.

## Visual inspection (performed)

Inspected `examples/recipe-output/renders/recipe_gallery.png` and `examples/output/renders/contact_sheet.png`:

- Circular pattern: eight perforations distributed on a disk; mounting plate: four corner holes and rounded vertical corners.
- Revolved ring: symmetric annular form with a visibly rounded outer profile, bore remains open.
- Loft: continuous rectangular-to-round transition; sweep: connected curved tube.
- Shell: open-top rectangular vessel with rounded vertical edges and visible inner cavity.
- Rosette: two contrasting disk halves with front edge rounding and central circular opening; exploded view shows two registration pins and matching reliefs (not snap-fit proof).
- Fine high-contrast outline artifacts from render edge extraction remain a visualization detail, not demonstrated CAD defects.

## Important limitations

- No physical prototype, FDM material-temperature or retention-force evaluation, assembly insertion path simulation, or automated minimum local wall-thickness proof.
- Script's validation reports geometry and mesh properties, not real fit to measured external hardware.
- No Onshape workspace was created; all files were generated locally using CadQuery.
- Headless VTK may emit an X-display warning on Linux but successfully generated usable PNGs in the tested environment.
