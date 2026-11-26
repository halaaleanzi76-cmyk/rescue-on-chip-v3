"""Train the auditable PubChem AID 1288 exploratory model."""
from __future__ import annotations

import json

from .training import train_model


def main():
    result = train_model(force_refresh=True, progress=print)
    print(json.dumps({
        "model_version": result["model_version"],
        "model_dir": result["model_dir"],
        "test_metrics": result["metrics"]["test_metrics"],
        "reliable_prediction_eligible": result["metrics"]["eligible_for_reliable_prediction"],
        "reliability_decision": result["metrics"]["reliability_decision"],
    }, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
