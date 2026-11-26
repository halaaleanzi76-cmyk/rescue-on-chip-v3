"""FastAPI integration tests for the vascular computation contract."""

import unittest

from fastapi.testclient import TestClient

from main import app
from .graph import build_default_network


class VascularAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_network_endpoint_returns_connected_stable_segment_ids(self):
        response = self.client.get("/api/vascular/network")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        local_graph = build_default_network()
        self.assertEqual(payload["network_version"], local_graph.network_version)
        self.assertEqual(
            [segment["segment_id"] for segment in payload["segments"]],
            [segment.segment_id for segment in local_graph.segments],
        )
        self.assertEqual(payload["inlet_node_id"], "inlet")
        self.assertEqual(payload["outlet_node_id"], "outlet")
        self.assertIn("not measured", payload["geometry_note"])

    def test_solver_response_maps_computed_values_to_every_network_segment(self):
        graph = self.client.get("/api/vascular/network").json()
        response = self.client.post("/api/vascular/solve", json={})
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(
            {segment["segment_id"] for segment in result["segments"]},
            {segment["segment_id"] for segment in graph["segments"]},
        )
        self.assertGreater(result["inlet_flow_ul_min"], 0)
        self.assertLess(result["max_normalized_mass_balance_residual"], 1e-8)
        self.assertTrue(result["input_fingerprint"])

    def test_radius_change_runs_python_solver_and_changes_flow(self):
        baseline = self.client.post("/api/vascular/solve", json={}).json()
        changed = self.client.post(
            "/api/vascular/solve",
            json={"radius_overrides_um": {"capillary_u_0_1": 2}},
        )
        self.assertEqual(changed.status_code, 200)
        narrowed = changed.json()
        self.assertLess(narrowed["inlet_flow_ul_min"], baseline["inlet_flow_ul_min"])
        result_by_id = {segment["segment_id"]: segment for segment in narrowed["segments"]}
        self.assertAlmostEqual(result_by_id["capillary_u_0_1"]["radius_m"], 2e-6)
        self.assertNotEqual(narrowed["input_fingerprint"], baseline["input_fingerprint"])

    def test_unknown_segment_override_returns_validation_error(self):
        response = self.client.post(
            "/api/vascular/solve",
            json={"radius_overrides_um": {"not-a-real-vessel": 5}},
        )
        self.assertEqual(response.status_code, 422)

    def test_fixed_flow_boundary_uses_requested_flow(self):
        response = self.client.post(
            "/api/vascular/solve",
            json={
                "boundary_mode": "fixed_inlet_flow",
                "inlet_flow_ul_min": 0.5,
                "outlet_pressure_pa": 20,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(result["boundary_mode"], "fixed_inlet_flow")
        self.assertAlmostEqual(result["inlet_flow_ul_min"], 0.5, delta=1e-10)
        self.assertGreater(result["inlet_pressure_pa"], result["outlet_pressure_pa"])


if __name__ == "__main__":
    unittest.main()
