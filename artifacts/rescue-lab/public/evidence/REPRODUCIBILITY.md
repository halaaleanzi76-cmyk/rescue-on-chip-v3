# Reproducibility
Generated 2026-11-26 19:24 UTC. Engine `bench-1.0.2` · validation suite `validation-suite-1.0.0` · Python 3.12.10 · NumPy 2.5.5 · SciPy 1.18.1.

## Determinism
Every run is fully determined by its configuration and seed. The SHA-256 fingerprint = hash(model version + canonical JSON config);
the same config + seed reproduces a byte-identical result (checked automatically in the validation suite).

## Reproduce everything (Windows, PowerShell)
```
.\start.ps1                                         # database, API, web app
.venv\Scripts\python.exe scripts\generate_evidence_package.py   # this package
.venv\Scripts\python.exe REAL_WORLD_VALIDATION_EVIDENCE\runs\run_verification.py
powershell -File scripts\windows\test-all.ps1      # all test suites incl. browser E2E
```
## In the web app
- Scientific Validation → "Re-run all tests now" executes the same suite on the server.
- Research Simulation → any saved run exports HTML, trace CSV and full reproducibility JSON.
