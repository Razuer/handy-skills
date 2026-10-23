# Structural sizing and DfAM for 3D printing

Before choosing structural dimensions, estimate loads, stress, and deflection. The numerical
examples below illustrate a preliminary sizing method, not verified material data or rated loads.
Use actual filament/process data and representative tests for the intended service conditions.
Temperature, creep, fatigue, layer adhesion, and stress concentrations can govern the result.

---

## 1. First-Principles Structural Sizing (Stop Overbuilding)

### 1.1 Illustrative material assumptions

These example values assume `0.4 mm` nozzle FDM and `3–4` perimeters. The stress values divided
by an illustrative safety factor of 3 are calculation inputs, not universal design allowables.

| Material | Young's Modulus $E$ | Yield along Perimeters ($\sigma_{y,\parallel}$) | Layer-Bond Tensile ($\sigma_{y,\perp}$) | Design Allowable $\sigma_{\text{allow},\parallel}$ ($SF = 3$) | Design Allowable $\sigma_{\text{allow},\perp}$ ($SF = 3$) |
|---|---|---|---|---|---|
| **PLA / Tough PLA** | `2,800 MPa` | `50 MPa` | `22 MPa` | **`16 MPa`** | **`7 MPa`** |
| **PETG** | `1,900 MPa` | `45 MPa` | `20 MPa` | **`15 MPa`** | **`6.5 MPa`** |
| **ABS / ASA** | `2,000 MPa` | `40 MPa` | `18 MPa` | **`13 MPa`** | **`6 MPa`** |

> **Print orientation:** Prefer continuous extrusions along the dominant tensile load path. Printing a bracket or clamp on its side can help, but check every load direction, overhang, and critical section before selecting the pose.

### 1.2 Cantilever & C-Clamp Bending Check
Choose a peak load $F_{\text{peak}}$ from the intended use and credible shock/misuse cases, acting at lever arm $L$. A multiplier of static weight alone does not establish a shock load. For a simple cantilever approximation:

1. **Bending moment:**
   $$M = F_{\text{peak}} \cdot L \quad [\text{N}\cdot\text{mm}]$$
2. **Required section modulus:**
   $$W_{\text{req}} = \frac{M}{\sigma_{\text{allow}}} \quad [\text{mm}^3]$$
3. **Minimum depth $h$ for a rectangular beam of width $b$ ($W = \frac{b \cdot h^2}{6}$):**
   $$h_{\text{min}} = \sqrt{\frac{6 \cdot W_{\text{req}}}{b}}$$
4. **Tip deflection check ($\delta = \frac{F \cdot L^3}{3 \cdot E \cdot I}$, where $I = \frac{b \cdot h^3}{12}$):**
   Choose allowable deflection from functional clearances and user needs. The worked accessory example uses $1.5\text{ mm}$ at working load and $4\text{ mm}$ at peak load; these are not general limits.

### 1.3 Worked Example: Desk Headphone Holder (v2 Overbuilt vs. v3 Right-Sized)
- **Load:** Headphones weigh $3.5\text{ N}$ ($350\text{ g}$). Design for a **$50\text{ N}$ ($5\text{ kg}$) downward shock load** at $L = 60\text{ mm}$:
  - $M = 50 \times 60 = 3{,}000\text{ N}\cdot\text{mm}$.
  - At $\sigma_{\text{allow}} = 15\text{ MPa}$, required $W_{\text{req}} = \frac{3{,}000}{15} = \mathbf{200\text{ mm}^3}$.
- **Original section (`32 mm` wide × `14 mm` spine):**
  - $W_{v2} = \frac{32 \times 14^2}{6} = \mathbf{1{,}045\text{ mm}^3}$ which exceeds the required `200 mm³` under the same assumptions. This section comparison alone does not establish a safe working load.
- **Pocketed section, `20 mm` wide × `9.5 mm` tall:**
  - Outer envelope $b = 20\text{ mm}, h = 9.5\text{ mm}$ with two recessed side pockets (`depth = 7.8 mm` per side, leaving a `4.4 mm` central web and `2.5 mm` top/bottom flanges):
  - $I_{\text{I-beam}} = \frac{20 \times 9.5^3 - 15.6 \times 4.5^3}{12} = 1{,}310\text{ mm}^4 \implies W = \frac{I}{4.75} = \mathbf{276\text{ mm}^3} > 200\text{ mm}^3$.
  - **Interpretation:** The pocketed section exceeds the required section modulus under these assumptions. Compare actual CAD volume and slicer estimates before claiming material or print-time savings, and check shear, local buckling, and stress concentrations.

