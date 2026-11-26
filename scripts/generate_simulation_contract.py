"""Generate the OpenAPI source contract from typed Python declarations."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"artifacts"/"api-server"))
from fastapi import FastAPI
from simulation.config import ExperimentInput
from simulation.contracts import (
    AIModelRegistryEntry, AIReproducibilityReport, AIResearchOverview, AIPredictionResponse,
    ClinicalEvidenceOverview, ClinicalEvidenceSearchResponse, CompoundDescription, CompoundInput,
    CompoundSearchResponse, HealthStatus, ModelInfo, LabSummary, MoleculeConformerResponse,
    RunSummary, RunVisualization, SimulationPreview, SimulationRun, TrainingJobStatus,
)
from vascular.contracts import VascularNetwork, VascularSolveInput, VascularSolveResult
import yaml

app = FastAPI(title="Api", version="1.0.0", servers=[{"url": "/api"}])

@app.get("/healthz", response_model=HealthStatus, operation_id="healthCheck")
def health(): pass
@app.get("/model", response_model=ModelInfo, operation_id="getModel")
def model(): pass
@app.get("/summary", response_model=LabSummary, operation_id="getSummary")
def summary(): pass
@app.get("/runs", response_model=list[RunSummary], operation_id="listRuns")
def runs(): pass
@app.post("/runs", response_model=SimulationRun, operation_id="createRun", status_code=201)
def run(data: ExperimentInput): pass
@app.get("/runs/{run_id}", response_model=SimulationRun, operation_id="getRun")
def get_run(run_id: str): pass
@app.get("/runs/{run_id}/visualization", response_model=RunVisualization, operation_id="getRunVisualization")
def visualization(run_id: str): pass
@app.post("/preview", response_model=SimulationPreview, operation_id="previewSimulation")
def preview(data: ExperimentInput): pass
@app.get("/runs/{run_id}/report", operation_id="downloadReport",
         responses={200: {"description":"Self-contained HTML report, use ?format=csv or json for raw data",
                          "content":{"text/html":{"schema":{"type":"string"}}}}})
def report(run_id: str): pass
@app.get("/ai/overview", response_model=AIResearchOverview, operation_id="getAIResearchOverview")
def ai_overview(): pass
@app.get("/ai/training", response_model=TrainingJobStatus, operation_id="getAITrainingStatus")
def ai_training_status(): pass
@app.post("/ai/train", response_model=TrainingJobStatus, operation_id="startAITraining", status_code=202)
def start_ai_training(): pass
@app.get("/ai/models", response_model=list[AIModelRegistryEntry], operation_id="listAIModels")
def ai_models(): pass
@app.get("/ai/models/{model_version}/report", response_model=AIReproducibilityReport, operation_id="downloadAIReproducibilityReport")
def ai_report(model_version: str): pass
@app.get("/ai/compound/search", response_model=CompoundSearchResponse, operation_id="searchPubChemCompounds")
def ai_search(q: str): pass
@app.post("/ai/compound/describe", response_model=CompoundDescription, operation_id="describeCompound")
def ai_describe(data: CompoundInput): pass
@app.post("/ai/compound/conformer", response_model=MoleculeConformerResponse, operation_id="generateCompoundConformer")
def ai_conformer(data: CompoundInput): pass
@app.post("/ai/predict", response_model=AIPredictionResponse, operation_id="predictCompoundResponse")
def ai_predict(data: CompoundInput): pass
@app.get("/evidence/overview", response_model=ClinicalEvidenceOverview, operation_id="getClinicalEvidenceOverview")
def clinical_evidence_overview(): pass
@app.get("/evidence/search", response_model=ClinicalEvidenceSearchResponse, operation_id="searchClinicalEvidence")
def clinical_evidence_search(q: str): pass
@app.get("/evidence/report", operation_id="downloadClinicalEvidenceImportReport",
         responses={200: {"description":"JSON evidence import report"}})
def download_evidence_report(): pass
@app.get("/evidence/import-log", operation_id="downloadClinicalEvidenceImportLog",
         responses={200: {"description":"Text public API import log"}})
def download_evidence_import_log(): pass
@app.get("/vascular/network", response_model=VascularNetwork, operation_id="getVascularNetwork")
def get_vascular_network(): pass
@app.post("/vascular/solve", response_model=VascularSolveResult, operation_id="solveVascularNetwork")
def solve_vascular_network(data: VascularSolveInput): pass

spec=app.openapi()
# Pydantic emits nullable anyOf. Orval accepts it; eliminate validation-error
# response internals so callers receive standard error objects.
for path in spec["paths"].values():
    for op in path.values():
        op.get("responses",{}).pop("422",None)
Path("lib/api-spec/openapi.yaml").write_text(yaml.safe_dump(spec, sort_keys=False))
