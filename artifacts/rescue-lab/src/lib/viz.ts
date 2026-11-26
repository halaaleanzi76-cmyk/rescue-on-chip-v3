import type { RunVisualization, VisualizationFrame } from '@workspace/api-client-react';
import { METHOD_ORDER } from '@/lib/lab';

export type ViewMode = 'pressure' | 'velocity' | 'tracer';

export interface MethodFrames { method: string; frames: VisualizationFrame[]; times: number[] }

export interface Sample {
  time_s: number;
  pressure_pa: number;
  flow_ul_min: number;
  mean_velocity_mm_s: number;
  centerline_velocity_mm_s: number;
  viscosity_mpas: number;
  wall_shear_pa: number;
  carryover_pct: number;
  displacement_mm: number;
  axial: number[];
  radial: number[];
}

export interface Scale { pMin: number; pMax: number; vMax: number }

/** Visual constants of the 3D chip. Representation only; not to scale. */
export const CHIP_LEN = 6;
export const MAX_DISPLAY_CHANNELS = 16;
export const CHANNEL_SPACING = 0.3;
export function visualRadius(radiusUm: number) { return 0.045 + 0.075 * Math.min(1, radiusUm / 100); }
export function displayCount(n: number) { return Math.max(1, Math.min(MAX_DISPLAY_CHANNELS, Math.round(n || 1))); }

export function groupFrames(v: RunVisualization | null | undefined): Record<string, MethodFrames> {
  const out: Record<string, MethodFrames> = {};
  if (!v) return out;
  for (const f of v.frames) {
    (out[f.method] ??= { method: f.method, frames: [], times: [] }).frames.push(f);
  }
  for (const k of Object.keys(out)) {
    out[k].frames.sort((a, b) => a.time_s - b.time_s);
    out[k].times = out[k].frames.map((f) => f.time_s);
  }
  return out;
}

export function methodsOf(g: Record<string, MethodFrames>) {
  return Object.keys(g).sort((a, b) => METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b));
}

export function timeRange(v: RunVisualization | null | undefined): [number, number] {
  if (!v || v.frames.length === 0) return [0, 1];
  let a = Infinity, b = -Infinity;
  for (const f of v.frames) { if (f.time_s < a) a = f.time_s; if (f.time_s > b) b = f.time_s; }
  return [a, b];
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
function lerpArr(a: number[], b: number[], u: number) {
  const n = Math.min(a.length, b.length); const o = new Array<number>(n);
  for (let i = 0; i < n; i++) o[i] = lerp(a[i], b[i], u);
  return o;
}

/** Linear interpolation between neighbouring Python frames. No extrapolation beyond the trace window. */
export function sampleAt(mf: MethodFrames | undefined, t: number): Sample | null {
  if (!mf || mf.frames.length === 0) return null;
  const { frames, times } = mf;
  let i0 = 0, i1 = 0, u = 0;
  if (t <= times[0]) { i0 = i1 = 0; }
  else if (t >= times[times.length - 1]) { i0 = i1 = times.length - 1; }
  else {
    let lo = 0, hi = times.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
    i0 = lo; i1 = hi; const span = times[hi] - times[lo]; u = span > 0 ? (t - times[lo]) / span : 0;
  }
  const a = frames[i0], b = frames[i1];
  return {
    time_s: t,
    pressure_pa: lerp(a.pressure_pa, b.pressure_pa, u),
    flow_ul_min: lerp(a.flow_ul_min, b.flow_ul_min, u),
    mean_velocity_mm_s: lerp(a.mean_velocity_mm_s, b.mean_velocity_mm_s, u),
    centerline_velocity_mm_s: lerp(a.centerline_velocity_mm_s, b.centerline_velocity_mm_s, u),
    viscosity_mpas: lerp(a.viscosity_mpas, b.viscosity_mpas, u),
    wall_shear_pa: lerp(a.wall_shear_pa, b.wall_shear_pa, u),
    carryover_pct: lerp(a.carryover_pct, b.carryover_pct, u),
    displacement_mm: lerp(a.displacement_mm, b.displacement_mm, u),
    axial: lerpArr(a.axial_pressure_pa, b.axial_pressure_pa, u),
    radial: lerpArr(a.radial_velocity_mm_s, b.radial_velocity_mm_s, u),
  };
}

/** Interpolate a uniformly sampled array at fractional position f in [0,1]. */
export function interpUniform(arr: number[], f: number) {
  if (arr.length === 0) return 0;
  const x = Math.max(0, Math.min(1, f)) * (arr.length - 1);
  const i = Math.floor(x); const j = Math.min(arr.length - 1, i + 1);
  return lerp(arr[i], arr[j], x - i);
}

/** Interpolate a sampled array at position x over (possibly non-uniform) grid xs. */
export function interpGrid(xs: number[], ys: number[], x: number) {
  if (!xs.length) return 0;
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1));
  return ys[ys.length - 1];
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const PRESSURE_STOPS = ['#102a43', '#145c7a', '#1f9aa0', '#7fd1a7', '#f1dc7a', '#f39a4f', '#d9452f'];
export const VELOCITY_STOPS = ['#2c6fd6', '#59a8e8', '#a9d6ee', '#dfe7ea', '#f6cf7c', '#f08c4a', '#d63b2a'];
const P_RGB = PRESSURE_STOPS.map(hex);
const V_RGB = VELOCITY_STOPS.map(hex);
function ramp(stops: RGB[], u: number): RGB {
  const x = Math.max(0, Math.min(1, Number.isFinite(u) ? u : 0)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x)); const t = x - i;
  return [lerp(stops[i][0], stops[i + 1][0], t), lerp(stops[i][1], stops[i + 1][1], t), lerp(stops[i][2], stops[i + 1][2], t)];
}
export function pressureRGB(p: number, s: Scale): RGB { return ramp(P_RGB, (p - s.pMin) / ((s.pMax - s.pMin) || 1)); }
/** Diverging map centred on zero velocity; negative = reversed flow. */
export function velocityRGB(v: number, s: Scale): RGB { return ramp(V_RGB, 0.5 + 0.5 * v / (s.vMax || 1)); }
export const TRACER_RGB: RGB = hex('#3a6f7c');
export const NEUTRAL_RGB: RGB = hex('#5d8592');
export const gradientCss = (stops: string[]) => `linear-gradient(90deg, ${stops.join(', ')})`;

export function scaleOf(...vs: (RunVisualization | null | undefined)[]): Scale {
  const list = vs.filter(Boolean) as RunVisualization[];
  if (!list.length) return { pMin: 0, pMax: 1, vMax: 1 };
  return {
    pMin: Math.min(...list.map((v) => v.pressure_min_pa)),
    pMax: Math.max(...list.map((v) => v.pressure_max_pa)),
    vMax: Math.max(...list.map((v) => v.velocity_abs_max_mm_s)) || 1,
  };
}

/** Deterministic quasi-random sequence (golden-ratio / Halton style). No Math.random. */
export function halton(i: number, base: number) {
  let f = 1, r = 0, n = i + 1;
  while (n > 0) { f /= base; r += f * (n % base); n = Math.floor(n / base); }
  return r;
}
