#!/usr/bin/env python3
"""Inspect the CAD Python environment; no hardcoded Python-wheel compatibility claims."""
import sys, json, importlib, importlib.metadata
names = ['cadquery', 'cadquery-ocp', 'trimesh', 'vtk', 'Pillow', 'numpy']
report = {'python':sys.version.split()[0], 'executable':sys.executable, 'packages':{}, 'errors':[]}
for name in names:
    try:
        version = importlib.metadata.version(name)
        module = 'OCP' if name == 'cadquery-ocp' else 'PIL' if name == 'Pillow' else name
        importlib.import_module(module)
        report['packages'][name] = version
    except Exception as exc:
        report['packages'][name] = None
        report['errors'].append(f'{name}: {type(exc).__name__}: {exc}')
print(json.dumps(report, indent=2))
sys.exit(bool(report['errors']))
