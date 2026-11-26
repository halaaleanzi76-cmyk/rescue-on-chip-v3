"""Steady-state reduced-order Poiseuille network solver; not CFD or physiology."""

from __future__ import annotations

import hashlib
import json
import math
import warnings

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import MatrixRankWarning, spsolve

from .contracts import (
    VascularNetwork,
    VascularSegmentResult,
    VascularSolveInput,
    VascularSolveResult,
)
from .graph import NETWORK_VERSION, build_default_network

MODEL_VERSION = "vascular-poiseuille-network-0.1.0"
_FLOW_UL_MIN_PER_M3_S = 6e10
_PA_PER_MMHG = 133.322387415


def _fingerprint(network: VascularNetwork, request: VascularSolveInput) -> str:
    payload = {
        "model_version": MODEL_VERSION,
        "network": network.model_dump(mode="json"),
        "request": request.model_dump(mode="json"),
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _active_components(adjacency: dict[str, set[str]]) -> list[set[str]]:
    unseen = set(adjacency)
    components = []
    while unseen:
        start = unseen.pop()
        component = {start}
        stack = [start]
        while stack:
            current = stack.pop()
            for neighbor in adjacency[current] & unseen:
                unseen.remove(neighbor)
                component.add(neighbor)
                stack.append(neighbor)
        components.append(component)
    return components


def solve_network(
    network: VascularNetwork,
    request: VascularSolveInput,
) -> VascularSolveResult:
    """Solve a connected resistor graph with explicit pressure or flow boundaries."""
    nodes = {node.node_id: node for node in network.nodes}
    segments = {segment.segment_id: segment for segment in network.segments}
    unknown_overrides = set(request.radius_overrides_um) - set(segments)
    unknown_occlusions = set(request.occluded_segment_ids) - set(segments)
    if unknown_overrides or unknown_occlusions:
        unknown = sorted(unknown_overrides | unknown_occlusions)
        raise ValueError(f"Unknown vascular segment ID(s): {', '.join(unknown)}.")
    if len(request.occluded_segment_ids) != len(set(request.occluded_segment_ids)):
        raise ValueError("Occluded segment IDs must not contain duplicates.")

    ids = list(nodes)
    index = {node_id: i for i, node_id in enumerate(ids)}
    conductance_by_id: dict[str, float] = {}
    radius_by_id: dict[str, float] = {}
    adjacency = {node_id: set() for node_id in ids}
    for segment in network.segments:
        override = request.radius_overrides_um.get(segment.segment_id)
        radius = float(override) * 1e-6 if override is not None else segment.radius_m
        if not math.isfinite(radius) or radius <= 0:
            raise ValueError(f"Radius for {segment.segment_id} must be a finite positive value.")
        radius_by_id[segment.segment_id] = radius
        is_occluded = segment.segment_id in request.occluded_segment_ids
        conductance = (
            0.0
            if is_occluded
            else math.pi * radius**4 / (8 * request.viscosity_pa_s * segment.length_m)
        )
        conductance_by_id[segment.segment_id] = conductance
        if conductance > 0:
            adjacency[segment.start_node_id].add(segment.end_node_id)
            adjacency[segment.end_node_id].add(segment.start_node_id)

    inlet = network.inlet_node_id
    outlet = network.outlet_node_id
    if request.boundary_mode == "fixed_pressure":
        fixed = {inlet: request.inlet_pressure_pa, outlet: request.outlet_pressure_pa}
        unknown_nodes = [node_id for node_id in ids if node_id not in fixed]
        for component in _active_components(adjacency):
            if not component & set(fixed):
                raise ValueError(
                    "An isolated internal vessel component has no pressure boundary; "
                    "the network is underdetermined."
                )
    else:
        fixed = {outlet: request.outlet_pressure_pa}
        unknown_nodes = [node_id for node_id in ids if node_id != outlet]
        outlet_component = next(
            (component for component in _active_components(adjacency) if outlet in component),
            {outlet},
        )
        if inlet not in outlet_component or set(ids) - outlet_component:
            raise ValueError(
                "Fixed-inlet-flow mode requires every modeled node and the inlet "
                "to connect to the fixed-pressure outlet."
            )

    row_indices: list[int] = []
    column_indices: list[int] = []
    values: list[float] = []
    rhs = np.zeros(len(unknown_nodes), dtype=float)
    unknown_index = {node_id: i for i, node_id in enumerate(unknown_nodes)}
    incident: dict[str, list[tuple[str, float]]] = {node_id: [] for node_id in ids}
    for segment in network.segments:
        g = conductance_by_id[segment.segment_id]
        incident[segment.start_node_id].append((segment.end_node_id, g))
        incident[segment.end_node_id].append((segment.start_node_id, g))

    for node_id, row in unknown_index.items():
        i = row
        diagonal = 0.0
        for neighbor, g in incident[node_id]:
            diagonal += g
            if g == 0:
                continue
            if neighbor in unknown_index:
                row_indices.append(i)
                column_indices.append(unknown_index[neighbor])
                values.append(-g)
            else:
                rhs[i] += g * fixed[neighbor]
        row_indices.append(i)
        column_indices.append(i)
        values.append(diagonal)

    if request.boundary_mode == "fixed_inlet_flow":
        rhs[unknown_index[inlet]] += request.inlet_flow_ul_min / _FLOW_UL_MIN_PER_M3_S

    if unknown_nodes:
        matrix = coo_matrix(
            (values, (row_indices, column_indices)),
            shape=(len(unknown_nodes), len(unknown_nodes)),
            dtype=float,
        ).tocsr()
        with warnings.catch_warnings():
            warnings.simplefilter("error", MatrixRankWarning)
            try:
                pressure_values = spsolve(matrix, rhs)
            except (MatrixRankWarning, RuntimeError, ValueError) as exc:
                raise ValueError("The vascular boundary conditions do not define a unique solution.") from exc
        if not np.all(np.isfinite(pressure_values)):
            raise ValueError("The vascular solver produced a non-finite pressure.")
    else:
        pressure_values = np.array([], dtype=float)
    pressures = {node_id: pressure for node_id, pressure in fixed.items()}
    pressures.update(
        {node_id: float(pressure_values[row]) for node_id, row in unknown_index.items()}
    )

    raw_flows: dict[str, float] = {}
    node_balance = {node_id: 0.0 for node_id in ids}
    solved_segments: list[VascularSegmentResult] = []
    for segment in network.segments:
        start_p = pressures[segment.start_node_id]
        end_p = pressures[segment.end_node_id]
        radius = radius_by_id[segment.segment_id]
        area = math.pi * radius**2
        resistance = (
            None
            if conductance_by_id[segment.segment_id] == 0
            else 1 / conductance_by_id[segment.segment_id]
        )
        flow = 0.0 if resistance is None else (start_p - end_p) / resistance
        shear = 4 * request.viscosity_pa_s * abs(flow) / (math.pi * radius**3)
        velocity = flow / area
        node_balance[segment.start_node_id] += flow
        node_balance[segment.end_node_id] -= flow
        raw_flows[segment.segment_id] = flow
        direction = "forward" if flow > 0 else "reverse" if flow < 0 else "stagnant"
        solved_segments.append(
            VascularSegmentResult(
                segment_id=segment.segment_id,
                start_node_id=segment.start_node_id,
                end_node_id=segment.end_node_id,
                vessel_class=segment.vessel_class,
                length_m=segment.length_m,
                radius_m=radius,
                cross_section_area_m2=area,
                hydraulic_resistance_pa_s_m3=resistance,
                pressure_start_pa=start_p,
                pressure_end_pa=end_p,
                pressure_start_mmhg=start_p / _PA_PER_MMHG,
                pressure_end_mmhg=end_p / _PA_PER_MMHG,
                flow_rate_m3_s=flow,
                flow_rate_ul_min=flow * _FLOW_UL_MIN_PER_M3_S,
                flow_direction=direction,
                mean_velocity_m_s=velocity,
                mean_velocity_mm_s=velocity * 1e3,
                wall_shear_stress_pa=shear,
                start_position_m=segment.start_position_m,
                end_position_m=segment.end_position_m,
                occluded=resistance is None,
            )
        )

    internal = set(ids) - {inlet, outlet}
    flow_scale = max((abs(value) for value in raw_flows.values()), default=0.0)
    normalized_residual = max(
        (abs(node_balance[node_id]) for node_id in internal), default=0.0
    ) / max(flow_scale, 1e-30)
    if not math.isfinite(normalized_residual):
        raise ValueError("The vascular mass-balance residual is not finite.")

    inlet_flow = sum(
        flow
        for segment_id, flow in raw_flows.items()
        if segments[segment_id].start_node_id == inlet
    ) - sum(
        flow
        for segment_id, flow in raw_flows.items()
        if segments[segment_id].end_node_id == inlet
    )
    warnings_out = []
    if request.boundary_mode == "fixed_pressure":
        warnings_out.append(
            "Fixed-pressure mode holds both boundary pressures; total flow is calculated and can change with resistance."
        )
    else:
        warnings_out.append(
            "Fixed-inlet-flow mode holds inlet flow and outlet pressure; the inlet pressure is solved and can change with resistance."
        )
    warnings_out.extend(
        [
            "The model uses rigid cylindrical segments, steady laminar Newtonian flow, Poiseuille resistance and junction mass conservation.",
            "This reduced-order graph is not CFD, a blood-cell transport model, or a calibrated physiological prediction.",
            "The default geometry is an illustrative engineering fixture, not a measured or patient-specific cerebral vascular anatomy.",
        ]
    )
    if request.occluded_segment_ids:
        warnings_out.append(
            "Listed segments are modeled as zero-conductance blocked edges; disconnected underdetermined components are rejected."
        )

    return VascularSolveResult(
        network_version=network.network_version,
        model_version=MODEL_VERSION,
        input_fingerprint=_fingerprint(network, request),
        boundary_mode=request.boundary_mode,
        viscosity_pa_s=request.viscosity_pa_s,
        inlet_pressure_pa=pressures[inlet],
        inlet_pressure_mmhg=pressures[inlet] / _PA_PER_MMHG,
        outlet_pressure_pa=pressures[outlet],
        outlet_pressure_mmhg=pressures[outlet] / _PA_PER_MMHG,
        inlet_flow_m3_s=inlet_flow,
        inlet_flow_ul_min=inlet_flow * _FLOW_UL_MIN_PER_M3_S,
        max_normalized_mass_balance_residual=normalized_residual,
        node_pressures_pa=pressures,
        segments=solved_segments,
        assumptions=warnings_out,
        warnings=[],
    )


def solve_default_network(request: VascularSolveInput) -> VascularSolveResult:
    return solve_network(build_default_network(), request)
