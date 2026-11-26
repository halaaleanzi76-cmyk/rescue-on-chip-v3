# Rescue-on-Chip Simulation Lab

A concept-stage scientific workbench for reproducible microfluidic switching, virtual 2 × 2 crossover experiments, and prescribed-permeability tracer transport.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — Python FastAPI service, managed API workflow supplies PORT
- `pnpm --filter @workspace/rescue-lab run dev` — React frontend, managed web workflow supplies PORT and BASE_PATH
- `cd artifacts/api-server && python -m unittest simulation.test_engine -v` — numerical invariants
- `python scripts/check_simulation_workflow.py` — real API create/reload/export/validation checks; saves one clearly named simulated run
- `cd artifacts/api-server && python -m unittest simulation.test_visualization -v` — verify pressure/velocity reconstruction, no-slip profiles, signed motion and original-run immutability
- `python scripts/check_visualization_api.py` — saved-run visualization and stateless preview integration checks; creates no saved experiments
- `cd artifacts/api-server && python -m research.train_vascular_model` — retrieve and genuinely retrain the candidate classifier from PubChem BioAssay AID 1288; not required at API startup
- `cd artifacts/api-server && python -m unittest research.test_research_ai -v` — structure, dataset, artifact-integrity, measured-evidence and held-out inference checks (requires the downloaded dataset/model snapshot)
- `cd artifacts/api-server/research/clinical_evidence && python -m unittest -v` — catalog, additive migration, response hashing, read-only search and imported-record checks
- `cd artifacts/api-server/research/clinical_evidence && python sync_public_evidence.py --compound aspirin --max-studies 10 --max-labels 3 --max-signals 5` — bounded public API smoke import; aspirin is a connectivity example, not a therapeutic recommendation
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Python 3.11 / FastAPI / Pydantic, NumPy / SciPy / Pandas
- Compound research: RDKit, scikit-learn, joblib, official PubChem PUG REST
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/simulation/` — parameter constraints, engine, reports, database access and Python response contracts
- `artifacts/api-server/research/` — PubChem HUVEC assay acquisition, RDKit chemistry and deterministic ETKDG conformers, scaffold-split candidate training, model registry and explicit-abstention inference
- `artifacts/api-server/research/clinical_evidence/` — 21-source catalog, public-only evidence SQLite snapshot, additive fetch-hash migration, network importer, actual import log and verification report
- `artifacts/api-server/research/clinical_evidence/database.py` — bounded, parameterized, read-only evidence search used by `/evidence`
- `artifacts/api-server/main.py` — API entry point, `/api/docs` interactive documentation
- `artifacts/rescue-lab/src/` — frontend application
- `artifacts/rescue-lab/src/components/lab/` — interactive Three.js / React Three Fiber laboratory and quantitative overlays
- `artifacts/api-server/simulation/visualization.py` — analytical pressure/velocity reconstruction from immutable recorded run outputs
- `lib/db/src/schema/simulation-runs.ts` — persisted run schema, structured numerical data in PostgreSQL
- `lib/api-spec/openapi.yaml` — frontend API source contract; regenerate from Python declarations with `python scripts/generate_simulation_contract.py`, then run codegen
- `pyproject.toml` / `uv.lock` — Python dependencies, installed with `uv sync --frozen`

## Architecture decisions

- The user's proposal defines an experimental concept, not a calibrated mathematical model. Standard hydraulics and mass balance provide a defensible bench-level starting point; never present these predictions as experimental evidence.
- Comparator performance is independently configurable. Equalization must not be guaranteed to outperform a known pressure-controlled topology.
- No biological BBB injury, therapeutic efficacy or viability prediction is supported. Permeability is prescribed; optional rescue means assumed geometric reversal only.
- Full reproducibility inputs, seed, model version and numerical-library versions travel with every result. The SHA-256 fingerprint identifies configuration plus model version, not a security signature.
- Scientific numerical arrays are stored as structured PostgreSQL data; downloadable reports are generated on demand, not stored file blobs.
- The 3D apparatus is a conceptual layout, not anatomy or validated CAD. Quantitative fields apply only to straight reference channels: a quasi-steady analytical reconstruction, not CFD.
- Live parameter previews run the same Python engine without persistence. Saving an experiment remains a separate explicit action; historical results must never be overwritten by a preview.
- The clinical-evidence store currently contains only public aggregate records and is queried read-only with parameterized, bounded searches; it must never contain patient-level data.
- The evidence catalog status is per tested integration: ClinicalTrials.gov and the two openFDA endpoints have live HTTP-200 fetches; the remaining entries stay catalog-only unless verified by a real request.
- The evidence database is a development SQLite sidecar. Replit Autoscale filesystems reset on publish/redeploy, so move this schema and imported data into the existing PostgreSQL database before relying on durable production updates or publishing this importer workflow.

## Product

The opening `/` route is the 3D laboratory, with left-side configuration, orbit controls, quantitative color modes, synchronized playback, inspection and cutaway views. `/compare` provides synchronized side-by-side topology or saved-run comparisons. `/research-ai` provides source-attributed compound lookup, deterministic RDKit descriptors and a computed, rotatable 3D conformer, the candidate model's actual training log and validation, and an explicit-abstention inference form. `/evidence` searches only imported public trial, FDA label and report-count records and shows fetch provenance plus per-source connection status. `/analysis` retains the full numerical workbench; `/runs` and `/model` retain history and scientific methods.

Configure geometry, rheology, controller response, switching sequence and virtual-chip variability; compare three switching topologies; inspect a 2 × 2 crossover and descriptive factorial contrasts; inspect tracer transport; reopen saved experiments; export printable HTML, trace CSV and full reproducibility JSON. Live edits request stateless Python previews; only Save experiment adds a stored run.

## User preferences

Use genuine calculations supported by the document's scientific scope; clearly distinguish assumptions and unvalidated models. Preserve the existing Python engine and test the main simulation workflow.

The user explicitly rejected the calculator-style interface. The default experience must be a sophisticated dark, interactive 3D scientific laboratory with a large central viewport, experimental controls, playback and inspection. Numerical analysis supports the 3D laboratory; it must not replace it as the opening screen.

The current compound-screen model uses PubChem BioAssay AID 1288 only. Its HUVEC TNF-alpha/E-selectin endpoint is selected from earlier primary-screen hits, severely imbalanced and too limited for reliable, calibrated vascular predictions; keep the reliability gate closed until suitable external data supports it.

## Gotchas

- Apply development schema with the existing database push command. Never add startup DDL or production migration scripts.
- API report HTML can be printed to PDF; do not advertise a native PDF export.
- Model changes affecting calculations require a model-version bump. Retain historical run outputs rather than recomputing them silently.
- One nominal switch per topology does not establish the proposal's ≥95% experimental success target.
- Time-domain washout uses log concentration to remain stable for large flow-to-dead-volume ratios. Start the post-stop solve at the valve reopening event, not across a discontinuous zero-flow interval.
- 3D particle paths must remain deterministic functions of Python-integrated signed displacement and simulation time, never a free-running decorative clock. Pause, restart, zero flow and reversed flow must remain physically consistent with the supplied traces.
- Do not apply computed channel pressures or velocities to the illustrative reservoirs, fittings or bypass. Those geometries are not solved by the model.
- Molecular descriptors, assay evidence, exploratory scores and flow simulations are distinct result classes. Never silently map a compound score to pressure, flow, viscosity, radius, permeability or another physical parameter.
- The AID 1288 source metadata does not state a dataset license. Preserve attribution and verify depositor rights before redistribution or commercial use.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
