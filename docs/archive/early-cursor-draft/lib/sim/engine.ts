/**
 * Rescue-on-Chip — Virtual Simulation Engine (v0.1)
 * --------------------------------------------------
 * A deterministic (seeded) in-silico model of the Neuro-Reflow Rescue 3.0 platform:
 *   - Dual perfusate input (reference vs altered fluid)
 *   - Switching manifold: A = stop-flow, B = pressure-controlled, C = proposed equalization
 *   - Neurovascular chips (intact vs injured), Poiseuille microchannel network
 *   - Operating states S0..S4, safety interlocks, endpoints, 2x2 crossover analysis
 *
 * RESEARCH / EDUCATIONAL SIMULATION ONLY. Parameters are illustrative, not measured.
 * Pure TypeScript, no dependencies, erasable syntax only (runs with `node file.ts` on Node >= 23).
 */

// ───────────────────────────── Types ─────────────────────────────

export type ManifoldKind = "A_STOP_FLOW" | "B_PRESSURE_CONTROLLED" | "C_EQUALIZATION";
export type FluidKind = "REFERENCE" | "ALTERED";
export type VesselKind = "INTACT" | "INJURED";
export type OperatingState = "S0_BASELINE" | "S1_INJURY" | "S2_PRE_EQUALIZATION" | "S3_CROSSOVER" | "S4_RESCUE";
export type SafetyEventType = "BUBBLE" | "PRESSURE_SPIKE" | "FLOW_REVERSAL" | "INTERLOCK_STOP";

export interface PerfusateParams {
  name: string;
  kind: FluidKind;
  viscosity_cP: number;   // reference medium ~0.9–1.0 cP
  particleLoad: number;   // 0..1 plugging propensity (cells/particles/aggregates)
}

export interface VesselParams {
  name: string;
  kind: VesselKind;
  swelling: number;              // fractional lumen-radius loss from endothelial swelling (0..0.5)
  pericyteConstriction: number;  // fractional radius loss from pericyte constriction (0..0.5)
  permeabilityMultiplier: number;// BBB leak multiplier vs intact (1 = intact)
  viabilityPenalty: number;      // 0..1 fraction of viability lost from injury
}

export interface ManifoldParams {
  name: string;
  kind: ManifoldKind;
  deadVolume_uL: number;     // valve + tubing dead volume → carryover
  tau_s: number;             // pressure recovery time constant
  residualOffset_pct: number;// mean source/inlet mismatch at switch (C: after pre-equalization)
  stopDuration_s: number;    // complete flow interruption (A only)
  bubbleProb: number;        // probability of a bubble reaching the chip per switch
  reversalProb: number;      // probability of transient backflow per switch
}

export interface InterventionParams {
  name: string;
  isVehicle: boolean;
  occlusionReduction: number;   // 0..1 fraction of occluded channels reopened
  constrictionReversal: number; // 0..1 fraction of pericyte constriction relieved
  permeabilityEffect: number;   // multiplier on BBB permeability (>1 harmful)
  cytotoxicity: number;         // 0..1 viability lost
}

export interface ChipParams {
  id: string;
  channels: number;   // parallel microvessels
  radius_um: number;  // nominal lumen radius
  length_mm: number;
  batchEffect: number;// fabrication-batch multiplier on resistance (~1 ± 0.05)
}

export interface RunConfig {
  perfusate: PerfusateParams;
  vessel: VesselParams;
  manifold: ManifoldParams;
  chip: ChipParams;
  intervention?: InterventionParams;
  drivingPressure_mbar: number;
  flushVolume_uL: number;
  duration_s: number;
  dt_s: number;
  switchAt_s: number;
  rescueAt_s: number;
  seed: number;
  guardThreshold_pct: number;   // S2 guard: max allowed pre-switch offset
  pressureLimit_pct: number;    // interlock: abort if |deviation| exceeds this
  interlockEnabled: boolean;
}

