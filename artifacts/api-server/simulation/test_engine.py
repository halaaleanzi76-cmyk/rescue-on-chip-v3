"""Numerical invariants; no claim of biological or experimental validation."""
import math
import unittest
import numpy as np
from pydantic import ValidationError
from .config import ExperimentInput
from .engine import flow_ul_min, simulate
from .contracts import SimulationRun


class EngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = ExperimentInput(duration_s=20, switch_s=2, radius_cv_pct=0,
                                     altered_viscosity_ratio=1, narrowing_pct=0, occlusion_pct=0)
        cls.result = simulate(cls.config)

    def test_poiseuille_scaling_and_units(self):
        q = float(flow_ul_min(1000,25e-6,1.2e-3,0.01,16))
        self.assertAlmostEqual(q, 1000*math.pi*(25e-6)**4*16/(8*1.2e-3*0.01)*6e10)
        self.assertAlmostEqual(float(flow_ul_min(2000,25e-6,1.2e-3,0.01,16)),q*2)
        self.assertAlmostEqual(float(flow_ul_min(1000,50e-6,1.2e-3,0.01,16)),q*16)
        self.assertAlmostEqual(float(flow_ul_min(1000,25e-6,2.4e-3,0.01,16)),q/2)

    def test_null_crossover(self):
        self.assertTrue(all(abs(x["value"]) < 1e-12 for x in self.result["contrasts"]))
        self.assertTrue(all(abs(a["mean_flow_ul_min"]-self.result["baseline_flow_ul_min"])<1e-12 for a in self.result["arms"]))

    def test_complete_output_contract_and_finite_values(self):
        parsed = SimulationRun.model_validate({**self.result, "id":"test", "created_at":"2026-11-23T00:00:00Z"})
        self.assertEqual(len(parsed.arms),4)
        for point in self.result["traces"]:
            for key in ["time_s","pressure_pa","flow_ul_min","carryover_pct"]:
                self.assertTrue(math.isfinite(point[key]))

    def test_washout_matches_integrated_mass_balance(self):
        from scipy.integrate import cumulative_trapezoid
        points = [p for p in self.result["traces"] if p["method"]=="equalized" and p["time_s"]>=self.config.switch_s]
        time = np.array([p["time_s"] for p in points])
        q = np.array([p["flow_ul_min"] for p in points])
        expected = np.exp(-cumulative_trapezoid(q/60,time,initial=0)/self.config.dead_volume_ul)
        actual = np.array([p["carryover_pct"]/100 for p in points])
        self.assertLess(float(np.max(np.abs(expected-actual))), 2e-4)
        self.assertTrue(np.all(np.diff(actual)<=1e-10))

    def test_concentration_bounds(self):
        for point in self.result["tracer"]:
            self.assertGreaterEqual(point["receiver_fraction"],-1e-8)
            self.assertLessEqual(point["receiver_fraction"],point["donor_fraction"]+1e-8)
            self.assertLessEqual(point["donor_fraction"],1+1e-8)

    def test_seed_and_fingerprint_reproducibility(self):
        again = simulate(self.config)
        self.assertEqual(self.result,again)

    def test_no_hardcoded_topology_superiority(self):
        config = self.config.model_copy(update={"regulated_wait_s":5, "equalization_s":5})
        result = simulate(config)
        a,b = result["metrics"][1:]
        self.assertAlmostEqual(a["peak_deviation_pct"],b["peak_deviation_pct"])
        self.assertAlmostEqual(a["carryover_pct"],b["carryover_pct"])
        # Allow the established controller to be better, not just equal.
        result = simulate(config.model_copy(update={"regulated_wait_s":10}))
        self.assertLess(result["metrics"][1]["peak_deviation_pct"],result["metrics"][2]["peak_deviation_pct"])

    def test_parameter_validation(self):
        for data in [{"radius_um":0},{"replicates":2},{"pressure_pa":float("nan")},
                     {"seed":-1},{"duration_s":20,"switch_s":18},{"unknown":1}]:
            with self.assertRaises(ValidationError):
                ExperimentInput(**data)

    def test_fingerprint_reproducible_from_exported_config(self):
        # Regression: integer float-defaults once made the default run's fingerprint
        # irreproducible from its own JSON export (1000 vs 1000.0).
        import hashlib, json
        result = simulate(ExperimentInput())
        exported = json.loads(json.dumps(result["config"]))
        recomputed = hashlib.sha256((result["model_version"] + json.dumps(exported, sort_keys=True, separators=(",", ":"))).encode()).hexdigest()
        self.assertEqual(recomputed, result["fingerprint"])
        self.assertEqual(simulate(ExperimentInput(**exported))["fingerprint"], result["fingerprint"])

    def test_high_flow_limit_remains_finite(self):
        config = self.config.model_copy(update={"radius_um":100, "pressure_pa":10000,
                  "channels":200, "length_mm":1, "viscosity_mpas":0.5, "dead_volume_ul":0.01})
        result = simulate(config)
        self.assertTrue(all(math.isfinite(p["carryover_pct"]) for p in result["traces"]))
        self.assertTrue(all(m["carryover_target_met"] for m in result["metrics"]))


if __name__ == "__main__":
    unittest.main()
