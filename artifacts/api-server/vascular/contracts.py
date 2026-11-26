"""Validated API contracts for the independent vascular graph and solver."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class VascularNode(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    node_id: str
    role: Literal["inlet", "junction", "outlet"]
    position_m: tuple[float, float, float]


class VascularSegment(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    segment_id: str
    start_node_id: str
    end_node_id: str
    vessel_class: Literal["artery", "arteriole", "capillary", "venule", "vein"]
    length_m: float = Field(gt=0)
    radius_m: float = Field(gt=0)
    start_position_m: tuple[float, float, float]
    end_position_m: tuple[float, float, float]
    geometry_basis: str


class VascularNetwork(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    network_version: str
    tissue_scope: str
    inlet_node_id: str
    outlet_node_id: str
    nodes: list[VascularNode]
    segments: list[VascularSegment]
    geometry_note: str
    physical_assumptions: list[str]


class VascularSolveInput(BaseModel):
    """User-controlled steady-state inputs; numbers are not patient measurements."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    boundary_mode: Literal["fixed_pressure", "fixed_inlet_flow"] = "fixed_pressure"
    inlet_pressure_pa: float = Field(default=1000, ge=0, le=100_000)
    outlet_pressure_pa: float = Field(default=0, ge=0, le=100_000)
    inlet_flow_ul_min: float = Field(default=1, gt=0, le=1_000_000)
    viscosity_pa_s: float = Field(default=0.0012, gt=0, le=0.1)
    radius_overrides_um: dict[str, float] = Field(default_factory=dict, max_length=100)
    occluded_segment_ids: list[str] = Field(default_factory=list, max_length=100)

class VascularSegmentResult(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    segment_id: str
    start_node_id: str
    end_node_id: str
    vessel_class: Literal["artery", "arteriole", "capillary", "venule", "vein"]
    length_m: float
    radius_m: float
    cross_section_area_m2: float
    hydraulic_resistance_pa_s_m3: float | None
    pressure_start_pa: float
    pressure_end_pa: float
    pressure_start_mmhg: float
    pressure_end_mmhg: float
    flow_rate_m3_s: float
    flow_rate_ul_min: float
    flow_direction: Literal["forward", "reverse", "stagnant"]
    mean_velocity_m_s: float
    mean_velocity_mm_s: float
    wall_shear_stress_pa: float
    start_position_m: tuple[float, float, float]
    end_position_m: tuple[float, float, float]
    occluded: bool


class VascularSolveResult(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    network_version: str
    model_version: str
    input_fingerprint: str
    boundary_mode: Literal["fixed_pressure", "fixed_inlet_flow"]
    viscosity_pa_s: float
    inlet_pressure_pa: float
    inlet_pressure_mmhg: float
    outlet_pressure_pa: float
    outlet_pressure_mmhg: float
    inlet_flow_m3_s: float
    inlet_flow_ul_min: float
    max_normalized_mass_balance_residual: float
    node_pressures_pa: dict[str, float]
    segments: list[VascularSegmentResult]
    assumptions: list[str]
    warnings: list[str]
