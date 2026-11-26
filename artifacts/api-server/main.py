"""FastAPI service for the research simulator. No clinical inference endpoints."""
import io
import json
import logging
import os
import sqlite3
import threading
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from uuid import UUID

import pandas as pd
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query


def _load_env_file(path: Path) -> None:
    """Load KEY=VALUE lines from the repo's .env.local without overriding real environment variables."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file(Path(__file__).resolve().parents[2] / ".env.local")
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.gzip import GZipMiddleware
from simulation.config import ExperimentInput
from simulation.contracts import HealthStatus, ModelInfo, LabSummary, RunSummary, SimulationRun, RunVisualization, SimulationPreview
from simulation.engine import MODEL_VERSION, simulate
from simulation.reports import EQUATIONS, html_report
from simulation import store
from simulation.visualization import derive_visualization
from vascular.contracts import VascularNetwork, VascularSolveInput, VascularSolveResult
from vascular.graph import build_default_network
from vascular.solver import solve_network
from auth.core import CurrentUser, optional_user, require_role
from auth.routes import router as auth_router

logger = logging.getLogger("rescue-lab")
slots = threading.BoundedSemaphore(2)
ROOT = Path(__file__).resolve().parents[2]


@lru_cache(maxsize=1)
def default_calculation():
    return simulate(ExperimentInput())


@asynccontextmanager
async def lifespan(app):
    # Schema is applied during setup, not mutated on application startup.
    if store.summary()["total_runs"] == 0:
        store.save(default_calculation())
        logger.info("Calculated and saved one clearly labeled default virtual-bench run.")
    if os.environ.get("WARM_VALIDATION") == "1":
        # Small hosted instances are slow: execute the validation suite once in the background so the
        # first visitor gets the (genuinely computed) result without waiting.
        threading.Thread(target=lambda: validation_run(fresh=False), daemon=True).start()
    yield


app = FastAPI(title="Api", version="1.0.0", lifespan=lifespan,
              docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
app.add_middleware(GZipMiddleware, minimum_size=1000)

CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; "
       "connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; "
       "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'")
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    for k, v in SECURITY_HEADERS.items():
        response.headers.setdefault(k, v)
    # Swagger UI (/api/docs) loads its own CDN assets; everything else gets the strict policy.
    if not request.url.path.startswith("/api/docs"):
        response.headers.setdefault("Content-Security-Policy", CSP)
    return response
app.include_router(auth_router)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    details = [{"field": ".".join(map(str,e["loc"])), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"error":"Invalid experiment parameters", "detail":details})


@app.exception_handler(Exception)
async def server_error(request, exc):
    logger.exception("Simulation service request failed")
    return JSONResponse(status_code=500, content={"error":"The simulation service could not complete this request. Please retry."})


@app.get("/api/healthz", response_model=HealthStatus, operation_id="healthCheck")
def health():
    store.summary()
    return {"status":"ok"}


@app.get("/api/model", response_model=ModelInfo, operation_id="getModel")
def model():
    return {"version":MODEL_VERSION,"status":"Concept-stage / unvalidated numerical model",
            "source_title":"Neuro-Reflow Rescue 3.0 / Rescue-on-Chip",
            "source_date":"2026-11-22","defaults":ExperimentInput().model_dump(),
            "equations":EQUATIONS,"assumptions":default_calculation()["assumptions"]}


@app.get("/api/summary", response_model=LabSummary, operation_id="getSummary")
def summary(viewer: CurrentUser | None = Depends(optional_user)):
    return {**store.summary(viewer),"model_version":MODEL_VERSION}


@app.get("/api/runs", response_model=list[RunSummary], operation_id="listRuns")
def runs(viewer: CurrentUser | None = Depends(optional_user)):
    return store.history(viewer)


@app.post("/api/runs", response_model=SimulationRun, status_code=201, operation_id="createRun")
def create_run(data: ExperimentInput, user: CurrentUser = Depends(require_role("admin", "researcher"))):
    if not slots.acquire(blocking=False):
        raise HTTPException(429, "Two calculations are already running. Please try again shortly.")
    try:
        result = simulate(data)
        # Validate the full output before saving it as a scientific record.
        record = store.save(result, owner_id=user.id)
        return SimulationRun.model_validate(record)
    finally:
        slots.release()


def require_run(run_id, viewer=None):
    try:
        UUID(run_id)
    except (ValueError, AttributeError):
        raise HTTPException(404, "Simulation run not found")
    run = store.load(run_id, viewer)
    if run is None:  # missing and not-visible are indistinguishable on purpose
        raise HTTPException(404, "Simulation run not found")
    return run


@app.get("/api/runs/{run_id}", response_model=SimulationRun, operation_id="getRun")
def get_run(run_id: str, viewer: CurrentUser | None = Depends(optional_user)):
    return require_run(run_id, viewer)


@lru_cache(maxsize=4)
def _cached_visualization(run_id: str, fingerprint: str):
    # Saved runs are immutable; access is checked before this cache is consulted.
    return derive_visualization(store.load(run_id, _SYSTEM))


class _System:  # internal reader used only after an access check succeeded
    is_admin = True
    id = None


_SYSTEM = _System()


@app.get("/api/runs/{run_id}/visualization", response_model=RunVisualization, operation_id="getRunVisualization")
def get_visualization(run_id: str, viewer: CurrentUser | None = Depends(optional_user)):
    run = require_run(run_id, viewer)
    return _cached_visualization(run_id, run["fingerprint"])


@app.post("/api/preview", response_model=SimulationPreview, operation_id="previewSimulation")
def preview_simulation(data: ExperimentInput):
    if not slots.acquire(blocking=False):
        raise HTTPException(429, "Two calculations are already running. Please try again shortly.")
    try:
        result = simulate(data)
        run = {**result, "id": "preview-"+result["fingerprint"][:16],
               "created_at": datetime.now(timezone.utc).isoformat()}
        return {"run":run, "visualization":derive_visualization(run)}
    finally:
        slots.release()


@app.get("/api/runs/{run_id}/report", operation_id="downloadReport")
def report(run_id: str, format: str = Query("html", pattern="^(html|csv|json)$"),
           viewer: CurrentUser | None = Depends(optional_user)):
    run = require_run(run_id, viewer)
    filename = f"rescue-on-chip-{run_id[:8]}.{format}"
    headers = {"Content-Disposition":f'attachment; filename="{filename}"',
               "X-Content-Type-Options":"nosniff"}
    if format == "json":
        return Response(json.dumps(run,indent=2,allow_nan=False),media_type="application/json",headers=headers)
    if format == "csv":
        output = io.StringIO()
        # Repeat provenance per row so exported traces remain attributable.
        df = pd.DataFrame(run["traces"])
        df.insert(0,"run_id",run["id"])
        df.insert(1,"input_fingerprint",run["fingerprint"])
        df.insert(2,"model_version",run["model_version"])
        df.to_csv(output,index=False)
        return Response(output.getvalue(),media_type="text/csv",headers=headers)
    return Response(html_report(run),media_type="text/html",headers=headers)


@app.get("/api/vascular/network", response_model=VascularNetwork, operation_id="getVascularNetwork")
def vascular_network():
    return build_default_network()


@app.post("/api/vascular/solve", response_model=VascularSolveResult, operation_id="solveVascularNetwork")
def vascular_solve(data: VascularSolveInput):
    if not slots.acquire(blocking=False):
        raise HTTPException(429, "Two calculations are already running. Please try again shortly.")
    try:
        return solve_network(build_default_network(), data)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    finally:
        slots.release()


# ---------------------------------------------------------------- Scientific Validation Lab
_validation_cache: dict = {}
_validation_lock = threading.Lock()


@app.get("/api/validation/run", operation_id="runValidationSuite")
def validation_run(fresh: bool = Query(False, description="Re-execute instead of returning the cached run for this engine version")):
    """Executes the verification + synthetic-benchmark suite (≈10 s). Results are cached per engine version."""
    from validation.suite import run_suite, SUITE_VERSION
    key = (MODEL_VERSION, SUITE_VERSION)
    with _validation_lock:
        if fresh or key not in _validation_cache:
            _validation_cache[key] = run_suite()
        return _validation_cache[key]


SENSITIVITY_PARAMS = {
    "equalization_s": (0, 15), "regulated_wait_s": (0, 15), "offset_pct": (-100, 100), "dead_volume_ul": (0.02, 2),
    "narrowing_pct": (0, 60), "occlusion_pct": (0, 80), "altered_viscosity_ratio": (1, 4), "radius_um": (10, 60),
}


@app.get("/api/sensitivity", operation_id="runSensitivity")
def sensitivity(parameter: str = Query(...), points: int = Query(7, ge=3, le=11)):
    """One-at-a-time parameter sweep around the reference configuration, computed by the real engine."""
    if parameter not in SENSITIVITY_PARAMS:
        raise HTTPException(422, f"Unsupported parameter. Choose one of: {', '.join(SENSITIVITY_PARAMS)}")
    lo, hi = SENSITIVITY_PARAMS[parameter]
    values = [lo + (hi - lo) * i / (points - 1) for i in range(points)]
    if not slots.acquire(blocking=False):
        raise HTTPException(429, "Two calculations are already running. Please try again shortly.")
    try:
        rows = []
        for v in values:
            cfg = ExperimentInput(**{parameter: v, "radius_cv_pct": 0, "replicates": 3})
            r = simulate(cfg)
            m = {x["method"]: x for x in r["metrics"]}
            rows.append({"value": v, "baseline_flow_ul_min": r["baseline_flow_ul_min"],
                         "peak": {k: m[k]["peak_deviation_pct"] for k in m}, "carryover": {k: m[k]["carryover_pct"] for k in m},
                         "pressure_goal_met": {k: m[k]["pressure_target_met"] for k in m},
                         "contrasts": {c["name"]: c["value"] for c in r["contrasts"]}})
        return {"parameter": parameter, "range": [lo, hi], "model_version": MODEL_VERSION,
                "note": "Reference configuration with chip variability set to 0 so that only the swept parameter changes.", "rows": rows}
    finally:
        slots.release()


# ---------------------------------------------------------------- production: serve the built web app
STATIC_DIR = Path(os.environ.get("STATIC_DIR", ROOT / "deploy" / "static")).resolve()
if (STATIC_DIR / "index.html").is_file():
    import base64, hashlib, re as _re
    from fastapi.responses import HTMLResponse

    # Allow exactly the inline scripts shipped in index.html (by hash), nothing else.
    _inline = _re.findall(r"<script>(.*?)</script>", (STATIC_DIR / "index.html").read_text(encoding="utf-8"), _re.S)
    _hashes = " ".join(f"'sha256-{base64.b64encode(hashlib.sha256(x.encode()).digest()).decode()}'" for x in _inline)
    if _hashes:
        CSP = CSP.replace("script-src 'self'", f"script-src 'self' {_hashes}", 1)

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(404, "Not found")
        target = (STATIC_DIR / full_path).resolve()
        if full_path and target.is_file() and STATIC_DIR in target.parents:
            cache = "public, max-age=31536000, immutable" if full_path.startswith("assets/") else "public, max-age=300"
            return FileResponse(target, headers={"Cache-Control": cache})
        return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"), headers={"Cache-Control": "no-cache"})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app,host="0.0.0.0",port=int(os.environ["PORT"]),log_level="info")
