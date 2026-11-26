// Seed: library presets + demo project + a fully simulated 2x2 crossover and an A/B/C falsification experiment.
// Run: npx prisma db seed   (package.json → "prisma": { "seed": "tsx prisma/seed.ts" })
import { PrismaClient, type FluidKind, type VesselKind } from "@prisma/client";
import { createHash } from "node:crypto";
import {
  PRESETS, simulateRun, defaultConfig, analyze2x2, twoAxisVerdict, rng,
  type PerfusateParams, type VesselParams, type ManifoldParams, type InterventionParams, type RunResult,
} from "../lib/sim/engine";

const prisma = new PrismaClient();

async function main() {
  // Clean (dev only)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.note.deleteMany(), prisma.analysisResult.deleteMany(),
    prisma.endpointResult.deleteMany(), prisma.safetyEvent.deleteMany(), prisma.stateTransition.deleteMany(),
    prisma.runTrace.deleteMany(), prisma.run.deleteMany(), prisma.preregistration.deleteMany(),
    prisma.experimentArm.deleteMany(), prisma.experiment.deleteMany(), prisma.milestone.deleteMany(),
    prisma.project.deleteMany(), prisma.chip.deleteMany(), prisma.chipBatch.deleteMany(),
    prisma.intervention.deleteMany(), prisma.manifoldDesign.deleteMany(), prisma.vesselCondition.deleteMany(),
    prisma.perfusateProfile.deleteMany(), prisma.user.deleteMany(),
  ]);

  // Users (demo accounts, no passwords — auth handled by Supabase Auth)
  const pi = await prisma.user.create({ data: { email: "pi@demo.local", name: "Principal Investigator", role: "ADMIN" } });
  await prisma.user.create({ data: { email: "engineer@demo.local", name: "Microfluidics Engineer", role: "RESEARCHER" } });
  await prisma.user.create({ data: { email: "stats@demo.local", name: "Statistician", role: "REVIEWER" } });

  // Library
  const perf = {
    reference: await prisma.perfusateProfile.create({ data: { ...PRESETS.perfusates.reference, tracer: "FITC-dextran 4 kDa" } }),
    altered: await prisma.perfusateProfile.create({ data: { ...PRESETS.perfusates.altered, tracer: "FITC-dextran 4 kDa" } }),
  };
  await prisma.perfusateProfile.create({ data: { name: "Viscosity challenge (2.5 cP, no particles)", kind: "ALTERED", viscosity_cP: 2.5, particleLoad: 0 } });

  const ves = {
    intact: await prisma.vesselCondition.create({ data: { ...PRESETS.vessels.intact, injuryType: "NONE" } }),
    injured: await prisma.vesselCondition.create({ data: { ...PRESETS.vessels.injured, injuryType: "OGD" } }),
  };
  await prisma.vesselCondition.create({ data: { name: "Inflammatory (cytokine) injury", kind: "INJURED", injuryType: "INFLAMMATORY", swelling: 0.08, pericyteConstriction: 0.1, permeabilityMultiplier: 2.8, viabilityPenalty: 0.08 } });

  const man: Record<"A" | "B" | "C", { id: string }> = {} as never;
  for (const k of ["A", "B", "C"] as const) man[k] = await prisma.manifoldDesign.create({ data: { ...PRESETS.manifolds[k] } });

  const ivs: Record<string, { id: string }> = {};
  const ivClass: Record<string, string> = { vehicle: "Vehicle", antiConstriction: "Pericyte relaxation", antiAdhesion: "Anti-adhesion", aggressive: "Lytic (demo)" };
  for (const [k, v] of Object.entries(PRESETS.interventions)) ivs[k] = await prisma.intervention.create({ data: { ...v, mechanismClass: ivClass[k] } });

  // Chips: 3 fabrication batches × 24 chips
  const r = rng(2026);
  const chips: { id: string; batchEffect: number; code: string }[] = [];
  for (const [bi, code] of ["FAB-2026-11-A", "FAB-2026-11-B", "FAB-2026-12-A"].entries()) {
    const be = 1 + (r() - 0.5) * 0.1;
    const batch = await prisma.chipBatch.create({ data: { code, fabricatedAt: new Date(2026, 10 + Math.floor(bi / 2), 1 + bi * 7), batchEffect: be } });
    for (let i = 0; i < 24; i++) {
      const c = await prisma.chip.create({ data: { code: `${code}-${String(i + 1).padStart(2, "0")}`, batchId: batch.id, hasPericytes: i % 2 === 0 } });
      chips.push({ id: c.id, batchEffect: be, code: c.code });
    }
  }

  // Project + milestones (proposal §14)
  const project = await prisma.project.create({ data: { name: "Neuro-Reflow Rescue 3.0 — Rescue-on-Chip", description: "Virtual twin of the proposed pressure-stabilized crossover neurovascular platform.", ownerId: pi.id } });
  await prisma.milestone.createMany({ data: [
    { projectId: project.id, title: "Feasibility", deliverable: "Requirements, schematic, simulation, cell-free switching prototype", startMonth: 0, endMonth: 2, budgetMinSAR: 30000, budgetMaxSAR: 80000, done: true },
    { projectId: project.id, title: "Functional model", deliverable: "Chip integration, perfusion verification, barrier assay", startMonth: 2, endMonth: 5, budgetMinSAR: 80000, budgetMaxSAR: 220000 },
    { projectId: project.id, title: "Hypothesis testing", deliverable: "2x2 injury/fluid crossover, initial intervention screen", startMonth: 5, endMonth: 9, budgetMinSAR: 120000, budgetMaxSAR: 350000 },
    { projectId: project.id, title: "Validation", deliverable: "Repeatability, claim chart, manuscript / disclosure dossier", startMonth: 9, endMonth: 12, budgetMinSAR: 60000, budgetMaxSAR: 180000 },
  ] });

  let chipCursor = 0;
  const nextChip = () => chips[chipCursor++ % chips.length];

  async function persistRun(experimentId: string, armId: string, replicate: number, seed: number, res: RunResult, chipId: string) {
    await prisma.run.create({ data: {
      experimentId, armId, chipId, replicate, seed,
      status: res.status, startedAt: new Date(), finishedAt: new Date(),
      trace: { create: { t: res.trace.t, pressure_pct: res.trace.pressure_pct, flow_uL_min: res.trace.flow_uL_min } },
      states: { create: res.states.map((s) => ({ state: s.state, t_s: s.t_s, checksPassed: s.checksPassed, note: s.note })) },
      events: { create: res.events.map((e) => ({ type: e.type, t_s: e.t_s, detail: e.detail, severity: e.type === "INTERLOCK_STOP" || e.type === "BUBBLE" ? "CRITICAL" : "WARNING" })) },
      endpoint: { create: res.endpoints },
    } });
  }

  // ── Experiment 1: 2x2 crossover + rescue arms (manifold C) ──
  const exp1 = await prisma.experiment.create({ data: {
    projectId: project.id, createdById: pi.id, title: "2x2 crossover + rescue screen (demo)", type: "CROSSOVER_2X2",
    status: "COMPLETED", masterSeed: 1001, replicatesPerArm: 6,
    hypothesis: "Blood-phase and vessel-wall causes of no-reflow are separable, and anti-adhesion improves flow without BBB worsening.",
  } });
  const plan = { primaryEndpoint: "perfusionIndex_pct", primaryContrast: "Altered+Injured: intervention vs vehicle", permMargin_pct: 15, targets: { peakDeviation_pct: 5, carryover_pct: 5 } };
  await prisma.preregistration.create({ data: { experimentId: exp1.id, ...plan, contentHash: createHash("sha256").update(JSON.stringify(plan)).digest("hex") } });

  type ArmDef = { label: string; fluid: FluidKind; vessel: VesselKind; ivKey?: keyof typeof PRESETS.interventions };
  const armDefs: ArmDef[] = [
    { label: "Reference + Intact", fluid: "REFERENCE", vessel: "INTACT" },
    { label: "Altered + Intact", fluid: "ALTERED", vessel: "INTACT" },
    { label: "Reference + Injured", fluid: "REFERENCE", vessel: "INJURED" },
    { label: "Altered + Injured", fluid: "ALTERED", vessel: "INJURED" },
    { label: "Altered + Injured + Vehicle", fluid: "ALTERED", vessel: "INJURED", ivKey: "vehicle" },
    { label: "Altered + Injured + Pericyte-relaxing", fluid: "ALTERED", vessel: "INJURED", ivKey: "antiConstriction" },
    { label: "Altered + Injured + Anti-adhesion", fluid: "ALTERED", vessel: "INJURED", ivKey: "antiAdhesion" },
    { label: "Altered + Injured + Aggressive lytic", fluid: "ALTERED", vessel: "INJURED", ivKey: "aggressive" },
  ];
  const crossoverRows: { fluid: FluidKind; vessel: VesselKind; value: number }[] = [];
  const byIv: Record<string, RunResult["endpoints"][]> = {};
  let seed = exp1.masterSeed * 1000;

  for (const [ai, d] of armDefs.entries()) {
    const arm = await prisma.experimentArm.create({ data: {
      experimentId: exp1.id, label: d.label, blindCode: `ARM-${String.fromCharCode(65 + ai)}${(ai * 37) % 90 + 10}`,
      perfusateId: d.fluid === "REFERENCE" ? perf.reference.id : perf.altered.id,
      vesselId: d.vessel === "INTACT" ? ves.intact.id : ves.injured.id,
      manifoldId: man.C.id, interventionId: d.ivKey ? ivs[d.ivKey].id : null,
    } });
    for (let rep = 1; rep <= 6; rep++) {
      const chip = nextChip();
      const s = seed++;
      const res = simulateRun(defaultConfig({
        seed: s,
        perfusate: (d.fluid === "REFERENCE" ? PRESETS.perfusates.reference : PRESETS.perfusates.altered) as PerfusateParams,
        vessel: (d.vessel === "INTACT" ? PRESETS.vessels.intact : PRESETS.vessels.injured) as VesselParams,
        manifold: PRESETS.manifolds.C as ManifoldParams,
        intervention: d.ivKey ? (PRESETS.interventions[d.ivKey] as InterventionParams) : undefined,
        chip: { id: chip.code, channels: 64, radius_um: 25, length_mm: 10, batchEffect: chip.batchEffect },
      }));
      await persistRun(exp1.id, arm.id, rep, s, res, chip.id);
      if (!d.ivKey) crossoverRows.push({ fluid: d.fluid, vessel: d.vessel, value: res.endpoints.occlusionFraction });
      else (byIv[d.ivKey] ??= []).push(res.endpoints);
    }
  }
  await prisma.analysisResult.create({ data: { experimentId: exp1.id, kind: "2x2", metric: "occlusionFraction", result: analyze2x2(crossoverRows) as object } });
  for (const k of ["antiConstriction", "antiAdhesion", "aggressive"]) {
    const v = twoAxisVerdict(byIv[k], byIv.vehicle);
    await prisma.analysisResult.create({ data: { experimentId: exp1.id, kind: "two-axis", metric: `${k} vs vehicle`, result: v as object, verdict: v.verdict as "PASS" | "FAIL" | "FALSE_EFFICACY_RISK" } });
  }

  // ── Experiment 2: falsification A vs B vs C (§9) ──
  const exp2 = await prisma.experiment.create({ data: {
    projectId: project.id, createdById: pi.id, title: "Falsification: stop-flow vs pressure-controlled vs equalization", type: "FALSIFICATION_ABC",
    status: "COMPLETED", masterSeed: 2002, replicatesPerArm: 10, interlockEnabled: false,
  } });
  seed = exp2.masterSeed * 1000;
  for (const k of ["A", "B", "C"] as const) {
    const arm = await prisma.experimentArm.create({ data: {
      experimentId: exp2.id, label: PRESETS.manifolds[k].name, blindCode: `MAN-${k}${k.charCodeAt(0)}`,
      perfusateId: perf.reference.id, vesselId: ves.intact.id, manifoldId: man[k].id,
    } });
    for (let rep = 1; rep <= 10; rep++) {
      const chip = nextChip();
      const s = seed++;
      const res = simulateRun(defaultConfig({ seed: s, manifold: PRESETS.manifolds[k], interlockEnabled: false,
        chip: { id: chip.code, channels: 64, radius_um: 25, length_mm: 10, batchEffect: chip.batchEffect } }));
      await persistRun(exp2.id, arm.id, rep, s, res, chip.id);
    }
  }

  // Draft experiment for the user to run from the UI
  await prisma.experiment.create({ data: { projectId: project.id, createdById: pi.id, title: "My first experiment (draft)", type: "CROSSOVER_2X2", masterSeed: 3003 } });

  await prisma.auditLog.create({ data: { userId: pi.id, action: "seed.complete", entity: "Project", entityId: project.id } });
  console.log("✅ Seed complete:", { chips: chips.length, runs: await prisma.run.count() });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
