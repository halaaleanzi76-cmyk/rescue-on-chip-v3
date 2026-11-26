"""Auditable, uncalibrated hydraulic + tracer calculations, not a disease model."""
import hashlib
import json
import math
import numpy as np
import scipy
import pandas as pd
from scipy.integrate import cumulative_trapezoid, solve_ivp
from scipy.stats import t as student_t
from .config import ExperimentInput

# 1.0.2: canonical float defaults in the fingerprint payload (numerics unchanged from 1.0.1).
MODEL_VERSION = "bench-1.0.2"
METHODS = ["stop_flow", "pressure_controlled", "equalized"]
LABELS = {"stop_flow": "Stop-flow selector", "pressure_controlled": "Pressure-controlled", "equalized": "Proposed equalization"}


def flow_ul_min(pressure, radius_m, viscosity_pa_s, length_m, channels):
    return np.asarray(pressure) * math.pi * radius_m**4 * channels / (8 * viscosity_pa_s * length_m) * 6e10


def simulate(c: ExperimentInput):
    rng = np.random.default_rng(c.seed)
    r, length, mu = c.radius_um * 1e-6, c.length_mm * 1e-3, c.viscosity_mpas * 1e-3
    baseline = float(flow_ul_min(c.pressure_pa, r, mu, length, c.channels))
    # Dense around valve events; exact event samples prevent peak underestimation.
    time = np.unique(np.r_[np.linspace(0, c.duration_s, 601), c.switch_s,
                          c.switch_s + c.stop_duration_s,
                          c.switch_s + np.linspace(0, min(10, c.duration_s-c.switch_s), 501)])
    x = time - c.switch_s
    switched = x >= 0
    traces, metrics = [], []
    for method in METHODS:
        tau = c.regulated_tau_s if method != "equalized" else c.equalized_tau_s
        wait = c.equalization_s if method == "equalized" else (c.regulated_wait_s if method == "pressure_controlled" else 0)
        residual = c.offset_pct / 100 * math.exp(-wait / tau)
        p = np.full_like(time, c.pressure_pa)
        if method == "stop_flow":
            stop = switched & (x < c.stop_duration_s)
            p[stop] = 0
            recovered = x >= c.stop_duration_s
            p[recovered] = c.pressure_pa * (1 + residual * np.exp(-(x[recovered]-c.stop_duration_s)/tau))
        else:
            p[switched] = c.pressure_pa * (1 + residual * np.exp(-x[switched]/tau))
        q = flow_ul_min(p, r, mu, length, c.channels)
        # Viscosity changes as old perfusate washes out; concentration is solved
        # by first-order mixed-volume mass balance using positive through-flow.
        def washout(ti, state):
            # Integrating log concentration avoids stiffness at very high Q/V.
            # Evaluate valve events exactly, without interpolating across jumps.
            old = math.exp(min(float(state[0]), 0))
            elapsed = ti-c.switch_s
            if method == "stop_flow" and elapsed < c.stop_duration_s:
                local_pressure = 0
            else:
                elapsed -= c.stop_duration_s if method == "stop_flow" else 0
                local_pressure = c.pressure_pa*(1+residual*math.exp(-elapsed/tau))
            base_q = float(flow_ul_min(local_pressure, r, mu, length, c.channels))
            mix_ratio = old + (1-old) * c.altered_viscosity_ratio
            return [-max(base_q, 0) / (60*c.dead_volume_ul*mix_ratio)]
        integration_start = c.switch_s + (c.stop_duration_s if method == "stop_flow" else 0)
        active = time >= integration_start
        sol = solve_ivp(washout, (integration_start, c.duration_s), [0.0],
                        t_eval=time[active], rtol=1e-7, atol=1e-10, max_step=0.1)
        if not sol.success:
            raise RuntimeError("Tracer solver did not converge: " + sol.message)
        carry = np.ones_like(time)
        carry[active] = np.exp(np.minimum(sol.y[0], 0))
        q = q / (carry + (1-carry) * c.altered_viscosity_ratio)
        deviation = float(np.max(np.abs(p[switched]/c.pressure_pa-1))*100)
        passed = np.flatnonzero(switched & (carry <= 0.05))
        flush = cumulative_trapezoid(np.where(switched, np.maximum(q,0),0)/60, time, initial=0)
        metrics.append({
            "method": method, "label": LABELS[method], "peak_deviation_pct": deviation,
            "pressure_target_met": deviation <= 5 + 1e-10,
            "carryover_pct": float(carry[-1]*100), "carryover_target_met": bool(carry[-1] <= 0.05),
            "washout_s": float(time[passed[0]]-c.switch_s) if len(passed) else None,
            "flush_volume_ul": float(flush[-1]),
            "interruption_s": c.stop_duration_s if method == "stop_flow" else 0,
            "reversal_detected": bool(np.any(q < 0)),
        })
        for ti, pi, qi, ci in zip(time, p, q, carry):
            traces.append({"method": method, "time_s": float(ti), "pressure_pa": float(pi),
                           "flow_ul_min": float(qi), "carryover_pct": float(ci*100)})

    # Independently sampled chip geometry in the full 2x2. No synthetic efficacy data.
    arms, chips = [], []
    sigma = math.sqrt(math.log1p((c.radius_cv_pct/100)**2))
    for fluid in [0, 1]:
        for vessel in [0, 1]:
            arm = f"F{fluid}V{vessel}"
            viscosity = mu * (c.altered_viscosity_ratio if fluid else 1)
            radius_factor = 1-c.narrowing_pct/100 if vessel else 1
            open_channels = c.channels * (1-c.occlusion_pct/100 if vessel else 1)
            for replicate in range(c.replicates):
                chip_r = r * math.exp(float(rng.normal(-sigma*sigma/2, sigma)))
                vehicle = float(flow_ul_min(c.pressure_pa, chip_r*radius_factor, viscosity, length, open_channels))
                # Hypothetical geometric reversal, explicitly not a drug response law.
                rescue_radius = radius_factor + (1-radius_factor)*c.rescue_fraction
                rescue_channels = open_channels + (c.channels-open_channels)*c.rescue_fraction
                rescued = float(flow_ul_min(c.pressure_pa, chip_r*rescue_radius, viscosity, length, rescue_channels))
                perm = c.permeability_um_s * (c.injury_permeability_ratio if vessel else 1)
                chips.append({"arm": arm, "fluid": fluid, "vessel": vessel, "replicate": replicate+1,
                              "radius_um": chip_r*1e6, "flow_ul_min": vehicle, "rescue_flow_ul_min": rescued,
                              "permeability_um_s": perm})
            values = np.array([z["flow_ul_min"] for z in chips if z["arm"] == arm])
            rescue = np.array([z["rescue_flow_ul_min"] for z in chips if z["arm"] == arm])
            se = float(values.std(ddof=1)/math.sqrt(c.replicates))
            width = float(student_t.ppf(0.975, c.replicates-1)*se)
            arms.append({"arm": arm, "label": ("Altered" if fluid else "Reference")+" fluid / "+("Injured" if vessel else "Healthy")+" vessel",
                         "fluid": fluid, "vessel": vessel, "n": c.replicates,
                         "mean_flow_ul_min": float(values.mean()), "ci_low": float(values.mean()-width),
                         "ci_high": float(values.mean()+width), "rescue_flow_ul_min": float(rescue.mean()),
                         "normalized_flow_pct": float(values.mean()/baseline*100),
                         "permeability_um_s": c.permeability_um_s*(c.injury_permeability_ratio if vessel else 1)})
    means = {a["arm"]: a["mean_flow_ul_min"] for a in arms}
    contrasts = [
        {"name": "Perfusate main effect", "value": ((means["F1V0"]+means["F1V1"])-(means["F0V0"]+means["F0V1"]))/2},
        {"name": "Vessel main effect", "value": ((means["F0V1"]+means["F1V1"])-(means["F0V0"]+means["F1V0"]))/2},
        {"name": "Interaction (difference-in-differences)", "value": means["F1V1"]-means["F1V0"]-means["F0V1"]+means["F0V0"]},
    ]
    # Continuous donor supply, two well-mixed compartments, concentration normalized.
    tracer = []
    area = 2*math.pi*r*length*c.channels
    lumen_volume = math.pi*r*r*length*c.channels
    receiver_volume = c.receiver_volume_ul*1e-9
    t_eval = np.linspace(0,c.duration_s,121)
    for injured in [False, True]:
        permeability = c.permeability_um_s*1e-6*(c.injury_permeability_ratio if injured else 1)
        conductance = permeability*area
        q_si = baseline/6e10
        def transport(_, state):
            donor, receiver = state
            flux = conductance*(donor-receiver)
            return [(q_si*(1-donor)-flux)/lumen_volume, flux/receiver_volume]
        sol = solve_ivp(transport,(0,c.duration_s),[0,0],t_eval=t_eval,rtol=1e-7,atol=1e-10,method="LSODA")
        if not sol.success:
            raise RuntimeError("Barrier transport solver failed.")
        for ti, cd, ca in zip(sol.t,sol.y[0],sol.y[1]):
            tracer.append({"condition": "injured" if injured else "healthy", "time_s": float(ti),
                           "donor_fraction": float(cd), "receiver_fraction": float(ca)})
    reynolds = 1000 * (baseline/6e10/(math.pi*r*r*c.channels)) * 2*r/mu
    assumptions = [
        "Proposal §§5–9 specifies experimental design and provisional ≤5% pressure/carryover targets, but contains no calibrated equations or measured datasets.",
        "Hagen–Poiseuille flow: straight rigid circular, identical parallel channels; incompressible Newtonian fluid, no-slip laminar flow. Not an RBC/capillary or thrombotic model.",
        "Pressure transients are user-prescribed exponential RC relaxations, not a solved manifold geometry or measured controller performance. Equalization attenuates offset by exp(−wait/τ); a comparator may be equally good or better.",
        "Washout is a perfectly mixed dead-volume model: dC_old/dt = −Q_positive C_old/V_dead. Viscosity is linearly mixed. Backflow is flagged but reverse-flow composition is not resolved.",
        "2×2 arms are independent virtual chips with seeded lognormal radius variation only. Student-t intervals quantify assumed simulation variability, not biological evidence, statistical power or mixed-effects batch analysis.",
        "Injury is user-assumed radius narrowing, loss of open channels and a prescribed permeability multiplier. No injury induction, cell viability, BBB damage or clinical response is predicted.",
        "Rescue is an optional assumed reversal of geometry (0–1), not therapeutic efficacy. Permeability is held unchanged by rescue; barrier preservation cannot be inferred.",
        "Barrier traces solve two well-mixed compartments with continuous donor supply and prescribed permeability, common reference geometry/flow. They do not correct real assay data for pressure, filtration, binding or photobleaching.",
        "Pressure targets are checked on one deterministic nominal switch per topology, not the proposal's ≥95% of experimentally successful switches. Carryover is assessed at the configured run end; flush volume is reported.",
        "All defaults except proposal endpoint targets and illustrative six chips per arm are engineering assumptions requiring laboratory calibration. Not for diagnosis, patient connection or treatment.",
        f"Planned barrier criterion only: injury-matched reference permeability × (1 + {c.barrier_margin_pct:g}%) = {c.permeability_um_s*c.injury_permeability_ratio*(1+c.barrier_margin_pct/100):.6g} µm/s. This user-selected margin is reported for experimental planning, not evaluated as a biological rescue outcome.",
    ]
    warnings = []
    if any(m["reversal_detected"] for m in metrics):
        warnings.append("Backflow detected: washout estimates exclude reverse transport and are not valid for experimental interpretation.")
    if reynolds >= 1:
        warnings.append("Reynolds number ≥1. Check low-Re modeling assumptions and entrance effects.")
    if c.rescue_fraction > 0:
        warnings.append("Rescue benefit is imposed by your geometric reversal input; it is not an efficacy prediction. Barrier outcome is not established.")
    if c.radius_cv_pct == 0:
        warnings.append("Zero radius variability produces zero-width synthetic intervals, not certainty about experiments.")
    if not all(m["carryover_target_met"] for m in metrics):
        warnings.append("At least one topology has not reached 5% carryover by the configured run end.")
    payload = c.model_dump()
    fingerprint = hashlib.sha256((MODEL_VERSION+json.dumps(payload,sort_keys=True,separators=(",",":"))).encode()).hexdigest()
    return {"config": payload, "model_version": MODEL_VERSION, "fingerprint": fingerprint,
            "baseline_flow_ul_min": baseline, "reynolds_number": float(reynolds),
            "wall_shear_pa": c.pressure_pa*r/(2*length),
            "resistance_pa_s_m3": 8*mu*length/(math.pi*r**4*c.channels),
            "metrics": metrics, "traces": traces, "arms": arms, "replicates": chips,
            "contrasts": contrasts, "tracer": tracer, "assumptions": assumptions, "warnings": warnings,
            "software": {"numpy": np.__version__, "scipy": scipy.__version__, "pandas": pd.__version__}}
