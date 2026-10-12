#!/usr/bin/env python3
"""Mandatory CadQuery project gate: paired CAD exports + separate engineering evidence.

Use --manifest <project.json>. PASS means each applicable requirement has evidence;
UNVERIFIED is not success and exits 2 by default. Never interpret unknown as PASS.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import subprocess
import sys

CATEGORIES = ('geometry', 'assembly', 'function', 'manufacturing')


def normalize_file(root: Path, value: str) -> Path:
    result = (root / value).resolve()
    if not result.is_file():
        raise FileNotFoundError(str(result))
    return result


def check_report(root: Path, args: list[str], *, expected_pairs: int = 0) -> dict:
    command = [sys.executable, str(Path(__file__).with_name('audit.py')), *args]
    p = subprocess.run(command, cwd=root, capture_output=True, text=True)
    try:
        result = json.loads(p.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f'Audit unavailable (exit {p.returncode}): {p.stderr[-1000:]}') from exc
    if len(result.get('step_stl_comparisons', [])) != expected_pairs:
        result.setdefault('errors', []).append(
            f'Expected {expected_pairs} STEP/STL comparisons, got {len(result.get("step_stl_comparisons", []))}')
    return result


def gate(items: list[dict]) -> str:
    if any(x['status'] == 'FAIL' for x in items):
        return 'FAIL'
    if any(x['status'] == 'UNVERIFIED' for x in items) or not items:
        return 'UNVERIFIED'
    return 'PASS'


def validate(manifest: Path) -> dict:
    root = manifest.resolve().parent
    doc = json.loads(manifest.read_text())
    output = {'manifest': str(manifest), 'categories': {}, 'checks': [], 'errors': [],
              'rules': 'PASS only with required positive evidence; no inferred print-fit/functional claims'}
    checks = {category: [] for category in CATEGORIES}
    def add(category: str, name: str, status: str, detail: str):
        rec = {'category': category, 'name': name, 'status': status, 'detail': detail}
        checks[category].append(rec)
        output['checks'].append(rec)

    parts = doc.get('parts', [])
    if not parts:
        add('geometry', 'parts declared', 'FAIL', 'No components listed')
    seen = set()
    part_records = []
    for part in parts:
        name = part.get('name', '')
        if not name or name in seen:
            add('geometry', 'unique part names', 'FAIL', f'Missing or repeated name {name!r}')
            continue
        seen.add(name)
        stl = None
        try:
            step = normalize_file(root, part['manufacturing_step'])
            stl = normalize_file(root, part['manufacturing_stl'])
            if step.stem != stl.stem:
                # Accept explicit mapping in manifest; copies with matching stem in temp aren't needed.
                pass
            result = check_report(root, [str(step), str(stl), '--expected-solids', '1',
                                         '--expected-components-per-stl', '1'], expected_pairs=1 if step.stem == stl.stem else 0)
            if step.stem != stl.stem:
                add('geometry', f'{name}: STEP/STL pair', 'FAIL',
                    'Manufacturing STEP and STL need matching stems for enforced round-trip comparison')
            else:
                add('geometry', f'{name}: STEP/STL pair',
                    'FAIL' if result['errors'] else 'PASS', '; '.join(result['errors']) or 'B-Rep, STL, and paired size/volume audit passed')
        except (KeyError, ValueError, OSError, RuntimeError) as exc:
            add('geometry', f'{name}: exports', 'FAIL', str(exc))

        manufacturing = part.get('print', {})
        transform = manufacturing.get('assembly_to_manufacturing_transform')
        transform_ok = False
        try:
            import numpy as np
            mat = np.asarray(transform, dtype=float)
            if mat.shape != (4,4) or not np.all(np.isfinite(mat)) or not np.allclose(mat[3], [0,0,0,1], atol=1e-6):
                raise ValueError('Expected finite homogeneous rigid 4x4 transform')
            rot = mat[:3,:3]
            if not np.allclose(rot.T@rot, np.eye(3), atol=1e-5) or not np.isclose(np.linalg.det(rot), 1, atol=1e-5):
                raise ValueError('Transform is not an orthonormal proper rotation')
            transform_ok = True
        except (ValueError, TypeError, KeyError) as exc:
            add('assembly', f'{name}: pose mapping', 'UNVERIFIED', f'Absent/invalid assembly-to-print rigid transform: {exc}')
        if not manufacturing.get('orientation_reason') or not manufacturing.get('build_direction') or not transform_ok:
            add('manufacturing', f'{name}: intentional print orientation', 'UNVERIFIED',
                'Specify print.build_direction and print.orientation_reason; STL must be manufacturing-pose')
        else:
            add('manufacturing', f'{name}: intentional print orientation', 'PASS',
                f"{manufacturing['build_direction']} — {manufacturing['orientation_reason']}")
        part_records.append((part, stl, mat if transform_ok else None))
        try:
            pm = normalize_file(root, part['printability_report'])
            record = json.loads(pm.read_text())
            if stl is None:
                add('manufacturing', f'{name}: printability scan', 'UNVERIFIED', 'Print STL unavailable')
            elif record.get('model') and Path(record['model']).resolve() != stl.resolve():
                add('manufacturing', f'{name}: printability scan', 'FAIL', 'Scan is for a different STL')
            else:
                add('manufacturing', f'{name}: printability scan', 'PASS' if record.get('status') == 'ANALYZED' else 'FAIL',
                    'Mesh orientation heuristics recorded (not slicer verification)')
        except (KeyError, OSError, ValueError) as exc:
            add('manufacturing', f'{name}: printability scan', 'UNVERIFIED', str(exc))
        try:
            sr = normalize_file(root, part['slicer_report'])
            report = json.loads(sr.read_text())
            if (report.get('status') == 'PASS' and report.get('profile_files')
                    and report.get('sliced_model') == str(stl)
                    and report.get('layer_review_evidence')
                    and Path(report['layer_review_evidence']).is_file()):
                add('manufacturing', f'{name}: slicer execution', 'PASS', 'CLI sliced using declared profiles')
            else:
                add('manufacturing', f'{name}: slicer execution', 'UNVERIFIED', 'No passing matching profile-backed slice report')
        except (KeyError, OSError, ValueError):
            add('manufacturing', f'{name}: slicer execution', 'UNVERIFIED', 'No slice report for actual profile/settings')

    assembled = doc.get('assembled_steps', [])
    if len(parts) > 1:
        if len(assembled) != len(parts):
            add('assembly', 'assembly coordinate frame', 'FAIL',
                'Provide ONE distinct global-pose STEP per component in assembled_steps (not manufacturing STEP files)')
        else:
            try:
                files = [normalize_file(root, f) for f in assembled]
                a = check_report(root, [*[str(f) for f in files], '--expected-solids', str(len(parts)),
                                        '--check-intersections'])
                pairs = a.get('pair_intersection_mm3', [])
                # Pose consistency verifies transformed solid centroids/volume, not full surface identity.
                # Full B-Rep shape correspondence requires CAD-specific tests beyond this generic gate.
                for (part, local_stl, matrix), assembled_file in zip(part_records, files):
                    if matrix is None:
                        continue
                    try:
                        import numpy as np
                        import cadquery as cq
                        manufactured = cq.importers.importStep(str(normalize_file(root,part['manufacturing_step']))).solids().val()
                        assembled = cq.importers.importStep(str(assembled_file)).solids().val()
                        centroid = np.array(assembled.Center().toTuple())
                        predicted = matrix[:3,:3]@centroid + matrix[:3,3]
                        actual = np.array(manufactured.Center().toTuple())
                        difference = np.linalg.norm(actual-predicted)
                        fraction = abs(assembled.Volume()-manufactured.Volume())/max(1.0,assembled.Volume())
                        add('assembly', f"{part['name']}: pose transform consistency",
                            'PASS' if difference < .15 and fraction < .005 else 'FAIL',
                            f'centroid residual {difference:.5g} mm, volume residual {fraction:.4%}; checks mapping plausibility, not full exact surface identity')
                    except Exception as exc:
                        add('assembly', f"{part['name']}: pose transform consistency", 'FAIL', str(exc))
                add('assembly', 'assembled pose collisions', 'FAIL' if a['errors'] or len(pairs) != len(parts)*(len(parts)-1)//2 else 'PASS',
                    '; '.join(a['errors']) or f'{len(pairs)} pairwise intersection checks in global assembly frame')
            except (OSError, ValueError, RuntimeError) as exc:
                add('assembly', 'assembled pose collisions', 'FAIL', str(exc))
    else:
        add('assembly', 'single independent part', 'PASS' if parts else 'FAIL', 'No multi-body pose collisions required')

    # Explicit requirements: unlisted requirements never silently pass.
    requirements = doc.get('requirements', [])
    for req in requirements:
        category = req.get('category')
        if category not in CATEGORIES:
            add('geometry', 'requirements schema', 'FAIL', f'Unknown category {category!r}')
            continue
        status = req.get('status', 'UNVERIFIED')
        if status not in ('PASS', 'FAIL', 'UNVERIFIED'):
            status = 'FAIL'
        evidence = req.get('evidence', '')
        if status == 'PASS':
            if not evidence or not req.get('method'):
                status = 'FAIL'
                detail = 'Claimed PASS requires method and existing evidence file'
            else:
                try:
                    normalize_file(root, evidence)
                    detail = str(evidence)
                except OSError:
                    status = 'FAIL'
                    detail = f'Evidence does not exist: {evidence}'
        else:
            detail = str(req.get('note') or 'Not demonstrated')
        add(category, req.get('id', 'unnamed requirement'), status, detail)
    for cat in ('function',):
        if not any(r.get('category') == cat for r in requirements):
            add(cat, 'functional requirements', 'UNVERIFIED', 'No objective functional evidence supplied')
    if not any(r.get('category') == 'assembly' for r in requirements) and len(parts) > 1:
        add('assembly', 'assembly path, fastener access, retention', 'UNVERIFIED',
            'Collision-free final pose does not verify insertion/motion, fastener accessibility or retention')
    if not any(r.get('category') == 'manufacturing' for r in requirements):
        add('manufacturing', 'physical fit / strength', 'UNVERIFIED',
            'Slicing does not establish real printed fit or service performance')
    for category, entries in checks.items():
        output['categories'][category] = {'status': gate(entries), 'checks': entries}
    output['overall'] = gate([{'status': x['status']} for x in output['categories'].values()])
    return output


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--json', type=Path)
    p.add_argument('--allow-unverified', action='store_true', help='exit 0 on UNVERIFIED, report remains UNVERIFIED')
    args = p.parse_args()
    try:
        report = validate(args.manifest)
    except Exception as exc:
        report = {'overall': 'FAIL', 'errors': [f'Could not validate project: {exc}']}
    dump = json.dumps(report, indent=2)
    print(dump)
    if args.json:
        args.json.parent.mkdir(exist_ok=True, parents=True)
        args.json.write_text(dump + '\n')
    return 1 if report['overall'] == 'FAIL' else 2 if report['overall'] == 'UNVERIFIED' and not args.allow_unverified else 0


if __name__ == '__main__':
    sys.exit(main())
