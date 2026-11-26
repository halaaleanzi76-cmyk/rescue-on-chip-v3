"""Read-only compound lookup, model registry and cautious inference."""
from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

import httpx
import joblib
import numpy as np
import pandas as pd
from rdkit import DataStructs

from .chemistry import descriptors, feature_vector, fingerprint, standardize_structure
from .dataset import DATASET_PATH, ENDPOINT, SERVICE_ROOT, dataset_manifest, prepare_dataset
from .training import MODELS_DIR


def _read_manifest(path: Path) -> dict:
    return json.loads(path.read_text())


def model_registry() -> list[dict]:
    registry = []
    if not MODELS_DIR.exists():
        return registry
    for manifest_path in MODELS_DIR.glob("*/manifest.json"):
        try:
            manifest = _read_manifest(manifest_path)
            model_path = manifest_path.parent / manifest["model_file"]
            integrity_ok = hashlib.sha256(model_path.read_bytes()).hexdigest() == manifest.get("model_sha256")
            registry.append(
                {
                    "model_version": manifest["model_version"],
                    "status": manifest["status"] if integrity_ok else "integrity_failed",
                    "endpoint": manifest["metrics"]["endpoint"],
                    "algorithm": manifest["metrics"]["selected_algorithm"],
                    "trained_at_utc": manifest["training"]["trained_at_utc"],
                    "eligible_for_reliable_prediction": bool(integrity_ok) and manifest["metrics"][
                        "eligible_for_reliable_prediction"
                    ],
                    "integrity_verified": integrity_ok,
                    "test_metrics": manifest["metrics"]["test_metrics"],
                }
            )
        except (OSError, KeyError, ValueError, json.JSONDecodeError):
            continue
    return sorted(registry, key=lambda entry: entry["trained_at_utc"], reverse=True)


def latest_manifest_path() -> Path | None:
    manifests = list(MODELS_DIR.glob("*/manifest.json")) if MODELS_DIR.exists() else []
    if not manifests:
        return None
    valid = []
    for path in manifests:
        try:
            manifest = _read_manifest(path)
            valid.append((manifest.get("training", {}).get("trained_at_utc", ""), path))
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    return max(valid, default=(None, None), key=lambda item: item[0])[1]


@lru_cache(maxsize=1)
def _load_model():
    manifest_path = latest_manifest_path()
    if manifest_path is None:
        return None
    manifest = _read_manifest(manifest_path)
    model_path = manifest_path.parent / manifest["model_file"]
    digest = hashlib.sha256(model_path.read_bytes()).hexdigest()
    if digest != manifest.get("model_sha256"):
        raise RuntimeError("The stored model hash does not match its training manifest.")
    model = joblib.load(model_path)  # Only load the hash-verified, locally trained artifact.
    return manifest, model


def clear_research_caches():
    _load_model.cache_clear()
    _known_compounds.cache_clear()


@lru_cache(maxsize=1)
def _known_compounds() -> dict[str, dict]:
    if not DATASET_PATH.exists():
        return {}
    frame, _ = prepare_dataset(DATASET_PATH.read_bytes())
    known = {}
    for _, row in frame.iterrows():
        def numeric(field):
            value = pd.to_numeric(row.get(field), errors="coerce")
            return float(value) if pd.notna(value) else None

        known[row["canonical_smiles"]] = {
            "cid": int(row["PUBCHEM_CID"]),
            "outcome": row["PUBCHEM_ACTIVITY_OUTCOME"],
            "activity_score": numeric("PUBCHEM_ACTIVITY_SCORE"),
            "normalized_mean_inhibition_pct_at_2um": numeric("CS_%Inh"),
            "replicate_sd_pct": numeric("CS_StdDev"),
            "replicates": numeric("CS_N"),
            "ic50_um": numeric("DR_IC50"),
            "ic50_qualifier": row.get("DR_Qualifier") if pd.notna(row.get("DR_Qualifier")) else None,
            "source": f"PubChem BioAssay AID {1288}",
        }
    return known


def describe_structure(value: str, representation: str = "smiles") -> dict:
    molecule, canonical = standardize_structure(value, representation)
    try:
        inchi_key = __import__("rdkit.Chem.inchi", fromlist=["MolToInchiKey"]).MolToInchiKey(molecule)
    except Exception:
        inchi_key = None
    return {
        "representation": representation,
        "canonical_smiles": canonical,
        "inchi_key": inchi_key,
        "descriptors": descriptors(molecule),
        "descriptor_note": (
            "These are calculated 2D RDKit descriptors, not experimentally measured properties "
            "or biological responses."
        ),
    }


