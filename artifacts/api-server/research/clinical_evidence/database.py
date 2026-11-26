"""Read-only, bounded queries over the public clinical-evidence SQLite store."""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import quote


DATABASE_PATH = Path(__file__).resolve().parent / "clinical_evidence_sources.sqlite"
TABLES = (
    "source_catalog",
    "clinical_trials",
    "clinical_outcomes",
    "fda_labels",
    "safety_signals",
    "studies_evidence",
    "model_registry",
    "external_validations",
    "expert_reviews",
    "fetch_log",
)

NOT_COVERED = [
    "No patient-level records or patient-specific treatment decisions are included.",
    "A trial registry entry or product label does not establish benefit for a new indication.",
    "No evidence of an aspirin effect on Rescue-on-Chip, BBB injury, neuro-reflow, or microfluidic flow was imported.",
    "FAERS spontaneous-report counts are not incidence rates, comparative risks, or causal evidence.",
    "Only the exact products and indications in the retrieved FDA label records can be reviewed; other indications were not assessed.",
]


@contextmanager
def _connect(path: Path = DATABASE_PATH):
    uri = f"file:{quote(str(path.resolve()), safe='/')}?mode=ro"
    connection = sqlite3.connect(uri, uri=True, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only=ON")
    try:
        yield connection
    finally:
        connection.close()


def _decode_list(value) -> list[str]:
    try:
        data = json.loads(value or "[]")
        return [str(item) for item in data] if isinstance(data, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def _clip(value, limit: int) -> str:
    return str(value or "")[:limit]


def evidence_overview(path: Path = DATABASE_PATH) -> dict:
    with _connect(path) as db:
        sources = [
            dict(row)
            for row in db.execute(
                """
                SELECT s.source_id, s.name, s.domain, s.access_mode, s.official_url,
                       s.api_base, s.contents, s.critical_limitations,
                       s.integration_state, f.request_url AS latest_request_url,
                       f.fetched_at AS latest_fetched_at,
                       f.http_status AS latest_http_status,
                       f.count_records AS latest_record_count,
                       f.response_sha256 AS latest_response_sha256,
                       f.outcome AS latest_outcome
                FROM source_catalog AS s
                LEFT JOIN fetch_log AS f
                  ON f.fetch_id = (
                    SELECT MAX(f2.fetch_id) FROM fetch_log AS f2
                    WHERE f2.source_id = s.source_id
                  )
                ORDER BY s.source_id
                """
            )
        ]
        counts = {
            table: int(db.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0])
            for table in TABLES
        }
        policy = db.execute(
            """SELECT classification, patient_specific_recommendations_allowed,
                      safety_efficacy_claims_allowed
               FROM clinical_use_policy WHERE policy_id=1"""
        ).fetchone()
        if policy is None:
            raise RuntimeError("Research-only clinical-use policy is missing.")
        return {
            "sources": sources,
            "table_counts": counts,
            "clinical_use_classification": policy["classification"],
            "patient_specific_recommendations_allowed": bool(
                policy["patient_specific_recommendations_allowed"]
            ),
            "safety_efficacy_claims_allowed": bool(policy["safety_efficacy_claims_allowed"]),
        }


def search_evidence(query: str, path: Path = DATABASE_PATH) -> dict:
    term = query.strip()
    if not term or len(term) > 100 or any(ord(char) < 32 for char in term):
        raise ValueError("Search text must contain 1–100 printable characters.")
    escaped = term.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"

    with _connect(path) as db:
        trials = []
        for row in db.execute(
            """
            SELECT t.nct_id, t.query_compound, t.study_title, t.overall_status, t.phase,
                   t.enrollment, t.intervention_names_json, t.condition_names_json,
                   t.has_posted_results, t.record_url, t.source_version_date,
                   t.fetched_at, t.raw_sha256,
                   (SELECT COUNT(*) FROM clinical_outcomes AS o WHERE o.nct_id=t.nct_id) AS outcome_count
            FROM clinical_trials AS t
            WHERE lower(t.query_compound) LIKE ? ESCAPE char(92)
               OR lower(COALESCE(t.study_title,'')) LIKE ? ESCAPE char(92)
               OR lower(COALESCE(t.intervention_names_json,'')) LIKE ? ESCAPE char(92)
               OR lower(COALESCE(t.condition_names_json,'')) LIKE ? ESCAPE char(92)
            ORDER BY t.has_posted_results DESC, t.nct_id
            LIMIT 20
            """,
            (pattern, pattern, pattern, pattern),
        ):
            item = dict(row)
            item["intervention_names"] = _decode_list(item.pop("intervention_names_json"))
            item["condition_names"] = _decode_list(item.pop("condition_names_json"))
            item["has_posted_results"] = bool(item["has_posted_results"])
            trials.append(item)

        labels = []
        for row in db.execute(
            """
            SELECT label_key, query_compound, effective_time, drug_names_json,
                   indications_text, warnings_text, contraindications_text,
                   adverse_reactions_text, clinical_studies_text, source_url,
                   fetched_at, raw_sha256
            FROM fda_labels
            WHERE lower(query_compound) LIKE ? ESCAPE char(92)
               OR lower(COALESCE(drug_names_json,'')) LIKE ? ESCAPE char(92)
               OR lower(COALESCE(indications_text,'')) LIKE ? ESCAPE char(92)
            ORDER BY effective_time DESC
            LIMIT 20
            """,
            (pattern, pattern, pattern),
        ):
            item = dict(row)
            item["drug_names"] = _decode_list(item.pop("drug_names_json"))
            for field in (
                "indications_text",
                "warnings_text",
                "contraindications_text",
                "adverse_reactions_text",
                "clinical_studies_text",
            ):
                item[field] = _clip(item[field], 2400)
            labels.append(item)

        signals = [
            {
                **dict(row),
                "interpretation": (
                    "Spontaneous report count only; not an incidence rate, causal finding, "
                    "comparative risk, or safety conclusion."
                ),
            }
            for row in db.execute(
                """
                SELECT query_compound, signal_name, report_count, source, fetched_at, search_query
                FROM safety_signals
                WHERE lower(query_compound) LIKE ? ESCAPE char(92)
                   OR lower(COALESCE(signal_name,'')) LIKE ? ESCAPE char(92)
                ORDER BY report_count DESC
                LIMIT 20
                """,
                (pattern, pattern),
            )
        ]

        fetches = [
            dict(row)
            for row in db.execute(
                """
                SELECT source_id, request_url, fetched_at, http_status, count_records,
                       response_sha256, outcome, detail
                FROM fetch_log
                WHERE lower(request_url) LIKE ? ESCAPE char(92)
                ORDER BY fetch_id DESC
                LIMIT 20
                """,
                (pattern,),
            )
        ]

    return {
        "query": term,
        "trials": trials,
        "labels": labels,
        "safety_signals": signals,
        "fetches": fetches,
        "not_covered": NOT_COVERED,
    }