export interface SafetyEvent { t_s: number; type: SafetyEventType; detail: string }
export interface StateMark { state: OperatingState; t_s: number; checksPassed: boolean; note: string }

export interface Endpoints {
  peakPressureDeviation_pct: number;
  flowInterruption_s: number;
  flowReversal: boolean;
  carryover_pct: number;
  occlusionFraction: number;       // at end of run
  perfusionIndex_pct: number;      // flow vs ideal intact/reference chip
  flow_uL_min: number;
  permeability_e6_cm_s: number;    // tracer Papp ×1e-6 cm/s
  viability_pct: number;
}

export interface RunResult {
  config: { seed: number; perfusate: string; vessel: string; manifold: ManifoldKind; intervention: string | null; chip: string };
  status: "COMPLETED" | "ABORTED_SAFETY";
  trace: { t: number[]; pressure_pct: number[]; flow_uL_min: number[] };
  states: StateMark[];
  events: SafetyEvent[];
  endpoints: Endpoints;
}

// ───────────────────────────── RNG ─────────────────────────────

/** mulberry32 — tiny seeded PRNG so every run is reproducible from its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(r: () => number, mean = 0, sd = 1): number {
  const u = Math.max(r(), 1e-12);
  const v = r();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

// ───────────────────────────── Physics ─────────────────────────────

/** Hagen–Poiseuille flow through `open` parallel channels, returned in µL/min. */
export function poiseuilleFlow(dp_mbar: number, mu_cP: number, r_um: number, L_mm: number, open: number, batch = 1): number {
  if (open <= 0 || r_um <= 0) return 0;
  const dp = dp_mbar * 100;      // Pa
  const mu = mu_cP * 1e-3;       // Pa·s
  const r = r_um * 1e-6;         // m
  const L = L_mm * 1e-3;         // m
  const R = (8 * mu * L) / (Math.PI * r ** 4) * batch; // Pa·s/m³ per channel
  const q = (dp / R) * open;     // m³/s
  return q * 1e9 * 60;           // µL/min
}

/** Washout model: fraction of previous perfusate left after flushing `flush` µL through `dead` µL. */
export function carryoverPct(flush_uL: number, dead_uL: number): number {
  return 100 * Math.exp(-flush_uL / (dead_uL * 1.5));
}

/**
 * Occlusion fraction from blood-phase (particles), vessel-wall (injury) and their interaction.
 * The interaction term is what the 2x2 crossover is designed to detect.
 */
function baseOcclusion(p: PerfusateParams, v: VesselParams, r: () => number): number {
  const injured = v.kind === "INJURED" ? 1 : 0;
  const blood = 0.35 * p.particleLoad;
  const wall = 0.03 + 0.14 * injured;
  const interaction = 0.3 * p.particleLoad * injured; // plugging is worse in swollen/sticky vessels
  return clamp(normal(r, blood + wall + interaction, 0.025), 0, 0.95);
}

/** Pressure deviation (% of baseline) at time `ts` seconds after the switch. */
function switchDeviation(m: ManifoldParams, ts: number, offset: number, r: () => number): number {
  const noise = normal(r, 0, 0.25);
  if (ts < 0) return noise;
  switch (m.kind) {
    case "A_STOP_FLOW": {
      if (ts < m.stopDuration_s) return -100 * (1 - Math.exp(-ts / 0.3)) + noise; // inlet pressure collapses
      const tr = ts - m.stopDuration_s;
      return (offset + 18) * Math.exp(-tr / m.tau_s) + noise; // reopen overshoot (water-hammer-like)
    }
    case "B_PRESSURE_CONTROLLED":
      return offset * Math.exp(-ts / m.tau_s) * Math.cos(ts * 2.2) + noise; // feedback ringing
    case "C_EQUALIZATION":
      return offset * Math.exp(-ts / m.tau_s) + noise; // pre-equalized: small first-order settle
  }
}

// ───────────────────────────── Run simulation ─────────────────────────────

