"""Separate the generated base mesh at its narrow connecting tunnel.

The source is preserved. X=0.15 is between the habitat (left) and greenhouse
(right), established from the source vertex projection in base-coordinates.png.
Cap the exposed tunnel so neither exported building has an open cut surface.
"""
from pathlib import Path
import json
import numpy as np
import trimesh

root = Path(__file__).resolve().parents[1]
source = trimesh.load(root / "public/models/base-scene.glb").to_geometry()
cut = 0.15
report = {}
for name, direction in [("habitat", -1), ("greenhouse", 1)]:
    clipped_vertices = []
    clipped_faces = []
    for triangle in source.triangles:
        polygon = []
        for index, vertex in enumerate(triangle):
            prior = triangle[index - 1]
            inside = direction * (vertex[0] - cut) >= 0
            prior_inside = direction * (prior[0] - cut) >= 0
            if inside != prior_inside:
                polygon.append(prior + (vertex - prior) * ((cut - prior[0]) / (vertex[0] - prior[0])))
            if inside:
                polygon.append(vertex)
        if len(polygon) >= 3:
            first = len(clipped_vertices)
            clipped_vertices.extend(polygon)
            clipped_faces.extend([[first, first + i, first + i + 1] for i in range(1, len(polygon) - 1)])
    part = trimesh.Trimesh(vertices=clipped_vertices, faces=clipped_faces, process=True)
    # All vertices on the slicing plane describe the tunnel opening. A planar
    # fan seals it; an opaque hatch in the scene makes the connector intentional.
    ids = np.flatnonzero(np.abs(part.vertices[:, 0] - cut) < 1e-7)
    center = part.vertices[ids].mean(axis=0)
    angles = np.arctan2(part.vertices[ids, 2] - center[2], part.vertices[ids, 1] - center[1])
    ids = ids[np.argsort(angles)]
    vertices = np.vstack([part.vertices, center])
    center_id = len(vertices) - 1
    faces = np.array([[center_id, ids[i], ids[(i + 1) % len(ids)]] for i in range(len(ids))])
    if direction > 0:
        faces = faces[:, ::-1]
    part = trimesh.Trimesh(vertices=vertices, faces=np.vstack([part.faces, faces]), process=True)
    # Remove tiny floating fragments left by source reconstruction (not domes).
    parents = list(range(len(part.vertices)))
    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i
    for face in part.faces:
        a = find(int(face[0]))
        for index in face[1:]:
            parents[find(int(index))] = a
    roots = np.array([find(int(face[0])) for face in part.faces])
    counts = dict(zip(*np.unique(roots, return_counts=True)))
    part.update_faces(np.array([counts[root] >= 100 for root in roots]))
    part.remove_unreferenced_vertices()
    destination = root / f"public/models/{name}-scene.glb"
    part.export(destination)
    report[name] = {"triangles": len(part.faces), "vertices": len(part.vertices), "bounds": part.bounds.tolist(), "bytes": destination.stat().st_size}
report["source"] = "base-scene.glb (preserved)"
report["cut_plane_x"] = cut
(root / "artifacts/model-generation/base-split.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
