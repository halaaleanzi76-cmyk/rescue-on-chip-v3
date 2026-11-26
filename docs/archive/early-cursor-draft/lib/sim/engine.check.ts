// Sanity checks for the simulation engine. Run: node lib/sim/engine.check.ts
import assert from "node:assert/strict";
import { simulateRun, defaultConfig, PRESETS, analyze2x2, twoAxisVerdict, compareManifolds, type FluidKind, type VesselKind } from "./engine.ts";

// 1) Determinism: same seed → identical result
const a = simulateRun(defaultConfig({ seed: 42 }));
const b = simulateRun(defaultConfig({ seed: 42 }));
assert.deepEqual(a, b, "same seed must reproduce");

// 2) Falsification experiment: C should beat B should beat A on switching artefact
const cmp = compareManifolds(200);
console.log("Manifold comparison:", cmp);
assert.ok(cmp.C.meanPeak_pct < cmp.B.meanPeak_pct && cmp.B.meanPeak_pct < cmp.A.meanPeak_pct);
assert.ok(cmp.C.withinTarget_pct >= 95, "C should meet ≤5% deviation in ≥95% of switches");
assert.ok(cmp.C.carryover_pct <= 5 && cmp.A.carryover_pct > 5);

// 3) 2x2 crossover: fluid, vessel and interaction effects on occlusion must all be positive
const rows: { fluid: FluidKind; vessel: VesselKind; value: number }[] = [];
let seed = 1000;
for (const fluid of ["REFERENCE", "ALTERED"] as const)
  for (const vessel of ["INTACT", "INJURED"] as const)
    for (let i = 0; i < 6; i++) {
      const res = simulateRun(defaultConfig({
        seed: seed++,
        perfusate: fluid === "REFERENCE" ? PRESETS.perfusates.reference : PRESETS.perfusates.altered,
        vessel: vessel === "INTACT" ? PRESETS.vessels.intact : PRESETS.vessels.injured,
      }));
      rows.push({ fluid, vessel, value: res.endpoints.occlusionFraction });
    }
const an = analyze2x2(rows);
console.log("2x2 occlusion effects:", an.effects);
assert.ok(an.effects.F.ci95[0] > 0 && an.effects.V.ci95[0] > 0 && an.effects.FxV.estimate > 0);

// 4) Two-axis verdict: anti-adhesion passes, aggressive lytic flagged as false efficacy
const arm = (iv: typeof PRESETS.interventions.vehicle, s: number) =>
  Array.from({ length: 6 }, (_, i) => simulateRun(defaultConfig({
    seed: s + i, perfusate: PRESETS.perfusates.altered, vessel: PRESETS.vessels.injured, intervention: iv,
  })).endpoints);
const veh = arm(PRESETS.interventions.vehicle, 5000);
const good = twoAxisVerdict(arm(PRESETS.interventions.antiAdhesion, 6000), veh);
const bad = twoAxisVerdict(arm(PRESETS.interventions.aggressive, 7000), veh);
console.log("Anti-adhesion:", good, "\nAggressive:", bad);
assert.equal(good.verdict, "PASS");
assert.equal(bad.verdict, "FALSE_EFFICACY_RISK");

console.log("\n✅ All engine checks passed");