export function simulateRun(cfg: RunConfig): RunResult {
  const r = rng(cfg.seed);
  const { perfusate: p, vessel: v, manifold: m, chip, intervention: iv } = cfg;
  const events: SafetyEvent[] = [];
  const states: StateMark[] = [];

  // Geometry with injury
  const constriction = v.pericyteConstriction;
  const rPre = chip.radius_um * (1 - v.swelling) * (1 - constriction);
  const rPost = chip.radius_um * (1 - v.swelling) * (1 - constriction * (1 - (iv?.constrictionReversal ?? 0)));

  // Occlusion before/after rescue
  let occPre = baseOcclusion(p, v, r);
  const switchOffset = m.kind === "C_EQUALIZATION"
    ? Math.abs(normal(r, m.residualOffset_pct, m.residualOffset_pct * 0.45))
    : Math.abs(normal(r, m.residualOffset_pct, 3));

  // Per-switch stochastic events
  const bubble = r() < m.bubbleProb;
  const reversal = r() < m.reversalProb;
  if (bubble) {
    occPre = clamp(occPre + 0.08 + r() * 0.06, 0, 0.95); // false no-reflow from gas occlusion
    events.push({ t_s: cfg.switchAt_s + 0.4, type: "BUBBLE", detail: "Gas nucleus reached chip inlet → artefactual occlusion" });
  }
  if (reversal) events.push({ t_s: cfg.switchAt_s + 0.2, type: "FLOW_REVERSAL", detail: "Transient backflow at chip inlet" });

  const occPost = iv ? clamp(occPre * (1 - iv.occlusionReduction) + normal(r, 0, 0.01), 0, 0.95) : occPre;

  // S2 guard check (only meaningful for designs that pre-equalize)
  const guardOk = switchOffset <= cfg.guardThreshold_pct;

  states.push({ state: "S0_BASELINE", t_s: 0, checksPassed: true, note: "Reference baseline, calibrated pressure" });
  states.push({ state: "S1_INJURY", t_s: 0, checksPassed: true, note: v.kind === "INJURED" ? `Pre-applied injury: ${v.name}` : "Sham (intact)" });
  states.push({ state: "S2_PRE_EQUALIZATION", t_s: Math.max(0, cfg.switchAt_s - 3), checksPassed: m.kind !== "C_EQUALIZATION" || guardOk, note: `Inlet offset ${round(switchOffset, 2)}% (guard ${cfg.guardThreshold_pct}%)` });
  states.push({ state: "S3_CROSSOVER", t_s: cfg.switchAt_s, checksPassed: !bubble && !reversal, note: `Switch via ${m.name}` });
  if (iv) states.push({ state: "S4_RESCUE", t_s: cfg.rescueAt_s, checksPassed: true, note: `${iv.isVehicle ? "Vehicle" : "Intervention"}: ${iv.name}` });

  // Time loop
  const idealFlow = poiseuilleFlow(cfg.drivingPressure_mbar, 1.0, chip.radius_um, chip.length_mm, chip.channels, 1);
  const t: number[] = [], P: number[] = [], Q: number[] = [];
  let peak = 0, interruption = 0, status: RunResult["status"] = "COMPLETED";

  for (let ti = 0; ti <= cfg.duration_s + 1e-9; ti += cfg.dt_s) {
    const ts = ti - cfg.switchAt_s;
    let dev = switchDeviation(m, ts, switchOffset, r);
    if (reversal && ts >= 0 && ts < 0.6) dev -= 110 * Math.exp(-ts / 0.2); // backflow dip
    const pressurePct = 100 + dev;
    if (ts >= 0) peak = Math.max(peak, Math.abs(dev));

    const rescued = iv && ti >= cfg.rescueAt_s;
    const occ = rescued ? occPost : occPre;
    const rad = rescued ? rPost : rPre;
    const open = chip.channels * (1 - occ);
    let q = poiseuilleFlow(cfg.drivingPressure_mbar * Math.max(pressurePct, 0) / 100, p.viscosity_cP, rad, chip.length_mm, open, chip.batchEffect);
    if (pressurePct < 0) q = -poiseuilleFlow(cfg.drivingPressure_mbar * -pressurePct / 100, p.viscosity_cP, rad, chip.length_mm, open, chip.batchEffect);
    if (Math.abs(q) < idealFlow * 0.01) interruption += cfg.dt_s;

    t.push(round(ti, 2)); P.push(round(pressurePct, 2)); Q.push(round(q, 3));

    if (cfg.interlockEnabled && ts >= 0 && Math.abs(dev) > cfg.pressureLimit_pct && m.kind !== "A_STOP_FLOW") {
      events.push({ t_s: round(ti, 2), type: "INTERLOCK_STOP", detail: `|ΔP| ${round(Math.abs(dev), 1)}% > limit ${cfg.pressureLimit_pct}%` });
      status = "ABORTED_SAFETY";
      break;
    }
  }
  if (peak > 10) events.push({ t_s: cfg.switchAt_s, type: "PRESSURE_SPIKE", detail: `Peak inlet deviation ${round(peak, 1)}%` });

  // Endpoints
  const finalOcc = iv ? occPost : occPre;
  const finalR = iv ? rPost : rPre;
  const flowEnd = poiseuilleFlow(cfg.drivingPressure_mbar, p.viscosity_cP, finalR, chip.length_mm, chip.channels * (1 - finalOcc), chip.batchEffect);
  const mechanical = Math.max(0, Math.min(peak, 100) - 10) * 0.035; // pressure-induced BBB disruption
  const perm = Math.max(0.05, normal(r, 1.0, 0.08) * v.permeabilityMultiplier * (iv?.permeabilityEffect ?? 1) + mechanical);
  const viability = clamp(normal(r, 95, 1.5) - 100 * v.viabilityPenalty - 100 * (iv?.cytotoxicity ?? 0) - mechanical * 4, 0, 100);

  return {
    config: { seed: cfg.seed, perfusate: p.name, vessel: v.name, manifold: m.kind, intervention: iv?.name ?? null, chip: chip.id },
    status,
    trace: { t, pressure_pct: P, flow_uL_min: Q },
    states,
    events,
    endpoints: {
      peakPressureDeviation_pct: round(peak, 2),
      flowInterruption_s: round(interruption, 2),
      flowReversal: reversal,
      carryover_pct: round(carryoverPct(cfg.flushVolume_uL, m.deadVolume_uL), 3),
      occlusionFraction: round(finalOcc, 3),
      perfusionIndex_pct: round(100 * flowEnd / idealFlow, 2),
      flow_uL_min: round(flowEnd, 3),
      permeability_e6_cm_s: round(perm, 3),
      viability_pct: round(viability, 2),
    },
  };
}

