# FDM-first CadQuery process (required for printable deliverables)

**Plan manufacturing orientation before defining the part's underside and secondary features.** Maintain two independent frames: assembly global XYZ, and per-part manufacturing XYZ (+Z = layer deposition; minZ on build plate). Every printed component needs a documented assembly-to-print 4×4 transform; never mix local manufacturing STLs in a global collision audit.

## Decide pose and design geometry together

1. Identify intended print bed, material, nozzle/line width, layer height, functional loads, cosmetic and mating surfaces.
2. Generate at least two plausible orientations; compare first-layer contact, stability/islands, support need, unsupported internal ceilings, critical dimension direction, layer-load anisotropy, print time/height, visible surface quality. No universal ranking.
3. Prefer connected planar contact regions and avoid decorative bosses, pins, and tabs unintentionally forming the only first-layer footprint. Move/recess features or split a part when function permits.
4. Favor chamfers on *down-facing* external transitions where fillets would produce extreme overhangs; preserve deliberate mating fillets where required. Overhang 45–60° from vertical build axis is only a starting point, printer/profile dependent (see Prusa sources).
5. Examine bridges, horizontal round holes (teardrops/arches if compatible), internal supports that would be trapped, slicer wall/path generation, small gaps, sharp internal corners and elephant foot.
6. When it improves printability without sacrificing structural function, **redesign instead of adding supports**. Record tradeoffs (extra joint/fastener, sealing, strength, appearance).
7. Export pose-specific STEP and STL for each single solid, preserving a separate global-pose assembly STEP. Run geometric comparisons and manufacturing heuristics on the *print-pose* export.

## Orientation preflight and slicer

```bash
python scripts/printability.py print/duct.stl --candidates --angle 50 --json print/duct_printability.json
python scripts/slice_verify.py print/duct.stl --printer profiles/printer.json \
  --process profiles/process.json --filament profiles/filament.json --out-dir print/duct_slice
```

`printability.py` estimates planar bed contact and disconnected bottom patches based on mesh triangles, downward-overhang area proxy, height, six candidate rotations; it **cannot** model sliced islands, bridge span, anisotropy or supports. Use recommendations only to trigger visual/slicer follow-up. A contact-area number cannot prove reliable adhesion.

OrcaSlicer exposes CLI slicing (`--slice 0`) with explicit `--load-settings` and `--load-filaments` in recent versions. Inspect your installed `--help` and exported preset format before scripting it. The wrapper does not bypass validation (`--no-check` is intentionally unused). After a slice is generated, inspect layer by layer: first-layer continuity, perimeters on thin features, support placements/removal, bridges/ceiling, toolpath islands, extrusion paths, warnings, estimated material/time. Provide an existing written/screenshotted review record to `--layer-review-evidence` to record review; the script **cannot prove that the reviewer inspected it**.

No slicer binary or actual matching profiles? **Manufacturing gate `UNVERIFIED`.** A slicer success alone is `SLICED_NEEDS_LAYER_REVIEW`, not PASS. A real printer test is still needed to certify fit/reliability.

## Key considerations

- Stability and large first-layer contact matter, but may conflict with tensile strength across layer lines. Consider load paths before picking the flattest side.
- Short well-anchored bridges may work; sharp unsupported ceilings and enclosed soluble support are not automatically safe.
- Nozzle 0.4 mm does not imply arbitrary walls under 0.4 mm slice; configure line width and wall counts, and verify in toolpath preview.
- PETG/ASA/PLA differences, shrinkage, thermal creep, bed warping, layer adhesion, and printer calibration affect fit and strength.
- Critical mating dimensions require coupons and measured assembled test, not just CAD clearance.

Sources: https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135 ; https://help.prusa3d.com/article/support-material_1698 ; https://github.com/OrcaSlicer/OrcaSlicer/wiki/cli_mode ; https://github.com/OrcaSlicer/OrcaSlicer/wiki/cli_actions .
