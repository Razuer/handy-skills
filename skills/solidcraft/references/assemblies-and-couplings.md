# Assemblies, tolerances, and couplings in SolidCraft

Load this reference when building multi-part assemblies, joints, snap-fits, swivel pads, hinge pins, or motion studies.

---

## 1. FDM tolerance starting points

These examples assume a `0.4 mm` nozzle and PLA/PETG/ASA. Validate critical interfaces with a
coupon using the intended material, layer height, orientation, and slicer settings. Positive
clearance means the hole is larger than the mating shaft; negative clearance means interference.
Snap undercuts describe retention geometry, not fit clearance or a verified strain limit.

| Interface Type | Radial (per side) | Diametral ($\Delta \varnothing$) | Design Notes |
|---|---|---|---|
| **Press / interference fit (smooth)** | `−0.05–0.00 mm` | `−0.10–0.00 mm` | Sensitive to flow calibration; **prefer Crush Ribs** (below). |
| **Crush-rib press fit (preferred)** | `+0.15 mm` bore + `-0.10 mm` rib | — | Bore has `+0.15 mm` radial clearance; add 3–4 sharp `0.25 mm` longitudinal ribs that deform on press-in. |
| **3D-printed threads (both vertical)** | `0.10–0.125 mm` | `0.20–0.25 mm` | Use when both nut and bolt print with thread axis along printer `Z`. |
| **3D-printed threads (nut horizontal / on side)** | **`0.20–0.25 mm`** | **`0.40–0.50 mm`** | Starting range when internal thread axis prints parallel to bed (e.g. C-clamp on its side). See `threads-and-fasteners.md`. |
| **Damped / positioning hinge (clevis + arm)** | **`0.05–0.08 mm`** pin; **`0.00–0.05 mm`/side** axial | `0.10–0.15 mm` pin; `0.00–0.10 mm` axial | **Light rubbing is desirable:** prevents lever-amplified tip wobble on long arms ($L/w \ge 5$) and holds position smoothly. |
| **Free-spinning swivel (`ClampPad` on screw)** | `0.15–0.20 mm` | `0.30–0.40 mm` | Leave `0.20–0.30 mm` axial play so continuous rotation never binds. |
| **Print-in-place (PiP) articulated joint** | `0.20–0.30 mm` | `0.40–0.60 mm` | Small gaps may fuse; use `45°` conical / double-cone capture. |
| **Snap-fit radial undercut (PETG / PLA)** | `0.35–0.45 mm` (PETG) / `0.25 mm` (PLA) | `0.70–0.90 mm` | `25°–30°` lead-in ramp; `45°` shoulder for removable snaps, `90°` for permanent lock. |

---

## 2. Engineered Mechanical Couplings (Never Leave Parts "Floating")

Provide physical retention against unintended translation or rotation while preserving the intended joint motion. CAD joints alone do not retain real parts. Check thrust faces, shoulders, pins, or other retention features through the full motion range.

### 2.1 Captured Snap-Swivel Pad on a Clamp Screw (`ClampScrew` + `ClampPad`)
A clamp pad must:
1. **Push upward** with high axial force against the desk underside without binding.
2. **Pull downward** when unscrewing so the pad retracts with the screw instead of falling off.
3. **Swivel freely** so the pad stays stationary against the desk while the screw rotates.

**Example geometry for an M12 screw, requiring fit and load validation:**
- **On `ClampScrew` top tip (revolved in one profile):**
  1. **Flat thrust shoulder** at the top of the unthreaded upper neck (`r = 5.6 mm`, `Z = z_thrust`).
  2. **Reduced swivel neck** above the thrust shoulder (`r = 3.4 mm` (`Ø 6.8 mm`), height `2.8 mm`).
  3. **45° underside retention cone** flaring from `r = 3.4 mm` out to `r = 4.5 mm` (`Ø 9.0 mm` button crest, `1.1 mm` tall).
  4. **30°–45° top lead-in taper** from `r = 4.5 mm` (`Ø 9.0 mm`) narrowing to `r = 3.2 mm` at the top tip (`1.8 mm` tall) so it presses smoothly into the socket.
- **Inside `ClampPad` (revolved body + 2 orthogonal slot cuts):**
  1. **Bottom thrust face** (`Z = z_thrust`) rests directly on the screw's `r = 5.6 mm` thrust shoulder during upward clamping, so clamping force goes straight through solid compression rather than through the snap lip.
  2. **Internal retaining throat** (`r = 3.65 mm` (`Ø 7.3 mm`), `2.5 mm` tall) with a `45°` entry chamfer below and a **`45°` upper retention seat** above. This gives `0.25 mm` radial swivel clearance around the `r = 3.4 mm` neck and a **`0.85 mm` diametral (`0.425 mm` radial) snap undercut** under the `r = 4.5 mm` button.
  3. **Upper button cavity** (`r = 4.75 mm` (`Ø 9.5 mm`)) with `0.3 mm` axial clearance so the button spins without rubbing.
  4. **Two orthogonal relief slots (`1.8 mm` wide)** cut across the lower socket boss, splitting it into **4 compliant collet fingers** that flex outward during snap-in.
  5. **Concentric grip rings or chevron grooves** (`0.6 mm` deep) on the top face of `ClampPad` so it grips the desk without slipping.

