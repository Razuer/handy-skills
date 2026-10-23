# Printed threads and fasteners in SolidCraft

Load this reference whenever a design uses `solid.thread`, `solid.coil`, lead screws, clamp screws, threaded caps, captive nuts, or self-tapping fasteners.

---

The dimensions below are starting points for a `0.4 mm` nozzle and `0.16–0.20 mm` layers,
not guaranteed fits. Print a representative thread coupon in the intended material and orientation
before committing to a close fit. Cooling, flow, shrinkage, and bridging affect the result.
Engine implementation notes describe observed versions; verify behavior on the installed release.

## 1. Why print orientation controls thread clearance

A previously recorded `desk-headphone-holder` build bound with a `0.10 mm` radial offset and `0.20 mm` diametral clearance. Its print orientations differed:
- `ClampScrew` was printed **vertically** (thread axis = printer `Z`), so its threads were clean horizontal rings.
- `ClampFrame` was printed **flat on its side** (for maximum C-clamp bending strength), meaning the internal threaded bore (`JawInternalThread`) was printed **horizontally** (thread axis $\perp$ printer `Z`)!
- In a **horizontal internal threaded bore**:
  1. The roof of the hole (`+Y` in world coords when lying on its side) is a steep `60°–90°` arch overhang. Sag can pull the extruded thread crests into the bore; its magnitude depends on bridging and cooling.
  2. Layer stair-stepping at the roof and floor can further reduce the effective bore diameter.
  3. Combined, these effects can consume the designed clearance. Use a coupon to choose the actual offset rather than assuming a fixed loss.

### 1.1 Thread Clearance Table by Print Orientation (`0.4 mm` Nozzle, `0.16–0.20 mm` Layers)
| Internal (Nut) Pose | External (Screw) Pose | Radial Offset (per wall) | Diametral Clearance ($\Delta \varnothing$) | Example Designation Pair (`M12x2`) |
|---|---|---|---|---|
| **Vertical** (`Z` = axis) | **Vertical** (`Z` = axis) | `0.10–0.125 mm` | `0.20–0.25 mm` | Nut `M12x2` (`Ø10.0` hole) + Screw `M11.75x2` (`Ø11.75` shaft) |
| **Horizontal** (on side) | **Vertical** (`Z` = axis) | **`0.20–0.25 mm`** | **`0.40–0.50 mm`** | Nut `M12x2` (`Ø10.0` hole) + Screw **`M11.55x2`** (`Ø11.55` shaft) + **Roof/Floor Crest Relief** |
| **Horizontal** (on side) | **Horizontal** (D-cut bolt) | **`0.225–0.25 mm`** | **`0.45–0.50 mm`** | Nut `M12x2` (`Ø10.0` hole) + Screw **`M11.5x2`** (`Ø11.5` shaft) |

