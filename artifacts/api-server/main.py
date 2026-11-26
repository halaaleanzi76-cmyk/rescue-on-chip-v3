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
from simulation.contracts import (
    AIModelRegistryEntry, AIReproducibilityReport, AIResearchOverview, AIPredictionResponse,
    CompoundDescription, CompoundInput, CompoundSearchResponse, MoleculeConformerResponse,
    ClinicalEvidenceOverview, ClinicalEvidenceSearchResponse, TrainingJobStatus,
)
from research import jobs as research_jobs
from research.service import (
    describe_structure, model_registry, predict_structure, research_overview,
    search_pubchem, training_log,
)
from research.chemistry import generate_conformer
from research.clinical_evidence.database import evidence_overview, search_evidence
from research.training import MODELS_DIR
from vascular.contracts import VascularNetwork, VascularSolveInput, VascularSolveResult
from vascular.graph import build_default_network
from vascular.solver import solve_network
from auth.core import CurrentUser, optional_user, require_admin, require_role
from auth.routes import router as auth_router

logger = logging.getLogger("rescue-lab")
slots = threading.BoundedSemaphore(2)
ROOT = Path(__file__).resolve().parents[2]
CLINICAL_EVIDENCE_DIR = Path(__file__).resolve().parent / "research" / "clinical_evidence"


@lru_cache(maxsize=1)
def default_calculation():
    return simulate(ExperimentInput())


@asynccontextmanager
async def lifespan(app):
    # Schema is applied during setup, not mutated on application startup.
    if store.summary()["total_runs"] == 0:
        store.save(default_calculation())
        logger.info("Calculated and saved one clearly labeled default virtual-bench run.")
    yield


app = FastAPI(title="Api", version="1.0.0", lifespan=lifespan,
              docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
app.add_middleware(GZipMiddleware, minimum_size=1000)
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


@app.get("/api/source")
def source():
    return FileResponse(Path(__file__).resolve().parent/"resources"/"project-proposal.pdf",
                        media_type="application/pdf",filename="Rescue-on-Chip-Research-Proposal.pdf")


@app.get("/api/ai/overview", response_model=AIResearchOverview, operation_id="getAIResearchOverview")
def ai_overview():
    return research_overview()


@app.get("/api/ai/training", response_model=TrainingJobStatus, operation_id="getAITrainingStatus")
def ai_training_status():
    state = research_jobs.get_state()
    if state["status"] == "idle":
        entries = model_registry()
        if entries:
            state["status"] = "completed"
            state["model_version"] = entries[0]["model_version"]
            state["log"] = training_log()
    return state


@app.post("/api/ai/train", response_model=TrainingJobStatus, status_code=202, operation_id="startAITraining")
def start_ai_training(_: CurrentUser = Depends(require_admin)):
    try:
        return research_jobs.start_training()
    except RuntimeError as exc:
        raise HTTPException(429, str(exc))


@app.get("/api/ai/models", response_model=list[AIModelRegistryEntry], operation_id="listAIModels")
def list_ai_models():
    return model_registry()


@app.get(
    "/api/ai/models/{model_version}/report",
    response_model=AIReproducibilityReport,
    operation_id="downloadAIReproducibilityReport",
)
def download_ai_report(model_version: str):
    if len(model_version) > 120 or any(char not in "abcdefghijklmnopqrstuvwxyz0123456789-" for char in model_version):
        raise HTTPException(404, "Model version not found.")
    model_dir = MODELS_DIR / model_version
    manifest_path = model_dir / "manifest.json"
    metrics_path = model_dir / "metrics.json"
    if not manifest_path.is_file() or not metrics_path.is_file():
        raise HTTPException(404, "Model version not found.")
    report_data = {
        "manifest": json.loads(manifest_path.read_text()),
        "metrics": json.loads(metrics_path.read_text()),
        "training_log": (model_dir / "training.log").read_text().splitlines()
        if (model_dir / "training.log").exists() else [],
    }
    return JSONResponse(
        content=report_data,
        headers={"Content-Disposition": f'attachment; filename="rescue-on-chip-{model_version}-reproducibility.json"'},
    )


@app.get("/api/ai/compound/search", response_model=CompoundSearchResponse, operation_id="searchPubChemCompounds")
def ai_compound_search(q: str = Query(min_length=1, max_length=100)):
    try:
        return {"results": search_pubchem(q)}
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except RuntimeError as exc:
        raise HTTPException(502, str(exc))


@app.post("/api/ai/compound/describe", response_model=CompoundDescription, operation_id="describeCompound")
def ai_describe_compound(data: CompoundInput):
    try:
        return describe_structure(data.structure, data.representation)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@app.post("/api/ai/compound/conformer", response_model=MoleculeConformerResponse, operation_id="generateCompoundConformer")
def ai_compound_conformer(data: CompoundInput):
    try:
        return generate_conformer(data.structure, data.representation)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@app.post("/api/ai/predict", response_model=AIPredictionResponse, operation_id="predictCompoundResponse")
def ai_predict_compound(data: CompoundInput):
    try:
        return predict_structure(data.structure, data.representation)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except RuntimeError as exc:
        logger.exception("Stored research model could not be safely verified or loaded")
        raise HTTPException(503, "The stored research model is unavailable or failed integrity validation.")


@app.get("/api/evidence/overview", response_model=ClinicalEvidenceOverview, operation_id="getClinicalEvidenceOverview")
def clinical_evidence_overview():
    try:
        return evidence_overview()
    except (sqlite3.Error, OSError, RuntimeError):
        logger.exception("Read-only clinical evidence database is unavailable")
        raise HTTPException(503, "The public clinical evidence database is unavailable.")


@app.get("/api/evidence/search", response_model=ClinicalEvidenceSearchResponse, operation_id="searchClinicalEvidence")
def clinical_evidence_search(q: str = Query(min_length=1, max_length=100)):
    try:
        return search_evidence(q)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except (sqlite3.Error, OSError, RuntimeError):
        logger.exception("Read-only clinical evidence search failed")
        raise HTTPException(503, "The public clinical evidence search is unavailable.")


@app.get("/api/evidence/report", operation_id="downloadClinicalEvidenceImportReport")
def clinical_evidence_import_report():
    path = CLINICAL_EVIDENCE_DIR / "stage1_import_report.json"
    if not path.is_file():
        raise HTTPException(404, "The verified evidence import report is unavailable.")
    return FileResponse(path, media_type="application/json", filename="clinical-evidence-import-report.json")


@app.get("/api/evidence/import-log", operation_id="downloadClinicalEvidenceImportLog")
def clinical_evidence_import_log():
    path = CLINICAL_EVIDENCE_DIR / "importer-run-2026-11-23.log"
    if not path.is_file():
        raise HTTPException(404, "The public evidence import log is unavailable.")
    return FileResponse(path, media_type="text/plain", filename="clinical-evidence-import.log")


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


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app,host="0.0.0.0",port=int(os.environ["PORT"]),log_level="info")