// ───────────────────────────── Presets (from the proposal) ─────────────────────────────

export const PRESETS = {
  perfusates: {
    reference: { name: "Reference medium", kind: "REFERENCE", viscosity_cP: 0.95, particleLoad: 0.0 } as PerfusateParams,
    altered: { name: "Altered perfusate (particle/cell load)", kind: "ALTERED", viscosity_cP: 1.6, particleLoad: 0.45 } as PerfusateParams,
  },
  vessels: {
    intact: { name: "Intact (sham)", kind: "INTACT", swelling: 0.0, pericyteConstriction: 0.0, permeabilityMultiplier: 1.0, viabilityPenalty: 0.0 } as VesselParams,
    injured: { name: "OGD injury", kind: "INJURED", swelling: 0.12, pericyteConstriction: 0.18, permeabilityMultiplier: 2.2, viabilityPenalty: 0.12 } as VesselParams,
  },
  manifolds: {
    A: { name: "A · Simple stop-flow selector", kind: "A_STOP_FLOW", deadVolume_uL: 15, tau_s: 0.8, residualOffset_pct: 8, stopDuration_s: 1.5, bubbleProb: 0.12, reversalProb: 0.2 } as ManifoldParams,
    B: { name: "B · Pressure-controlled switch", kind: "B_PRESSURE_CONTROLLED", deadVolume_uL: 8, tau_s: 1.2, residualOffset_pct: 6, stopDuration_s: 0, bubbleProb: 0.06, reversalProb: 0.03 } as ManifoldParams,
    C: { name: "C · Proposed equalization manifold", kind: "C_EQUALIZATION", deadVolume_uL: 3, tau_s: 0.5, residualOffset_pct: 1.6, stopDuration_s: 0, bubbleProb: 0.02, reversalProb: 0.0 } as ManifoldParams,
  },
  interventions: {
    vehicle: { name: "Vehicle control", isVehicle: true, occlusionReduction: 0, constrictionReversal: 0, permeabilityEffect: 1, cytotoxicity: 0 } as InterventionParams,
    antiConstriction: { name: "Class 1 · Pericyte-relaxing", isVehicle: false, occlusionReduction: 0.15, constrictionReversal: 0.6, permeabilityEffect: 1.05, cytotoxicity: 0.01 } as InterventionParams,
    antiAdhesion: { name: "Class 2 · Anti-adhesion / de-plugging", isVehicle: false, occlusionReduction: 0.55, constrictionReversal: 0.05, permeabilityEffect: 1.0, cytotoxicity: 0.01 } as InterventionParams,
    aggressive: { name: "Class 3 · Aggressive lytic (false-efficacy demo)", isVehicle: false, occlusionReduction: 0.7, constrictionReversal: 0.1, permeabilityEffect: 1.9, cytotoxicity: 0.15 } as InterventionParams,
  },
};