def search_pubchem(query: str) -> list[dict]:
    if not query or len(query.strip()) > 100:
        raise ValueError("Search terms must contain 1–100 characters.")
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"
        f"{quote(query.strip(), safe='')}/property/"
        "MolecularFormula,ConnectivitySMILES,IUPACName,MolecularWeight/JSON"
    )
    try:
        with httpx.Client(
            timeout=httpx.Timeout(12.0, connect=5.0),
            follow_redirects=True,
            headers={"User-Agent": "Rescue-on-Chip Research Prototype (PubChem PUG REST)"},
        ) as client:
            response = client.get(url)
            if response.status_code == 404:
                return []
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (400, 404):
            return []
        raise RuntimeError("PubChem is temporarily unavailable; try the structure input directly.") from exc
    except (httpx.TimeoutException, httpx.RequestError, ValueError) as exc:
        raise RuntimeError("Could not retrieve a PubChem result; try again shortly.") from exc
    rows = data.get("PropertyTable", {}).get("Properties", [])
    return [
        {
            "cid": int(row["CID"]),
            "molecular_formula": row.get("MolecularFormula"),
            "canonical_smiles": row.get("ConnectivitySMILES"),
            "iupac_name": row.get("IUPACName"),
            "molecular_weight_da": row.get("MolecularWeight"),
            "source": "PubChem PUG REST",
        }
        for row in rows[:10]
        if row.get("CID") is not None
    ]


def predict_structure(value: str, representation: str = "smiles") -> dict:
    molecule, canonical = standardize_structure(value, representation)
    result = {
        "canonical_smiles": canonical,
        "descriptors": descriptors(molecule),
        "endpoint": ENDPOINT,
        "evidence": None,
        "prediction_available": False,
        "exploratory_score": None,
        "score_is_calibrated_probability": False,
        "uncertainty_available": False,
        "model_version": None,
        "applicability": None,
        "nearest_compounds": [],
        "message": "No trained model is available. Experimental evidence lookup remains separate.",
        "physics_integration": "None. Compound scores never alter pressure, flow, viscosity or permeability.",
    }
    evidence = _known_compounds().get(canonical)
    if evidence:
        result["evidence"] = {
            **evidence,
            "endpoint": ENDPOINT,
            "interpretation": (
                "Direct assay record; this is experimental evidence, not a model prediction. "
                "A hit label is not a clinical efficacy or safety result."
            ),
        }
        result["message"] = "Exact standardized-structure match: showing the measured PubChem assay record."
        return result

    loaded = _load_model()
    if loaded is None:
        return result
    manifest, artifact = loaded
    result["model_version"] = manifest["model_version"]
    fp = fingerprint(molecule)
    train_vectors = []
    for row in artifact["train_fingerprint_matrix"]:
        vector = DataStructs.ExplicitBitVect(int(artifact["fingerprint_bits"]))
        for bit in np.flatnonzero(row):
            vector.SetBit(int(bit))
        train_vectors.append(vector)
    query_vector = DataStructs.ExplicitBitVect(int(artifact["fingerprint_bits"]))
    for bit in np.flatnonzero(fp):
        query_vector.SetBit(int(bit))
    similarities = DataStructs.BulkTanimotoSimilarity(query_vector, train_vectors)
    nearest_indices = np.argsort(similarities)[::-1][:3]
    nearest_tanimoto = float(similarities[int(nearest_indices[0])])
    result["applicability"] = {
        "nearest_training_tanimoto": nearest_tanimoto,
        "training_oof_tenth_percentile_floor": float(artifact["similarity_floor"]),
        "within_heuristic_domain": nearest_tanimoto >= float(artifact["similarity_floor"]),
        "domain_note": "A training-derived similarity heuristic, not a validated applicability guarantee.",
    }
    for index in nearest_indices:
        result["nearest_compounds"].append(
            {
                "cid": int(artifact["train_cids"][index]),
                "outcome": "Active" if int(artifact["train_labels"][index]) else "Inactive",
                "tanimoto": float(similarities[int(index)]),
                "source": "PubChem AID 1288 training subset",
            }
        )
    if nearest_tanimoto < float(artifact["similarity_floor"]):
        result["message"] = "Prediction unavailable or unreliable — outside validated model applicability domain."
        result["applicability"]["abstained"] = True
        return result

    score = float(artifact["model"].predict_proba(feature_vector(molecule).reshape(1, -1))[0, 1])
    result["exploratory_score"] = score
    result["applicability"]["abstained"] = True
    result["message"] = (
        "Exploratory score computed, but a reliable vascular prediction is unavailable: this candidate "
        "model failed calibration/validation gates and applies only to a selected historical primary-screen hit set."
    )
    return result


def research_overview() -> dict:
    manifest_path = latest_manifest_path()
    return {
        "dataset": dataset_manifest(),
        "models": model_registry(),
        "latest_model": _read_manifest(manifest_path) if manifest_path else None,
        "prediction_policy": (
            "Experimental assay matches are displayed as evidence. New-structure scores are uncalibrated "
            "and currently unreliable; out-of-domain compounds are explicitly abstained. No model output "
            "is connected to the fluid simulation."
        ),
    }


def training_log() -> list[str]:
    manifest_path = latest_manifest_path()
    if not manifest_path:
        return []
    path = manifest_path.parent / "training.log"
    return path.read_text().splitlines() if path.exists() else []
