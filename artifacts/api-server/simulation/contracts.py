from typing import Any, Literal
from pydantic import BaseModel, Field
from .config import ExperimentInput


class HealthStatus(BaseModel):
    status: str


class MethodMetric(BaseModel):
    method: str
    label: str
    peak_deviation_pct: float
    pressure_target_met: bool
    carryover_pct: float
    carryover_target_met: bool
    washout_s: float | None
    flush_volume_ul: float
    interruption_s: float
    reversal_detected: bool


class TracePoint(BaseModel):
    method: str
    time_s: float
    pressure_pa: float
    flow_ul_min: float
    carryover_pct: float


class Arm(BaseModel):
    arm: str
    label: str
    fluid: int
    vessel: int
    n: int
    mean_flow_ul_min: float
    ci_low: float
    ci_high: float
    rescue_flow_ul_min: float
    normalized_flow_pct: float
    permeability_um_s: float


class Chip(BaseModel):
    arm: str
    fluid: int
    vessel: int
    replicate: int
    radius_um: float
    flow_ul_min: float
    rescue_flow_ul_min: float
    permeability_um_s: float


class Contrast(BaseModel):
    name: str
    value: float


class TracerPoint(BaseModel):
    condition: str
    time_s: float
    donor_fraction: float
    receiver_fraction: float


class Software(BaseModel):
    numpy: str
    scipy: str
    pandas: str


class RunSummary(BaseModel):
    id: str
    name: str
    created_at: str
    fingerprint: str
    seed: int
    replicates: int
    equalized_peak_pct: float
    pressure_target_met: bool


class SimulationRun(BaseModel):
    id: str
    created_at: str
    config: ExperimentInput
    model_version: str
    fingerprint: str
    baseline_flow_ul_min: float
    reynolds_number: float
    wall_shear_pa: float
    resistance_pa_s_m3: float
    metrics: list[MethodMetric]
    traces: list[TracePoint]
    arms: list[Arm]
    replicates: list[Chip]
    contrasts: list[Contrast]
    tracer: list[TracerPoint]
    assumptions: list[str]
    warnings: list[str]
    software: Software


class ModelInfo(BaseModel):
    version: str
    status: str
    source_title: str
    source_date: str
    defaults: ExperimentInput
    equations: list[str]
    assumptions: list[str]


class LabSummary(BaseModel):
    total_runs: int
    virtual_chips: int
    model_version: str
    latest_run_id: str | None


class VisualizationGeometry(BaseModel):
    radius_um: float
    length_mm: float
    channels: int
    outlet_pressure_pa: float


class VisualizationFrame(BaseModel):
    method: str
    time_s: float
    pressure_pa: float
    flow_ul_min: float
    mean_velocity_mm_s: float
    centerline_velocity_mm_s: float
    viscosity_mpas: float
    wall_shear_pa: float
    carryover_pct: float
    displacement_mm: float
    axial_pressure_pa: list[float]
    radial_velocity_mm_s: list[float]


class RunVisualization(BaseModel):
    run_id: str
    model_version: str
    visualization_version: str
    geometry: VisualizationGeometry
    axial_positions_mm: list[float]
    radial_fractions: list[float]
    frames: list[VisualizationFrame]
    pressure_min_pa: float
    pressure_max_pa: float
    velocity_abs_max_mm_s: float
    notes: list[str]


class SimulationPreview(BaseModel):
    run: SimulationRun
    visualization: RunVisualization


class CompoundInput(BaseModel):
    structure: str = Field(min_length=1, max_length=2048)
    representation: Literal["smiles", "inchi"] = "smiles"


class CompoundSearchItem(BaseModel):
    cid: int
    molecular_formula: str | None = None
    canonical_smiles: str | None = None
    iupac_name: str | None = None
    molecular_weight_da: float | None = None
    source: str


class CompoundSearchResponse(BaseModel):
    results: list[CompoundSearchItem]


class CompoundDescription(BaseModel):
    representation: str
    canonical_smiles: str
    inchi_key: str | None = None
    descriptors: dict[str, float]
    descriptor_note: str


