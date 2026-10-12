#!/usr/bin/env python3
"""FDM preflight heuristics for a manufacturing-pose STL (+Z is build direction).

Reports orientation/contact/overhang estimates; it CANNOT prove support-free slicing,
feature wall generation, physical fit, or strength. Inspect actual slicer layers.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import numpy as np
import trimesh


def analyze(path: Path, *, tolerance_mm: float = .04, overhang_degrees: float = 50., line_width_mm: float = .45, candidates: bool = False) -> dict:
    mesh = trimesh.load_mesh(str(path), process=True)
    return _analyze_mesh(mesh, path, tolerance_mm=tolerance_mm, overhang_degrees=overhang_degrees, line_width_mm=line_width_mm, candidates=candidates)

def _analyze_mesh(mesh, path, *, tolerance_mm, overhang_degrees, line_width_mm, candidates=False) -> dict:
    if mesh.is_empty or not mesh.is_watertight:
        raise ValueError('Expected nonempty watertight print STL')
    z0 = float(mesh.bounds[0, 2])
    cent = mesh.triangles_center
    n = mesh.face_normals
    z = mesh.vertices[mesh.faces][:, :, 2]
    planar = (np.max(np.abs(z - z0), axis=1) <= tolerance_mm) & (n[:, 2] < -0.98)
    contact_area = float(mesh.area_faces[planar].sum())
    # Connectivity of first-layer *triangle face edges*, not individual points.
    connected = 0
    if np.any(planar):
        selected = np.flatnonzero(planar)
        parent = {int(i): int(i) for i in selected}
        def root(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        for i, j in mesh.face_adjacency:
            if planar[i] and planar[j]:
                parent[root(int(i))] = root(int(j))
        connected = len({root(int(i)) for i in selected})
    # Slope from vertical up: 0=horizontal downward ceiling, 90=vertical wall.
    threshold = -np.sin(np.radians(overhang_degrees))
    down = (n[:, 2] < 0) & (n[:, 2] < -1e-4)
    # Overhang angle measured from vertical (+Z), rule of thumb only.
    severe = down & (n[:, 2] < threshold) & (cent[:, 2] > z0 + tolerance_mm)
    b = mesh.bounds[1] - mesh.bounds[0]
    result = {
        'model': str(path.resolve()), 'status': 'ANALYZED', 'coordinate_convention': 'STL in manufacturing pose; bed at min Z; +Z upward',
        'bbox_mm': [round(float(x), 4) for x in b], 'build_height_mm': round(float(b[2]), 4),
        'bed_contact_area_mm2': round(contact_area, 4), 'first_layer_connected_patches_heuristic': connected,
        'downward_overhang_area_mm2_proxy': round(float(mesh.area_faces[severe].sum()), 4),
        'severe_overhang_face_count': int(severe.sum()),
        'parameters': {'flat_tolerance_mm': tolerance_mm, 'self_support_angle_deg_approx': overhang_degrees,
                       'line_width_mm': line_width_mm},
        'warnings': [],
        'limitations': ['Only planar bottom triangle contact at tolerance, NOT adhesion or stability simulation',
                        'Downward face angle is a proxy, NOT support prediction; bridges/tunnels not classified',
                        'Thin-wall/toolpath and directional strength need slicer/material/load assessment',
                        'A print-ready PASS requires an actual slicer profile, layer review, and possibly test print']
    }
    if contact_area == 0:
        result['warnings'].append('No horizontal bottom-contact facets: choose a stable print pose or redesign')
    if connected > 1:
        result['warnings'].append(f'{connected} separate bottom contact patches; evaluate adhesion/islands')
    if severe.sum():
        result['warnings'].append('Downward-facing overhang candidates: review unsupported geometry and bridges in slicer')
    if candidates:
        options = []
        for rx, ry in [(0,0),(90,0),(-90,0),(180,0),(0,90),(0,-90)]:
            rotated = mesh.copy()
            rotated.apply_transform(trimesh.transformations.rotation_matrix(np.radians(rx), [1,0,0]))
            rotated.apply_transform(trimesh.transformations.rotation_matrix(np.radians(ry), [0,1,0]))
            r = _analyze_mesh(rotated, path, tolerance_mm=tolerance_mm,
                              overhang_degrees=overhang_degrees, line_width_mm=line_width_mm)
            options.append({'rotation_degrees_xyz': [rx, ry, 0],
                            'contact_area_mm2':r['bed_contact_area_mm2'],
                            'contact_patches':r['first_layer_connected_patches_heuristic'],
                            'downward_overhang_area_mm2_proxy':r['downward_overhang_area_mm2_proxy'],
                            'height_mm':r['build_height_mm']})
        result['orientation_candidates'] = options
        result['warnings'].append('Orientation candidates are non-ranked heuristics; select using load axis, surfaces, access and slicer inspection')
    return result


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('stl', type=Path)
    p.add_argument('--json', type=Path)
    p.add_argument('--candidates', action='store_true', help='evaluate six axis-aligned orientation candidates (diagnostics, NOT automatic selection)')
    p.add_argument('--angle', type=float, default=50.)
    p.add_argument('--line-width', type=float, default=.45)
    args = p.parse_args()
    report = analyze(args.stl, overhang_degrees=args.angle, line_width_mm=args.line_width, candidates=args.candidates)
    s = json.dumps(report, indent=2)
    print(s)
    if args.json:
        args.json.parent.mkdir(exist_ok=True, parents=True)
        args.json.write_text(s+'\n')

if __name__ == '__main__':
    main()
