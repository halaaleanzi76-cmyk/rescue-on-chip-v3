-- Rescue-on-Chip evidence database template; no clinical claims, patient rows or trial records prepopulated.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS source_catalog (
 source_id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT NOT NULL,
 access_mode TEXT NOT NULL, official_url TEXT NOT NULL, api_base TEXT,
 contents TEXT, critical_limitations TEXT,
 integration_state TEXT NOT NULL DEFAULT 'CATALOG_ONLY_NOT_CONNECTED'
);
CREATE TABLE IF NOT EXISTS substances (
 compound_id INTEGER PRIMARY KEY AUTOINCREMENT, display_name TEXT NOT NULL,
 structure_smiles TEXT, inchikey TEXT, identity_source TEXT,
 created_at TEXT DEFAULT (datetime('now')),
 UNIQUE(display_name,inchikey)
);
CREATE TABLE IF NOT EXISTS clinical_trials (
 nct_id TEXT PRIMARY KEY, query_compound TEXT NOT NULL, study_title TEXT,
 overall_status TEXT, phase TEXT, enrollment INTEGER,
 intervention_names_json TEXT, condition_names_json TEXT,
 has_posted_results INTEGER NOT NULL DEFAULT 0,
 record_url TEXT NOT NULL, source_version_date TEXT, fetched_at TEXT NOT NULL,
 raw_sha256 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clinical_outcomes (
 outcome_row_id INTEGER PRIMARY KEY AUTOINCREMENT, nct_id TEXT NOT NULL,
 outcome_type TEXT NOT NULL, endpoint_title TEXT, description TEXT,
 timeframe TEXT, results_json TEXT, raw_sha256 TEXT NOT NULL,
 FOREIGN KEY(nct_id) REFERENCES clinical_trials(nct_id)
);
CREATE TABLE IF NOT EXISTS fda_labels (
 label_key TEXT PRIMARY KEY, query_compound TEXT NOT NULL,
 effective_time TEXT, drug_names_json TEXT, indications_text TEXT,
 warnings_text TEXT, contraindications_text TEXT,
 adverse_reactions_text TEXT, clinical_studies_text TEXT,
 source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, raw_sha256 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS safety_signals (
 id INTEGER PRIMARY KEY AUTOINCREMENT, query_compound TEXT NOT NULL,
 signal_name TEXT, report_count INTEGER, source TEXT NOT NULL,
 fetched_at TEXT NOT NULL, search_query TEXT NOT NULL,
 UNIQUE(query_compound, signal_name, source, search_query)
);
CREATE TABLE IF NOT EXISTS studies_evidence (
 evidence_id INTEGER PRIMARY KEY AUTOINCREMENT, compound_name TEXT NOT NULL,
 indication TEXT, population TEXT, outcome_name TEXT, outcome_type TEXT,
 evidence_level TEXT NOT NULL, study_design TEXT, source_id TEXT NOT NULL,
 record_locator TEXT NOT NULL, sample_size INTEGER, effect_estimate TEXT,
 uncertainty TEXT, limitations TEXT, expert_review_status TEXT DEFAULT 'NOT_REVIEWED',
 imported_at TEXT DEFAULT (datetime('now')),
 FOREIGN KEY(source_id) REFERENCES source_catalog(source_id)
);
CREATE TABLE IF NOT EXISTS mechanistic_links (
 link_id INTEGER PRIMARY KEY AUTOINCREMENT, molecular_endpoint TEXT NOT NULL,
 physiological_endpoint TEXT NOT NULL, clinical_endpoint TEXT,
 association_or_causal TEXT NOT NULL, justification_source TEXT,
 biological_model TEXT, applicability TEXT, validation_status TEXT NOT NULL DEFAULT 'NOT_VALIDATED',
 clinical_inference_allowed INTEGER NOT NULL DEFAULT 0 CHECK (clinical_inference_allowed=0)
);
CREATE TABLE IF NOT EXISTS model_registry (
 model_id TEXT PRIMARY KEY, predicted_endpoint TEXT NOT NULL, dataset_id TEXT,
 algorithm TEXT, training_dataset_hash TEXT, model_file_hash TEXT,
 validation_report_url TEXT, external_validation_status TEXT NOT NULL DEFAULT 'NONE',
 calibration_status TEXT NOT NULL DEFAULT 'NOT_ASSESSED',
 intended_use TEXT NOT NULL DEFAULT 'RESEARCH_ONLY', clinical_use_allowed INTEGER NOT NULL DEFAULT 0 CHECK(clinical_use_allowed=0)
);
CREATE TABLE IF NOT EXISTS external_validations (
 validation_id INTEGER PRIMARY KEY AUTOINCREMENT, model_id TEXT NOT NULL,
 independent_dataset_id TEXT NOT NULL, independence_description TEXT,
 temporal_external INTEGER, geographic_external INTEGER, prospective INTEGER,
 target_population TEXT, endpoint_match INTEGER, performance_metrics_json TEXT,
 calibration_json TEXT, subgroup_metrics_json TEXT, sample_n INTEGER,
 expert_review TEXT, risk_of_bias TEXT, validation_status TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
 FOREIGN KEY(model_id) REFERENCES model_registry(model_id)
);
CREATE TABLE IF NOT EXISTS expert_reviews (
 review_id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL,
 entity_id TEXT NOT NULL, reviewer_role TEXT NOT NULL,
 documented_conflicts TEXT, review_date TEXT, verdict TEXT,
 supporting_report_ref TEXT
);
CREATE TABLE IF NOT EXISTS fetch_log (
 fetch_id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT NOT NULL,
 request_url TEXT NOT NULL, fetched_at TEXT NOT NULL,
 http_status INTEGER, count_records INTEGER DEFAULT 0, response_sha256 TEXT,
 outcome TEXT NOT NULL, detail TEXT,
 FOREIGN KEY(source_id) REFERENCES source_catalog(source_id)
);
CREATE TABLE IF NOT EXISTS clinical_use_policy (
 policy_id INTEGER PRIMARY KEY CHECK (policy_id=1),
 classification TEXT NOT NULL DEFAULT 'RESEARCH_ONLY',
 patient_specific_recommendations_allowed INTEGER NOT NULL DEFAULT 0 CHECK(patient_specific_recommendations_allowed=0),
 safety_efficacy_claims_allowed INTEGER NOT NULL DEFAULT 0 CHECK(safety_efficacy_claims_allowed=0)
);
INSERT OR IGNORE INTO clinical_use_policy(policy_id) VALUES (1);
CREATE INDEX IF NOT EXISTS idx_trials_compound ON clinical_trials(query_compound);
CREATE INDEX IF NOT EXISTS idx_evidence_indication ON studies_evidence(compound_name, indication);
CREATE INDEX IF NOT EXISTS idx_safety_compound ON safety_signals(query_compound);
