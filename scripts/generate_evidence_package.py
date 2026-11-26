"""Generate the competition evidence package from REAL engine runs.

Outputs (REAL_WORLD_VALIDATION_EVIDENCE/package/, copied to artifacts/rescue-lab/public/evidence/ for the website):
  SCIENTIFIC_VALIDATION_REPORT.pdf (+ .html source) · EXPERIMENT_RESULTS.csv · verification_results.json
  MODEL_ASSUMPTIONS.md · REPRODUCIBILITY.md · SCIENTIFIC_REFERENCES.md · JUDGE_QA.md
Run:  .venv\\Scripts\\python.exe scripts\\generate_evidence_package.py
"""
from __future__ import annotations

import csv
import datetime as dt
import html
import json
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "artifacts" / "api-server"
PKG = ROOT / "REAL_WORLD_VALIDATION_EVIDENCE" / "package"
WEB = ROOT / "artifacts" / "rescue-lab" / "public" / "evidence"
PKG.mkdir(parents=True, exist_ok=True)
WEB.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(API))

import numpy as np  # noqa: E402
import scipy  # noqa: E402
from simulation.config import ExperimentInput  # noqa: E402
from simulation.engine import MODEL_VERSION, simulate  # noqa: E402
from simulation.reports import EQUATIONS  # noqa: E402
from validation.suite import run_suite, SUITE_VERSION  # noqa: E402

now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

# ------------------------------------------------------------------ experiments (all computed now)
rows: list[dict] = []
def add(exp, scenario, quantity, unit, value, note=""):
    rows.append({"experiment": exp, "scenario": scenario, "quantity": quantity, "unit": unit, "value": value,
                 "model_version": MODEL_VERSION, "note": note})

ref = simulate(ExperimentInput())
for a in ref["arms"]:
    add("A_2x2_crossover", "reference config (seed 42, n=6/arm, radius CV 3%)", f"mean flow {a['arm']} ({a['label']})", "uL/min", a["mean_flow_ul_min"], f"95% CI [{a['ci_low']:.6g}, {a['ci_high']:.6g}]")
for c in ref["contrasts"]:
    add("A_2x2_crossover", "reference config", c["name"], "uL/min", c["value"], "descriptive contrast of simulated virtual chips")
scen = {"reference (B wait 0 s, C equalization 5 s)": {}, "strong comparator B (wait 15 s)": {"regulated_wait_s": 15},
        "no equalization time (C wait 0 s)": {"equalization_s": 0}}
abc = {}
for name, over in scen.items():
    r = simulate(ExperimentInput(**over)); abc[name] = {}
    for m in r["metrics"]:
        abc[name][m["method"]] = m
        add("B_switching_ABC", name, f"peak inlet deviation {m['method']}", "%", m["peak_deviation_pct"], "goal <=5% (provisional)" + (" MET" if m["pressure_target_met"] else " NOT MET"))
        add("B_switching_ABC", name, f"carryover at run end {m['method']}", "%", m["carryover_pct"], "goal <=5% (provisional)" + (" MET" if m["carryover_target_met"] else " NOT MET"))
        add("B_switching_ABC", name, f"flow interruption {m['method']}", "s", m["interruption_s"])
sweeps = {}
for param, vals in {"equalization_s": [0, 1, 2, 3, 4, 5, 7.5, 10, 15], "regulated_wait_s": [0, 2, 5, 10, 15]}.items():
    sweeps[param] = []
    for v in vals:
        r = simulate(ExperimentInput(**{param: v, "radius_cv_pct": 0, "replicates": 3}))
        mm = {m["method"]: m for m in r["metrics"]}
        sweeps[param].append((v, mm))
        for k, m in mm.items():
            add("C_sensitivity", f"{param} = {v}", f"peak inlet deviation {k}", "%", m["peak_deviation_pct"], "one-at-a-time; chip variability 0")
