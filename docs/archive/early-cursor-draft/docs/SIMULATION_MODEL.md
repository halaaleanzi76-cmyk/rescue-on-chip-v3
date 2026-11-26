# Simulation Model (engine v0.1) — `lib/sim/engine.ts`

All parameters are **illustrative**, chosen so the model reproduces the qualitative claims of the proposal.
They must be recalibrated against bench data before any conclusion is drawn.

## 1. Microvascular flow — Hagen–Poiseuille
Each chip = `channels` parallel cylindrical microvessels (default 64 × r = 25 µm × L = 10 mm).

R_channel = 8 μ L / (π r⁴) × batchEffect  Q = ΔP · N_open / R_channel

- μ from perfusate viscosity (cP). r reduced by injury: r = r₀ (1 − swelling)(1 − constriction·(1 − reversal)).
- N_open = channels × (1 − occlusionFraction).
- **Perfusion index** = Q / Q_ideal (intact chip, 1 cP, no occlusion) × 100.

## 2. Occlusion (no-reflow)
occlusion = 0.35·particleLoad (blood phase) + (0.03 + 0.14·injured) (vessel wall) + 0.30·particleLoad·injured (interaction) + noise
Rescue (S4): occlusion × (1 − occlusionReduction). A bubble adds +0.08–0.14 (artefactual "false no-reflow").

## 3. Switching transient (S3) by manifold
| Design | Model of inlet pressure deviation after the switch |
|---|---|
| A stop-flow | pressure collapses to 0 for `stopDuration` (τ 0.3 s), then overshoot (offset + 18 %)·e^(−t/τ) |
| B pressure-controlled | offset·e^(−t/τ)·cos(2.2 t) (feedback ringing), offset ≈ 6 ± 3 % |
| C equalization | residual offset ≈ 1.6 % after S2 pre-equalization, first-order settle τ = 0.5 s |
Sensor noise σ = 0.25 %. Per-switch random bubble / reversal with design-specific probabilities.
S2 guard: C passes only if offset ≤ `guardThreshold_pct`. Interlock aborts if |ΔP| > `pressureLimit_pct`.

## 4. Carryover
carryover % = 100 · exp(−V_flush / (1.5 · V_dead)). Default flush 50 µL → A 10.8 %, B 1.6 %, C ≈ 0 %.

## 5. BBB permeability & viability
P_app = N(1, 0.08) · permeabilityMultiplier · interventionPermEffect + 0.035 · max(0, peakΔP − 10)
viability = N(95, 1.5) − 100·injuryPenalty − 100·cytotoxicity − 4 · mechanical
The mechanical term encodes the proposal's concern that pressure spikes can mimic BBB injury.

## 6. Statistics
- **2x2 effects**: F = ½[(AI+AJ) − (RI+RJ)], V = ½[(RJ+AJ) − (RI+AI)], F×V = (AJ − RJ) − (AI − RI); bootstrap 95 % CI (1000 resamples, seeded).
- **Two-axis verdict**: PASS if Δperfusion > 0 AND permeability ratio ≤ 1 + margin (15 %) AND Δviability > −5 %;
  flow improved but barrier/viability worse ⇒ FALSE_EFFICACY_RISK.
- **Falsification**: % of switches with peak deviation ≤ 5 % per design (target ≥ 95 % for C).
- Roadmap: mixed-effects model with chip batch as random effect (proposal §8) — implement server-side later.

## 7. Verified behaviour (`node lib/sim/engine.check.ts`)
Same seed ⇒ identical output · C: 100 % switches ≤ 5 %, B: ~45 %, A: 0 % · F, V, F×V all positive with CIs excluding 0 ·
Anti-adhesion ⇒ PASS · Aggressive lytic ⇒ FALSE_EFFICACY_RISK.
