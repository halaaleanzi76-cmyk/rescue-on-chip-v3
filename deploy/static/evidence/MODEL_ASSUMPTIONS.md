# Model assumptions — Rescue-on-Chip (engine bench-1.0.2)
Generated 2026-11-26 19:24 UTC from the running engine. Source: `artifacts/api-server/simulation/engine.py`.

## Equations
- `Q = N_open π r⁴ ΔP / (8 μ L) [m³/s]; 1 m³/s = 6×10¹⁰ µL/min`
- `R_h = 8 μ L / (N π r⁴); τ_wall = ΔP r / (2 L); Re = ρ u (2r) / μ, ρ assumed 1000 kg/m³`
- `ΔP_switch(t) = ΔP₀ [1 + (offset/100) exp(−wait/τ) exp(−(t−t_switch)/τ)]`
- `Stop-flow model: inlet pressure = 0 during interruption, then baseline plus a decaying offset`
- `dC_old/dt = −max(Q,0) C_old / V_dead; μ_mix = C_old μ_ref + (1−C_old) μ_alt`
- `J = P A (C_d−C_a); V_l dC_d/dt = Q(C_in−C_d)−J; V_a dC_a/dt = J`
- `Virtual-chip mean 95% interval = mean ± t(0.975,n−1) SD/√n; assumed radius CV only`
- `F = [(F1V0+F1V1)−(F0V0+F0V1)]/2; V = [(F0V1+F1V1)−(F0V0+F1V0)]/2; F×V = F1V1−F1V0−F0V1+F0V0`

## Assumptions (verbatim from the engine output)
1. Proposal §§5–9 specifies experimental design and provisional ≤5% pressure/carryover targets, but contains no calibrated equations or measured datasets.
2. Hagen–Poiseuille flow: straight rigid circular, identical parallel channels; incompressible Newtonian fluid, no-slip laminar flow. Not an RBC/capillary or thrombotic model.
3. Pressure transients are user-prescribed exponential RC relaxations, not a solved manifold geometry or measured controller performance. Equalization attenuates offset by exp(−wait/τ); a comparator may be equally good or better.
4. Washout is a perfectly mixed dead-volume model: dC_old/dt = −Q_positive C_old/V_dead. Viscosity is linearly mixed. Backflow is flagged but reverse-flow composition is not resolved.
5. 2×2 arms are independent virtual chips with seeded lognormal radius variation only. Student-t intervals quantify assumed simulation variability, not biological evidence, statistical power or mixed-effects batch analysis.
6. Injury is user-assumed radius narrowing, loss of open channels and a prescribed permeability multiplier. No injury induction, cell viability, BBB damage or clinical response is predicted.
7. Rescue is an optional assumed reversal of geometry (0–1), not therapeutic efficacy. Permeability is held unchanged by rescue; barrier preservation cannot be inferred.
8. Barrier traces solve two well-mixed compartments with continuous donor supply and prescribed permeability, common reference geometry/flow. They do not correct real assay data for pressure, filtration, binding or photobleaching.
9. Pressure targets are checked on one deterministic nominal switch per topology, not the proposal's ≥95% of experimentally successful switches. Carryover is assessed at the configured run end; flush volume is reported.
10. All defaults except proposal endpoint targets and illustrative six chips per arm are engineering assumptions requiring laboratory calibration. Not for diagnosis, patient connection or treatment.
11. Planned barrier criterion only: injury-matched reference permeability × (1 + 10%) = 0.033 µm/s. This user-selected margin is reported for experimental planning, not evaluated as a biological rescue outcome.

## What the model does NOT predict
Injury induction, cell viability, blood–brain-barrier damage or preservation, drug efficacy, or any clinical outcome.
Permeability and "rescue" are user-prescribed inputs.

## Reference configuration (defaults)
| Parameter | Value |
|---|---|
| `name` | Pressure-equilibrated crossover |
| `seed` | 42 |
| `replicates` | 6 |
| `pressure_pa` | 1000.0 |
| `radius_um` | 25.0 |
| `length_mm` | 10.0 |
| `channels` | 16 |
| `viscosity_mpas` | 1.2 |
| `altered_viscosity_ratio` | 1.8 |
| `narrowing_pct` | 20.0 |
| `occlusion_pct` | 15.0 |
| `radius_cv_pct` | 3.0 |
| `duration_s` | 60.0 |
| `switch_s` | 10.0 |
| `offset_pct` | 25.0 |
| `regulated_tau_s` | 2.0 |
| `equalized_tau_s` | 2.0 |
| `regulated_wait_s` | 0.0 |
| `equalization_s` | 5.0 |
| `stop_duration_s` | 1.5 |
| `dead_volume_ul` | 0.1 |
| `permeability_um_s` | 0.01 |
| `injury_permeability_ratio` | 3.0 |
| `receiver_volume_ul` | 1.0 |
| `rescue_fraction` | 0.0 |
| `barrier_margin_pct` | 10.0 |
