# Judge Q&A (answers reference computed outputs, generated 2026-11-26 19:24 UTC)

**Is this clinically validated?** No. Mathematical verification passes (24/24). Independent empirical validation is not currently possible with the available data, and no clinical validation was performed.

**Is the proposed design (C) hard-coded to win?** No. With the reference settings C has the lowest peak deviation (2.05 % vs B 25 %). When B is given a 15 s wait, the engine ranks B first (0.0138 % vs C 2.05 %). With no equalization time C fails the ≤5 % goal (25 %).

**What does the 2×2 crossover show?** Descriptive fluid, vessel and interaction contrasts of simulated virtual chips: Perfusate main effect -3.421 µL/min, Vessel main effect -5.954 µL/min, Interaction (difference-in-differences) 3.039 µL/min. These are consequences of the assumed geometry and viscosity, not biological findings.

**Did anything fail?** Yes — one pre-registered synthetic benchmark (interaction recovery under 3 % chip variability, single seed) exceeded its 5 % tolerance. A post-hoc check across 20 other seeds found no systematic bias; the tolerance ignored sampling error. It is shown as a negative finding.

**What is real data here?** Published clinical numbers (PMID 40160088) are cited as background. No published dataset measures what this model predicts, so none is used as validation.

**What is the next experiment?** A cell-free bench (proposal phase 0): measure inlet pressure transients and washout for A/B/C and compare with these predictions using pre-registered error metrics.

**Why is it valuable before validation?** It defines tolerances and failure conditions before chips are fabricated, so the first wet-lab experiments are designed to falsify the claim efficiently.
