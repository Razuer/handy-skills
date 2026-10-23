# Geometry construction and observed engine traps

These are observations from earlier SolidCraft builds, not guarantees about every version.
Confirm command shapes against the installed tool schemas. Numerical offsets below are local
workarounds, not manufacturing clearances. Use the smallest effective offset and recheck geometry.

## Construction sequence
1. Work the part out as numbers and structural section moduli first ([structural sizing](structural-sizing-and-dfam.md)).
2. Draw **every face that must be flush in one sketch profile** and extrude it once.
3. **Fillet that extrusion's edges right away**, while it is standalone.
4. Join the other blocks (plate, towers, cylinders).
5. Cut all voids last: **one sketch per kind of cut, all instances together**, extrude-cut with `targets`.
6. Apply `solid.thread {modeled: true}` only **after** all `inspect.interference` and `motion.interference` checks pass ([thread engine traps](threads-and-fasteners.md)).
7. Verify dimensions, interference, and exported meshes using the entry-point skill.

## Observed traps
- **Flush, tangent or coincident faces between separate features** cause `Boolean retry`
  warnings, sliver faces, fillet failures, cracked STLs, even `boolean Union ... no result`. That
  includes a cylinder exactly tangent to a plane (an R3 nose centred 3 mm from a wall) and a ring
  whose edge coincides with the plate edge. Fix it by construction: one profile (recipe step 2), a
  0.1 mm offset for tangency, or growing a feature from the other face (a rim extruded up from the
  plate's top rather than from z 0). Avoid a visible 0.5–1 mm offset that adds an unintended ledge. Read
  `boolean_diagnostics` in the timeline: `coplanar_separation` and `tool_nudge`
  events mark these spots.
- **Smooth profiles:** draw a polyline and round its corners with `sketch.fillet {a, b, radius}`
  (or use tangent arcs). Straight segments plus small 3D fillets look faceted.
- **Fillets:** they work only on lines and arcs; **fit-point splines can't be filleted**. An edge
  chain fails when it ends on a face at an angle ("blend's end on its end face"), or next to a
  face narrower than the radius ("rounds would leave openings", e.g. a 1 mm plate). End profiles
  perpendicular to their end faces, and fillet before joining.
- **Rounded part onto a curved wall:** filleting a separate body and then `solid.combine`-ing it
  fails. Join the plain shape first, then fillet.
- **Never let two cuts share a face** (e.g. a channel and a tape zone both with their floor on the
  rail face y = 6): the overlap left open edges in the STL. Draw them as **one polygon, one cut**.
  A cut polygon's edge must not lie on another feature's face either: pull it 0.3 mm short.
- **Don't cut a seat for a fitted part where faces are shared.** Put the level change into the base
  profile instead. Blocks meeting that level use **exactly** the same height: a 0.1 mm step left a
  sliver face that cracked the STL.
- **Form defaults, unless the design calls for otherwise:**
  - **Round the outer silhouette, keep junctions crisp.** Never fillet or chamfer an edge where two
    parts meet flush: the round breaks the surface into a groove. Round only edges that are outside
    corners of the finished, assembled shape.
  - **Align adjoining outlines.** Plate, rim, tower and cap end in the same planes, or one sits
    clearly inside the other. Nothing sticks out by a millimetre or two.
  - **After edits that affect the outline, inspect a suitable top/side screenshot** and check
    alignment. Preserve the live viewport or restore it after an intentional camera change.
  - **Check every part in its full context, accessories included.** Every add-on follows the outline
    of what it attaches to, and every face must hold, guide or close something.
  - **A chamfer or slope runs edge to edge.** It ends on a wall, not 0.2–3 mm short of one,
    and a column under it rises into it instead of stopping flat beneath it.
- **Making a slope meet a wall without slivers:** don't put a profile vertex or edge exactly on
  another feature's edge line. Cut the slope before joining the wall's block, and let it meet the
  underside 0.2 mm inside that block's footprint. Move a cylinder whose axis lies on a wall plane
  0.1 mm off the plane. `timeline.reorder_many {features, position}` moves features safely.
- **`sketch.move` on a line tangent to a fillet arc skews it.** Delete the curves and redraw the
  rectangle, then fillet only the corners you want.
- **An edge split by boolean retries** won't take a single fillet pick at full radius. Add a new
  fillet feature with one pick on each piece.
- **Edit features in place instead of rebuilding:** `timeline.edit {feature, set:{...}}` changes a
  feature's definition and recomputes everything after it.
- **Small faces limit fillets:** an end face 4 mm tall can't take a fillet on its top edge even at
  1.5 mm next to R3 long-edge fillets. Use a 1 mm chamfer there, or make the face taller.
- **Re-cutting an existing void:** a new cut must either fully contain the old void or stay well
  clear (≥ 0.3 mm) of its faces. Width changes inside a slot also need ≥ 0.3 mm steps.
- **Patterns ignore `targets`:** `solid.pattern.circular` of a cut also cut other bodies. Put all
  instances in one sketch and extrude-cut with `targets`.
- **Extruding several closed profiles as `new`** makes one body per region. `solid.combine` them,
  or extrude the regions one by one with `join`.
- **A boss on a rounded rim leaves a ring.** Filleting a plate's top edge and then joining a boss of
  almost the same radius reads as a separate spacer. Make the boss exactly the plate's end radius
  (give its centre as the same expressions as the sketch, `12.6 + 30*cos(25 deg)`, or the union
  fails "no result") and fillet only the back edge and the boss top afterwards. A front-edge fillet
  chain cannot end where a straight side meets a tangent boss ("a vertex of the edge chain where
  other faces meet"). A boss 0.01 to 0.1 mm smaller than the rim, or one starting inside the rounded
  zone, gave non-watertight STLs.
- **Same-radius coaxial cylinders overlapping in height fail to union** (`boolean Union: no result`).
  Stack them touching (base exactly at the other's top, centre by identical expressions) or overlap
  with a radius difference of at least 0.1 mm.
- **Author at the zero pose.** Boxes and cylinders use world coordinates, so with joints driven they
  land off the part. Drive joints back to 0 before editing a component.
- **Edit the timeline in place for restyling:** `timeline.roll_to` a feature, add a fillet or edit
  (`timeline.edit {feature, set}`), `timeline.roll_to` end. Mirrors made from `bodies` follow the
  edited original; a fillet added after the mirror affects only one side, so place it before.
- **`browser.visibility` with `items` can hide occurrences** after a recompute; show them with
  `paths:[[occurrence id]]`.
- **Batch rollback** undoes the whole batch, including `timeline.delete` steps in it. Do deletes
  in their own call, then build.
- **Sketch planes:** on `XZ`, sketch y = world −Z. `solid.box`: length = X, width = Y, height = Z,
  `corner` = min corner.
- `set_parameter` is a tool, not a batch command; in a batch use `parameters.add` / `parameters.change`.
- **Bridged batch timeout:** a step reported as timed out may not have applied. Check the
  timeline before retrying.


## Tool output and inspection

Observed response sizes vary by version and model complexity:
  - `inspect_design` returns the full timeline with `boolean_diagnostics`, even with
    `measure:false, sketches:false` (about 30 KB at 100 features).
  - `body_topology` (138 KB at 400 edges) is saved to a file: query it with `jq` (`edges[].mid`, `start`, `end`, `length`); keep it out of the project.
  - `motion.play` returns every occurrence's pose (about 5 KB for 11 occurrences).
  - `measure {items}` needs an `index`, not just a point.
  - `list_commands` always takes a `filter`.
