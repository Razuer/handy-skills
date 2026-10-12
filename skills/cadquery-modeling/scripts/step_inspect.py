#!/usr/bin/env python3
"""Inventory imported STEP solids, cylindrical/planar interfaces and nearby components.

Cylindrical faces can be bores, bosses, or partial cylinders: classification is
CANDIDATE only. Imported STEP names/colors may be lost by CadQuery importer.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from collections import Counter
import cadquery as cq
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder, GeomAbs_Plane


def v3(vector):
    return [round(float(a), 4) for a in (vector.X(), vector.Y(), vector.Z())]


def inspect(path: Path, *, neighbors: int = 3) -> dict:
    objects = cq.importers.importStep(str(path)).solids().vals()
    report = {'source': str(path), 'solid_count': len(objects), 'units': 'mm on import',
              'name_limitation': 'CadQuery Workplane import may not preserve native STEP assembly hierarchy/names/colors',
              'solids': [], 'neighbors': [],
              'limitations': 'Surface heuristics do not distinguish bore from outer boss or prove screw access'}
    for i, solid in enumerate(objects):
        bbox = solid.BoundingBox()
        p = solid.Center()
        entry = {'id': i, 'label': f'part_{i:03d}', 'valid': solid.isValid(),
                 'volume_mm3': round(solid.Volume(), 4),
                 'bbox_min_mm': [round(v, 4) for v in (bbox.xmin, bbox.ymin, bbox.zmin)],
                 'bbox_max_mm': [round(v, 4) for v in (bbox.xmax, bbox.ymax, bbox.zmax)],
                 'bbox_size_mm': [round(v, 4) for v in (bbox.xlen, bbox.ylen, bbox.zlen)],
                 'centroid_mm': [round(v, 4) for v in p.toTuple()],
                 'surface_types': dict(Counter(f.geomType() for f in solid.Faces())),
                 'cylindrical_faces': [], 'largest_planes': []}
        planes = []
        for face in solid.Faces():
            adapter = BRepAdaptor_Surface(face.wrapped)
            t = adapter.GetType()
            if t == GeomAbs_Cylinder:
                c = adapter.Cylinder()
                entry['cylindrical_faces'].append({
                    'radius_mm': round(float(c.Radius()), 4),
                    'axis_direction': v3(c.Axis().Direction()),
                    'axis_location_mm': v3(c.Axis().Location()),
                    'face_area_mm2': round(float(face.Area()), 3),
                    'classification': 'candidate cylindrical interface (inside/outside unclassified)'})
            elif t == GeomAbs_Plane:
                pl = adapter.Plane()
                planes.append({'area_mm2': round(float(face.Area()), 3),
                               'normal': v3(pl.Axis().Direction()),
                               'point_mm': v3(pl.Location())})
        entry['largest_planes'] = sorted(planes, key=lambda x: -x['area_mm2'])[:8]
        report['solids'].append(entry)
    # Bounding-box neighbor candidates for large imported assemblies (O(n^2) bbox, no O(n^2) booleans).
    for i, a in enumerate(objects):
        box_a = a.BoundingBox()
        near = []
        for j, b in enumerate(objects):
            if i == j:
                continue
            box_b = b.BoundingBox()
            separation = sum(max(getattr(box_b, axis+'min')-getattr(box_a, axis+'max'),
                                 getattr(box_a, axis+'min')-getattr(box_b, axis+'max'), 0.0)**2
                             for axis in 'xyz')**.5
            near.append({'other': j, 'bbox_gap_mm': round(separation, 4)})
        near.sort(key=lambda x: x['bbox_gap_mm'])
        report['neighbors'].append({'id': i, 'nearest_bbox_candidates': near[:neighbors]})
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('step', type=Path)
    p.add_argument('--json', type=Path)
    p.add_argument('--neighbors', type=int, default=3)
    args = p.parse_args()
    report = inspect(args.step, neighbors=args.neighbors)
    string = json.dumps(report, indent=2)
    print(string)
    if args.json:
        args.json.parent.mkdir(exist_ok=True, parents=True)
        args.json.write_text(string+'\n')

if __name__ == '__main__':
    main()