---

## 2. Saving Plastic & Slashing Print Time in CAD

### 2.1 Consider channels and pockets for structural efficiency
- Placing material away from the neutral axis can improve bending stiffness per unit mass. Compare section properties and slicer estimates rather than assuming a fixed advantage over infill.
- Consider **recessed side pockets, channels, or filleted cutouts** when a solid section has excess capacity. Recalculate the remaining section and inspect load introduction, shear paths, and local stresses before removing material.
- When `ClampFrame` or `HangerArm` prints flat on its side, side web pockets facing upward (`+Y`) can avoid ceiling overhangs; for the downward-facing side (`-Y`), either keep the pocket shallow with slopes validated for the chosen process or use through-windows / truss slots that go all the way through `Y`.

### 2.2 Quantize Wall Thicknesses to Extrusion Multiples (`n × line_width`)
With a standard `0.4 mm` nozzle (`0.42–0.45 mm` line width), size thin walls, ribs, and webs to integer multiples so the slicer lays down pure perimeters without slow, vibrating gap-fill zigzags:
- **2 perimeters (light cover / flex finger):** `0.85–0.90 mm`
- **3 perimeters (standard structural web / rib):** `1.30–1.35 mm`
- **4 perimeters (heavy flange / boss wall):** `1.70–1.80 mm`
- **6 perimeters (solid load flange):** `2.52–2.70 mm`

Confirm the actual wall toolpaths in the slicer; variable-width extrusion may change this choice.

### 2.3 Support-reduction options for ceilings and holes
1. **Sequential bridging for downward counterbores:**
   A circular hole starting in mid-air on the ceiling of a recessed counterbore prints as spaghetti. Consider two single-layer stepped chord cuts in CAD, `0.20 mm` each only when that matches the intended layer height:
   - Layer 1 bridges two straight parallel chords across the counterbore (`width = inner_hole_Ø`).
   - Layer 2 bridges perpendicular chords (`inner_hole_Ø × inner_hole_Ø` square).
   - Layer 3 starts the round hole on top of that bridged grid.
2. **Sacrificial `0.20 mm` bridge membrane:**
   In a small blind counterbore, consider a one-layer skin across the step, sized to the intended layer height. Verify that it bridges and can be removed without damaging the part.
3. **Truncated teardrop ("flat-roof arch") for horizontal holes:**
   A full 45° pointed teardrop adds `0.414 × r` of extra height. Truncate the apex with a narrow flat chord (`0.3–0.4 × Ø` wide) so the roof bridges in a `2–3 mm` span while keeping the hole compact and self-centering.
4. **Elephant's-foot relief:**
   Consider a small first-layer chamfer on affected outer edges and bores. Choose its size from a calibration print and preserve required bearing/contact surfaces. No fixed chamfer guarantees immunity.

### 2.4 Preliminary serpentine spring sizing
- Model a meander of $n$ beams with round U-turns, printed flat on the bed so bending stresses run along the extrusions.
- For an ideal fixed-guided beam per fold, with $\delta$ as the deflection of each fold and $n$ identical folds acting in series:
  $$\varepsilon_{\text{peak}} = \frac{3 \cdot t \cdot \delta}{L^2} \le \varepsilon_{\text{allow}}, \qquad k_{\text{total}} = \frac{12 \cdot E \cdot I}{n \cdot L^3}$$
- Choose allowable strain from the material, temperature, creep, and cycle-life requirements, then verify the complete flexure.
- Check solid length ($n \cdot t$) against compressed stroke, make `spring_t` a parameter, and draw as lines + 3-point arcs with `thin: true`.

---

## 3. External references for further checking
- **Prusa modeling guidance:** https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135
- **OrcaSlicer wiki:** https://github.com/OrcaSlicer/OrcaSlicer/wiki
- **BYU Compliant Mechanisms Research (Flexures & Living Hinges):** https://compliantmechanisms.byu.edu/
- **HydraResearch FFF design rules:** https://www.hydraresearch3d.com/design-rules
