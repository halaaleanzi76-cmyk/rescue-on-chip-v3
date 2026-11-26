"""Reproducible scaffold-split training on the fixed PubChem AID 1288 snapshot."""
from __future__ import annotations

import hashlib
import json
import math
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from rdkit import DataStructs
from rdkit.Chem import rdFingerprintGenerator
from scipy.stats import norm
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .chemistry import (
    DESCRIPTOR_NAMES,
    FEATURE_NAMES,
    FINGERPRINT_BITS,
    MORGAN_RADIUS,
    descriptors,
    fingerprint,
    scaffold_key,
    standardize_structure,
)
from .dataset import (
    DATA_DIR,
    ENDPOINT,
    SERVICE_ROOT,
    dataset_manifest,
    fetch_dataset,
    prepare_dataset,
    sha256_bytes,
)

MODELS_DIR = SERVICE_ROOT / "research" / "models"
SEED = 42
TEST_FOLDS = 5
CV_FOLDS = 4


def _progress(callback, message: str):
    if callback:
        callback(message)


def _json_hash(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _atomic_json(path: Path, value: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(value, indent=2, sort_keys=True, allow_nan=False).encode("utf-8")
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".manifest-", delete=False) as stream:
        stream.write(content)
        temporary = Path(stream.name)
    temporary.replace(path)


def _atomic_joblib(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".model-", delete=False) as stream:
        temporary = Path(stream.name)
    try:
        joblib.dump(value, temporary, compress=3, protocol=5)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def _classifier_factories():
    return {
        "random_forest": lambda: RandomForestClassifier(
            n_estimators=500,
            min_samples_leaf=3,
            max_features="sqrt",
            class_weight="balanced_subsample",
            random_state=SEED,
            n_jobs=1,
        ),
        "regularized_logistic_regression": lambda: make_pipeline(
            StandardScaler(),
            LogisticRegression(
                max_iter=3000,
                class_weight="balanced",
                C=0.03,
                random_state=SEED,
            ),
        ),
    }


def _wilson(successes: int, total: int, confidence: float = 0.95) -> list[float] | None:
    if total == 0:
        return None
    z = float(norm.ppf(0.5 + confidence / 2))
    p = successes / total
    den = 1 + z * z / total
    center = (p + z * z / (2 * total)) / den
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / den
    return [max(0.0, center - half), min(1.0, center + half)]


def _metrics(y_true: np.ndarray, score: np.ndarray, threshold: float, baseline_prevalence: float) -> dict:
    predicted = score >= threshold
    tn, fp, fn, tp = confusion_matrix(y_true, predicted, labels=[0, 1]).ravel()
    positives = int(tp + fn)
    negatives = int(tn + fp)
    return {
        "n": int(len(y_true)),
        "active_n": positives,
        "inactive_n": negatives,
        "active_prevalence": float(np.mean(y_true)),
        "roc_auc": float(roc_auc_score(y_true, score)) if len(np.unique(y_true)) == 2 else None,
        "pr_auc_average_precision": float(average_precision_score(y_true, score)),
        "raw_score_brier": float(brier_score_loss(y_true, score)),
        "null_prevalence_brier": float(brier_score_loss(y_true, np.full(len(y_true), baseline_prevalence))),
        "threshold_from_development_oof": float(threshold),
        "true_positive": int(tp),
        "false_positive": int(fp),
        "true_negative": int(tn),
        "false_negative": int(fn),
        "precision": float(precision_score(y_true, predicted, zero_division=0)),
        "recall_sensitivity": float(recall_score(y_true, predicted, zero_division=0)),
        "recall_wilson_95_ci": _wilson(int(tp), positives),
        "specificity": float(tn / negatives) if negatives else None,
        "specificity_wilson_95_ci": _wilson(int(tn), negatives),
        "f1": float(f1_score(y_true, predicted, zero_division=0)),
    }


def train_model(force_refresh: bool = True, progress=None) -> dict:
    """Fetch the official snapshot, audit it, train candidate models, and hold out scaffolds."""
    _progress(progress, "Downloading the official PubChem assay snapshot.")
    content, source = fetch_dataset(force=force_refresh, progress=progress)
    frame, audit = prepare_dataset(content)
    _progress(
        progress,
        f"Audited {audit['valid_binary_assay_records']} records: "
        f"{audit['active_count']} active, {audit['inactive_count']} inactive; "
        f"{audit['invalid_or_unparseable_structures']} invalid structures.",
    )

    structures = []
    feature_rows = []
    fingerprints = []
    scaffolds = []
    for raw_smiles in frame["PUBCHEM_EXT_DATASOURCE_SMILES"].astype(str):
        molecule, canonical = standardize_structure(raw_smiles)
        structure_descriptors = descriptors(molecule)
        fp = fingerprint(molecule)
        structures.append(canonical)
        feature_rows.append(np.r_[fp.astype(np.float32), list(structure_descriptors.values())])
        fingerprints.append(fp)
        scaffolds.append(scaffold_key(molecule, canonical))
    X = np.asarray(feature_rows, dtype=np.float32)
    y = frame["label"].to_numpy(dtype=np.int8)
    groups = np.asarray(scaffolds)
    fp_matrix = np.asarray(fingerprints, dtype=np.uint8)
    cids = frame["PUBCHEM_CID"].to_numpy(dtype=np.int64)
    if len(np.unique(structures)) != len(structures):
        raise ValueError("Duplicate standardized structures remain after dataset cleaning.")

    test_splitter = StratifiedGroupKFold(n_splits=TEST_FOLDS, shuffle=True, random_state=SEED)
    development_indices, test_indices = next(test_splitter.split(X, y, groups))
    _progress(
        progress,
        f"Created a scaffold-held-out split: {len(development_indices)} development records, "
        f"{len(test_indices)} untouched test records.",
    )

    factories = _classifier_factories()
    cv_splitter = StratifiedGroupKFold(n_splits=CV_FOLDS, shuffle=True, random_state=17)
    model_results = {}
    oof_scores = {}
    oof_domain_similarities = []
    dev_x = X[development_indices]
    dev_y = y[development_indices]
    dev_groups = groups[development_indices]
    for model_name, factory in factories.items():
        _progress(progress, f"Training {model_name.replace('_', ' ')} in {CV_FOLDS}-fold scaffold cross-validation.")
        scores = np.full(len(development_indices), np.nan, dtype=np.float64)
        fold_rows = []
        for fold_index, (train_local, validation_local) in enumerate(
            cv_splitter.split(dev_x, dev_y, dev_groups), start=1
        ):
            train_global = development_indices[train_local]
            validation_global = development_indices[validation_local]
            classifier = factory()
            classifier.fit(X[train_global], y[train_global])
            validation_score = classifier.predict_proba(X[validation_global])[:, 1]
            scores[validation_local] = validation_score
            fold_rows.append(
                {
                    "fold": fold_index,
                    "n": int(len(validation_global)),
                    "active_n": int(y[validation_global].sum()),
                    "pr_auc_average_precision": float(
                        average_precision_score(y[validation_global], validation_score)
                    ),
                    "roc_auc": float(roc_auc_score(y[validation_global], validation_score)),
                }
            )
            if model_name == "random_forest":
                neighbor_matrix = fp_matrix[train_global]
                neighbor_fps = []
                # Rebuild compact RDKit bit vectors from feature fingerprints.
                from rdkit import DataStructs

                for row in neighbor_matrix:
                    bit_vector = DataStructs.ExplicitBitVect(FINGERPRINT_BITS)
                    for bit in np.flatnonzero(row):
                        bit_vector.SetBit(int(bit))
                    neighbor_fps.append(bit_vector)
                for global_index in validation_global:
                    query_fp = DataStructs.ExplicitBitVect(FINGERPRINT_BITS)
                    for bit in np.flatnonzero(fp_matrix[global_index]):
                        query_fp.SetBit(int(bit))
                    oof_domain_similarities.append(
                        max(DataStructs.BulkTanimotoSimilarity(query_fp, neighbor_fps))
                    )
        if not np.isfinite(scores).all():
            raise ValueError("Scaffold cross-validation did not produce all out-of-fold scores.")
        model_results[model_name] = {
            "folds": fold_rows,
            "mean_fold_pr_auc": float(np.mean([row["pr_auc_average_precision"] for row in fold_rows])),
            "mean_fold_roc_auc": float(np.mean([row["roc_auc"] for row in fold_rows])),
            "oof_pr_auc_average_precision": float(average_precision_score(dev_y, scores)),
            "oof_roc_auc": float(roc_auc_score(dev_y, scores)),
            "oof_raw_score_brier": float(brier_score_loss(dev_y, scores)),
        }
        oof_scores[model_name] = scores

    selected_name = max(model_results, key=lambda name: model_results[name]["mean_fold_pr_auc"])
    selected_scores = oof_scores[selected_name]
    candidates = np.unique(np.r_[selected_scores, 0.5])
    threshold = max(
        candidates,
        key=lambda value: (f1_score(dev_y, selected_scores >= value, zero_division=0), value),
    )
    domain_threshold = float(np.quantile(oof_domain_similarities, 0.10))
    _progress(
        progress,
        f"Selected {selected_name} using development-fold PR-AUC; "
        f"decision threshold {threshold:.4f} and exploratory similarity floor {domain_threshold:.4f} "
        "were derived without using the held-out test set.",
    )

    classifier = factories[selected_name]()
    classifier.fit(X[development_indices], y[development_indices])
    test_scores = classifier.predict_proba(X[test_indices])[:, 1]
    test_metrics = _metrics(
        y[test_indices], test_scores, float(threshold), float(np.mean(y[development_indices]))
    )
    test_neighbors = []
    from rdkit import DataStructs

    development_fps = []
    for row in fp_matrix[development_indices]:
        bit_vector = DataStructs.ExplicitBitVect(FINGERPRINT_BITS)
        for bit in np.flatnonzero(row):
            bit_vector.SetBit(int(bit))
        development_fps.append(bit_vector)
    for global_index in test_indices:
        query_fp = DataStructs.ExplicitBitVect(FINGERPRINT_BITS)
        for bit in np.flatnonzero(fp_matrix[global_index]):
            query_fp.SetBit(int(bit))
        test_neighbors.append(max(DataStructs.BulkTanimotoSimilarity(query_fp, development_fps)))
    test_metrics["nearest_training_tanimoto_mean"] = float(np.mean(test_neighbors))
    test_metrics["nearest_training_tanimoto_p10"] = float(np.quantile(test_neighbors, 0.10))
    test_metrics["nearest_training_tanimoto_median"] = float(np.median(test_neighbors))
    test_metrics["nearest_training_tanimoto_min"] = float(np.min(test_neighbors))
    test_metrics["baseline_test_prevalence_pr_auc"] = float(np.mean(y[test_indices]))

    configuration = {
        "dataset_assay_id": 1288,
        "dataset_sha256": sha256_bytes(content),
        "seed": SEED,
        "test_method": "StratifiedGroupKFold by standardized Bemis-Murcko scaffold",
        "test_folds": TEST_FOLDS,
        "test_fold": 1,
        "development_cv_method": "StratifiedGroupKFold by scaffold",
        "development_cv_folds": CV_FOLDS,
        "development_cv_seed": 17,
        "fingerprint": f"Morgan radius {MORGAN_RADIUS}, {FINGERPRINT_BITS} bits",
        "descriptors": DESCRIPTOR_NAMES,
        "candidate_algorithms": list(factories),
        "selected_algorithm": selected_name,
        "threshold_selection": "maximize pooled out-of-fold development F1; not tuned on test",
        "domain_rule": "10th percentile of development OOF nearest-neighbor Tanimoto; heuristic only",
        "features": FEATURE_NAMES,
    }
    configuration_hash = _json_hash(configuration)
    model_version = f"e-selectin-aid1288-{sha256_bytes(content)[:10]}-scaffold-{configuration_hash[:8]}"
    model_dir = MODELS_DIR / model_version
    _progress(progress, "Saving the model, test-set predictions, metrics and reproducibility manifest.")
    train_artifact = {
        "model": classifier,
        "model_version": model_version,
        "feature_names": FEATURE_NAMES,
        "fingerprint_bits": FINGERPRINT_BITS,
        "morgan_radius": MORGAN_RADIUS,
        "train_fingerprint_matrix": fp_matrix[development_indices],
        "train_cids": cids[development_indices],
        "train_smiles": np.asarray(structures, dtype=object)[development_indices],
        "train_labels": y[development_indices],
        "decision_threshold": float(threshold),
        "similarity_floor": domain_threshold,
        "eligible_for_reliable_prediction": False,
    }
    model_path = model_dir / "model.joblib"
    _atomic_joblib(model_path, train_artifact)
    predictions = pd.DataFrame(
        {
            "cid": cids[test_indices],
            "scaffold": groups[test_indices],
            "experimental_active_label": y[test_indices],
            "exploratory_score_not_calibrated_probability": test_scores,
            "model_positive_at_development_threshold": (test_scores >= threshold).astype(int),
            "nearest_development_training_tanimoto": test_neighbors,
        }
    )
    model_dir.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(model_dir / "heldout_test_predictions.csv", index=False)
    metrics = {
        "model_version": model_version,
        "endpoint": ENDPOINT,
        "algorithm_comparison": model_results,
        "selected_algorithm": selected_name,
        "decision_threshold": float(threshold),
        "test_metrics": test_metrics,
        "development_records": int(len(development_indices)),
        "development_active": int(y[development_indices].sum()),
        "test_records": int(len(test_indices)),
        "test_active": int(y[test_indices].sum()),
        "test_scaffolds": int(len(set(groups[test_indices]))),
        "eligible_for_reliable_prediction": False,
        "reliability_decision": (
            "Not eligible: the single-assay data are strongly imbalanced and selected from a prior "
            "primary-screen hit set; the raw, uncalibrated score Brier value did not improve on the "
            "prevalence baseline, and the test contains only ten active examples. Keep scores exploratory and abstain from "
            "claiming a reliable vascular prediction."
        ),
        "calibrated_probability_available": False,
        "test_set_was_used_for_model_selection_or_threshold_tuning": False,
    }
    metrics_path = model_dir / "metrics.json"
    _atomic_json(metrics_path, metrics)
    model_digest = hashlib.sha256(model_path.read_bytes()).hexdigest()
    manifest = {
        "model_version": model_version,
        "model_file": "model.joblib",
        "model_sha256": model_digest,
        "metrics_file": "metrics.json",
        "test_predictions_file": "heldout_test_predictions.csv",
        "configuration": configuration,
        "configuration_sha256": configuration_hash,
        "dataset": dataset_manifest(),
        "training": {
            "trained_at_utc": datetime.now(timezone.utc).isoformat(),
            "python_package_versions": {
                "scikit_learn": __import__("sklearn").__version__,
                "rdkit": __import__("rdkit").__version__,
                "numpy": np.__version__,
                "pandas": pd.__version__,
            },
            "development_records": int(len(development_indices)),
            "development_active": int(y[development_indices].sum()),
            "development_inactive": int(len(development_indices) - y[development_indices].sum()),
            "test_records": int(len(test_indices)),
            "test_active": int(y[test_indices].sum()),
            "test_inactive": int(len(test_indices) - y[test_indices].sum()),
            "scaffold_groups_total": int(len(set(groups))),
            "invalid_structures": audit["invalid_or_unparseable_structures"],
            "duplicate_structures": audit["duplicate_standardized_structures"],
        },
        "metrics": metrics,
        "status": "candidate_unvalidated",
        "prediction_policy": (
            "No calibrated or validated vascular prediction is available. A similarity-qualified "
            "model score is a non-actionable exploratory ranking signal only. Never map it into "
            "fluid-mechanics parameters."
        ),
        "files": {},
    }
    for filename in ["model.joblib", "metrics.json", "heldout_test_predictions.csv"]:
        manifest["files"][filename] = hashlib.sha256((model_dir / filename).read_bytes()).hexdigest()
    _atomic_json(model_dir / "manifest.json", manifest)
    log_lines = [
        f"Trained at UTC: {manifest['training']['trained_at_utc']}",
        f"Source: PubChem BioAssay AID {source['assay_id']} ({source['source_url']})",
        f"Dataset SHA-256: {configuration['dataset_sha256']}",
        f"Audited records: {audit['valid_binary_assay_records']} ({audit['active_count']} active, {audit['inactive_count']} inactive)",
        f"Split: {len(development_indices)} development / {len(test_indices)} scaffold-held-out test; "
        f"{test_metrics['active_n']} test actives.",
        f"Selected algorithm by development scaffold CV PR-AUC: {selected_name}",
        f"Development threshold: {threshold:.6f}; test score is not a calibrated probability.",
        f"Test ROC-AUC: {test_metrics['roc_auc']:.6f}",
        f"Test PR-AUC / average precision: {test_metrics['pr_auc_average_precision']:.6f} "
        f"(test prevalence baseline {test_metrics['baseline_test_prevalence_pr_auc']:.6f})",
        f"Test Brier score: {test_metrics['raw_score_brier']:.6f}; prevalence baseline Brier: "
        f"{test_metrics['null_prevalence_brier']:.6f}",
        f"Test threshold precision/recall/specificity/F1: {test_metrics['precision']:.6f}/"
        f"{test_metrics['recall_sensitivity']:.6f}/{test_metrics['specificity']:.6f}/{test_metrics['f1']:.6f}",
        f"Model SHA-256: {model_digest}",
        f"Result: candidate saved; reliable inference gate FAILED: {metrics['reliability_decision']}",
    ]
    (model_dir / "training.log").write_text("\n".join(log_lines) + "\n")
    manifest["training_log_sha256"] = hashlib.sha256((model_dir / "training.log").read_bytes()).hexdigest()
    manifest["files"]["training.log"] = manifest["training_log_sha256"]
    _atomic_json(model_dir / "manifest.json", manifest)
    _progress(progress, f"Saved candidate model {model_version}; its reliability gate correctly remains closed.")
    return {
        "model_version": model_version,
        "model_dir": str(model_dir.relative_to(SERVICE_ROOT)),
        "manifest": manifest,
        "metrics": metrics,
        "log": log_lines,
    }
