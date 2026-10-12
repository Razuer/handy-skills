# Installation and Python environments

First run `python scripts/env_check.py`. Required: CadQuery, OCP (cadquery-ocp), NumPy, Trimesh, VTK, Pillow. The Python version supported by binary OCP wheels changes; **do not assert that Python 3.12+ is always unsupported**—this skill was also exercised on Python 3.13 with CadQuery 2.8.0. If install fails choose a supported interpreter according to *current* wheel availability.

Example provision using `uv`:

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python scripts/env_check.py
.venv/bin/python scripts/smoke_test.py
```

On Windows substitute `.venv\\Scripts\\python.exe`. Try a recent compatible interpreter if 3.11 isn't available. Requirements use bounded dependency ranges rather than unverifiable system-specific locks; for production reproducibility record working `uv pip freeze` and lock your selected versions. The skill does not download fonts; the renderer falls back to Pillow's built-in font.

If VTK headless rendering fails due to EGL/X dependencies, document the error and configure appropriate display/OSMesa/EGL support or another rendering worker. Never report visual review PASS without seeing actual images.