export function defaultChip(id: string, r: () => number): ChipParams {
  return { id, channels: 64, radius_um: 25, length_mm: 10, batchEffect: clamp(normal(r, 1, 0.05), 0.85, 1.15) };
}

export function defaultConfig(over: Partial<RunConfig> & Pick<RunConfig, "seed">): RunConfig {
  const r = rng(over.seed ^ 0x9e3779b9);
  return {
    perfusate: PRESETS.perfusates.reference,
    vessel: PRESETS.vessels.intact,
    manifold: PRESETS.manifolds.C,
    chip: defaultChip(`chip-${over.seed}`, r),
    drivingPressure_mbar: 20,
    flushVolume_uL: 50,
    duration_s: 30,
    dt_s: 0.1,
    switchAt_s: 10,
    rescueAt_s: 18,
    guardThreshold_pct: 3,
    pressureLimit_pct: 60,
    interlockEnabled: true,
    ...over,
  };
}

// ───────────────────────────── Analysis ─────────────────────────────

export interface CellSummary { n: number; mean: number; sd: number; ci95: [number, number] }

export function summarize(xs: number[]): CellSummary {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const half = n > 1 ? 1.96 * sd / Math.sqrt(n) : 0;
  return { n, mean: round(mean), sd: round(sd), ci95: [round(mean - half), round(mean + half)] };
}

/**
 * 2x2 crossover effects (proposal §6):
 *   F   = perfusate (fluid) main effect
 *   V   = vessel-condition main effect
 *   FxV = interaction
 * Bootstrap 95% CIs, seeded.
 */