class MoleculeConformerAtom(BaseModel):
    index: int
    element: str
    x: float
    y: float
    z: float


class MoleculeConformerBond(BaseModel):
    begin: int
    end: int
    order: float


class MoleculeConformerResponse(BaseModel):
    canonical_smiles: str
    atoms: list[MoleculeConformerAtom]
    bonds: list[MoleculeConformerBond]
    force_field_energy: float | None
    method: str
    seed: int
    note: str


class AIPredictionResponse(BaseModel):
    canonical_smiles: str
    descriptors: dict[str, float]
    endpoint: str
    evidence: dict[str, Any] | None = None
    prediction_available: bool
    exploratory_score: float | None = None
    score_is_calibrated_probability: bool
    uncertainty_available: bool
    model_version: str | None = None
    applicability: dict[str, Any] | None = None
    nearest_compounds: list[dict[str, Any]]
    message: str
    physics_integration: str


class AIResearchOverview(BaseModel):
    dataset: dict[str, Any]
    models: list[dict[str, Any]]
    latest_model: dict[str, Any] | None = None
    prediction_policy: str


class TrainingJobStatus(BaseModel):
    status: Literal["idle", "running", "completed", "failed"]
    training_id: str | None = None
    started_at_utc: str | None = None
    updated_at_utc: str
    model_version: str | None = None
    log: list[str]
    error: str | None = None


class AIModelRegistryEntry(BaseModel):
    model_version: str
    status: str
    endpoint: str
    algorithm: str
    trained_at_utc: str
    eligible_for_reliable_prediction: bool
    integrity_verified: bool
    test_metrics: dict[str, Any]


class AIReproducibilityReport(BaseModel):
    manifest: dict[str, Any]
    metrics: dict[str, Any]
    training_log: list[str]


class EvidenceSourceStatus(BaseModel):
    source_id: str
    name: str
    domain: str
    access_mode: str
    official_url: str
    api_base: str | None = None
    contents: str | None = None
    critical_limitations: str | None = None
    integration_state: str
    latest_request_url: str | None = None
    latest_fetched_at: str | None = None
    latest_http_status: int | None = None
    latest_record_count: int | None = None
    latest_response_sha256: str | None = None
    latest_outcome: str | None = None


class ClinicalEvidenceOverview(BaseModel):
    sources: list[EvidenceSourceStatus]
    table_counts: dict[str, int]
    clinical_use_classification: str
    patient_specific_recommendations_allowed: bool
    safety_efficacy_claims_allowed: bool


class ClinicalTrialEvidenceRecord(BaseModel):
    nct_id: str
    query_compound: str
    study_title: str | None
    overall_status: str | None
    phase: str | None
    enrollment: int | None
    intervention_names: list[str]
    condition_names: list[str]
    has_posted_results: bool
    outcome_count: int
    record_url: str
    source_version_date: str | None
    fetched_at: str
    raw_sha256: str


class FdaLabelEvidenceRecord(BaseModel):
    label_key: str
    query_compound: str
    effective_time: str | None
    drug_names: list[str]
    indications_text: str
    warnings_text: str
    contraindications_text: str
    adverse_reactions_text: str
    clinical_studies_text: str
    source_url: str
    fetched_at: str
    raw_sha256: str


class FaersSignalEvidenceRecord(BaseModel):
    query_compound: str
    signal_name: str | None
    report_count: int | None
    source: str
    fetched_at: str
    search_query: str
    interpretation: str


class EvidenceFetchRecord(BaseModel):
    source_id: str
    request_url: str
    fetched_at: str
    http_status: int | None
    count_records: int
    response_sha256: str | None
    outcome: str
    detail: str | None


class ClinicalEvidenceSearchResponse(BaseModel):
    query: str
    trials: list[ClinicalTrialEvidenceRecord]
    labels: list[FdaLabelEvidenceRecord]
    safety_signals: list[FaersSignalEvidenceRecord]
    fetches: list[EvidenceFetchRecord]
    not_covered: list[str]
