"""Single-worker, rate-limited training-job state for the research prototype."""
from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .service import clear_research_caches
from .training import train_model
from .dataset import SERVICE_ROOT

STATE_PATH = SERVICE_ROOT / "research" / "training_status.json"
_lock = threading.RLock()
_active = False
_last_start_monotonic = 0.0
_state = None
_COOLDOWN_SECONDS = 600


def _utc_now():
    return datetime.now(timezone.utc).isoformat()


def _persist():
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(_state, indent=2, allow_nan=False))
    temporary.replace(STATE_PATH)


def get_state() -> dict:
    global _state
    with _lock:
        if _state is None:
            if STATE_PATH.exists():
                try:
                    _state = json.loads(STATE_PATH.read_text())
                except (OSError, ValueError):
                    _state = None
            if _state is None:
                _state = {
                    "status": "idle",
                    "training_id": None,
                    "started_at_utc": None,
                    "updated_at_utc": _utc_now(),
                    "model_version": None,
                    "log": [],
                    "error": None,
                }
        return dict(_state)


def _worker(training_id: str):
    global _active, _state

    def progress(message: str):
        with _lock:
            _state["log"].append(message)
            _state["updated_at_utc"] = _utc_now()
            _persist()

    try:
        result = train_model(force_refresh=True, progress=progress)
        with _lock:
            _state.update(
                status="completed",
                model_version=result["model_version"],
                updated_at_utc=_utc_now(),
                log=result["log"],
                error=None,
            )
            _persist()
        clear_research_caches()
    except Exception as exc:
        progress(f"Training failed: {type(exc).__name__}: {exc}")
        with _lock:
            _state.update(status="failed", error=str(exc), updated_at_utc=_utc_now())
            _persist()
    finally:
        with _lock:
            _active = False


def start_training() -> dict:
    global _active, _last_start_monotonic, _state
    with _lock:
        now = time.monotonic()
        if _active:
            return dict(_state)
        if _last_start_monotonic and now - _last_start_monotonic < _COOLDOWN_SECONDS:
            remaining = int(_COOLDOWN_SECONDS - (now - _last_start_monotonic))
            raise RuntimeError(f"Training is rate-limited in this shared research lab; retry in {remaining} seconds.")
        _active = True
        _last_start_monotonic = now
        _state = {
            "status": "running",
            "training_id": str(uuid4()),
            "started_at_utc": _utc_now(),
            "updated_at_utc": _utc_now(),
            "model_version": None,
            "log": ["Training job accepted; progress will reflect actual pipeline stages."],
            "error": None,
        }
        _persist()
        thread = threading.Thread(target=_worker, args=(_state["training_id"],), daemon=True)
        thread.start()
        return dict(_state)
