# CadQuery API cookbook — tested runnable idioms

**All six recipe functions are actually executed by `scripts/cadquery_recipes.py`.** Their STEP/STL outputs can be checked with the bundled auditor and renderer. Read this for syntax and implications; adapt only after verifying the resulting shapes.

## 1. Plate, holes and selective fillets

```python
import cadquery as cq
plate = (
    cq.Workplane("XY").box(80, 50, 5)
    .edges("|Z").fillet(3)
    .faces(">Z").workplane()
    .pushPoints([(-32,-17), (32,-17), (-32,17), (32,17)])
    .hole(4.4)
)
```

**Why:** prototype the mechanical envelope, round external edges, then drill. `.hole(d)` takes **diameter**, while `.circle(r)` takes **radius**. `.box` centers in Z by default, so its underside sits at -2.5 mm. The face-relative workplane follows the top face. For holes with finite depth, countersinks or counterbores use `hole(d, depth)`, `cskHole(...)` and `cboreHole(...)` after confirming installed signatures.

## 2. Revolved radial profile (bevels, collars, knobs)

```python
ring = (
    cq.Workplane("XZ")
    .moveTo(10, 0).lineTo(12, 0)
    .threePointArc((13.5, 2), (12, 4))
    .lineTo(10, 4).close()
    .revolve(360, (0, 0), (0, 1))
)
```

Use revolve for axisymmetric ornamental rings, curved bezels, hollow ducts, and undercut-free profiles. X = radius, sketch Y = world Z. **Do not cross the axis in a profile meant to leave a central bore.** Build front bevels into a radial cross-section when broad edge fillets fail. This produces exact OCCT surfaces.

## 3. Loft across sections

```python
transition = (
    cq.Workplane("XY")
    .rect(30,20)
    .workplane(offset=12).rect(25,18)
    .workplane(offset=12).circle(9)
    .loft(combine=True)
)
```

Place coherent sections along a sensible axis. Keep winding/orientation consistent. More sections allow controlling an hourglass or smooth transition, but can introduce twist and local self-intersection; inspect all views and section profiles. **A sequence of extruded blocks is not a smooth loft.** For many profiles or complex shape matching, break into multiple simpler lofts and check each.

## 4. Sweep a closed profile along a path

```python
path = cq.Workplane("XZ").spline([(0,0),(6,8),(14,12),(22,5)]).wire()
rod = cq.Workplane("XY").circle(2).sweep(path, isFrenet=True)
```

Sweep when a rib/tube follows a curve. Path must be a valid wire; profile must be compatible and near the path start. The moving orientation (`isFrenet`) materially affects twisting for noncircular sections. Sweep results can pinch/self-intersect around tight curves; inspect centerline radius and cross-section orientation. For a long helical rib, check continuity along its whole length.

## 5. Hollow housing using shell

```python
housing = (
    cq.Workplane("XY").box(50,35,24)
    .edges("|Z").fillet(3)
    .faces(">Z").shell(-2)
)
```

Selecting a face for `.shell(-2)` **removes that face** and offsets remaining walls inward. Shelling can fail at small radii, corners, and variable thickness: test validity and physically required walls. Sometimes a cut with separately modeled cavity and rounded corners is more robust than `shell`.

## 6. Polar/radial patterns

```python
flange = (
    cq.Workplane("XY").circle(30).extrude(4)
    .faces(">Z").workplane()
    .polarArray(23, 0, 360, 8).hole(4)
)
```

`polarArray` positions stack locations on a bolt circle. As usual: array radius is a radius; `.hole()` uses diameter. For constrained bolt patterns check minimum ligament width and distance to outer/inner edges. If a hole merges with another edge, the model may remain valid while becoming unprintable.

## 7. Booleans and keeping two parts separate

```python
left = cq.Workplane("XY").box(20, 10, 4).translate((-10.2, 0, 0))
right = cq.Workplane("XY").box(20, 10, 4).translate((10.2, 0, 0))
a, b = left.val(), right.val()
assert a.intersect(b).Volume() < 1e-6
assembly = cq.Compound.makeCompound([a, b])
assembly.exportStep("assembly.step")
```

The example intentionally has 0.4 mm **total seam gap**. For an actual joint, add **mating geometry** separately; don't assume zero-volume overlap proves that it can be installed or retained. Beware `.union()` often fuses the context by default. If intended part count is two, audit two.

## 8. Inspecting B-Rep results

```python
solid = housing.solids().val()
assert solid.isValid() and solid.Volume() > 0
bb = solid.BoundingBox()
print(bb.xlen, bb.ylen, bb.zlen, solid.Volume())
print("solids:", len(housing.solids().vals()))
```

`BoundingBox` may contain a tiny OCCT tolerance expansion; do not assert exact floating-point equality for nominal dimensions. A bounding box **cannot** establish bore diameter, wall thickness, or minimum gap. Measure functional interfaces analytically or inspect OCCT surface geometry and sections.

## 9. Explore a new API without guessing

Use Python introspection in the active environment (then run a minimal test before full-model use):

```bash
python - <<'PY'
import inspect, cadquery as cq
print(inspect.signature(cq.Workplane.cboreHole))
print(inspect.signature(cq.Workplane.loft))
print(inspect.signature(cq.Shape.exportStl))
print(inspect.signature(cq.Assembly.export))
PY
```

Check `cadquery.readthedocs.io/en/latest/classreference.html` and `.../examples.html` for version-specific semantics. Do not copy random snippets assuming deprecated methods still work. The `cq.Sketch` constraint solver remains marked experimental by the official docs; prefer stable direct profiles unless that functionality is needed.
