"""Evidence runner for the Scientific Validation Lab suite (artifacts/api-server/validation/suite.py).

Writes ../results/verification_*.json|csv and runs the engine unit-test suites.
Exit code: 0 when verdict A (mathematical verification) passes and unit tests pass.
Synthetic-benchmark (S) failures are scientific findings that are REPORTED, not hidden, and do not fail the build.
Run:  .venv\\Scripts\\python.exe REAL_WORLD_VALIDATION_EVIDENCE\\runs\\run_verification.py
"""
from __future__ import annotations

import csv
import hashlib
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = HERE.parents[1] / "artifacts" / "api-server"
OUT = HERE.parent / "results"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(API))
from validation.suite import run_suite  # noqa: E402

extra: dict = {}
summary = run_suite(extra)
for r in summary["results"]:
    print(f"[{'PASS' if r['pass'] else 'FAIL'}] {r['category']} {r['group']:<20} {r['check'][:70]:<70} {r['metric']}={r['value']:.3e} (tol {r['tolerance']:.0e})")

suites = {}
for mod in ("simulation.test_engine", "simulation.test_visualization", "vascular.test_solver", "vascular.test_api"):
    p = subprocess.run([sys.executable, "-m", "unittest", mod], cwd=API, capture_output=True, text=True)
    suites[mod] = {"returncode": p.returncode, "summary": [l for l in (p.stderr or "").splitlines() if l.startswith(("Ran ", "OK", "FAILED"))]}
    print(f"[{'PASS' if p.returncode == 0 else 'FAIL'}] unittest {mod} {' '.join(suites[mod]['summary'])}")
summary["unit_test_suites"] = suites

blob = json.dumps(summary, indent=1, ensure_ascii=False)
(OUT / "verification_results.json").write_text(blob, encoding="utf-8")
(OUT / "verification_results.sha256").write_text(hashlib.sha256(blob.encode()).hexdigest() + "\n", encoding="utf-8")
with open(OUT / "verification_results.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["category", "group", "check", "metric", "value", "tolerance", "pass"])
    for r in summary["results"]:
        w.writerow([r["category"], r["group"], r["check"], r["metric"], f"{r['value']:.6e}", r["tolerance"], r["pass"]])
for name, hdr in (("washout", ["method", "time_s", "engine_carryover_pct", "exact_carryover_pct"]),
                  ("tracer", ["condition", "compartment", "time_s", "engine_fraction", "exact_fraction"])):
    with open(OUT / f"verification_{name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(hdr)
        w.writerows(extra[name])

v = summary["verdicts"]
print("\n" + " | ".join(f"{k}: {x['status']}" + (f" {x['passed']}/{x['total']}" if "total" in x else "") for k, x in v.items()))
ok = v["A_mathematical_verification"]["status"] == "PASS" and all(s["returncode"] == 0 for s in suites.values())
sys.exit(0 if ok else 1)
