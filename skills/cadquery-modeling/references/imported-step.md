# Imported STEP: orientation, inventory, reverse engineering

Use `cq.importers.importStep(...)` (`mm` by default) and immediately save the reference's *original global coordinate system*. Importing STEP as a CadQuery Workplane may not retain original assembly hierarchy, names, colors or placements as distinct metadata. Do not infer intended fastener geometry from a cylinder alone.

Run:

```bash
python scripts/step_inspect.py imported/toolhead.step --json imported/inventory.json
python scripts/render.py imported/toolhead.step --out-dir imported/overview --preset desk --labels
```

The inspector numbers imported solids in importer order (`part_000`, ...), reports B-Rep validity, volume, AABB min/max/center, cylindrical radii/axes, largest planes, and bbox-only nearby-component candidates. Inventory is a starting point, **not automatic semantic recognition** of mounting holes. Neighbor candidate bounding box gaps do not prove exact OCCT clearance. For large assemblies inspect close neighbors explicitly with `shape.distance()` or clearance checks; exact all-pair booleans may be expensive.

Next: visually correlate the numbered components, determine real datums and coordinate transforms, identify reference solids to preserve (no accidental fusing), measure candidate interfaces with query/OCCT and verify against physical nominal dimensions. Keep imported reference untouched and export every designed part twice when required: posed assembly STEP in reference coordinates, and locally reoriented manufacturing STEP/STL with an explicit transform record. Compare each local STEP/STL pair, and only use global STEP solids for collision testing.

When views obscure an interface, isolate solids or render transparent reference geometry:

```bash
python scripts/render.py posed_new.step --reference imported_reference.step --preset desk --labels --out-dir renders
```

Caution: translucent rendering is a visual aid, not a true section or wall-thickness inspection. For critical internal geometry, create a clipped/sectioned CAD solid and dimension it directly.
