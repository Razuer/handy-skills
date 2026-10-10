# Functional fit and additive manufacturing checklist

This guide prioritizes FDM/FFF desktop 3D printing and does not supply universal tolerance constants.

- **Define fit type:** free sliding, snug keyed, light press fit, snap, permanent interference, magnet pocket. State installation force/direction and number of cycles.
- **Distinguish:** nominal component size, measured component size, design clearance, slicer XY compensation, nozzle/line width and actual error. Formula for a round pipe: `bore_d = measured_pipe_d + 2 * desired_radial_clearance`.
- **Clearance should be calibrated**, not assumed universal. Published guidance varies by process, geometry and material. Starting small-calibration coupons allow 0.1/0.15/0.2/0.25/0.3 mm trials per side. Do not assume 0.1 mm will reliably fit on an uncalibrated FDM printer.
- **Minimum wall check:** for a 0.4 mm nozzle, multiple walls of around 0.45 mm extrusion width matter; three perimeters are around 1.35 mm in Prusa's example. These are process-dependent guidelines, not exact mechanical strength guarantees.
- **Snap-fit geometry:** longer compliant beams reduce insertion stress, gently tapered hooks, root fillets, avoid sharp notches, test load parallel/perpendicular to layer lines; the best material/geometry differs for repeated actuation.
- **Visual seams:** put alignment keys behind the visible face, keep gaps consistent; exploit visual grooves where appropriate, but don't hide an impossible assembly sequence.
- **Build orientation:** choose best combination of skin quality, support count, bed adhesion, mechanical anisotropy, and accuracy. Recheck clearances in their printed direction.
- **FDM risks:** elephant-foot, bridged ceilings, unsupported horizontal bore, heat/shrinkage, warped corners, seam placement, overhang/surface finish; inspect the actual slicer preview/layers.
- **Heat-adjacent parts:** material selection must consider wall and pipe temperature rather than assume generic PLA/PETG are always suitable. For a radiator cover, verify expected temperatures and choose accordingly.
- **Physical validation:** test a small joint coupon, measure with calipers, record printer/nozzle/material/layer settings, and update nominal clearance parameters. Mark "print tested" only when a real test happened.

## Source-backed context (see sources.md)

Prusa recommends explicit model clearances and test prints; its guide notes clearances depend on size, XY/Z orientation, machine calibration, slicer settings and material. Its examples of wall thickness reflect extrusion width. Formlabs illustrates why fit types and flexible snap arms need different design decisions. Published numerical values should be treated as starting points, not certifications for a user's printer.
