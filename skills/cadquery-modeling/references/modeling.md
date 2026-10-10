# CadQuery parametric modeling tactics

1. **Data model:** keep a dataclass of source parameters in mm, validate ranges, derive dependent dimensions once; functions return named `cq.Workplane` or `cq.Shape` objects.
2. **Reference axes:** choose a fixed origin and explicit datums. Example: wall plane XY, +Z visible front, origin at pipe center. Use world positions for assembly, different positions only in renderer.
3. **Start with the envelope:** construct base ring/prism/section; check B-Rep solid count, validity, volume and approximate bounds before decorative features.
4. **Functional geometry first:** through-bores, pockets, retention, insertion route, mates and tolerances. Use `hole(d)` for diameter, `circle(r)` for radius; avoid conflating them. Design cosmetic features last.
5. **Local Workplanes:** `faces(selector).workplane()` is convenient but projected workplane origin and changed topology can surprise. For critical absolute datums use explicit `cq.Workplane(cq.Plane(...))` or model at fixed coordinates.
6. **Selections:** robust selectors by direction/type/position, with cardinality asserts. Prefer `edges("|Z")` to `edges().item(7)` and only trust a selector if it still identifies intended edges after a parameter perturbation.
7. **Booleans:** use explicit `.union`, `.cut`, `.intersect`; keep independent parts separate. Check result `isValid`, number of solids and positive volume after every significant operation. Avoid coincident/tangent-only fuses and zero-thickness contacts.
8. **Fillets:** apply to an intentional edge subset. Smaller local blends often work where a blanket `edges().fillet(...)` fails. On radial profiles prefer exact revolved bevels if they are visually important.
9. **Loft/sweep:** maintain profile consistency, avoid degenerate wires/self-intersections, evaluate progressive twist and smooth transitions from front/side/isometric/section renders. Do not simulate a twisted rib with disconnected extruded slabs.
10. **Assembly:** preserve one independently exportable solid per physical print. Test assembled pose (not exploded view), spacing and actual insertion path; `cq.Assembly` stores geometry and optional constraint-based placement, not a physical retention simulation.
11. **Tessellation:** build/validate B-Rep first, tessellate only at export; choose absolute STL deflection to match surface details. STEP and STL should have similar envelope and volume within explicitly chosen export error bounds.
12. **Sensitivity:** rebuild min/default/max combinations for interface and cosmetic parameters where feasible; verify solid count, validity and physical constraints at boundaries.

Detailed syntax: [fundamentals](cadquery-fundamentals.md), [API cookbook](cadquery-api-cookbook.md). Troubleshooting: [CadQuery debugging](cadquery-debugging.md).
