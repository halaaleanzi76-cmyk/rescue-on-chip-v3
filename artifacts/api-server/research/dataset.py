"""Acquisition and audit of the single assay used by the candidate model."""
from __future__ import annotations

import hashlib
import io
import json
import os
import tempfile
from pathlib import Path

import httpx
import pandas as pd

from .chemistry import standardize_structure


SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = SERVICE_ROOT / "research" / "data"
DATASET_PATH = DATA_DIR / "pubchem_aid_1288.csv"
ASSAY_METADATA_PATH = DATA_DIR / "pubchem_aid_1288_metadata.json"
ASSAY_ID = 1288
ASSAY_URL = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/assay/aid/{ASSAY_ID}/CSV"
METADATA_URL = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/assay/aid/{ASSAY_ID}/description/JSON"
ENDPOINT = "Confirmed inhibition of TNF-alpha-induced E-selectin expression in primary HUVEC screen at nominal 2 uM"
USER_AGENT = "Rescue-on-Chip Research Prototype (PubChem PUG REST)"


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _atomic_write(path: Path, content: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".download-")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def fetch_dataset(force: bool = False, progress=None) -> tuple[bytes, dict]:
    if not force and DATASET_PATH.exists() and ASSAY_METADATA_PATH.exists():
        content = DATASET_PATH.read_bytes()
        metadata = json.loads(ASSAY_METADATA_PATH.read_text())
        if metadata.get("csv_sha256") == sha256_bytes(content):
            return content, metadata

    if progress:
        progress("Fetching PubChem BioAssay AID 1288 and its assay protocol.")
    timeout = httpx.Timeout(45.0, connect=10.0)
    headers = {"User-Agent": USER_AGENT, "Accept": "text/csv, application/json"}
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        csv_response = client.get(ASSAY_URL)
        csv_response.raise_for_status()
        content = csv_response.content
        if len(content) > 5_000_000:
            raise ValueError("PubChem returned a dataset larger than the 5 MB prototype limit.")
        metadata_response = client.get(METADATA_URL)
        metadata_response.raise_for_status()
        metadata_json = metadata_response.json()
    containers = metadata_json.get("PC_AssayContainer", [])
    if not containers:
        raise ValueError("PubChem returned no assay metadata for AID 1288.")
    assay = containers[0].get("assay", {}).get("descr", {})
    metadata = {
        "assay_id": ASSAY_ID,
        "assay_name": assay.get("name"),
        "source_name": assay.get("aid_source", {}).get("db", {}).get("name"),
        "source_id": assay.get("aid_source", {}).get("db", {}).get("source_id", {}).get("str"),
        "source_url": f"https://pubchem.ncbi.nlm.nih.gov/bioassay/{ASSAY_ID}",
        "csv_url": ASSAY_URL,
        "metadata_url": METADATA_URL,
        "description": assay.get("description", []),
        "protocol": assay.get("protocol", []),
        "results": assay.get("results", []),
        "comments": assay.get("comment", []),
        "cross_references": assay.get("xref", []),
        "csv_sha256": sha256_bytes(content),
        "metadata_sha256": sha256_bytes(metadata_response.content),
        "retrieved_at_utc": pd.Timestamp.now(tz="UTC").isoformat(),
        "license_note": (
            "The PubChem assay record does not specify a dataset license in its retrieved metadata. "
            "The record is publicly retrievable; verify depositor-specific rights before redistribution "
            "or commercial use. Source attribution is retained."
        ),
    }
    _atomic_write(DATASET_PATH, content)
    _atomic_write(ASSAY_METADATA_PATH, json.dumps(metadata, indent=2).encode("utf-8"))
    return content, metadata


