"""Analytical visualization of stored hydraulic traces, not a new CFD solver.

The original simulation engine remains unchanged. Every dimensional quantity
below is derived from its recorded pressure, flow, carryover and geometry.
"""
import math
import numpy as np
from scipy.integrate import cumulative_trapezoid
from .config import ExperimentInput
from .engine import METHODS

VISUALIZATION_VERSION = "analytical-fields-1.0.0"


def derive_visualization(run):
    config = ExperimentInput.model_validate(run["config"])
    radius_m = config.radius_um * 1e-6
    area_m2 = config.channels * math.pi * radius_m**2
    axial_mm = np.linspace(0, config.length_mm, 25)
    radial = np.linspace(0, 1, 17)
    frames = []
    for method in METHODS:
        trace = sorted((p for p in run["traces"] if p["method"] == method), key=lambda p: p["time_s"])
        if len(trace) < 2:
            raise ValueError("Visualization requires at least two recorded samples per topology.")
        times = np.array([p["time_s"] for p in trace], dtype=float)
        flows = np.array([p["flow_ul_min"] for p in trace], dtype=float)
        # µL/min -> m³/s -> m/s -> mm/s; equally shared by nominal channels.
        mean_velocity = flows * 1e-9 / 60 / area_m2 * 1000
        displacement = cumulative_trapezoid(mean_velocity, times, initial=0)
        for i, point in enumerate(trace):
            old_fraction = float(point["carryover_pct"]) / 100
            viscosity = config.viscosity_mpas * (old_fraction + (1-old_fraction)*config.altered_viscosity_ratio)
            pressure = float(point["pressure_pa"])
            mean_v = float(mean_velocity[i])
            frames.append({
                "method": method,
                "time_s": float(times[i]),
                "pressure_pa": pressure,
                "flow_ul_min": float(flows[i]),
                "mean_velocity_mm_s": mean_v,
                "centerline_velocity_mm_s": 2*mean_v,
                "viscosity_mpas": viscosity,
                "wall_shear_pa": 4*(viscosity*1e-3)*(mean_v*1e-3)/radius_m,
                "carryover_pct": float(point["carryover_pct"]),
                "displacement_mm": float(displacement[i]),
                "axial_pressure_pa": (pressure * (1-axial_mm/config.length_mm)).tolist(),
                "radial_velocity_mm_s": (2*mean_v*(1-radial**2)).tolist(),
            })
    return {
        "run_id": run["id"], "model_version": run["model_version"],
        "visualization_version": VISUALIZATION_VERSION,
        "geometry": {"radius_um": config.radius_um, "length_mm": config.length_mm,
                     "channels": config.channels, "outlet_pressure_pa": 0.0},
        "axial_positions_mm": axial_mm.tolist(),
        "radial_fractions": radial.tolist(),
        "frames": frames,
        "pressure_min_pa": min(0.0, min(f["pressure_pa"] for f in frames)),
        "pressure_max_pa": max(0.0, max(f["pressure_pa"] for f in frames)),
        "velocity_abs_max_mm_s": max(abs(f["centerline_velocity_mm_s"]) for f in frames),
        "notes": [
            "Conceptual visualization: apparatus layout, reservoirs, bypass, fittings, wall thickness and channel spacing are illustrative, not manufactured CAD or anatomy. No pressure field is calculated inside these illustrative fittings.",
            "Quantitative channel fields are analytical reconstructions from the original Python engine's recorded nominal hydraulic traces, not a three-dimensional Navier–Stokes CFD solution.",
            "Gauge outlet pressure is assumed zero. In each straight channel, p(x,t) = p_in(t) × (1−x/L); inertial transients, entry effects and junction losses are not resolved.",
            "Mean speed is Q_total/(N π r²). The assumed quasi-steady, Newtonian, no-slip profile is u(ρ,t)=2 ū(t)(1−ρ²), with ρ=radial distance/r. These fields describe reference geometry, not the injured virtual-chip arms.",
            "Signed shear = 4 μ_mix ū/r. μ_mix is reconstructed from the engine's old-fluid fraction and the configured reference/altered viscosities.",
            "Displacement is the SciPy trapezoidal integral of recorded signed mean velocity in mm. Passive pathline indicators may use displacement × 2(1−ρ²), modulo L, to re-inject visual tracers at boundaries.",
            "Particle count, size and axial spacing are illustrative; particles are neither red blood cells nor a measured concentration. Do not infer cell mechanics, collisions, transport through fittings, or biological rescue.",
            "Playback interpolates recorded numerical samples. Valve discontinuities have finite temporal sampling. The quasi-steady reconstruction is an assumption, especially near switching or reverse flow.",
            "Before/after refers to pre-switch versus selected playback time, not treatment efficacy. Topology comparisons use their recorded outputs and should share physical color scales.",
            "All biological effects, permeability and rescue retain the original engine's explicit unvalidated assumptions. A polished 3D display does not constitute experimental or clinical validation.",
        ],
    }