### 2.2 Tool-Free Slotted Snap Clevis Pin (`PivotPin`)
Instead of a loose rod that slides out of a hinge:
- **Head flange** on the entry side (`Ø = bore_Ø + 3.5 mm`, `1.8 mm` thick) recessed or flush with the outer clevis ear.
- **Smooth bearing shaft** (`Ø = bore_Ø - 0.15 mm` for a close-fit positioning hinge, e.g. `Ø 6.05 mm` in a `Ø 6.2 mm` bore).
- **4-Prong Slotted Snap Crown** on the exit end:
  - Starts `0.1 mm` past the outer ear face with a `45°` retention shoulder stepping out by `+0.35 mm` radially (`+0.70 mm` Ø), followed by a `30°` conical insertion nose back down to `bore_Ø - 0.6 mm`.
  - Cut **two orthogonal `1.4 mm` wide slots** (`10–12 mm` deep into the shaft, with their floors staggered by `0.5 mm` or drawn as one 12-point cross polygon so two cuts never share a floor face) so the 4 prongs bend easily during insertion and snap outward to lock the pin axially.

### 2.3 Positioning Hinges vs. Free-Spinning Joints (Why Light Rubbing Beats Loose Play)
- **The lever-amplification trap:** On a cantilever arm of length $L$ and hub width $w$ (e.g. $L = 64\text{ mm}, w = 9\text{ mm} \implies L/w \approx 7$), an axial clevis clearance of `0.30 mm` per side (`0.60 mm` total) plus `0.30 mm` pin clearance multiplies by $7\times$ into **`3–4 mm` of cheap-feeling lateral tip wobble**.
- **Starting choice:** Larger running clearances such as `0.20–0.30 mm` may suit continuously spinning parts (`ClampPad` swiveling on `ClampScrew`, gears, rollers).
- For **manually positioned hinges (`HangerArm`, folding hooks, adjustable stands)**, design for **light rubbing / compliant preload (`0.00–0.05 mm` per side)**:
  - Model a **`0.10–0.15 mm` raised annular friction boss** (`Ø = bore_Ø + 6 mm`) on the inner faces of the clevis ears around the pivot hole where the axial gap to the arm is **`0.00–0.05 mm` per side** (or `0.05 mm` across the flat knuckle), while the rest of the slot has `0.15 mm` relief.
  - Compliant clevis ears can preload the arm, but verify insertion force, strain, creep, wear, and holding torque. Preload alone does not guarantee stable positioning.

### 2.4 Stowed-Envelope Ergonomics & Real-World Desk Sizing
- **Check where a mechanism goes when folded/stowed:** Never design an under-desk folding arm that folds **upward (`-90°`)** so its tip pokes `30–50 mm` *above* the tabletop into the user's wrist/mouse/cable zone!
  - Instead, either:
    1. **Fold downward (`+90°`) under the desk:** Place the pivot near the top of the clevis and the solid rotational stop shelf *below* the knuckle so the arm rests on the lower shelf when horizontal (`0°`) and folds straight **downward alongside the clamp screw underneath the desk** (`0 mm` peeking above the upper jaw), OR
    2. **Swivel horizontally (`Z`-axis) underneath the desk apron**, OR
    3. Use a **fixed low-profile sculpted hook** if folding adds height without saving usable space.
- **Size clamp jaws to the actual mounting surface.** Measure or obtain the thickness range,
  edge profile, apron clearance, and contact-pad needs. A `15–36 mm` grip range is one possible
  accessory specification, not a claim about market coverage. Keep jaw opening and throat depth
  as separate parameters and verify both at the required extremes.

---

## 3. SolidCraft assembly and motion workflow

The commands and joint conventions below describe earlier builds. Check installed schemas and verify resulting poses before applying them to another version.

1. **Build bodies in the root, then structure:**
   - `component.create {name, parent:"root", activate:false}` and `component.move_bodies {bodies, component}`.
   - One component per printed part, plus one each for reference/purchased parts and fit coupons (hidden).
   - There is no reparent command: plan the component hierarchy before moving bodies.
2. **Ground the frame:** `occurrence.ground {"occurrence":"ClampFrame:1", "grounded":true}`.
3. **Joints:**
   - Origins as `point` + `z` on both sides, the intended world point. Choose `flip` from the joint axes and verify the resulting pose; earlier examples used `flip: true`.
   - Slider positive value is along its `z`: point `z` toward travel direction, limits `[[0, stroke]]`.
   - Pass `quiet: true` to skip the DOF list in every reply.
4. **Verify each joint:**
   - `occurrence.properties` bbox before and after joining must match.
   - `joint.drive` to limits and verify moved bbox against calculated coordinates; reset to `0` afterwards.
5. **Assemblability & Insertion Path Check:**
   - Check how each part gets *into* the assembly, not just how it moves once installed.
   - Verify with `inspect.section {"plane":"YZ","at":0}` (and `{"clear":true}` after) plus `inspect.interference` while threads are `modeled: false`.
6. **Animation Export:**
   - Hide joint glyphs (`browser.visibility {"folder":"joints","visible":false}`), run `motion.export_animation {study, path:".../motion.gif", grid:false}`, and reset `motion.play` to step `0` before saving.
