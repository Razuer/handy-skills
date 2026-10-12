# Visual verification standard for CAD agents

## Required camera captures

- `iso`: silhouette, relative proportions, overall aesthetic and construction.
- `front` / `back`: primary appearance and reverse-side mounting features.
- `top` / `right`: symmetric holes, section widths, side walls, flange thickness, and disconnected parts.
- `bottom`: mating tabs, underside reliefs and print-bed face.
- `exploded_iso`: multiple parts visibly separated along an informative axis **without changing their true assembled coordinates** in source CAD.
- `section`: when something hidden could fail (snap pocket depth, nested wall, inaccessible screw). Create with CAD intersection/cutaway, or use a sectional viewer; orthographic renders cannot establish interior geometry.

## Visual iteration contract

1. Generate *real* CAD geometry; verify no errors.
2. Run render CLI. Do not substitute a description of intended geometry for the image.
3. Open `contact_sheet.png` with a vision-capable tool and inspect at original size. Open individual PNGs for detail; inspect primary aesthetic face and the functional reverse.
4. Write findings: `[severity] view -> observed defect -> expected behavior -> proposed modeling action`. Distinguish observed visual facts from spec guesses.
5. Fix and regenerate **all relevant views**, not only the one that failed. Repeat until no remaining P0/P1 visual defects.
6. Check that the visible render matches the last exported STEP/STL (prefer render from reimported STEP rather than in-memory source).
7. If image output is unavailable, state `VISUAL NOT VERIFIED`; do not claim it looks good.

## Useful design red flags

- floating pieces or stepped/sliced layers masquerading as a continuous helix
- pin accidentally on the visible side, undercut unreachable in assembly
- split line crossing decorative high-contrast features unnecessarily
- near-0-thickness wall, sharp untreated outer edge, blocked pipe opening
- unexpected voids, wrong orientation, face hiding a missing part
- aesthetics approved from top view only, no rear underside inspection

## Bundled renderer

`python scripts/render.py a.step b.step --out-dir renders --explode 8` uses VTK offscreen, with fixed camera definitions and consistent framing, producing six static views plus contact sheet, and an exploded isometric (only when >1 solid and `--explode > 0`). VTK 9.5+ supports modern headless rendering in many supported environments; for older/container setups EGL or virtual display libraries may be needed. Use the PNGs as actual evidence, not a promise to the user.

Legacy `--explode` offsets parts along X; `--explode-plan` supports individual XYZ offsets. Both are **for presentation only**, not assembly motion simulation. Use the original STEP coordinates for mating/collision tests.

## v2.1 cameras, reference assemblies, explosions and fonts

- `--preset wall`: XY wall plane, positive Z faces viewer; `--preset desk`: XY desk, positive Z up. `--camera-json views.json` overrides camera direction/up pairs (must include `iso`).
- `--labels` shows per-solid identifiers (file-stem + solid index); match numbered STEP inventory to the render.
- `--reference reference.step` draws contextual assembly components with reduced opacity. True sectioning/inner cavity checks require separate CAD analytical section or a specifically modeled clipped view; transparency alone does not prove internal wall integrity.
- `--explode-plan explode.json`: mapping `{"base:0":[-25,0,0],"cradle:0":[0,0,18],"strut:0":[12,0,35]}` where keys match imported model labels. This is **visualization only**, never assembly-path proof. `--explode 10` retains legacy X-only separation for quick checks.
- Missing DejaVu/Noto font is not a fatal error: Pillow built-in font fallback. If `vtk` rendering fails headless, preserve the failure and use supported EGL/OSMesa/X backend; never claim images were visually inspected without viewing them.

Mandatory inspection: main front/isometric, back/underside, assembled context, hidden joints/access, print-bed orientation, visual seams/finish, relevant functional close-up and any exported cutaway. Record defects and edits before approval.
