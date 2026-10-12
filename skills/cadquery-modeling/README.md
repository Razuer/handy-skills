# CadQuery Modeling Agent Skill v2.1

Agent Skill for accurate CadQuery CAD, imported STEP reverse engineering, assemblies, FDM-first design, visual QA and traceable engineering verification.

## Install

Unpack this folder into `.agents/skills/cadquery-modeling/`, `.claude/skills/cadquery-modeling/` or another compatible agent-skill location. Read `SKILL.md` before using. This is an instruction package, not a one-command model generator.

Check dependencies: `python scripts/env_check.py`. Use `requirements.txt` with a compatible interpreter (e.g. `uv venv --python 3.11 .venv && uv pip install --python .venv/bin/python -r requirements.txt`). Wheel availability depends on platform and Python version; Python 3.13 was also validated in the authoring environment.

## What changed since v2.0

- Strict unified manifest-based project checks (`project_validate.py`); per-component STEP/STL pairs mandatory and non-connected printable STL rejected.
- Separate assembly/global-coordinate STEP and manufacturing/print-pose STEP/STL: no false collision tests from origin-overlapping print parts.
- Four acceptance gates (geometry, assembly, function, manufacturing) with explicit UNVERIFIED status and requirement evidence.
- Imported STEP inventory (`step_inspect.py`) with cylindrical surfaces, mounting-plane candidates, bounding boxes, and nearby parts.
- Mechanical checks (`engineering_checks.py`) for clearance, sampled insertion, tool approach and duct aim, with explicit scope limits.
- FDM orientation heuristic (`printability.py`) and OrcaSlicer profile-backed CLI wrapper (`slice_verify.py`) that requires layer review evidence to report PASS.
- Renderer accepts `--preset desk|wall`, custom views, labels, transparent references and explicit multi-axis exploded vectors; font fallback works without DejaVu.
- Environment checker, uv install notes, expanded templates, positive/negative regression cases.

## Quick check

```bash
python scripts/env_check.py
python scripts/smoke_test.py
```

Original six CadQuery API recipes and the two-component rosette remain available. See `references/setup.md`, `references/fdm-first.md` and `references/engineering-validation.md` for new workflows. Render screenshots are not substitutes for visual inspection; topology is not function; slice generation is not actual physical test.