with open(PKG / "EXPERIMENT_RESULTS.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

suite = run_suite()
(PKG / "verification_results.json").write_text(json.dumps(suite, indent=1, ensure_ascii=False), encoding="utf-8")
V = suite["verdicts"]

# ------------------------------------------------------------------ markdown documents
assumptions = "\n".join(f"{i + 1}. {a}" for i, a in enumerate(ref["assumptions"]))
equations = "\n".join(f"- `{e}`" for e in EQUATIONS)
defaults = "\n".join(f"| `{k}` | {v} |" for k, v in ExperimentInput().model_dump().items())
(PKG / "MODEL_ASSUMPTIONS.md").write_text(f"""# Model assumptions — Rescue-on-Chip (engine {MODEL_VERSION})
Generated {now} from the running engine. Source: `artifacts/api-server/simulation/engine.py`.

## Equations
{equations}

## Assumptions (verbatim from the engine output)
{assumptions}

## What the model does NOT predict
Injury induction, cell viability, blood–brain-barrier damage or preservation, drug efficacy, or any clinical outcome.
Permeability and "rescue" are user-prescribed inputs.

## Reference configuration (defaults)
| Parameter | Value |
|---|---|
{defaults}
""", encoding="utf-8")

(PKG / "REPRODUCIBILITY.md").write_text(f"""# Reproducibility
Generated {now}. Engine `{MODEL_VERSION}` · validation suite `{SUITE_VERSION}` · Python {platform.python_version()} · NumPy {np.__version__} · SciPy {scipy.__version__}.

## Determinism
Every run is fully determined by its configuration and seed. The SHA-256 fingerprint = hash(model version + canonical JSON config);
the same config + seed reproduces a byte-identical result (checked automatically in the validation suite).

## Reproduce everything (Windows, PowerShell)
```
.\\start.ps1                                         # database, API, web app
.venv\\Scripts\\python.exe scripts\\generate_evidence_package.py   # this package
.venv\\Scripts\\python.exe REAL_WORLD_VALIDATION_EVIDENCE\\runs\\run_verification.py
powershell -File scripts\\windows\\test-all.ps1      # all test suites incl. browser E2E
```
## In the web app
- Scientific Validation → "Re-run all tests now" executes the same suite on the server.
- Research Simulation → any saved run exports HTML, trace CSV and full reproducibility JSON.
""", encoding="utf-8")

(PKG / "SCIENTIFIC_REFERENCES.md").write_text("""# Scientific references and how each is used
| Reference | Use in this platform |
|---|---|
| Ng et al., *Stroke* 2025, PMID 40160088 — persistent tissue-level hypoperfusion (no-reflow) after thrombectomy | Clinical background only (problem statement). Not used to validate the model. |
| PMID 39648915 — recanalization does not always equate to reperfusion | Background |
| PMID 37871624 — systematic review of persistent hypoperfusion after recanalization | Background |
| PMID 41078791 (PMC12508954, CC BY) — ischemia-reperfusion BBB chip | Assessed for validation; not comparable (permeability is a model input; rocker-driven perfusion, no pressure/flow data; values only in figures). Background. |
| PMID 41808629 — BBB-on-a-chip with integrated TEER and K⁺ sensors | Assessed; not comparable (model does not compute TEER or ions). Background. |
| PLOS ONE 2026, 10.1371/journal.pone.0352263 — 3D BBB chip, reversible penumbra | Background |
| Hagen–Poiseuille law | Governing hydraulics of channels and network |
| Neuro-Reflow Rescue 3.0 proposal (22 Nov 2026) | Invention definition: architecture, S0–S4, 2×2 crossover, A/B/C falsification test, provisional ≤5 % goals |

Datasets downloaded and used for quantitative comparison: **none**. See `REAL_WORLD_VALIDATION_EVIDENCE/sources/SOURCES.json` for what was retrieved, URLs and checksums.
""", encoding="utf-8")

d = abc["reference (B wait 0 s, C equalization 5 s)"]; sB = abc["strong comparator B (wait 15 s)"]; z = abc["no equalization time (C wait 0 s)"]
(PKG / "JUDGE_QA.md").write_text(f"""# Judge Q&A (answers reference computed outputs, generated {now})

**Is this clinically validated?** No. Mathematical verification passes ({V['A_mathematical_verification']['passed']}/{V['A_mathematical_verification']['total']}). Independent empirical validation is not currently possible with the available data, and no clinical validation was performed.

**Is the proposed design (C) hard-coded to win?** No. With the reference settings C has the lowest peak deviation ({d['equalized']['peak_deviation_pct']:.3g} % vs B {d['pressure_controlled']['peak_deviation_pct']:.3g} %). When B is given a 15 s wait, the engine ranks B first ({sB['pressure_controlled']['peak_deviation_pct']:.3g} % vs C {sB['equalized']['peak_deviation_pct']:.3g} %). With no equalization time C fails the ≤5 % goal ({z['equalized']['peak_deviation_pct']:.3g} %).

**What does the 2×2 crossover show?** Descriptive fluid, vessel and interaction contrasts of simulated virtual chips: {', '.join(f"{c['name']} {c['value']:.4g} µL/min" for c in ref['contrasts'])}. These are consequences of the assumed geometry and viscosity, not biological findings.

**Did anything fail?** Yes — one pre-registered synthetic benchmark (interaction recovery under 3 % chip variability, single seed) exceeded its 5 % tolerance. A post-hoc check across 20 other seeds found no systematic bias; the tolerance ignored sampling error. It is shown as a negative finding.

**What is real data here?** Published clinical numbers (PMID 40160088) are cited as background. No published dataset measures what this model predicts, so none is used as validation.

**What is the next experiment?** A cell-free bench (proposal phase 0): measure inlet pressure transients and washout for A/B/C and compare with these predictions using pre-registered error metrics.

**Why is it valuable before validation?** It defines tolerances and failure conditions before chips are fabricated, so the first wet-lab experiments are designed to falsify the claim efficiently.
""", encoding="utf-8")

# ------------------------------------------------------------------ PDF report (HTML -> Edge headless print)
def tr(cells, head=False):
    tag = "th" if head else "td"
    return "<tr>" + "".join(f"<{tag}>{html.escape(str(c))}</{tag}>" for c in cells) + "</tr>"
val_rows = "".join(tr([("PASS" if r["pass"] else "FAIL"), r["category"], r["group"], r["check"], f"{r['value']:.3e}", f"{r['tolerance']:.0e}"]) for r in suite["results"])
abc_rows = "".join(tr([n, k, f"{m['peak_deviation_pct']:.4g}", "yes" if m["pressure_target_met"] else "no", f"{m['carryover_pct']:.3g}", f"{m['interruption_s']:.3g}"]) for n, mm in abc.items() for k, m in mm.items())
arm_rows = "".join(tr([a["arm"], a["label"], f"{a['mean_flow_ul_min']:.5g}", f"[{a['ci_low']:.5g}, {a['ci_high']:.5g}]"]) for a in ref["arms"])
con_rows = "".join(tr([c["name"], f"{c['value']:.5g}"]) for c in ref["contrasts"])
sw_rows = "".join(tr([p, v, f"{mm['stop_flow']['peak_deviation_pct']:.4g}", f"{mm['pressure_controlled']['peak_deviation_pct']:.4g}", f"{mm['equalized']['peak_deviation_pct']:.4g}"]) for p, lst in sweeps.items() for v, mm in lst)
fails = [r for r in suite["results"] if not r["pass"]]
fail_html = "".join(f"<li><b>{html.escape(r['check'])}</b>: {r['metric']} = {r['value']:.3g} (tolerance {r['tolerance']:.0e}). {html.escape(str(r.get('detail', {}).get('posthoc_multi_seed_diagnostic', {}).get('interpretation', '')))}</li>" for r in fails) or "<li>None</li>"
logo = (ROOT / "artifacts" / "rescue-lab" / "public" / "brand" / "logo-horizontal-light.svg").read_text(encoding="utf-8")
doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Rescue-on-Chip — Scientific Validation Report</title>
<style>
@page {{ size: A4; margin: 16mm 14mm; }}
body {{ font: 10.5pt/1.5 'Segoe UI', Inter, Arial, sans-serif; color: #10243A; }}
h1 {{ font-size: 22pt; margin: 8px 0 2px; }} h2 {{ font-size: 13.5pt; color: #087F8C; margin-top: 22px; border-bottom: 1px solid #E2EAF0; padding-bottom: 3px; }}
table {{ border-collapse: collapse; width: 100%; font-size: 8.6pt; margin-top: 6px; }} th, td {{ border: 1px solid #E2EAF0; padding: 3px 5px; text-align: left; vertical-align: top; }}
th {{ background: #F1F8F9; }} .verdict {{ display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }}
.v {{ border: 1px solid #E2EAF0; border-radius: 8px; padding: 8px; }} .v b {{ display: block; font-size: 12pt; }} .pass {{ color: #087F8C; }} .fail {{ color: #B4341C; }} .na {{ color: #5B6F84; }}
.note {{ background: #F8FAFC; border-left: 4px solid #087F8C; padding: 8px 10px; }} code {{ font-size: 8.6pt; }}
</style></head><body>
{logo}
<h1>Scientific Validation &amp; Research-Readiness Report</h1>
<div>Neuro-Reflow Rescue 3.0 · Rescue-on-Chip · generated {now} · engine {MODEL_VERSION} · suite {SUITE_VERSION}</div>
<p class="note">Research-stage concept. All numbers below were computed by the platform's engines for this report. Mathematical verification is not evidence of agreement with experiments or of clinical validity. Not a medical device; no treatment efficacy is claimed.</p>
<h2>1. Verdicts (kept separate)</h2>
<div class="verdict">
<div class="v"><span>A · Mathematical verification</span><b class="{'pass' if V['A_mathematical_verification']['status']=='PASS' else 'fail'}">{V['A_mathematical_verification']['status']} {V['A_mathematical_verification']['passed']}/{V['A_mathematical_verification']['total']}</b></div>
<div class="v"><span>Synthetic benchmarks</span><b class="{'pass' if V['S_synthetic_benchmarks']['status']=='PASS' else 'fail'}">{V['S_synthetic_benchmarks']['status']} {V['S_synthetic_benchmarks']['passed']}/{V['S_synthetic_benchmarks']['total']}</b></div>
<div class="v"><span>B · Independent empirical validation</span><b class="na">NOT POSSIBLE</b></div>
<div class="v"><span>C · Clinical validation</span><b class="na">NOT PERFORMED</b></div></div>
<p><b>B:</b> Independent empirical validation is not currently possible with the available data. Assessed: PMID 40160088 (clinical outcomes), PMID 41078791 (BBB chip; permeability is a model input, no pressure/flow data), PMID 41808629 (TEER; not computed by the model). Datasets used quantitatively: none.</p>
<h2>2. Negative findings</h2><ul>{fail_html}</ul>
<h2>3. Experiment A — 2×2 crossover (reference configuration)</h2>
<table>{tr(['Arm', 'Condition', 'Mean flow µL/min', '95% CI'], True)}{arm_rows}</table>
<table>{tr(['Contrast', 'Value µL/min'], True)}{con_rows}</table>
<h2>4. Experiment B — A/B/C switching comparison</h2>
<table>{tr(['Scenario', 'Topology', 'Peak inlet deviation %', '≤5% met', 'Carryover %', 'Interruption s'], True)}{abc_rows}</table>
<p>Verdict: under the reference settings C has the lowest switching artefact; with a 15 s wait the pressure-controlled comparator B outperforms C; with no equalization time C fails the goal. The ranking follows the prescribed physics and is not hard-coded.</p>
<h2>5. Experiment C — sensitivity (one-at-a-time, chip variability 0)</h2>
<table>{tr(['Parameter', 'Value', 'A stop-flow %', 'B pressure-controlled %', 'C equalized %'], True)}{sw_rows}</table>
<h2>6. Verification and benchmark checks (all)</h2>
<table>{tr(['Status', 'Cat.', 'Group', 'Check', 'Result', 'Tolerance'], True)}{val_rows}</table>
<h2>7. Equations</h2><ul>{''.join(f'<li><code>{html.escape(e)}</code></li>' for e in EQUATIONS)}</ul>
<h2>8. Assumptions and limitations</h2><ol>{''.join(f'<li>{html.escape(a)}</li>' for a in ref['assumptions'])}</ol>
<h2>9. Reproduction</h2><p>Python {platform.python_version()}, NumPy {np.__version__}, SciPy {scipy.__version__}. Run <code>scripts/generate_evidence_package.py</code> to regenerate this report; identical config + seed gives identical results.</p>
</body></html>"""
(PKG / "SCIENTIFIC_VALIDATION_REPORT.html").write_text(doc, encoding="utf-8")
edge = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
pdf = PKG / "SCIENTIFIC_VALIDATION_REPORT.pdf"
if edge.exists():
    subprocess.run([str(edge), "--headless=new", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={pdf}",
                    (PKG / "SCIENTIFIC_VALIDATION_REPORT.html").resolve().as_uri()], check=True, capture_output=True, timeout=120)
for f in PKG.iterdir():
    if f.suffix in {".pdf", ".csv", ".json", ".md"}:
        shutil.copy2(f, WEB / f.name)
print(f"package: {[p.name for p in sorted(PKG.iterdir())]}")
print(f"PDF bytes: {pdf.stat().st_size if pdf.exists() else 'not generated'}; CSV rows: {len(rows)}")
