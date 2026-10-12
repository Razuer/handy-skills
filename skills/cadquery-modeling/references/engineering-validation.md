# Engineering validation beyond valid B-Reps

**Four independent gates:** geometric correctness; assembly correctness; functional correctness; FDM/manufacturing correctness. Each is `PASS`, `FAIL`, or `UNVERIFIED`. `UNVERIFIED` is the default for unsupported claims. The overall state is `FAIL` if any gate fails, `UNVERIFIED` if any required gate lacks evidence, otherwise `PASS`. `PASS` for CAD topology must *never* imply product readiness.

## Requirements-to-evidence traceability

Start from `assets/project-manifest.json` and edit its `requirements` array **before drawing**. For every requirement assign: stable ID, category, measurable criterion/units/limits, verification method, evidence artifact path, and state. Prefer machine-readable measurement reports over prose. The `project_validate.py` script enforces existence of supplied evidence but **does not independently establish the truth of a self-authored evidence file**: review its provenance and calculations.

Mandatory quality activities:

1. CAD dimensions and topology: check *critical* dimensions analytically or by querying imported STEP surfaces (the generic audit checks envelope and volume only).
2. Assembly: check physical tool approach, installation/removal path, final pose clearances, contact/retention, and articulation. Do not confuse zero *volume* overlap with minimum *surface-to-surface* clearance or a viable insertion trajectory.
3. Function: define output as physical behavior, not shape. Test power, forces/stress, thermal service conditions, friction, airflow, optical access, etc. Report assumptions. No unvalidated FOS or flow-efficiency claim.
4. Manufacturing: select build pose **before detailed CAD**; verify print layers with real printer/nozzle/material/process settings; print coupon, measure, refine critical joints. Record as UNVERIFIED if no calibrated print exists.

## Reusable quantitative checks (`scripts/engineering_checks.py`)

`python scripts/engineering_checks.py checks.json --json measurements.json`

Example `checks.json` (all STEP solids in *assembly* coordinates):

```json
{
  "parts": {"bracket":"posed_bracket.step", "housing":"posed_housing.step"},
  "checks": [
    {"name":"clearance", "type":"clearance", "a":"bracket", "b":"housing", "minimum_mm":0.2},
    {"name":"linear-install", "type":"translation_path", "moving":"bracket", "against":["housing"], "from_offset_mm":[0,0,20], "to_offset_mm":[0,0,0], "samples":41, "minimum_mm":0},
    {"name":"tool-to-screw", "type":"fastener_access", "tool_start_mm":[5,5,40], "axis":[0,0,-1], "tool_radius_mm":3.5, "tool_length_mm":25, "obstacles":["housing"]},
    {"name":"duct-aim", "type":"duct_aim", "outlet_center_mm":[1,3,5], "outlet_direction":[0,1,-0.2], "target_mm":[1,30,0], "max_angle_deg":15}
  ]
}
```

- `clearance` uses exact OCCT solid distance and B-Rep intersection volume. It does not tell you which face constitutes the intended mate, nor whether touching is desirable.
- `translation_path` samples a **straight translation** at N positions, *not* a continuous swept-volume proof. For rotation, mixed degrees of freedom or snap deformations implement explicit kinematic poses/analytic minimum-gap envelopes and add tests; do not silently repurpose translation as rotational collision checking.
- `fastener_access` checks a cylindrical tool-volume keepout against declared obstacles. It is not a screw-head torque/access or washer/thread engagement calculation.
- `duct_aim` checks an outlet-centerline direction versus target. For cooling/flow also verify outlet-to-target line of sight, channel connectivity, minimum cross-section, bends/area changes and exhaust interactions. Without CFD or measured airflow, flow-performance optimization remains `UNVERIFIED`.

## Functional checklist by class

- Mechanisms: degrees of freedom, limit poses, collision at intermediate states, correct retention and removal forces, hand access, fastener accessibility, cyclic loading, possible creep in plastic.
- Mounts/enclosures: datum alignment, measured reference envelope, stackup, bolt grip/thread length/torque, tool clearance, insertion without forcing, cable routing bend radius, assembly sequence.
- Ducts/fans: real fan inlet/outlet dims, aim vectors, flow channel *continuity*, bottleneck area, pressure/drop assumptions, thermal constraints; CFD and testing where performance claims are needed.
- Structural parts: loads, constraints, materials including print anisotropy, stress concentrations, FOS *with traceable derivation*, creep and thermal conditions.
- Human factors: finger/tool access, reach, likely use modes, obstruction, ergonomics, visible finish.

**Never write “optimized”, “production ready”, “zero collision at all angles” or “guaranteed fit” when evidence only covers finite checks.**
