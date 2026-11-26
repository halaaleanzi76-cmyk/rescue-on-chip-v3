"""Self-contained printable HTML with all run inputs and no invented results."""
import html
import json
import pandas as pd

EQUATIONS = [
    "Q = N_open π r⁴ ΔP / (8 μ L) [m³/s]; 1 m³/s = 6×10¹⁰ µL/min",
    "R_h = 8 μ L / (N π r⁴); τ_wall = ΔP r / (2 L); Re = ρ u (2r) / μ, ρ assumed 1000 kg/m³",
    "ΔP_switch(t) = ΔP₀ [1 + (offset/100) exp(−wait/τ) exp(−(t−t_switch)/τ)]",
    "Stop-flow model: inlet pressure = 0 during interruption, then baseline plus a decaying offset",
    "dC_old/dt = −max(Q,0) C_old / V_dead; μ_mix = C_old μ_ref + (1−C_old) μ_alt",
    "J = P A (C_d−C_a); V_l dC_d/dt = Q(C_in−C_d)−J; V_a dC_a/dt = J",
    "Virtual-chip mean 95% interval = mean ± t(0.975,n−1) SD/√n; assumed radius CV only",
    "F = [(F1V0+F1V1)−(F0V0+F0V1)]/2; V = [(F0V1+F1V1)−(F0V0+F1V0)]/2; F×V = F1V1−F1V0−F0V1+F0V0",
]


def table(rows):
    return pd.DataFrame(rows).to_html(index=False, escape=True, border=0, float_format=lambda x: f"{x:.6g}")


def html_report(run):
    esc = html.escape
    items = "".join(f"<li>{esc(a)}</li>" for a in run["assumptions"])
    warnings = "".join(f"<li>{esc(a)}</li>" for a in run["warnings"])
    equations = "".join(f"<li><code>{esc(a)}</code></li>" for a in EQUATIONS)
    config = [{"Parameter": k, "Value": v} for k,v in run["config"].items()]
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Rescue-on-Chip simulation report</title>
<style>body{{font:15px/1.6 system-ui;color:#183638;max-width:1100px;margin:40px auto;padding:0 24px}}
h1,h2{{color:#0b6262}}h1{{font-size:34px}}h2{{margin-top:40px}}.notice{{background:#fff4da;border-left:4px solid #ac7418;padding:18px}}
table{{border-collapse:collapse;width:100%;font-size:12px;margin:20px 0}}th,td{{text-align:left;border-bottom:1px solid #dce6e6;padding:9px}}
th{{background:#edf5f3}}code{{overflow-wrap:anywhere}}.meta{{font-size:12px;color:#4b6264;overflow-wrap:anywhere}}
@media print{{body{{margin:0;max-width:none}}table{{font-size:10px}}h2{{break-after:avoid}}tr{{break-inside:avoid}}}}</style></head>
<body><p>NEURO-REFLOW RESCUE 3.0 / VIRTUAL BENCH</p><h1>{esc(run["config"]["name"])}</h1>
<div class="notice"><strong>SIMULATED · UNVALIDATED · RESEARCH USE ONLY</strong><br>
This is a numerical exploration of engineering assumptions, not measured experimental evidence, a validated device, or clinical guidance.</div>
<p class="meta">Run: {esc(run["id"])}<br>Created: {esc(run["created_at"])}<br>
Model: {esc(run["model_version"])} · Seed: {run["config"]["seed"]}<br>
Input fingerprint: {esc(run["fingerprint"])}<br>Numerical libraries: {esc(json.dumps(run["software"]))}</p>
<h2>Reference hydraulics</h2>{table([{"Baseline flow (µL/min)":run["baseline_flow_ul_min"],
"Wall shear (Pa)":run["wall_shear_pa"],"Reynolds number":run["reynolds_number"],
"Resistance (Pa·s/m³)":run["resistance_pa_s_m3"]}])}
<h2>Three-topology comparison</h2>{table(run["metrics"])}
<p>Targets are provisional proposal objectives: peak pressure deviation ≤5%; carryover ≤5% at the configured run end.
These are single nominal simulated switches, not an experimentally measured 95% success rate. No topology is assumed superior.</p>
<h2>Independent virtual chips: 2 × 2 crossover</h2>{table(run["arms"])}
<p>Intervals reflect assumed geometry variability only. Rescue flow is calculated from the input geometric reversal fraction, not a drug-response prediction.
Permeability is prescribed; barrier preservation and viability are not established. No batch mixed-effects model or formal power analysis is performed.</p>
<h2>Descriptive factorial contrasts (µL/min)</h2>{table(run["contrasts"])}
<h2>Warnings</h2><ul>{warnings or "<li>No additional numerical warnings; all model limitations still apply.</li>"}</ul>
<h2>Complete reproducibility inputs</h2>{table(config)}
<h2>Equations and units</h2><ul>{equations}</ul>
<h2>Assumptions and scientific boundaries</h2><ol>{items}</ol>
<h2>Virtual-chip records</h2>{table(run["replicates"])}
<h2>Source provenance</h2><p>Neuro-Reflow Rescue 3.0 / Rescue-on-Chip, research proposal prepared 22 November 2026.
Design and protocol: §§4–7; provisional targets: §8; falsification comparator: §9; caveats: §§16–17.
The proposal supplies no calibrated mathematical model or measured datasets. Standard fluid mechanics and mass balance were selected for this software.</p>
<p>Use your browser’s Print → Save as PDF for a PDF copy. Export full JSON for all pressure, flow, washout and compartment time series;
trace CSV contains the switching time series.</p></body></html>"""
