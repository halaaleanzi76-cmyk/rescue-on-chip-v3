"""Coverage check: every sentence the Python engines display must have an Arabic display translation (lib/messages/engine.ts)."""
import json, os, sys
API = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artifacts", "api-server")
sys.path.insert(0, API)
os.chdir(API)
from simulation.config import ExperimentInput
from simulation.engine import simulate
from simulation.visualization import derive_visualization
from vascular.graph import build_default_network
from vascular.contracts import VascularSolveInput
from vascular.solver import solve_network
from research.service import research_overview, describe_structure, predict_structure
from research.chemistry import generate_conformer

texts = {}
def add(kind, s):
    if isinstance(s, str) and len(s) > 3:
        texts.setdefault(s, kind)

cases = [ExperimentInput(),
         ExperimentInput(rescue_fraction=0.5, radius_cv_pct=0, dead_volume_ul=10, duration_s=20, switch_s=5, stop_duration_s=1),
         ExperimentInput(offset_pct=-150, radius_um=100, pressure_pa=10000, channels=200)]
for c in cases:
    r = simulate(c)
    for a in r["assumptions"]: add("assumption", a)
    for w in r["warnings"]: add("warning", w)
    for m in r["metrics"]: add("method_label", m["label"])
    for a in r["arms"]: add("arm_label", a["label"])
    for k in r["contrasts"]: add("contrast", k["name"])
    v = derive_visualization({**r, "id": "x", "created_at": "2026-01-01T00:00:00Z"})
    for n in v["notes"]: add("viz_note", n)

net = build_default_network()
add("vascular_scope", net.tissue_scope); add("vascular_geometry", net.geometry_note)
for mode in ["fixed_pressure", "fixed_inlet_flow"]:
    res = solve_network(net, VascularSolveInput(boundary_mode=mode))
    for a in res.assumptions: add("vascular_assumption", a)
    for w in res.warnings: add("vascular_warning", w)
seg = net.segments[3].segment_id
res = solve_network(net, VascularSolveInput(occluded_segment_ids=[seg]) if False else VascularSolveInput())

ov = research_overview()
ds = ov.get("dataset") or {}
for k in ["cell_model", "endpoint", "protocol_summary", "label_definition"]: add("ai_dataset", ds.get(k))
for l in ds.get("limitations") or []: add("ai_limitation", l)
lm = ov.get("latest_model") or {}
add("ai_policy", lm.get("prediction_policy")); add("ai_status", lm.get("status"))
for k in ["selected_algorithm"]: add("ai_algo", (lm.get("metrics") or {}).get(k))
for name in ((lm.get("metrics") or {}).get("algorithm_comparison") or {}): add("ai_algo", name)
for smi in ["CC(=O)Oc1ccccc1C(=O)O", "CCO"]:
    d = describe_structure(smi, "smiles"); add("ai_descriptor_note", d.get("descriptor_note"))
    p = predict_structure(smi, "smiles")
    add("ai_message", p.get("message")); add("ai_physics", p.get("physics_integration"))
    ev = p.get("evidence") or {}
    add("ai_interpretation", ev.get("interpretation"))
    c = generate_conformer(smi, "smiles"); add("ai_conformer_note", c.get("note")); add("ai_conformer_method", c.get("method"))


# ---- coverage check: every displayed engine sentence must have an Arabic translation ----
import subprocess, tempfile
HANDLED_IN_UI = {"method_label", "arm_label", "contrast", "ai_status", "ai_conformer_method"}
need = [s for s, k in texts.items() if k not in HANDLED_IN_UI]
tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
json.dump(need, tmp, ensure_ascii=False); tmp.close()
engine_ts = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artifacts", "rescue-lab", "src", "lib", "messages", "engine.ts")
js = ("import(process.argv[1]).then(m=>{const t=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));"
      "const miss=t.filter(s=>!m.translateEngineText(s,'ar').translated);console.log(JSON.stringify(miss));})")
miss = json.loads(subprocess.run(["node", "-e", js, "file:///" + os.path.abspath(engine_ts).replace("\\", "/"), tmp.name],
                                 capture_output=True, text=True, check=True).stdout)
print(json.dumps({"engine_sentences": len(need), "untranslated": miss}, ensure_ascii=False, indent=1))
sys.exit(1 if miss else 0)