### 1.2 Horizontal bore crest relief
When a part with an internal thread (`ClampFrame`) prints on its side (so world `Y` is the printer's vertical `Z` axis, and the thread axis is world `Z`):
- The thread teeth on the **left and right walls (`±X`)** have less roof overhang and can retain useful thread engagement.
- The thread crests at the **top and bottom poles (`±Y`)** are the sagging roof and bridged floor in the printer.
- **CAD Fix:** In addition to using **`0.225 mm` radial (`0.45 mm` diametral) thread offset** on the screw, cut a narrow **crest-relief slot or elongated bore** at the `±Y` poles of the nut hole (e.g., `width_X = 4.0 mm`, `height_Y = tap_drill_Ø + 0.6 mm` = `10.6 mm` on an `M12x2` `Ø10.0` hole) **after** `solid.thread` (or use a `45°` teardrop crown at `±Y`).
  - This example relieves `0.30 mm` at the roof/floor poles. Check the remaining engagement and local stresses; relief changes the load-bearing area.
  - Consider a **`0.8–1.0 mm × 45°` lead-in chamfer** at bore entries and the screw tip where wall thickness allows. Apply bore chamfers after modeling the thread if required by the engine workaround below.

---

## 2. Size printed threads for the actual load

- For typical `0.4 mm` nozzle FDM, M8 and larger coarse threads are useful starting candidates.
  Smaller threads need process-specific evaluation; consider metal fasteners or inserts.
- For desk accessories, `M12 × 2` or `M12 × 1.75` may fit more compactly than an M16 screw.
  Choose diameter and pitch from the required force, root section, engagement length, stripping
  resistance, and surrounding jaw strength. A nominal diameter alone gives no verified capacity.
- Coarse pitch leaves more engagement after a clearance offset, but tooth overlap does not prove
  resistance to stripping. Account for print orientation, material, creep, and repeated use.
  Validate the fit with a coupon and the function with an appropriate physical test.

---

## 3. SolidCraft `solid.thread` Mechanics & Engine Traps

### 3.1 How to Apply Custom Radial Clearance in `solid.thread`
In SolidCraft (`crates/doc/src/eval.rs`), `parse_metric_thread` parses **any decimal `M<major>x<pitch>` string** (e.g. `"M12x2"`, `"M11.55x2"`):
1. **Internal thread (Nut / Jaw):**
   - Cut hole at tap drill diameter $D_{\text{tap}} = D_{\text{major}} - P$ (e.g. `10.0 mm` for `M12x2`).
   - Run `solid.thread {"face":[x,y,z], "designation":"M12x2", "modeled":true}`.
   - SolidCraft cuts outward from `r = 5.0 mm` to major radius `r = 6.0 mm`.
2. **External thread (Screw with radial clearance $c_{\text{rad}}$, diametral $\Delta D = 2 \cdot c_{\text{rad}}$):**
   - Revolve or extrude the screw shaft at diameter $D_{\text{shaft}} = D_{\text{major}} - \Delta D$ (e.g. `11.55 mm` (`r = 5.775 mm`) for $c_{\text{rad}} = 0.225\text{ mm}$).
   - Run `solid.thread {"face":[x,y,z], "designation":"M11.55x2", "modeled":true}`.
   - SolidCraft cuts inward from `r = 5.775 mm` with the exact same `2.0 mm` pitch and `60°` flank angle, shifting crest, root, and both flanks inward by `0.225 mm` radially!

### 3.2 Trap 1: Open-End Helix Overrun (`s0 = t.start - pitch`) Breaks STL Watertightness
- On any free end of a threaded cylinder (`open.0` / `open.1`), `thread_groove` (`crates/doc/src/eval.rs:366`) extends the helical cutter by **one full pitch (`s0 = t.start - pitch`, `s1 = t.end + pitch`)** into open air so the groove runs out cleanly.
- **Trap:** If an adjacent feature (such as a screw knob's top face or a flange) sits at `t.start - pitch` (e.g. threaded shaft starts at `Z = 55`, pitch `= 2`, knob top at `Z = 53`), the helix end-cap lands **coplanar** with that face and leaves **24 open boundary edges (`is_watertight = False`)** in the exported STL.
- **Fix:** Leave an unthreaded neck gap strictly larger than `1 × pitch` (e.g. **`≥ 1.5 × pitch`**, such as `3.0–3.5 mm` between the knob top and the start of the threaded shaft) with the neck radius slightly smaller than the thread root radius ($r_{\text{neck}} \le r_{\text{root}} = \frac{D_{\text{shaft}}}{2} - \frac{5\sqrt{3}}{16} P$).

### 3.3 Trap 2: Whole-Body Faceting (`faceted_boolean`) & `inspect.interference` Hang
- `solid.thread {modeled: true}` calls `kernel::faceted_boolean(&mb.body, &groove, BoolOp::Cut, t.pitch * 0.005)`, which tessellates **every curved face on the entire target body** into `3,500–6,000` planar facets.
- **Use cosmetic threads for initial interference checks.** Earlier builds stalled on B-rep booleans between thousands of facets. Recheck this limitation on newer versions before running expensive modeled-thread checks.
### 3.4 Trap 3: Keep `solid.thread` Major Diameter Inside Flat Entry/Exit Faces
- Never place a threaded hole where its **major diameter (`D_major`)** touches or crosses a nearby fillet, chamfer, or sloped wall at the entry or exit face (for example, an `M12x2` hole (`r_major = 6.0 mm`) centered `9.5 mm` from a wall that has an `R = 4.5 mm` fillet ending `4.5 mm` from the wall, leaving only `5.0 mm < 6.0 mm`).
- When the outward-cutting thread groove intersects a curved fillet or chamfer at the cylinder's end, `faceted_boolean` fails with `planar boolean: This shell is not oriented and closed`.
- **Fix:** Do not chamfer the tap hole before `solid.thread`, and keep the hole center at least `r_major + 1.5 mm` clear of any adjacent fillet tangent edge.

### 3.5 Verified method: thread a separate tool body, then combine (gravity-clamp-holder)
Found while building an 8-screw, 4-nut printed mechanism. Re-check on newer releases.
- **Only one modeled thread per body.** A second `solid.thread` on a body fails with `no cylindrical face there to thread` (the first one faceted the body). Threads cannot be patterned or mirrored. Mirror the geometry **before** cutting threads.
- **Female threads (many holes):** make each as its own body: `solid.cylinder {radius: major/2, operation:"new", body_name:"TapN"}`, `solid.thread {face, designation:"M8x1.25", modeled:true}` on it, then `solid.combine {target:part, tools:["TapN"], operation:"cut"}`. A few seconds per hole, up to ~25 s for several on a big plate. The drill depth is the tool's length; the tool's far end is the blind bottom.
- **External thread that must run up to a shoulder:** do not thread the screw body (the cutter overruns one pitch into the shoulder and notches it, see 3.2). Instead build the threaded tip as a separate body, 0.3–0.5 mm longer than the visible thread so it overlaps into the shoulder, chamfer its free end, thread it alone (both ends then run out in air), and `solid.combine join` it into the screw. Result: the thread meets the shoulder face with no notch and no undercut neck. An undercut neck (radius at or below the thread root, at least 1.5 pitch long) also works but costs thread length.
- **Verify a thread with sections, measured from the TRUE axis.** Slice the exported STL (`trimesh` section) and compute radius from the axis point. Radius from the slice centroid is wrong for a helix (centroid sits off axis) and wrongly suggests clipped crests. Expect crest = major/2 and root = major/2 - 0.54 P (M8x1.25: 3.875 / 3.20).
- **Fillets and threads:** a thread facets the whole body afterwards, so every fillet must come earlier in the timeline (`timeline.roll_to` the feature before the thread, add the fillet, roll to end). Some blends then break the STL (non-watertight, "degenerate faces"): re-run the mesh audit after any restyle.

---

## 4. Small Fasteners (`M2–M5`) & High-Tension Bolts
- **Horizontal D-cut bolts:** When a printed bolt needs high axial tensile strength, orient it flat on the bed and slice `15–20%` flat chords off the top and bottom (`D-cut` / double-flat shaft). Continuous strands run the full length of the bolt, and it still threads cleanly into a standard nut.
- **Trilobular / 3-rib self-tapping bores (`M2–M4`):** Model bore at `major_Ø + 0.1 mm` with 3 longitudinal inward lobes cresting at `major_Ø - 0.8 * pitch` so metal screws form threads without splitting layers.
- **Captive hex nut pockets:** Size across-flats `+0.15 to +0.20 mm` over nominal; use a side-entry slot or top-up mid-print pause pocket.
