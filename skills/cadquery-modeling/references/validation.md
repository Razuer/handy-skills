# Quality gates, assertions, metrics, and report semantics

| Gate | Mechanism | Acceptance condition | Cannot prove |
|---|---|---|---|
| Input/units | Parameter record + design manifest | Units, envelope, reference axes and constraints explicit | user measured interface accurately |
| CAD topology | OCCT/CadQuery `isValid()`, solids, volume | valid solid per intended printable part; volume positive | functional correctness |
| CAD dimensions | bounding box + analytic interfaces | dimensions within specified CAD tolerance | hole diameter from bounding-box alone |
| CAD intersections | B-Rep common-volume per part pair | overlap <= explicitly chosen numeric noise threshold for non-interfering assembled parts | minimum clearance, edge contact, stress |
| Mesh topology | Trimesh `is_watertight`, `is_winding_consistent`, `is_volume`, `split()` | each printable STL a connected, closed, outward-volume mesh unless intentionally specified otherwise | small internal void correctness |
| Round-trip | reimport STEP/STL + compare bounding boxes and volumes | exports match source within allowed deflection | fully identical analytic surfaces after meshing |
| Visual | actual multi-view camera render | no visible unresolved defects; hidden interfaces inspected | physical print fit |
| Print | slicer layer preview and coupon | slicer exposes expected walls and critical joint test fits | long-term mechanical life |

## Running the bundled audit

```bash
python scripts/audit.py housing.step --json housing_qa.json
python scripts/audit.py left.step right.step --check-intersections --json assembly_qa.json
python scripts/audit.py left.stl right.stl --json mesh_qa.json
```

The script audits each STEP body and STL mesh and supports a multi-part set of STEP files for an assembled-pose intersection test. `--expected-solids N` verifies **total solids across passed STEP files only**. `--check-intersections` should be used only for files in a common **assembled coordinate frame**; overlaid alternative configurations or exploded poses give false positives/negatives. Collision is tested with solid volume, not just AABB intersection. Inspect warnings and human requirements before calling a part ready to manufacture.

The audit does not calculate local wall thickness, snap-force, least-distance gaps, bore diameters, or full mesh self-intersections. Those need geometry-specific analytic tests and/or additional analysis. A low mesh-volume error and watertightness do not guarantee a print is dimensionally correct. No automated mesh repair is performed in order to avoid silently mutating the design.

### Suggested project-level custom assertions

```python
assert abs(measured_bore_diameter_mm - target_bore_diameter_mm) <= 0.05
assert nominal_radial_clearance_mm >= calibrated_clearance_mm
assert len(assembled_parts) == expected_parts
assert min_wall_mm >= printer_specific_min_wall_mm
assert release_motion_has_clear_path  # requires a real assembly-path test
```

Keep these linked to named design parameters and document how each measured or derived value was obtained. Avoid turning a measured / specified 0.1 mm *fit tolerance* into a B-Rep intersection noise threshold.
