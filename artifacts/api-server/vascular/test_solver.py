"""Analytical checks for the vascular resistor-network solver."""

import math
import unittest

from pydantic import ValidationError

from .contracts import VascularNetwork, VascularNode, VascularSegment, VascularSolveInput
from .graph import build_default_network
from .solver import solve_network, solve_default_network


def network(rows, positions=None, inlet="inlet", outlet="outlet"):
    positions = positions or {}
    node_ids = list(dict.fromkeys([row[1] for row in rows] + [row[2] for row in rows]))
    node_models = [
        VascularNode(
            node_id=node_id,
            role="inlet" if node_id == inlet else "outlet" if node_id == outlet else "junction",
            position_m=positions.get(node_id, (0.0, 0.0, 0.0)),
        )
        for node_id in node_ids
    ]
    segment_models = []
    for segment_id, start, end, length, radius in rows:
        segment_models.append(
            VascularSegment(
                segment_id=segment_id,
                start_node_id=start,
                end_node_id=end,
                vessel_class="capillary",
                length_m=length,
                radius_m=radius,
                start_position_m=positions.get(start, (0.0, 0.0, 0.0)),
                end_position_m=positions.get(end, (0.0, 0.0, 0.0)),
                geometry_basis="test fixture",
            )
        )
    return VascularNetwork(
        network_version="test-network",
        tissue_scope="analytical test fixture",
        inlet_node_id=inlet,
        outlet_node_id=outlet,
        nodes=node_models,
        segments=segment_models,
        geometry_note="Analytical test fixture only.",
        physical_assumptions=[],
    )