export function analyze2x2(
  rows: { fluid: FluidKind; vessel: VesselKind; value: number }[],
  seed = 1,
  boots = 1000,
) {
  const cell = (f: FluidKind, v: VesselKind) => rows.filter((x) => x.fluid === f && x.vessel === v).map((x) => x.value);
  const RI = cell("REFERENCE", "INTACT"), AI = cell("ALTERED", "INTACT"), RJ = cell("REFERENCE", "INJURED"), AJ = cell("ALTERED", "INJURED");
  const m = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
  const eff = (ri: number[], ai: number[], rj: number[], aj: number[]) => ({
    F: (m(ai) + m(aj) - m(ri) - m(rj)) / 2,
    V: (m(rj) + m(aj) - m(ri) - m(ai)) / 2,
    FxV: (m(aj) - m(rj)) - (m(ai) - m(ri)),
  });
  const point = eff(RI, AI, RJ, AJ);
  const r = rng(seed);
  const res = (a: number[]) => a.map(() => a[Math.floor(r() * a.length)]);
  const bs = { F: [] as number[], V: [] as number[], FxV: [] as number[] };
  for (let b = 0; b < boots; b++) {
    const e = eff(res(RI), res(AI), res(RJ), res(AJ));
    bs.F.push(e.F); bs.V.push(e.V); bs.FxV.push(e.FxV);
  }
  const ci = (a: number[]): [number, number] => {
    const s = [...a].sort((x, y) => x - y);
    return [round(s[Math.floor(0.025 * s.length)]), round(s[Math.floor(0.975 * s.length)])];
  };
  return {
    cells: { RI: summarize(RI), AI: summarize(AI), RJ: summarize(RJ), AJ: summarize(AJ) },
    effects: {
      F: { estimate: round(point.F), ci95: ci(bs.F) },
      V: { estimate: round(point.V), ci95: ci(bs.V) },
      FxV: { estimate: round(point.FxV), ci95: ci(bs.FxV) },
    },
  };
}

/** Two-axis success criterion (proposal §10 "False efficacy"): flow must improve AND barrier must not worsen. */
export function twoAxisVerdict(treated: Endpoints[], vehicle: Endpoints[], permMargin_pct = 15) {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
  const dPerf = mean(treated.map((e) => e.perfusionIndex_pct)) - mean(vehicle.map((e) => e.perfusionIndex_pct));
  const permRatio = mean(treated.map((e) => e.permeability_e6_cm_s)) / mean(vehicle.map((e) => e.permeability_e6_cm_s));
  const dViab = mean(treated.map((e) => e.viability_pct)) - mean(vehicle.map((e) => e.viability_pct));
  const flowOk = dPerf > 0;
  const barrierOk = permRatio <= 1 + permMargin_pct / 100;
  const viabilityOk = dViab > -5;
  return {
    deltaPerfusion_pct: round(dPerf, 2),
    permeabilityRatio: round(permRatio, 3),
    deltaViability_pct: round(dViab, 2),
    flowOk, barrierOk, viabilityOk,
    verdict: flowOk && barrierOk && viabilityOk ? "PASS" : flowOk ? "FALSE_EFFICACY_RISK" : "FAIL",
  };
}

/** Falsification experiment (proposal §9): head-to-head A vs B vs C over n switches. */
export function compareManifolds(n = 200, seed = 7, targetPct = 5) {
  const out: Record<string, { withinTarget_pct: number; meanPeak_pct: number; carryover_pct: number; bubbles: number; reversals: number; meanInterruption_s: number }> = {};
  for (const key of ["A", "B", "C"] as const) {
    const m = PRESETS.manifolds[key];
    let within = 0, peakSum = 0, bubbles = 0, reversals = 0, intr = 0;
    for (let i = 0; i < n; i++) {
      const res = simulateRun(defaultConfig({ seed: seed * 100003 + i, manifold: m, interlockEnabled: false }));
      const e = res.endpoints;
      if (e.peakPressureDeviation_pct <= targetPct) within++;
      peakSum += e.peakPressureDeviation_pct;
      intr += e.flowInterruption_s;
      if (res.events.some((x) => x.type === "BUBBLE")) bubbles++;
      if (e.flowReversal) reversals++;
    }
    out[key] = {
      withinTarget_pct: round(100 * within / n, 1),
      meanPeak_pct: round(peakSum / n, 2),
      carryover_pct: round(carryoverPct(50, m.deadVolume_uL), 3),
      bubbles, reversals,
      meanInterruption_s: round(intr / n, 2),
    };
  }
  return out;
}
