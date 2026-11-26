"""Invariants tying the 3D reconstruction to the unchanged scientific engine."""
import math
import unittest
import numpy as np
from .config import ExperimentInput
from .contracts import RunVisualization, SimulationPreview
from .engine import simulate
from .visualization import derive_visualization


class VisualizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = ExperimentInput(duration_s=20, switch_s=2, seed=47)
        cls.record = {**simulate(cls.config), "id":"visualization-fixture", "created_at":"2026-11-23T00:00:00Z"}
        cls.view = derive_visualization(cls.record)

    def test_response_contracts(self):
        RunVisualization.model_validate(self.view)
        SimulationPreview.model_validate({"run":self.record,"visualization":self.view})
        self.assertEqual(len(self.view["frames"]), len(self.record["traces"]))

    def test_flow_velocity_area_and_units(self):
        total_area = self.config.channels*math.pi*(self.config.radius_um*1e-6)**2
        for f in self.view["frames"][::73]:
            recovered_q = f["mean_velocity_mm_s"]*1e-3*total_area*60*1e9
            self.assertAlmostEqual(recovered_q,f["flow_ul_min"],places=10)

    def test_pressure_boundary_and_linear_gradient(self):
        for f in self.view["frames"][::97]:
            self.assertAlmostEqual(f["axial_pressure_pa"][0],f["pressure_pa"])
            self.assertAlmostEqual(f["axial_pressure_pa"][-1],0)
            self.assertAlmostEqual(f["axial_pressure_pa"][12],f["pressure_pa"]/2)

    def test_radial_profile_no_slip_and_flux(self):
        for f in self.view["frames"][::73]:
            self.assertAlmostEqual(f["radial_velocity_mm_s"][0],2*f["mean_velocity_mm_s"])
            self.assertEqual(f["radial_velocity_mm_s"][-1],0)
            rho = np.linspace(0,1,1001)
            area_mean = np.trapezoid(2*f["mean_velocity_mm_s"]*(1-rho*rho)*2*rho,rho)
            self.assertAlmostEqual(area_mean,f["mean_velocity_mm_s"],delta=max(abs(f["mean_velocity_mm_s"])*2e-6,1e-12))

    def test_shear_matches_pressure_geometry(self):
        r, length = self.config.radius_um*1e-6,self.config.length_mm*1e-3
        for f in self.view["frames"][::83]:
            self.assertAlmostEqual(f["wall_shear_pa"],f["pressure_pa"]*r/(2*length),places=9)

    def test_zero_flow_means_zero_motion(self):
        stop_frames = [f for f in self.view["frames"] if f["method"]=="stop_flow"
                       and self.config.switch_s <= f["time_s"] < self.config.switch_s+self.config.stop_duration_s]
        self.assertGreater(len(stop_frames),0)
        self.assertTrue(all(f["mean_velocity_mm_s"]==0 for f in stop_frames))
        self.assertAlmostEqual(stop_frames[0]["displacement_mm"],stop_frames[-1]["displacement_mm"])

    def test_reverse_flow_has_signed_motion(self):
        config = self.config.model_copy(update={"offset_pct":-150,"regulated_wait_s":0,"equalization_s":0})
        run = {**simulate(config),"id":"reverse","created_at":self.record["created_at"]}
        view = derive_visualization(run)
        reversed_frames = [f for f in view["frames"] if f["flow_ul_min"]<0]
        self.assertTrue(reversed_frames)
        self.assertTrue(all(f["mean_velocity_mm_s"]<0 for f in reversed_frames))
        self.assertLess(view["pressure_min_pa"],0)

    def test_deterministic_derivation_does_not_change_original_run(self):
        import copy
        before = copy.deepcopy(self.record)
        self.assertEqual(derive_visualization(self.record),self.view)
        self.assertEqual(self.record,before)


if __name__=="__main__":
    unittest.main()
