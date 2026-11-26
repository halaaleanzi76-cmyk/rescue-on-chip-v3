"""Verdict A — mathematical VERIFICATION of the Rescue-on-Chip engines (not validation).

Every check compares the REAL engine output against an INDEPENDENT reference computed here
(closed-form solution, matrix exponential, or a separately written nodal solver).
Acceptance tolerances are fixed in TOL before running. Outputs: ../results/verification_*.json|csv
Run:  .venv\\Scripts\\python.exe REAL_WORLD_VALIDATION_EVIDENCE\\runs\\run_verification.py
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import json
import math
import platform
import subprocess
import sys
from pathlib import Path

import numpy as np
import scipy
from scipy.linalg import expm

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
API = ROOT / "artifacts" / "api-server"
OUT = HERE.parent / "results"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(API))

from simulation.config import ExperimentInput  # noqa: E402
from simulation.engine import MODEL_VERSION, flow_ul_min, simulate  # noqa: E402
from vascular.contracts import VascularSolveInput  # noqa: E402
from vascular.graph import build_default_network  # noqa: E402
from vascular.solver import MODEL_VERSION as VASC_VERSION, solve_network  # noqa: E402

# Acceptance criteria, fixed before running (double-precision arithmetic; ODE solver rtol=1e-7 in engine).
TOL = {
    "closed_form_rel": 1e-12,     # same formula family evaluated independently
    "network_rel": 1e-9,          # sparse vs dense linear solve
    "mass_residual": 1e-9,
    "scaling_rel": 1e-9,
    "ode_rel": 1e-4,              # engine solve_ivp (rtol 1e-7) vs exact expm/exponential, includes output interpolation
    "ode_abs": 1e-6,
    "delta_method_rel": 0.15,     # Monte-Carlo CV vs first-order prediction (statistical tolerance)
}

results: list[dict] = []


def record(check: str, group: str, metric: str, value: float, tol: float, detail: dict | None = None, mode: str = "le"):
    ok = (value <= tol) if mode == "le" else (value >= tol)
    results.append({"check": check, "group": group, "metric": metric, "value": float(value),
                    "tolerance": tol, "pass": bool(ok), **({"detail": detail} if detail else {})})
    print(f"[{'PASS' if ok else 'FAIL'}] {group:<12} {check:<55} {metric}={value:.3e} (tol {tol:.0e})")


# ---------------------------------------------------------------- A1 Hagen–Poiseuille
def hp_reference(p_pa, r_m, mu_pa_s, l_m, n):
    return p_pa * math.pi * r_m**4 * n / (8 * mu_pa_s * l_m) * 1e9 * 60  # m3/s -> uL/min


errs = []
rng = np.random.default_rng(2026)
for _ in range(500):
    p, r, mu, L, n = rng.uniform(10, 1e4), rng.uniform(5e-6, 1e-4), rng.uniform(5e-4, 1e-2), rng.uniform(1e-3, 0.1), int(rng.integers(1, 201))
    e = float(flow_ul_min(p, r, mu, L, n)); ref = hp_reference(p, r, mu, L, n)
    errs.append(abs(e - ref) / ref)
record("Hagen–Poiseuille flow, 500 random parameter sets", "poiseuille", "max_rel_err", max(errs), TOL["closed_form_rel"])

cfg = ExperimentInput()
run = simulate(cfg)
r, L, mu = cfg.radius_um * 1e-6, cfg.length_mm * 1e-3, cfg.viscosity_mpas * 1e-3
q_ref = hp_reference(cfg.pressure_pa, r, mu, L, cfg.channels)
record("baseline_flow_ul_min (default run)", "poiseuille", "rel_err", abs(run["baseline_flow_ul_min"] - q_ref) / q_ref, TOL["closed_form_rel"],
       {"engine": run["baseline_flow_ul_min"], "reference": q_ref})
R_ref = 8 * mu * L / (math.pi * r**4 * cfg.channels)
record("hydraulic resistance", "poiseuille", "rel_err", abs(run["resistance_pa_s_m3"] - R_ref) / R_ref, TOL["closed_form_rel"])
tau_ref = cfg.pressure_pa * r / (2 * L)
record("wall shear = ΔP·r/(2L)", "poiseuille", "rel_err", abs(run["wall_shear_pa"] - tau_ref) / tau_ref, TOL["closed_form_rel"])
u_mean = (q_ref / 6e10) / (math.pi * r * r * cfg.channels)
re_ref = 1000 * u_mean * 2 * r / mu
record("Reynolds number (ρ=1000 kg/m³)", "poiseuille", "rel_err", abs(run["reynolds_number"] - re_ref) / re_ref, TOL["closed_form_rel"],
       {"engine": run["reynolds_number"], "reference": re_ref, "regime": "laminar (Re<<2000)"})

# Local sensitivities (finite differences on the engine) vs exact exponents of Q ∝ P·r⁴/(μL)
base = float(flow_ul_min(1000, 25e-6, 1.2e-3, 0.01, 16))
for name, args, exp_ in [("P", (1000 * 1.001, 25e-6, 1.2e-3, 0.01, 16), 1), ("r", (1000, 25e-6 * 1.001, 1.2e-3, 0.01, 16), 4),
                         ("mu", (1000, 25e-6, 1.2e-3 * 1.001, 0.01, 16), -1), ("L", (1000, 25e-6, 1.2e-3, 0.01 * 1.001, 16), -1)]:
    s = math.log(float(flow_ul_min(*args)) / base) / math.log(1.001)
    record(f"sensitivity d ln Q / d ln {name} = {exp_}", "sensitivity", "abs_err", abs(s - exp_), 1e-6, {"numerical": s, "exact": exp_})

# ---------------------------------------------------------------- A2 washout (exact exponential when Q is constant)
c2 = ExperimentInput(offset_pct=0, altered_viscosity_ratio=1.0, dead_volume_ul=0.5)
run2 = simulate(c2)
q_const = run2["baseline_flow_ul_min"]
worst_rel, worst_abs, n_pts = 0.0, 0.0, 0
rows_washout = []
for m in ("equalized", "pressure_controlled", "stop_flow"):
    start = c2.switch_s + (c2.stop_duration_s if m == "stop_flow" else 0)
    for t in (x for x in run2["traces"] if x["method"] == m and x["time_s"] >= start):
        ref = 100 * math.exp(-q_const * (t["time_s"] - start) / (60 * c2.dead_volume_ul))
        a = abs(t["carryover_pct"] - ref); worst_abs = max(worst_abs, a)
        if ref > 1e-3:
            worst_rel = max(worst_rel, a / ref)
        n_pts += 1
        rows_washout.append([m, t["time_s"], t["carryover_pct"], ref])
record(f"washout vs exact exp(−Qt/V), {n_pts} samples, 3 topologies", "washout", "max_rel_err(ref>1e-3%)", worst_rel, TOL["ode_rel"])
record("washout absolute error (all samples)", "washout", "max_abs_err_pct", worst_abs, 1e-3)
with open(OUT / "verification_washout.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["method", "time_s", "engine_carryover_pct", "exact_carryover_pct"]); w.writerows(rows_washout)

# Prescribed pressure transient: peak deviation must equal offset·exp(−wait/τ) (implementation check of a PRESCRIBED law)
for m, wait, tau in [("equalized", cfg.equalization_s, cfg.equalized_tau_s), ("pressure_controlled", cfg.regulated_wait_s, cfg.regulated_tau_s)]:
    exp_peak = abs(cfg.offset_pct) * math.exp(-wait / tau)
    eng = next(x for x in run["metrics"] if x["method"] == m)["peak_deviation_pct"]
    record(f"peak deviation {m} = |offset|·e^(−wait/τ)", "transient", "abs_err_pct", abs(eng - exp_peak), 1e-9, {"engine": eng, "expected": exp_peak})

# ---------------------------------------------------------------- A3 two-compartment tracer vs matrix exponential
area = 2 * math.pi * r * L * cfg.channels
v_l = math.pi * r * r * L * cfg.channels
v_r = cfg.receiver_volume_ul * 1e-9
q_si = run["baseline_flow_ul_min"] / 6e10
worst = 0.0
rows_tr = []
for cond, ratio in (("healthy", 1.0), ("injured", cfg.injury_permeability_ratio)):
    k = cfg.permeability_um_s * 1e-6 * ratio * area
    A = np.array([[-(q_si + k) / v_l, k / v_l, q_si / v_l], [k / v_r, -k / v_r, 0.0], [0, 0, 0]])
    for t in (x for x in run["tracer"] if x["condition"] == cond):
        y = expm(A * t["time_s"]) @ np.array([0.0, 0.0, 1.0])
        for name, eng, ref in (("donor", t["donor_fraction"], y[0]), ("receiver", t["receiver_fraction"], y[1])):
            err = abs(eng - ref) if ref < 1e-3 else abs(eng - ref) / ref
            worst = max(worst, err)
            rows_tr.append([cond, name, t["time_s"], eng, float(ref)])
record("tracer donor/receiver vs exact expm solution", "tracer", "max_err(rel, abs<1e-3)", worst, TOL["ode_rel"])
with open(OUT / "verification_tracer.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["condition", "compartment", "time_s", "engine_fraction", "exact_fraction"]); w.writerows(rows_tr)

# ---------------------------------------------------------------- A4 vascular network vs independent dense nodal solver
net = build_default_network()
inp = VascularSolveInput()
res = solve_network(net, inp)
ids = [n.node_id for n in net.nodes]
ix = {n: i for i, n in enumerate(ids)}
G = np.zeros((len(ids), len(ids)))
for s in net.segments:
    g = math.pi * s.radius_m**4 / (8 * inp.viscosity_pa_s * s.length_m)
    a, b = ix[s.start_node_id], ix[s.end_node_id]
    G[a, a] += g; G[b, b] += g; G[a, b] -= g; G[b, a] -= g
fixed = {net.inlet_node_id: inp.inlet_pressure_pa, net.outlet_node_id: inp.outlet_pressure_pa}
free = [n for n in ids if n not in fixed]
Gf = G[np.ix_([ix[n] for n in free], [ix[n] for n in free])]
rhs = -G[np.ix_([ix[n] for n in free], [ix[n] for n in fixed])] @ np.array(list(fixed.values()))
p_ref = dict(zip(free, np.linalg.solve(Gf, rhs))); p_ref.update(fixed)
p_err = max(abs(res.node_pressures_pa[n] - p_ref[n]) / max(abs(p_ref[n]), 1.0) for n in ids)
record(f"node pressures vs independent dense solver ({len(ids)} nodes, {len(net.segments)} segments)", "network", "max_rel_err", p_err, TOL["network_rel"])
record("junction mass conservation (solver-reported)", "network", "max_norm_residual", res.max_normalized_mass_balance_residual, TOL["mass_residual"])
# outlet flow must equal inlet flow
out_flow = sum(s.flow_rate_m3_s for s in res.segments if s.end_node_id == net.outlet_node_id) - sum(s.flow_rate_m3_s for s in res.segments if s.start_node_id == net.outlet_node_id)
record("global mass balance: outlet flow = inlet flow", "network", "rel_err", abs(out_flow - res.inlet_flow_m3_s) / res.inlet_flow_m3_s, TOL["mass_residual"])
# linearity and scaling laws
q0 = res.inlet_flow_m3_s
q_2p = solve_network(net, VascularSolveInput(inlet_pressure_pa=2 * inp.inlet_pressure_pa)).inlet_flow_m3_s
record("linearity: 2×ΔP → 2×Q", "network", "rel_err", abs(q_2p / q0 - 2), TOL["scaling_rel"])
q_2mu = solve_network(net, VascularSolveInput(viscosity_pa_s=2 * inp.viscosity_pa_s)).inlet_flow_m3_s
record("viscosity: 2×μ → Q/2", "network", "rel_err", abs(q_2mu / q0 - 0.5), TOL["scaling_rel"])
k = 1.1
over = {s.segment_id: s.radius_m * 1e6 * k for s in net.segments}
q_k = solve_network(net, VascularSolveInput(radius_overrides_um=over)).inlet_flow_m3_s
record("all radii ×1.1 → Q×1.1⁴", "network", "rel_err", abs(q_k / q0 - k**4) / k**4, TOL["scaling_rel"])
# boundary-condition consistency: fixed-flow with the flow from the fixed-pressure solve recovers the inlet pressure
res_f = solve_network(net, VascularSolveInput(boundary_mode="fixed_inlet_flow", inlet_flow_ul_min=res.inlet_flow_ul_min))
record("BC consistency: fixed-flow(Q*) recovers p_in", "network", "rel_err", abs(res_f.inlet_pressure_pa - inp.inlet_pressure_pa) / inp.inlet_pressure_pa, TOL["network_rel"])

# ---------------------------------------------------------------- A5 reproducibility and uncertainty propagation
r1 = simulate(ExperimentInput(seed=7)); r2 = simulate(ExperimentInput(seed=7)); r3 = simulate(ExperimentInput(seed=8))
same = json.dumps(r1, sort_keys=True) == json.dumps(r2, sort_keys=True)
record("same seed + config → byte-identical result", "reproducibility", "identical(1=yes)", 1.0 if same else 0.0, 1.0, mode="ge")
diff = [a["radius_um"] for a in r1["replicates"]] != [a["radius_um"] for a in r3["replicates"]]
record("different seed → different virtual-chip sample", "reproducibility", "differs(1=yes)", 1.0 if diff else 0.0, 1.0, mode="ge")
c5 = ExperimentInput(replicates=100, radius_cv_pct=3.0, seed=11)
r5 = simulate(c5)
flows = np.array([z["flow_ul_min"] for z in r5["replicates"] if z["arm"] == "F0V0"])
cv_mc = flows.std(ddof=1) / flows.mean(); cv_pred = 4 * 0.03  # first-order: CV_Q ≈ 4·CV_r
record("uncertainty propagation CV_Q ≈ 4·CV_r (n=100, delta method)", "uncertainty", "rel_diff", abs(cv_mc - cv_pred) / cv_pred, TOL["delta_method_rel"],
       {"cv_monte_carlo": cv_mc, "cv_first_order": cv_pred, "n": int(flows.size)})

# ---------------------------------------------------------------- unit test suites (real runs, captured)
suites = {}
for mod in ("simulation.test_engine", "simulation.test_visualization", "vascular.test_solver", "vascular.test_api"):
    p = subprocess.run([sys.executable, "-m", "unittest", mod], cwd=API, capture_output=True, text=True)
    last = [l for l in (p.stderr or "").splitlines() if l.startswith(("Ran ", "OK", "FAILED"))]
    suites[mod] = {"returncode": p.returncode, "summary": last}
    print(f"[{'PASS' if p.returncode == 0 else 'FAIL'}] unittest     {mod:<55} {' '.join(last)}")

summary = {
    "verdict": "A — mathematical verification",
    "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
    "engine_versions": {"switching": MODEL_VERSION, "vascular": VASC_VERSION},
    "software": {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__},
    "tolerances": TOL,
    "checks_total": len(results), "checks_passed": sum(r["pass"] for r in results),
    "unit_test_suites": suites,
    "results": results,
    "scope_note": "Verification shows the equations are implemented and solved correctly. It is NOT evidence that the model matches physical experiments (B) or patients (C).",
}
blob = json.dumps(summary, indent=1, ensure_ascii=False)
(OUT / "verification_results.json").write_text(blob, encoding="utf-8")
(OUT / "verification_results.sha256").write_text(hashlib.sha256(blob.encode()).hexdigest() + "\n", encoding="utf-8")
with open(OUT / "verification_results.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["group", "check", "metric", "value", "tolerance", "pass"])
    for r_ in results:
        w.writerow([r_["group"], r_["check"], r_["metric"], f"{r_['value']:.6e}", r_["tolerance"], r_["pass"]])
all_ok = summary["checks_passed"] == summary["checks_total"] and all(s["returncode"] == 0 for s in suites.values())
print(f"\n{summary['checks_passed']}/{summary['checks_total']} checks passed; unit suites {'OK' if all(s['returncode']==0 for s in suites.values()) else 'FAILED'}")
sys.exit(0 if all_ok else 1)
