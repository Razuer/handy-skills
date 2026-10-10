# CadQuery Modeling Agent Skill

Portable [Agent Skills](https://agentskills.io/) package focused **exclusively on CadQuery**, Python, and the OpenCascade/OCP B-Rep kernel. Other technologies (`trimesh`, `VTK`, `Pillow`) are **verification/rendering utilities**, not interchangeable modeling backends.

It teaches: CadQuery Workplanes and context-solid behavior; selectors; sketches; holes; revolutions; lofts; sweeps; shelling; patterned features; multipart assemblies; STEP/STL export; topology, interference and print checks; automated multi-view rendering **plus mandatory human/agent image inspection**.

## Install dependencies

The official CadQuery documentation recommends conda/mamba as a mature installation route. For a standalone environment:

```bash
# option A (Miniforge/mamba, if installed):
mamba create -n cadquery-skill -c conda-forge python=3.11 cadquery trimesh vtk pillow -y
mamba activate cadquery-skill

# option B (venv/pip, dependent on compatible platform wheels):
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install cadquery trimesh vtk pillow
```

Python 3.13.5 + CadQuery 2.8.0 were tested in the authoring environment; use a platform-supported Python/wheel combination if installing elsewhere. Optional viewer: [CQ-editor](https://cadquery.readthedocs.io/en/latest/installation.html). `show_object(...)` is CQ-editor-specific, not a default `python` global; the included VTK renderer works with exported STEP instead.

## Quick start

Run these from the directory containing `SKILL.md`:

```bash
python scripts/cadquery_recipes.py --out-dir examples/recipe-output
python scripts/example_rosette.py --out-dir examples/rosette-new
python scripts/audit.py examples/rosette-new/rosette_assembly.step --expected-solids 2 --check-intersections
python scripts/audit.py examples/rosette-new/rosette_left.stl examples/rosette-new/rosette_right.stl
python scripts/render.py examples/rosette-new/rosette_left.step examples/rosette-new/rosette_right.step --out-dir examples/rosette-new/renders --explode 8
python scripts/smoke_test.py
```

**Open and visually inspect** `examples/rosette-new/renders/contact_sheet.png`. These tools do not automatically understand if a design is attractive, printable, retains its snap fit or is assembled correctly.

## Contents

- `SKILL.md` — concise agent execution rules and navigation
- `references/cadquery-fundamentals.md` — Workplane/Shape/Sketch/Assembly, axes, selectors, parametric source
- `references/cadquery-api-cookbook.md` — tested CadQuery commands and patterns
- `references/cadquery-assemblies-exports.md` — multi-part assembly, STEP/STL, unit semantics
- `references/cadquery-debugging.md` — fillets, booleans, lofts, shells, selectors, rendering troubleshooting
- `references/validation.md`, `visual-qa.md`, `manufacturing.md` — independent validation gates
- `scripts/cadquery_recipes.py` — six working geometry patterns, standalone exportable solids
- `scripts/example_rosette.py` — full two-part parametric worked example
- `scripts/audit.py`, `render.py`, `smoke_test.py` — measurable geometry QA and real images
- `examples/output/` — tested rosette STEP, STL, QA JSON and rendered views
- `assets/` — customizable job intake and visual-review templates

## Install into an agent

Copy the entire `cadquery-modeling/` folder (not only `SKILL.md`), for example:

- Codex or shared repo agent skill: `.agents/skills/cadquery-modeling/`
- Claude Code: `.claude/skills/cadquery-modeling/`
- Cursor: `.cursor/skills/cadquery-modeling/`

Supported discovery/reload behavior varies between agents. **Downloading this package does not persistently install the skill in ChatGPT.**

## QA status vocabulary

Use distinct statements for `SCRIPT PASS`, `BREP PASS`, `EXPORT PASS`, `VISUALLY REVIEWED` (by actually seeing PNGs) and `PRINT TESTED` (physical prototype). Automated PNG generation only means `RENDER GENERATED`; it is not visual approval.

### Verified recipe gallery

`examples/recipe-output/renders/recipe_gallery.png` shows all six constructions generated from **re-imported STEP files**. Do not use a rendered image in place of CAD geometry assertions.
