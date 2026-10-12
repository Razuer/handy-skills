#!/usr/bin/env python3
"""Render actual STEP/STL solids in wall/desk/custom camera conventions.

All inputs must be co-located in the assembly frame. Explosions are *visual only*.
Use --reference for translucent context; --explode-plan JSON for per-body XYZ offsets.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np

# Camera vector, vertical/up vector. These labels match the example wall-plane part.
WALL_VIEWS = {
    "iso": ((1.2, -1.45, 1.3), (0, 0, 1)),
    "front": ((0, 0, 1), (0, 1, 0)),
    "back": ((0, 0, -1), (0, 1, 0)),
    "right": ((1, 0, 0), (0, 0, 1)),
    "top": ((0, 1, 0), (0, 0, 1)),
    "bottom": ((0, -1, 0), (0, 0, 1)),
}
DESK_VIEWS = {
    "iso": ((1.2, -1.45, 1.3), (0, 0, 1)),
    "front": ((0, -1, 0), (0, 0, 1)),
    "back": ((0, 1, 0), (0, 0, 1)),
    "right": ((1, 0, 0), (0, 0, 1)),
    "left": ((-1, 0, 0), (0, 0, 1)),
    "top": ((0, 0, 1), (0, 1, 0)),
    "bottom": ((0, 0, -1), (0, 1, 0)),
}
CAMERA_VIEWS = WALL_VIEWS
COLORS = [(0.48, 0.78, 0.92), (0.94, 0.68, 0.40), (0.70, 0.86, 0.62),
          (0.83, 0.66, 0.92), (0.93, 0.79, 0.45)]


def load_models(paths: list[Path]) -> list[dict]:
    output = []
    for path in paths:
        if not path.exists():
            raise FileNotFoundError(path)
        if path.suffix.lower() in (".step", ".stp"):
            import cadquery as cq
            wp = cq.importers.importStep(str(path))
            solids = wp.solids().vals()
            if not solids:
                raise ValueError(f"No STEP solids in {path}")
            for i, solid in enumerate(solids):
                verts, faces = solid.tessellate(0.055, 0.12)
                xyz = np.array([[v.x, v.y, v.z] for v in verts], dtype=np.float64)
                triangles = np.array(faces, dtype=np.int64)
                output.append({"label": f"{path.stem}:{i}", "vertices": xyz, "faces": triangles})
        elif path.suffix.lower() == ".stl":
            import trimesh
            mesh = trimesh.load_mesh(str(path), process=True)
            if mesh.is_empty:
                raise ValueError(f"No mesh in {path}")
            output.append({"label": path.stem, "vertices": np.asarray(mesh.vertices),
                           "faces": np.asarray(mesh.faces)})
        else:
            raise ValueError(f"Unsupported file type: {path}")
    return output


def to_polydata(vertices: np.ndarray, faces: np.ndarray):
    import vtk
    from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray

    poly = vtk.vtkPolyData()
    pts = vtk.vtkPoints()
    pts.SetData(numpy_to_vtk(np.ascontiguousarray(vertices), deep=True))
    poly.SetPoints(pts)
    # Modern VTK cell arrays use offset and connectivity arrays.
    cell_array = vtk.vtkCellArray()
    offsets = np.arange(0, 3 * (len(faces) + 1), 3, dtype=np.int64)
    connectivity = np.asarray(faces, dtype=np.int64).ravel()
    cell_array.SetData(numpy_to_vtkIdTypeArray(offsets, deep=True),
                       numpy_to_vtkIdTypeArray(connectivity, deep=True))
    poly.SetPolys(cell_array)
    normals = vtk.vtkPolyDataNormals()
    normals.SetInputData(poly)
    normals.ConsistencyOn()
    normals.SplittingOff()
    normals.AutoOrientNormalsOn()
    normals.Update()
    return normals.GetOutput()


def bounds_for(models: list[dict], offsets: list[np.ndarray]):
    pts_lo = np.array([np.min(m["vertices"], axis=0) + o for m, o in zip(models, offsets)])
    pts_hi = np.array([np.max(m["vertices"], axis=0) + o for m, o in zip(models, offsets)])
    return np.min(pts_lo, axis=0), np.max(pts_hi, axis=0)


def render_one(models: list[dict], camera: str, path: Path, width: int,
               height: int, offsets: list[np.ndarray], views: dict = None, labels: bool = False) -> None:
    import vtk

    views = views or WALL_VIEWS
    renderer = vtk.vtkRenderer()
    renderer.SetBackground(0.085, 0.105, 0.14)
    window = vtk.vtkRenderWindow()
    window.SetOffScreenRendering(True)
    window.SetSize(width, height)
    window.AddRenderer(renderer)
    window.SetMultiSamples(0)
    mapper_keepalive = []
    for i, (model, offset) in enumerate(zip(models, offsets)):
        poly = to_polydata(model["vertices"], model["faces"])
        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputData(poly)
        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        actor.SetPosition(*[float(x) for x in offset])
        actor.GetProperty().SetColor(*COLORS[i % len(COLORS)])
        if model.get("reference"):
            actor.GetProperty().SetOpacity(.23)
        actor.GetProperty().SetAmbient(0.28)
        actor.GetProperty().SetDiffuse(0.68)
        actor.GetProperty().SetSpecular(0.22)
        actor.GetProperty().SetSpecularPower(28)
        renderer.AddActor(actor)
        mapper_keepalive.append((poly, mapper, actor))
        if labels:
            center_part = model["vertices"].mean(axis=0) + offset
            marker = vtk.vtkBillboardTextActor3D()
            marker.SetInput(model["label"])
            marker.SetPosition(*[float(x) for x in center_part])
            marker.GetTextProperty().SetFontSize(18)
            marker.GetTextProperty().SetColor(1, 1, 1)
            marker.GetTextProperty().SetBold(True)
            renderer.AddActor(marker)
            mapper_keepalive.append(marker)
        # Extract sharp, genuine CAD/profile edges; do not display every triangle edge.
        edges = vtk.vtkFeatureEdges()
        edges.SetInputData(poly)
        edges.BoundaryEdgesOn()
        edges.FeatureEdgesOn()
        edges.NonManifoldEdgesOn()
        edges.ManifoldEdgesOff()
        edges.SetFeatureAngle(45)
        edges.Update()
        edge_mapper = vtk.vtkPolyDataMapper()
        edge_mapper.SetInputConnection(edges.GetOutputPort())
        edge_actor = vtk.vtkActor()
        edge_actor.SetMapper(edge_mapper)
        edge_actor.SetPosition(*[float(x) for x in offset])
        edge_actor.GetProperty().SetColor(0.13, 0.2, 0.26)
        edge_actor.GetProperty().SetLineWidth(1.25)
        if not model.get("reference"):
            renderer.AddActor(edge_actor)
            mapper_keepalive.append((edges, edge_mapper, edge_actor))

    low, high = bounds_for(models, offsets)
    center = (low + high) / 2
    extent = high - low
    direction, up = views[camera]
    direction = np.asarray(direction, dtype=float)
    direction /= np.linalg.norm(direction)
    up = np.asarray(up, dtype=float)
    camera_obj = renderer.GetActiveCamera()
    scale = max(1.0, np.linalg.norm(extent))
    camera_obj.SetFocalPoint(*center)
    camera_obj.SetPosition(*(center + direction * max(150, 3.8 * scale)))
    camera_obj.SetViewUp(*up)
    camera_obj.OrthogonalizeViewUp()
    camera_obj.ParallelProjectionOn()
    # Project the bbox corners onto camera up/right, giving tight framing for long objects.
    forward = -direction
    right = np.cross(forward, np.asarray(camera_obj.GetViewUp()))
    right /= np.linalg.norm(right)
    vertical = np.cross(right, forward)
    corners = np.array([[x, y, z] for x in (low[0], high[0])
                                  for y in (low[1], high[1])
                                  for z in (low[2], high[2])]) - center
    hspan = float(np.ptp(corners @ right))
    vspan = float(np.ptp(corners @ vertical))
    camera_obj.SetParallelScale(0.63 * max(vspan, hspan * height / width, 1.0))
    renderer.ResetCameraClippingRange()
    lights = vtk.vtkLightKit()
    lights.AddLightsToRenderer(renderer)
    window.Render()
    capture = vtk.vtkWindowToImageFilter()
    capture.SetInput(window)
    capture.SetInputBufferTypeToRGB()
    capture.ReadFrontBufferOff()
    capture.Update()
    writer = vtk.vtkPNGWriter()
    writer.SetFileName(str(path))
    writer.SetInputConnection(capture.GetOutputPort())
    writer.Write()
    window.Finalize()


def make_sheet(out_dir: Path, images: list[Path], metadata: dict) -> None:
    from PIL import Image, ImageDraw, ImageFont

    thumb_w, thumb_h, pad, header = 440, 370, 18, 34
    cols = 3
    rows = math.ceil(len(images) / cols)
    im = Image.new("RGB", (cols * (thumb_w + pad) + pad,
                          rows * (thumb_h + pad + header) + pad + 52), (16, 23, 32))
    draw = ImageDraw.Draw(im)
    def get_font(size: int):
        for candidate in (
            "DejaVuSans.ttf", "NotoSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/noto/NotoSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        ):
            try:
                return ImageFont.truetype(candidate, size)
            except (OSError, ValueError):
                continue
        return ImageFont.load_default()
    font = get_font(19)
    small = get_font(14)
    for i, file in enumerate(images):
        x = pad + (i % cols) * (thumb_w + pad)
        y = pad + (i // cols) * (thumb_h + pad + header)
        with Image.open(file) as pic:
            pic = pic.convert("RGB")
            pic.thumbnail((thumb_w, thumb_h))
            im.paste(pic, (x + (thumb_w - pic.width) // 2, y))
        draw.text((x + 12, y + thumb_h + 4), file.stem.upper(), font=font, fill=(230, 238, 246))
    footer = f"Parts: {metadata['parts']}   Envelope (mm): {metadata['bbox_mm']}   From imported geometry"
    draw.text((20, im.height - 33), footer, font=small, fill=(206, 222, 235))
    im.save(out_dir / "contact_sheet.png")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path, help="assembled STEP/STL solids")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--preset", choices=("wall", "desk"), default="wall",
                        help="wall: XY wall plane, +Z toward viewer; desk: XY desktop, +Z vertical")
    parser.add_argument("--camera-json", type=Path,
                        help='optional JSON of {"front": [[dx,dy,dz],[upx,upy,upz]], ...}')
    parser.add_argument("--reference", type=Path, nargs="*", default=[], help="transparent reference STEP solids in assembly pose")
    parser.add_argument("--labels", action="store_true", help="show model labels; numbers in STEP report can match component order")
    parser.add_argument("--explode-plan", type=Path,
                        help='JSON {"component_stem:0": [x,y,z], ...} offsets in mm, for exploded view')
    parser.add_argument("--explode", type=float, default=0,
                        help="X separation in mm per adjacent part, visualization only")
    parser.add_argument("--width", type=int, default=900)
    parser.add_argument("--height", type=int, default=720)
    args = parser.parse_args()
    if args.width < 200 or args.height < 200:
        parser.error("Minimum image width and height: 200")
    models = load_models(args.files)
    n_active = len(models)
    ref_models = load_models(args.reference) if args.reference else []
    for m in ref_models:
        m['reference'] = True
    models.extend(ref_models)
    views = DESK_VIEWS if args.preset == "desk" else WALL_VIEWS
    if args.camera_json:
        views = json.loads(args.camera_json.read_text())
        if 'iso' not in views:
            parser.error('Custom views require an iso view')
        for name, pair in views.items():
            if len(pair) != 2 or any(len(vec) != 3 for vec in pair):
                parser.error(f'Invalid vectors for view {name}')
            if np.linalg.norm(pair[0]) < 1e-5 or np.linalg.norm(np.cross(pair[0], pair[1])) < 1e-5:
                parser.error(f'Degenerate camera vectors for {name}')
    if not models:
        parser.error("No geometries loaded")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    zero = [np.zeros(3, dtype=float) for _ in models]
    images = []
    for camera in views:
        target = args.out_dir / (camera + ".png")
        render_one(models, camera, target, args.width, args.height, zero, views, args.labels)
        images.append(target)
    if (args.explode > 0 or args.explode_plan) and n_active > 1:
        if args.explode_plan:
            data = json.loads(args.explode_plan.read_text())
            invalid = set(data) - {m['label'] for m in models[:n_active]}
            if invalid:
                parser.error(f'Unknown explode-plan parts: {sorted(invalid)}')
            offsets = [np.array(data.get(m['label'], [0,0,0]), dtype=float) for m in models[:n_active]]
        else:
            offsets = [np.array([(i - (n_active-1)/2) * args.explode, 0, 0], dtype=float)
                       for i in range(n_active)]
        offsets += [np.zeros(3) for _ in ref_models]
        target = args.out_dir / "exploded_iso.png"
        render_one(models, "iso", target, args.width, args.height, offsets, views, args.labels)
        images.append(target)
    low, high = bounds_for(models, zero)
    info = {"parts": len(models), "bbox_mm": [round(float(v), 3) for v in high-low],
            "coordinates": "wall: +Z front +Y up; desk: +Z vertical +Y back",
            "preset": args.preset, "references": len(ref_models), "labels": args.labels,
            "files": [str(p) for p in args.files],
            "views": [p.name for p in images]}
    make_sheet(args.out_dir, images, info)
    (args.out_dir / "render_report.json").write_text(json.dumps(info, indent=2) + "\n")
    print(json.dumps(info, indent=2))


if __name__ == "__main__":
    main()
