# CadQuery fundamentals — mental model for agents

CadQuery is a Python parametric B-Rep modeling library using OCCT via OCP. The **Python script is the editable parametric design**, not its exported STEP. In scripts, prefer explicit `import cadquery as cq` and keep all dimensions in **mm by convention**. Most CadQuery lengths are plain numeric model units, not `pint`/typed units; validate the design contract and STEP headers independently.

## Workplane / Shape / Assembly

| Type | What it holds | Use it for |
|---|---|---|
| `cq.Workplane` | Local coordinate system; **stack** of geometry objects and parent chain/context | Fluent modeling and selections: `box`, `circle`, `extrude`, `hole`, `faces`, `edges`, `workplane` |
| `cq.Shape`, `cq.Solid`, `cq.Face`, `cq.Edge`, `cq.Wire` | Direct OCCT B-Rep entities | Inspection, boolean `cut/intersect/fuse`, volume, validity, STEP/STL exports |
| `cq.Sketch` | Specialized 2D geometry operations | 2D profiles, fillets/slots in sketch; note constraint solving is experimental |
| `cq.Assembly` | Named, optionally colored and hierarchically located components | Exchangeable multi-part STEP and optional constraint solver |
| `cq.Location`, `cq.Vector`, `cq.Plane` | Transforms, coordinates and workplane definition | Reusable, explicit placements (especially assembled pose) |

### Workplane is a stack, not a single shape

```python
import cadquery as cq
wp = cq.Workplane("XY").box(20, 20, 4)
assert len(wp.solids().vals()) == 1
shape = wp.val()       # single object at top of stack
objects = wp.vals()    # all objects in the selected stack
assert shape.isValid()
print(shape.Volume(), shape.BoundingBox().xlen)
```

A `Workplane` returned by `.faces(">Z")` contains selected faces, **not** necessarily the full original solid as `.val()`. The parent context is tracked for workplane-based editing. Calling `faces(...).val().Volume()` is not a valid way to recover the complete part. Use a saved `body` variable or `body.solids().vals()`, and check stack cardinality. Many operations (`extrude`, `hole`) act on the **context solid** and combine/subtract by default. To create multiple parts, use distinct `Workplane`s, `combine=False` where appropriate, or direct `Solid` operations.

### Local coordinates and placement

- `cq.Workplane("XY")` is the standard plane, +Z normal. 2D sketch coordinates are `(x, y)` and extrusion runs in local normal direction.
- `cq.Workplane("XZ")` sketches with X/Z world coordinates; always confirm axis direction on `revolve()`/`extrude()` when changing workplanes. When uncertain, export or inspect the bounding box.
- `.workplane(offset=d)` makes a new local plane; `.faces(">Z").workplane()` creates a workplane from a selected face, where default origin is projected rather than necessarily the face center. See official workplane docs for `centerOption`.
- `cq.Location((x, y, z))` or `.translate((x, y, z))` moves geometry. Keep model coordinates **assembled** for collision tests; apply visualization-only offsets in the renderer, not the source parts.

## Basic operations map

| Task | Typical CadQuery form |
|---|---|
| Cylinder / ring | `cq.Workplane("XY").circle(ro).circle(ri).extrude(h)` |
| Box | `.box(x, y, z)`; defaults centered on all axes |
| Profile | `.moveTo(x,y).lineTo(...).threePointArc(...).close()` |
| Extrude | `.extrude(length, combine=True)` |
| Revolve | `.revolve(360, axisStart=(0,0), axisEnd=(0,1))` (axis points in **local sketch coordinates**) |
| Loft | `.rect(...).workplane(offset=...).circle(...).loft()` |
| Sweep | `profile.sweep(path_wire, isFrenet=True)` |
| Hollow box | `.faces(">Z").shell(-wall)` (selected face opens; negative inward) |
| Fillet / chamfer | `.edges(selector).fillet(r)` / `.chamfer(d)` |
| Through hole(s) | `.faces(">Z").workplane().pushPoints(positions).hole(d)` |
| Boolean | `body.union(other)`, `.cut(other)`, `.intersect(other)` |
| Rect/polar pattern | `.rarray(dx,dy,nx,ny)`, `.polarArray(radius, start, angle, count)` |
| Mirror | `.mirror("YZ")` (check behavior and mirror center in installed version) |
| Export STEP | `shape.exportStep("part.step")` or `wp.export("part.step")` |

Some API signatures have evolved. Check the exact installed version and primary docs when copying older examples. The tested runnable counterparts are `scripts/cadquery_recipes.py`.

## Selectors and topological stability

| Selector | Meaning | Typical usage |
|---|---|---|
| `>Z`, `<Z` | Extremum in direction (semantics depend on face/edge) | top/bottom faces or edges |
| `+Z`, `-Z` | Geometry oriented along signed direction | face normal pointing +Z |
| `|Z` | Parallel to Z | upright straight edges; plane normal parallel to Z |
| `#Z` | Perpendicular to Z | face normals/straight edge tangents orthogonal to Z |
| `%Plane`, `%Circle`, `%Line` | Geometric type | exclude curved/polygonal edges |
| `and`, `or`, `not` | Combine selections | `.edges("|Z and >Y")` |
| `>>Z`, `<<Z` | Center-based extremum | sometimes useful for curved geometry |

**Warning:** For curved faces, direction selectors can use the normal at center of mass; for curved edges most direction-based string selectors do **not** match as if they were straight lines. Also, selecting `>Z` after a loft/fillet may select different subshapes following a parameter change. See [official selectors](https://cadquery.readthedocs.io/en/latest/selectors.html).

```python
body = cq.Workplane("XY").box(40, 20, 5)
chosen = body.edges("|Z")
assert len(chosen.vals()) == 4, "unexpected vertical edges; inspect new topology"
body = chosen.fillet(2)
```

Avoid index selectors like `edges().item(7)` unless verified on stable, intentionally fixed topology. For complex geometry, choose by actual geometric position and type or use `cq.selectors.BoxSelector`; assert the resulting count. `tag()` / `workplaneFromTagged()` help preserve references **within a Workplane chain**, but do not guarantee OCCT topological naming through arbitrary booleans.

## Canonical design intent

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Design:
    nominal_pipe_diameter_mm: float = 18.0
    radial_clearance_mm: float = 0.1
    outer_diameter_mm: float = 60.0
    thickness_mm: float = 4.0

p = Design()
assert p.radial_clearance_mm >= 0 and p.outer_diameter_mm > p.nominal_pipe_diameter_mm
bore_diameter_mm = p.nominal_pipe_diameter_mm + 2*p.radial_clearance_mm
```

Document why a default exists, and which parameters are safety/strength/interface-critical. Never hardcode a tolerance as an arbitrary hidden difference between repeated features.

## Official reading

- https://cadquery.readthedocs.io/en/latest/primer.html
- https://cadquery.readthedocs.io/en/latest/workplane.html
- https://cadquery.readthedocs.io/en/latest/selectors.html
- https://cadquery.readthedocs.io/en/latest/classreference.html
