# CadQuery debugging and robustness playbook

Use this order after a failing feature: **inspect intermediate topology → isolate operation → simplify inputs → constrain selection → inspect geometry/render → re-add cosmetics**. Do not silently skip a failed feature and present an incomplete design.

## 1. Quick diagnosis

```python
import cadquery as cq

def check(label: str, obj: cq.Workplane):
    solids = obj.solids().vals()
    print(label, "solids=", len(solids))
    for i, solid in enumerate(solids):
        bb = solid.BoundingBox()
        print(i, "valid=", solid.isValid(), "vol=", solid.Volume(),
              "bbox=", (bb.xlen, bb.ylen, bb.zlen))
    assert solids and all(s.isValid() and s.Volume() > 0 for s in solids)

body = cq.Workplane("XY").box(20, 20, 3)
check("base", body)
selection = body.edges("|Z")
assert len(selection.vals()) == 4, "fillet selector changed"
check("rounded", selection.fillet(1))
```

An operation with no exception may still have produced 2 solids, a plugged opening or invalid mating geometry. Add assertions to the **intermediate result** rather than only to final export.

## 2. Unexpected Workplane behavior

**Symptom:** sketch/extrude becomes part of earlier solid or `val()` returns a face.

- Inspect `.vals()` and `type(obj.val())`. Workplane's selected stack differs from its context solid.
- `faces(...).workplane()` uses the selected geometry for placement and may modify the original context when extruding.
- Use `combine=False`, a new `cq.Workplane("XY")`, or direct `.union()`/`.cut()` to control part identity.
- Use explicit reference coordinates to avoid unexpected projected workplane origin.

## 3. Fillet / chamfer fails

- Verify exact edge count and type **before** `.fillet()`; curved and tiny edges can evade intended string selectors.
- Try a smaller radius; radius cannot exceed local space/neighboring wall constraints.
- Fillet selected edges in smaller groups; change sequence of holes/fillets if topology makes it impossible.
- Prefer a **revolved outline** for rotational bevels; it is typically more robust and gives precise silhouette control.
- Do not broadly catch the exception and keep an unfilleted part while claiming cosmetics completed.

## 4. Cut/fuse/intersection failures

- B-Rep operations can fail with coplanar tangencies, zero-thickness contacts, self-intersecting wires, overly small intersections, nearly coincident surfaces and damaged inputs.
- Assert input validity and separate solids; model intended fusions with a finite, intentional overlap. For independent components, require appropriate physical clearance.
- Verify `result.solids().vals()` **after** every boolean; a union of disconnected regions need not create one contiguous body.
- Reduce boolean complexity; create an oversized cutter with clear entry/exit instead of ending exactly on a target face.
- Avoid arbitrary global tolerances/`clean()` as blanket fixes for broken inputs. Track the changed geometry explicitly.

## 5. Loft or sweep goes wrong

- Check wire closure, number of wires, and winding/orientation of the cross-sections.
- Avoid zero-area end sections or excessively different adjacent profiles. Use additional spaced control profiles rather than a series of unconnected extruded slices.
- Inspect multiple orthogonal views and a section at the difficult transition. A mathematically valid loft can look asymmetrical or unexpectedly twisted.
- Test sweep path and profile independently; avoid curvature tighter than profile width. The `isFrenet` choice changes orientation behavior for noncircular sections.

## 6. Unexpected dimensions after export

- Check box centering defaults, local vs world coordinates, units in STEP, and whether a visual-only transform leaked into exports.
- Use `BoundingBox` with realistic numerical tolerance; it may include a small kernel tolerance expansion. Verify critical holes/cylinders with actual surface geometry or cross-sections rather than bound dimensions.
- Re-import STEP and STL; inspect bounds/volume and open the exported model in the renderer. Mesh tolerance is **not** designed part clearance.

## 7. Headless rendering blank/crashes

- Test one small solid first; inspect graphics/VTK/EGL environment. Offscreen rendering depends on VTK/OpenGL platform support and can require a virtual framebuffer depending on build.
- Keep image generation separate from modeling. If rendering fails, geometry may still be valid; **do not claim visual review passed**.
- Validate rendering from **reimported exported STEP** rather than code-only `show_object(...)` output. Use `scripts/render.py`, then actually open the PNGs.

## 8. Performance

- Start low-complexity; avoid repeated full-model booleans inside high-count loops, massive edge fillets across hundreds of edges, excessively tiny tessellation settings and repeated export of every intermediate.
- Reuse parameterized helper functions; cache expensive unchanged calculations outside model loops, but avoid reusing **mutable** modeling state unintentionally.
- Prefer coarse mesh for intermediate visual iteration, then tighten mesh deflection for final print/export and rerun the audit.
- Keep operations and QA stages independent so a slow render does not require remodeling.
- For costly assemblies, audit per-part first, then pairwise intersections after candidate geometry stabilizes.

## 9. Version-aware troubleshooting

Capture versions and function signatures with:

```bash
python - <<'PY'
import cadquery as cq, inspect
print('CadQuery', cq.__version__)
for name in ('fillet', 'loft', 'sweep', 'shell', 'hole'):
    print(name, inspect.signature(getattr(cq.Workplane, name)))
PY
```

Use official CadQuery docs and inspect the local API rather than guessing from examples written for older releases. CadQuery's `cq.Sketch` constraints are currently flagged experimental in official docs. Avoid relying on these for critical production geometry unless tests cover them.
