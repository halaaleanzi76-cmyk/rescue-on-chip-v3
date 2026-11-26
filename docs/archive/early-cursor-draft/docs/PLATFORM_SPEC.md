# Rescue-on-Chip Virtual Lab — Platform Specification

> Source: *Neuro-Reflow Rescue 3.0 — Rescue-on-Chip* research proposal (22 Nov 2026).
> The platform is an **in-silico twin** of the proposed apparatus, for planning experiments, teaching,
> pitching to the supervising physician / funders, and stress-testing the design before any bench work.
> Research simulation only.

## 1. Product vision
"Run the whole proposal before buying a single valve." Users design the 2x2 crossover, pick a manifold
(A stop-flow / B pressure-controlled / C equalization), watch the chips perfuse live, inject failures,
and get publication-style statistics and a two-axis verdict (flow ✔ + barrier ✔).

## 2. Users & roles
| Role | Can |
|---|---|
| ADMIN (PI) | everything, unblind, lock preregistration, manage users |
| RESEARCHER | create experiments, run simulations, edit library |
| REVIEWER (statistician / physician) | view, comment, unblind for analysis |
| VIEWER (funder / student) | read-only, guided tour |

## 3. Pages & features

### 3.1 Mission Control (dashboard) — `/`
- Hero KPI tiles: runs this week, % switches within ±5 %, mean carryover, safety events, PASS verdicts.
- "Readiness radar" (from proposal §17): clinical need, novelty, inventive step, bench implementability, clinical value.
- Recent experiments with status pills; quick "New 2x2 experiment" button.
- Milestone timeline (0–12 months) with SAR budget bars (min–max ranges).

### 3.2 Live Virtual Lab (digital twin) — `/lab`  ⭐ signature feature
- Animated SVG schematic of Figure 1: Reservoir A/B → manifold → Chip 1/Chip 2 → readouts.
  Particles flow through tubing; speed ∝ simulated flow; occluded channels turn red; bubbles drawn as circles.
- Controls: driving pressure slider, perfusate, vessel condition, manifold, intervention, seed.
- State stepper **S0 → S1 → S2 → S3 → S4** with the "required checks" from proposal §5 ticking green/red.
- Real-time charts (Recharts, streaming): inlet pressure %, flow µL/min, BBB permeability, viability.
- **Chaos mode**: buttons to inject Bubble, Valve leak, Pressure spike, Viscosity mismatch → see interlocks fire
  and the run abort, with an explanation card citing the failure-mode table (§10).
- "Explain what happened" — AI assistant (optional, Claude API) summarises the run in Arabic/English.

### 3.3 Experiment Wizard — `/experiments/new`
Step 1 Type (Bench, Viscosity, 2x2 Crossover, Rescue Screen, Robustness, Falsification A/B/C, Sweep) →
Step 2 Arms (visual 2x2 matrix builder, drag interventions onto the Altered+Injured cell) →
Step 3 Replicates & randomization (chips auto-allocated across fabrication batches, blind codes generated) →
Step 4 Preregistration (primary endpoint, contrast, BBB margin, targets; **Lock** = SHA-256 hash) →
Step 5 Run (progress bar, worker-based, writes Runs/Endpoints/Events to DB).

### 3.4 Experiment Results — `/experiments/[id]`
- 2x2 heat-matrix (Figure 2 style) coloured by mean endpoint, click a cell → replicate list.
- Effect plot: F, V, F×V with bootstrap 95 % CIs (forest plot).
- Two-axis scatter: Δ perfusion (x) vs permeability ratio (y), quadrants labelled PASS / FALSE EFFICACY / FAIL.
- Per-run drill-down: pressure & flow traces, state timeline, safety events.
- Blinded view until unblinded (audit logged).
- Export: CSV, JSON, PNG charts, **auto-generated PDF report** (methods, preregistration hash, results, caveats).
- Comment thread for reviewers.

### 3.5 Manifold Arena (falsification §9) — `/arena`
- Side-by-side live race of A vs B vs C over N switches: overlaid pressure transients, % within ±5 %,
  carryover, bubbles, reversals. Big verdict banner: "C outperforms B?" ✔/✘ (the decisive comparator).
- Sliders for dead volume, τ, residual offset → instant re-run; users can try to make C fail.

### 3.6 Library — `/library`
CRUD for Perfusate profiles, Vessel conditions (injury types from §15 Q1: microemboli, swelling,
pericyte constriction, neutrophil plugging, combined), Manifold designs, Intervention classes, Chip batches & chips
(retire chips, see run history per chip).

### 3.7 Monte-Carlo & Sensitivity — `/sweep`
- Choose 1–2 parameters and ranges → heatmap of an endpoint (e.g. % switches within target vs dead volume × τ).
- Tornado chart: which parameter moves the verdict most.
- Power estimator: replicates per arm vs probability of detecting F×V (simulation-based power).

### 3.8 Readiness & Project — `/readiness`
Evidence table (§17), prior-art list (§11) with links, IP-gate checklist (§12), questions for the physician (§15),
ethics/biosafety checklist (§16), milestones & budget tracker (§14).

### 3.9 Learn — `/learn`
Interactive explainer of no-reflow, BBB, Poiseuille r⁴ law (slider: shrink radius 10 % → flow −34 %),
2x2 logic, and why pressure artefacts can fake BBB injury. Guided onboarding tour.

## 4. Extra "wow" ideas (backlog)
- Shareable run links: `/lab?seed=…&cfg=…` reproduces any run exactly.
- 3D chip view (react-three-fiber) of the microchannel network.
- Realtime collaboration (Supabase Realtime): see colleagues' runs appear live.
- Notebook mode: markdown + embedded live charts per experiment.
- Public API (`/api/v1/runs`) with API keys for Python/R analysis.
- Dark "lab at night" theme + light clinical theme.
- Achievement badges for students (first PASS, survived chaos mode…).

## 5. Data model
See `prisma/schema.prisma`. Key chain: Project → Experiment → ExperimentArm (perfusate, vessel, manifold, intervention)
→ Run (chip, seed) → RunTrace + StateTransition[] + SafetyEvent[] + EndpointResult; Experiment → AnalysisResult[],
Preregistration; AuditLog everywhere.

## 6. Non-functional
- A 2x2 × 6 replicate experiment (24 runs) completes in < 2 s in the browser.
- Lighthouse ≥ 90, works on mobile (Lab collapses to tabs).
- Seeded reproducibility: same seed + engineVersion ⇒ identical results (tested).
