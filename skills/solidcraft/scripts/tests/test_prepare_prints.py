"""Deterministic geometry and safety regressions; no SolidCraft app required."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np
import trimesh

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import prepare_prints as tool


class PreparePrintsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source.stl"
        mesh = trimesh.creation.box(extents=[2, 4, 6])
        mesh.apply_translation([8, 12, 20])
        mesh.export(self.source)
        self.manifest = self.root / "manifest.json"
        self.out = self.root / "prepared"
        self.data = {
            "version": 1, "units": "mm", "bed_mm": [40, 40],
            "margin_mm": 2, "gap_mm": 3,
            "parts": [{"name": "block", "input": "source.stl",
                       "rotation_deg": [0, 0, 0], "quantity": 3,
                       "expected_volume_mm3": 48}],
        }

    def run_prepare(self, overwrite=False):
        self.manifest.write_text(json.dumps(self.data))
        return tool.prepare(self.manifest, self.out, overwrite)

    def test_quantity_layout_and_source_preservation(self):
        digest = hashlib.sha256(self.source.read_bytes()).hexdigest()
        report = self.run_prepare()
        self.assertEqual(report["mesh_status"], "PASS")
        self.assertEqual(report["manufacturing_status"], "UNVERIFIED")
        self.assertEqual(len(report["placements"]), 3)
        plate = trimesh.load_mesh(self.out / "all-parts-flat.stl")
        self.assertEqual(len(plate.split()), 3)
        self.assertTrue(plate.is_watertight)
        self.assertAlmostEqual(plate.volume, 144)
        np.testing.assert_allclose(plate.bounds[0], [2, 2, 0])
        positions = [p["origin_mm"][0] for p in report["placements"]]
        np.testing.assert_allclose(np.diff(positions), [5, 5])
        self.assertEqual(hashlib.sha256(self.source.read_bytes()).hexdigest(), digest)

    def test_explicit_rotation_and_grounding(self):
        self.data["parts"][0]["rotation_deg"] = [90, 0, 0]
        self.run_prepare()
        mesh = trimesh.load_mesh(self.out / "block.stl")
        np.testing.assert_allclose(mesh.bounds[0], [0, 0, 0], atol=1e-6)
        np.testing.assert_allclose(mesh.extents, [2, 6, 4], atol=1e-6)

    def test_missing_rotation_is_rejected(self):
        del self.data["parts"][0]["rotation_deg"]
        with self.assertRaises(KeyError):
            self.run_prepare()
        self.assertFalse(self.out.exists())

    def test_no_expected_volume_stays_unverified(self):
        del self.data["parts"][0]["expected_volume_mm3"]
        report = self.run_prepare()
        self.assertEqual(report["parts"][0]["volume_comparison"], "UNVERIFIED")
        self.assertIsNone(report["parts"][0]["volume_discrepancy_percent"])

    def test_volume_failure_writes_report_not_meshes(self):
        self.data["parts"][0]["expected_volume_mm3"] = 100
        report = self.run_prepare()
        self.assertEqual(report["mesh_status"], "FAIL")
        self.assertTrue((self.out / "report.json").exists())
        self.assertEqual(list(self.out.glob("*.stl")), [])

    def test_open_mesh_fails(self):
        mesh = trimesh.creation.box()
        mesh.update_faces(np.arange(len(mesh.faces) - 1))
        mesh.export(self.source)
        report = self.run_prepare()
        self.assertFalse(report["parts"][0]["checks"]["watertight"])
        self.assertEqual(report["mesh_status"], "FAIL")

    def test_disconnected_mesh_requires_explicit_count(self):
        first = trimesh.creation.box()
        second = first.copy()
        second.apply_translation([5, 0, 0])
        trimesh.util.concatenate([first, second]).export(self.source)
        part = self.data["parts"][0]
        part["expected_volume_mm3"] = 2
        self.assertEqual(self.run_prepare()["mesh_status"], "FAIL")
        part["expected_solids"] = 2
        self.assertEqual(self.run_prepare(overwrite=True)["mesh_status"], "PASS")

    def test_layout_rejects_small_bed_before_writing(self):
        self.data["bed_mm"] = [5, 5]
        with self.assertRaisesRegex(ValueError, "exceeds usable bed"):
            self.run_prepare()
        self.assertFalse(self.out.exists())

    def test_inverted_component_cannot_hide_in_positive_total_volume(self):
        outer = trimesh.creation.box(extents=[2, 2, 2])
        inverted = trimesh.creation.box()
        inverted.invert()
        inverted.apply_translation([5, 0, 0])
        trimesh.util.concatenate([outer, inverted]).export(self.source)
        part = self.data["parts"][0]
        part["expected_solids"] = 2
        part["expected_volume_mm3"] = 7
        report = self.run_prepare()
        self.assertFalse(report["parts"][0]["checks"]["positive_volume"])
        self.assertEqual(report["mesh_status"], "FAIL")

    def test_rows_wrap_and_overflow(self):
        self.data["bed_mm"] = [9, 25]
        report = self.run_prepare()
        self.assertGreater(report["placements"][-1]["origin_mm"][1], 2)
        self.data["parts"][0]["quantity"] = 30
        with self.assertRaisesRegex(ValueError, "layout exceeds bed"):
            self.run_prepare(overwrite=True)

    def test_existing_outputs_require_explicit_overwrite(self):
        self.run_prepare()
        with self.assertRaisesRegex(ValueError, "Output exists"):
            self.run_prepare()
        self.assertEqual(self.run_prepare(overwrite=True)["mesh_status"], "PASS")

    def test_input_never_overwritten_even_with_flag(self):
        self.source.rename(self.root / "block.stl")
        self.data["parts"][0]["input"] = "block.stl"
        self.out = self.root
        with self.assertRaisesRegex(ValueError, "overwrite source"):
            self.run_prepare(overwrite=True)

    def test_output_symlink_refused(self):
        self.out.mkdir()
        (self.out / "block.stl").symlink_to(self.source)
        with self.assertRaises(ValueError):
            self.run_prepare(overwrite=True)

    def test_output_hardlink_to_source_refused(self):
        self.out.mkdir()
        os.link(self.source, self.out / "block.stl")
        with self.assertRaisesRegex(ValueError, "overwrite source"):
            self.run_prepare(overwrite=True)

    def test_invalid_names_and_quantities(self):
        for field, value in [("name", "../escape"), ("name", "all-parts-flat"),
                             ("quantity", 0), ("quantity", True)]:
            with self.subTest(field=field, value=value):
                original = self.data["parts"][0][field]
                self.data["parts"][0][field] = value
                with self.assertRaises(ValueError):
                    self.run_prepare()
                self.data["parts"][0][field] = original

    def test_cli_error_exit_codes(self):
        self.manifest.write_text("[]")
        result = subprocess.run(
            [sys.executable, str(Path(tool.__file__)), str(self.manifest), "--out", str(self.out)],
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertNotIn("Traceback", result.stderr)
        self.data["parts"][0]["expected_volume_mm3"] = 100
        self.manifest.write_text(json.dumps(self.data))
        result = subprocess.run(
            [sys.executable, str(Path(tool.__file__)), str(self.manifest), "--out", str(self.out)],
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 1)


if __name__ == "__main__":
    unittest.main()