def prepare_dataset(content: bytes) -> tuple[pd.DataFrame, dict]:
    # PubChem's CSV begins with five schema/units/assay-condition rows before
    # the compound records. Do not mistake those metadata rows for molecules.
    frame = pd.read_csv(io.BytesIO(content), skiprows=[1, 2, 3, 4, 5], dtype=str)
    initial_rows = len(frame)
    frame = frame[
        frame["PUBCHEM_ACTIVITY_OUTCOME"].isin(["Active", "Inactive"])
        & frame["PUBCHEM_CID"].notna()
        & frame["PUBCHEM_EXT_DATASOURCE_SMILES"].notna()
    ].copy()
    frame["PUBCHEM_CID"] = frame["PUBCHEM_CID"].astype(int)
    frame["label"] = frame["PUBCHEM_ACTIVITY_OUTCOME"].map({"Inactive": 0, "Active": 1}).astype(int)
    standardized = []
    invalid = 0
    for value in frame["PUBCHEM_EXT_DATASOURCE_SMILES"].astype(str):
        try:
            _, canonical = standardize_structure(value, "smiles")
            standardized.append(canonical)
        except ValueError:
            standardized.append(None)
            invalid += 1
    frame["canonical_smiles"] = standardized
    frame = frame.dropna(subset=["canonical_smiles"])
    conflicting = frame.groupby("canonical_smiles")["label"].nunique()
    conflict_smiles = set(conflicting[conflicting > 1].index)
    duplicate_structures = int(frame.duplicated("canonical_smiles").sum())
    frame = frame[~frame["canonical_smiles"].isin(conflict_smiles)].drop_duplicates("canonical_smiles")
    outcomes = frame["label"].value_counts().to_dict()
    audit = {
        "csv_rows_including_pubchem_metadata": initial_rows,
        "valid_binary_assay_records": int(len(frame)),
        "invalid_or_unparseable_structures": invalid,
        "duplicate_standardized_structures": duplicate_structures,
        "conflicting_label_structures_excluded": len(conflict_smiles),
        "unique_compounds": int(frame["PUBCHEM_CID"].nunique()),
        "active_count": int(outcomes.get(1, 0)),
        "inactive_count": int(outcomes.get(0, 0)),
        "active_prevalence": float(frame["label"].mean()),
    }
    if audit["unique_compounds"] < 100 or audit["active_count"] < 20:
        raise ValueError(
            "AID 1288 is too small after structure validation for even an exploratory split; "
            "do not train a vascular prediction model from this snapshot."
        )
    return frame.reset_index(drop=True), audit


def dataset_manifest() -> dict:
    if not DATASET_PATH.exists() or not ASSAY_METADATA_PATH.exists():
        return {
            "source": "PubChem BioAssay",
            "assay_id": ASSAY_ID,
            "endpoint": ENDPOINT,
            "status": "not downloaded",
        }
    content = DATASET_PATH.read_bytes()
    source = json.loads(ASSAY_METADATA_PATH.read_text())
    frame, audit = prepare_dataset(content)
    return {
        "source": "PubChem BioAssay",
        "assay_id": ASSAY_ID,
        "endpoint": ENDPOINT,
        "assay_name": source["assay_name"],
        "source_name": source["source_name"],
        "source_id": source["source_id"],
        "source_url": source["source_url"],
        "cell_model": "Primary human umbilical vein endothelial cells (HUVEC)",
        "nominal_compound_concentration_um": 2.0,
        "protocol_summary": (
            "Compound pre-incubation 1 hour, followed by 4 hours of 60 ng/mL TNF-alpha challenge; "
            "triplicate normalized percent inhibition is reported for the confirmatory screen."
        ),
        "label_definition": (
            "PubChem Active/Inactive screen outcome; the depositor protocol states that a >30% "
            "inhibition threshold was used in hit selection."
        ),
        "retrieved_at_utc": source["retrieved_at_utc"],
        "csv_sha256": sha256_bytes(content),
        "audit": audit,
        "limitations": [
            "Single historical HUVEC assay and one endpoint; not a general vascular-response measurement.",
            "Compounds were selected from an earlier primary-screen hit set, so the dataset is selection-biased.",
            "The endpoint is a confirmatory assay hit label at 2 uM, not safety, efficacy, clinical outcome, or dose-response.",
            "PubChem metadata does not state a dataset license; verify source-specific rights before redistribution or commercial use.",
        ],
        "redistribution_note": source["license_note"],
    }