class VascularSolverTests(unittest.TestCase):
    mu = 0.0012
    length = 0.001
    radius = 20e-6
    pressure_drop = 1000.0

    def one_tube(self, radius=None, mu=None, p_in=1000, p_out=0):
        graph = network(
            [("tube", "inlet", "outlet", self.length, self.radius if radius is None else radius)]
        )
        result = solve_network(
            graph,
            VascularSolveInput(
                inlet_pressure_pa=p_in,
                outlet_pressure_pa=p_out,
                viscosity_pa_s=self.mu if mu is None else mu,
            ),
        )
        return graph, result

    def test_single_tube_matches_analytical_poiseuille_solution(self):
        _, result = self.one_tube()
        expected = math.pi * self.radius**4 * self.pressure_drop / (8 * self.mu * self.length)
        self.assertAlmostEqual(result.segments[0].flow_rate_m3_s, expected, delta=expected * 1e-12)
        self.assertAlmostEqual(result.segments[0].hydraulic_resistance_pa_s_m3, self.pressure_drop / expected, delta=1e-3)
        self.assertLess(result.max_normalized_mass_balance_residual, 1e-8)

    def test_two_tubes_in_series_have_expected_pressure_drops(self):
        rows = [
            ("series_a", "inlet", "middle", 0.001, 20e-6),
            ("series_b", "middle", "outlet", 0.002, 20e-6),
        ]
        result = solve_network(
            network(rows),
            VascularSolveInput(inlet_pressure_pa=1200, outlet_pressure_pa=0, viscosity_pa_s=self.mu),
        )
        q = math.pi * (20e-6) ** 4 * 1200 / (8 * self.mu * 0.003)
        self.assertAlmostEqual(result.segments[0].flow_rate_m3_s, q, delta=q * 1e-12)
        self.assertAlmostEqual(result.segments[1].flow_rate_m3_s, q, delta=q * 1e-12)
        self.assertAlmostEqual(result.node_pressures_pa["middle"], 800, delta=1e-9)

    def test_two_parallel_branches_split_flow_by_conductance(self):
        rows = [
            ("branch_a", "inlet", "outlet", 0.001, 20e-6),
            ("branch_b", "inlet", "outlet", 0.002, 10e-6),
        ]
        result = solve_network(
            network(rows),
            VascularSolveInput(inlet_pressure_pa=800, outlet_pressure_pa=0, viscosity_pa_s=self.mu),
        )
        qa, qb = [segment.flow_rate_m3_s for segment in result.segments]
        expected_ratio = (20 / 10) ** 4 * (0.002 / 0.001)
        self.assertAlmostEqual(qa / qb, expected_ratio, delta=expected_ratio * 1e-12)
        self.assertLess(result.max_normalized_mass_balance_residual, 1e-8)

    def test_internal_junction_mass_conservation(self):
        result = solve_default_network(VascularSolveInput())
        self.assertLess(result.max_normalized_mass_balance_residual, 1e-8)

    def test_halving_radius_reduces_fixed_pressure_flow_to_one_sixteenth(self):
        _, base = self.one_tube()
        _, narrowed = self.one_tube(radius=self.radius / 2)
        self.assertAlmostEqual(
            narrowed.inlet_flow_m3_s / base.inlet_flow_m3_s,
            1 / 16,
            delta=1e-12,
        )

    def test_doubling_viscosity_halves_fixed_pressure_flow(self):
        _, base = self.one_tube()
        _, thicker = self.one_tube(mu=self.mu * 2)
        self.assertAlmostEqual(thicker.inlet_flow_m3_s / base.inlet_flow_m3_s, 0.5, delta=1e-12)

    def test_equal_pressure_boundaries_produce_zero_flow(self):
        _, result = self.one_tube(p_in=500, p_out=500)
        self.assertTrue(all(segment.flow_rate_m3_s == 0 for segment in result.segments))
        self.assertEqual(result.max_normalized_mass_balance_residual, 0)

    def test_si_display_conversions(self):
        _, result = self.one_tube()
        segment = result.segments[0]
        self.assertAlmostEqual(segment.flow_rate_ul_min, segment.flow_rate_m3_s * 6e10, delta=1e-12)
        self.assertAlmostEqual(segment.mean_velocity_mm_s, segment.mean_velocity_m_s * 1e3, delta=1e-12)

    def test_invalid_geometry_and_unknown_overrides_are_rejected(self):
        with self.assertRaises(ValidationError):
            network([("tube", "inlet", "outlet", 0.001, 0)])
        graph, _ = self.one_tube()
        with self.assertRaises(ValueError):
            VascularSolveInput(
                radius_overrides_um={"tube": float("inf")}
            )
        with self.assertRaises(ValueError):
            solve_network(graph, VascularSolveInput(radius_overrides_um={"tube": 0}))
        with self.assertRaises(ValueError):
            solve_network(graph, VascularSolveInput(radius_overrides_um={"not-a-segment": 5}))

    def test_invalid_graph_without_pressure_anchor_is_rejected(self):
        graph = network(
            [
                ("main", "inlet", "outlet", 0.001, 20e-6),
                ("isolated", "x", "y", 0.001, 20e-6),
            ]
        )
        with self.assertRaises(ValueError):
            solve_network(graph, VascularSolveInput())

    def test_repeatability_and_fingerprint(self):
        request = VascularSolveInput()
        graph = build_default_network()
        first = solve_network(graph, request)
        second = solve_network(graph, request)
        self.assertEqual(first.model_dump(), second.model_dump())
        self.assertEqual(len(first.input_fingerprint), 64)

    def test_fixed_inlet_flow_solves_inlet_pressure(self):
        graph = network([("tube", "inlet", "outlet", self.length, self.radius)])
        result = solve_network(
            graph,
            VascularSolveInput(
                boundary_mode="fixed_inlet_flow",
                inlet_flow_ul_min=1.0,
                outlet_pressure_pa=25,
                viscosity_pa_s=self.mu,
            ),
        )
        self.assertAlmostEqual(result.inlet_flow_ul_min, 1.0, delta=1e-12)
        self.assertGreater(result.inlet_pressure_pa, result.outlet_pressure_pa)
        self.assertLess(result.max_normalized_mass_balance_residual, 1e-8)

    def test_occlusion_preserves_flow_through_alternative_capillary_path(self):
        graph = build_default_network()
        baseline = solve_network(graph, VascularSolveInput())
        blocked = solve_network(
            graph,
            VascularSolveInput(occluded_segment_ids=["capillary_u_1_2"]),
        )
        baseline_total = abs(baseline.inlet_flow_m3_s)
        blocked_total = abs(blocked.inlet_flow_m3_s)
        self.assertTrue(any(segment.flow_rate_m3_s != 0 for segment in blocked.segments if "anastomosis" in segment.segment_id))
        self.assertGreater(blocked_total, 0)
        self.assertNotAlmostEqual(blocked_total, baseline_total, delta=baseline_total * 1e-6)


if __name__ == "__main__":
    unittest.main()
