#!/usr/bin/env python3
"""Selected CadQuery mechanical checks from explicit, testable inputs.

Supports exact B-Rep pairwise distance/overlap, sampled linear insertion sweep,
idealized fastener tool clearance, and duct-outlet alignment vector. These are
necessary geometric checks NOT proofs of mechanism function, load, or airflow.
Input JSON: {"parts":{"a":"a_assembled.step",...}, "checks":[...]}
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import cadquery as cq


def vector(values):
    return cq.Vector(*map(float, values))


def analyze(config: Path) -> dict:
    base = config.resolve().parent
    settings = json.loads(config.read_text())
    parts = {}
    for name, file in settings['parts'].items():
        solids = cq.importers.importStep(str(base / file)).solids().vals()
        if len(solids) != 1:
            raise ValueError(f'{name} must be a single solid in global assembly pose')
        parts[name] = solids[0]
    findings = []
    for c in settings['checks']:
        name, kind = c['name'], c['type']
        status, measurement = 'UNVERIFIED', {}
        try:
            if kind == 'clearance':
                a, b = parts[c['a']], parts[c['b']]
                overlap = a.intersect(b).Volume()
                gap = a.distance(b)
                measurement = {'interference_mm3': round(overlap, 6), 'minimum_distance_mm': round(gap, 5)}
                status = 'PASS' if overlap <= float(c.get('collision_threshold_mm3', 1e-5)) and gap + 1e-6 >= c['minimum_mm'] else 'FAIL'
            elif kind == 'translation_path':
                moved = parts[c['moving']]
                fixed = [parts[n] for n in c['against']]
                start, end = vector(c['from_offset_mm']), vector(c['to_offset_mm'])
                count = int(c['samples'])
                if count < 2 or count > 10000:
                    raise ValueError('samples must be in [2,10000]')
                sample_results = []
                for i in range(count):
                    t = i/(count-1)
                    pose = moved.translate(start + (end-start)*t)
                    volume = max((pose.intersect(other).Volume() for other in fixed), default=0)
                    distance = min((pose.distance(other) for other in fixed), default=math.inf)
                    sample_results.append((volume, distance))
                max_volume = max(x[0] for x in sample_results)
                min_gap = min(x[1] for x in sample_results)
                measurement = {'samples':count, 'maximum_interference_mm3':round(max_volume,6),
                               'minimum_distance_mm':round(min_gap,5), 'method':'DISCRETE translation samples; gaps between positions NOT proven'}
                status = 'PASS' if max_volume <= float(c.get('collision_threshold_mm3',1e-5)) and min_gap+1e-6 >= float(c.get('minimum_mm',0)) else 'FAIL'
            elif kind == 'fastener_access':
                # Cylindrical clearance volume in global pose; point at free end of tool approach.
                start = vector(c['tool_start_mm'])
                length = float(c['tool_length_mm'])
                axis = vector(c['axis']).normalized()
                radius = float(c['tool_radius_mm'])
                if length <= 0 or radius <= 0:
                    raise ValueError('Tool length/radius must be positive')
                tool = cq.Solid.makeCylinder(radius, length, start, axis)
                volumes = {n:round(tool.intersect(parts[n]).Volume(),6) for n in c['obstacles']}
                measurement = {'tool_intersections_mm3':volumes, 'clearance_cylinder_radius_mm':radius}
                status = 'PASS' if all(v <= 1e-5 for v in volumes.values()) else 'FAIL'
            elif kind == 'duct_aim':
                origin = vector(c['outlet_center_mm'])
                direction = vector(c['outlet_direction']).normalized()
                target = vector(c['target_mm'])
                to_target = target-origin
                if to_target.Length == 0:
                    raise ValueError('Target cannot coincide with outlet')
                dot = direction.dot(to_target.normalized())
                angle = math.degrees(math.acos(max(-1, min(1, dot))))
                measurement = {'alignment_dot':round(dot,5),'angular_error_deg':round(angle,3),
                               'method':'centerline aim only; no airflow or CFD simulation'}
                status = 'PASS' if angle <= float(c['max_angle_deg']) else 'FAIL'
            else:
                measurement = {'reason':f'Unimplemented check type {kind}'}
        except (ValueError, KeyError, RuntimeError, OSError) as exc:
            status = 'FAIL'
            measurement = {'error':str(exc)}
        findings.append({'name':name,'type':kind,'status':status,'measurement':measurement})
    status = 'FAIL' if any(x['status']=='FAIL' for x in findings) else 'UNVERIFIED' if any(x['status']=='UNVERIFIED' for x in findings) else 'PASS'
    return {'status':status, 'checks':findings,
            'scope':'Only declared quantitative checks; unlisted assembly, load, thermals, airflow and endurance remain UNVERIFIED'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('config', type=Path)
    p.add_argument('--json', type=Path)
    args = p.parse_args()
    try:
        r = analyze(args.config)
    except Exception as exc:
        r = {'status':'FAIL','error':str(exc)}
    s = json.dumps(r, indent=2)
    print(s)
    if args.json:
        args.json.parent.mkdir(parents=True,exist_ok=True)
        args.json.write_text(s+'\n')
    raise SystemExit(0 if r['status']=='PASS' else 1 if r['status']=='FAIL' else 2)

if __name__=='__main__':
    main()
