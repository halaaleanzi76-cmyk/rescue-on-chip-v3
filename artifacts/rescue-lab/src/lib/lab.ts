import type { ExperimentInput } from '@workspace/api-client-react';
import { getLang, tr, trd } from '@/lib/i18n';

export type FieldKey = keyof ExperimentInput;

export interface FieldSpec {
  key: FieldKey;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  int?: boolean;
  text?: boolean;
  hint: string;
}

export interface FieldGroup {
  id: string;
  title: string;
  note: string;
  advanced?: boolean;
  fields: FieldSpec[];
}

export const GROUPS: FieldGroup[] = [
  {
    id: 'identity',
    title: 'Run identity',
    note: 'Name, RNG seed and virtual chips per arm.',
    fields: [
      { key: 'name', label: 'Experiment name', text: true, hint: '1-100 characters' },
      { key: 'seed', label: 'Seed', int: true, min: 0, max: 2147483647, step: 1, hint: 'Integer 0 to 2147483647. Same seed + config reproduces the run.' },
      { key: 'replicates', label: 'Replicates / arm', unit: 'n', int: true, min: 3, max: 100, step: 1, hint: 'Virtual chips per 2x2 arm (proposal illustrates n=6).' },
    ],
  },
  {
    id: 'geometry',
    title: 'Network & fluid',
    note: 'Assumed geometry and rheology. No measured chip.',
    fields: [
      { key: 'pressure_pa', label: 'Driving pressure', unit: 'Pa', min: 10, max: 10000, step: 10, hint: 'Inlet pressure head' },
      { key: 'radius_um', label: 'Channel radius', unit: 'µm', min: 5, max: 100, step: 0.5, hint: 'Nominal circular radius' },
      { key: 'length_mm', label: 'Channel length', unit: 'mm', min: 1, max: 100, step: 0.5, hint: 'Per channel' },
      { key: 'channels', label: 'Parallel channels', unit: 'count', int: true, min: 1, max: 200, step: 1, hint: 'Identical parallel branches' },
      { key: 'viscosity_mpas', label: 'Base viscosity', unit: 'mPa·s', min: 0.5, max: 10, step: 0.1, hint: 'Healthy perfusate (F0)' },
      { key: 'altered_viscosity_ratio', label: 'Altered viscosity ratio', unit: '×', min: 1, max: 5, step: 0.1, hint: 'F1 fluid multiplier' },
      { key: 'narrowing_pct', label: 'Vessel narrowing', unit: '%', min: 0, max: 70, step: 1, hint: 'V1 radius reduction' },
      { key: 'occlusion_pct', label: 'Occluded channels', unit: '%', min: 0, max: 90, step: 1, hint: 'Fraction of channels blocked in V1' },
      { key: 'radius_cv_pct', label: 'Radius variability (CV)', unit: '%', min: 0, max: 15, step: 0.5, hint: 'Source of the only CI variance' },
    ],
  },
  {
    id: 'protocol',
    title: 'Switch protocol',
    note: 'Timing shared by all three topologies.',
    fields: [
      { key: 'duration_s', label: 'Duration', unit: 's', min: 20, max: 600, step: 1, hint: 'Must exceed switch + stop + 5 s' },
      { key: 'switch_s', label: 'Switch time', unit: 's', min: 1, max: 300, step: 0.5, hint: 'Moment of reservoir change' },
      { key: 'offset_pct', label: 'Reservoir pressure offset', unit: '%', min: -150, max: 150, step: 1, hint: 'Mismatch of incoming line' },
      { key: 'stop_duration_s', label: 'Stop-flow pause', unit: 's', min: 0.1, max: 10, step: 0.1, hint: 'stop_flow interruption' },
      { key: 'dead_volume_ul', label: 'Dead volume', unit: 'µL', min: 0.01, max: 10, step: 0.01, hint: 'Upstream mixing volume' },
    ],
  },
  {
    id: 'controllers',
    title: 'Controllers',
    note: 'Both topologies are independently editable. Equal τ is a modelling choice, not a fairness proof.',
    advanced: true,
    fields: [
      { key: 'regulated_tau_s', label: 'Pressure-controlled τ', unit: 's', min: 0.1, max: 10, step: 0.1, hint: 'First-order time constant' },
      { key: 'regulated_wait_s', label: 'Pressure-controlled wait', unit: 's', min: 0, max: 60, step: 0.5, hint: 'Delay before switch' },
      { key: 'equalized_tau_s', label: 'Equalized τ', unit: 's', min: 0.1, max: 10, step: 0.1, hint: 'First-order time constant' },
      { key: 'equalization_s', label: 'Equalization wait', unit: 's', min: 0, max: 60, step: 0.5, hint: 'Pre-switch equilibration' },
    ],
  },
  {
    id: 'barrier',
    title: 'Barrier & rescue',
    note: 'Permeability is prescribed by you, not predicted. Rescue fraction is an assumed geometric reversal, not efficacy.',
    advanced: true,
    fields: [
      { key: 'permeability_um_s', label: 'Baseline permeability', unit: 'µm/s', min: 0.0001, max: 1, step: 0.001, hint: 'Healthy barrier, user-prescribed' },
      { key: 'injury_permeability_ratio', label: 'Injury multiplier', unit: '×', min: 1, max: 20, step: 0.1, hint: 'Applied to injured condition' },
      { key: 'receiver_volume_ul', label: 'Receiver volume', unit: 'µL', min: 0.1, max: 100, step: 0.1, hint: 'Abluminal compartment' },
      { key: 'barrier_margin_pct', label: 'Planned barrier margin (%) — planning only', unit: '%', min: 0, max: 100, step: 1, hint: 'Planned experimental margin. Threshold = P × injury multiplier × (1 + margin/100). Not a simulated endpoint; no pass/fail.' },
      { key: 'rescue_fraction', label: 'Rescue fraction', unit: '0-1', min: 0, max: 1, step: 0.05, hint: 'Assumed reversal of narrowing; 0 = none' },
    ],
  },
];

export const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

/** Localized texts for groups and fields (English in GROUPS is the fallback). */
export const groupTitle = (g: FieldGroup) => trd(`group.${g.id}.title`, g.title);
export const groupNote = (g: FieldGroup) => trd(`group.${g.id}.note`, g.note);
export const fieldLabel = (f: FieldSpec) => trd(`field.${f.key}.label`, f.label);
export const fieldHint = (f: FieldSpec) => trd(`field.${f.key}.hint`, f.hint);
export const fieldUnit = (f: FieldSpec) => (f.unit === 'count' ? tr('unit.count') : f.unit);

export type FormState = Record<string, string>;

export function toForm(c: ExperimentInput): FormState {
  const f: FormState = {};
  for (const s of ALL_FIELDS) {
    const v = c[s.key];
    f[s.key] = v === undefined || v === null ? '' : String(v);
  }
  return f;
}

export function validate(f: FormState): { errors: Record<string, string>; data: ExperimentInput | null } {
  const errors: Record<string, string> = {};
  const data: Record<string, string | number> = {};
  for (const s of ALL_FIELDS) {
    const raw = (f[s.key] ?? '').trim();
    if (s.text) {
      if (!raw) errors[s.key] = tr('val.required');
      else if (raw.length > 100) errors[s.key] = tr('val.maxChars');
      data[s.key] = raw;
      continue;
    }
    if (raw === '') { errors[s.key] = tr('val.required'); continue; }
    const n = Number(raw);
    if (!Number.isFinite(n)) { errors[s.key] = tr('val.notNumber'); continue; }
    if (s.int && !Number.isInteger(n)) { errors[s.key] = tr('val.integer'); continue; }
    if (s.min !== undefined && n < s.min) { errors[s.key] = tr('val.min', { n: s.min }); continue; }
    if (s.max !== undefined && n > s.max) { errors[s.key] = tr('val.max', { n: s.max }); continue; }
    data[s.key] = n;
  }
  const d = data as unknown as Required<ExperimentInput>;
  if (!errors.duration_s && !errors.switch_s && !errors.stop_duration_s) {
    if (d.switch_s + d.stop_duration_s + 5 >= d.duration_s) {
      errors.duration_s = tr('val.duration', { n: +(d.switch_s + d.stop_duration_s + 5).toFixed(2) });
    }
  }
  return { errors, data: Object.keys(errors).length ? null : (data as ExperimentInput) };
}

export function changedKeys(f: FormState, c: ExperimentInput | undefined): string[] {
  if (!c) return [];
  return ALL_FIELDS.filter((s) => {
    const a = (f[s.key] ?? '').trim();
    const b = c[s.key];
    if (s.text) return a !== String(b ?? '');
    return a === '' || Number(a) !== Number(b);
  }).map((s) => s.key);
}

export function humanError(err: unknown): string {
  if (!err) return tr('err.unknown');
  const e = err as { data?: unknown; status?: number; message?: string };
  const data = e.data as { detail?: unknown } | null | undefined;
  if (data && typeof data === 'object' && 'detail' in data) {
    const det = data.detail;
    if (Array.isArray(det)) {
      return det
        .map((d: { loc?: (string | number)[]; msg?: string; field?: string; message?: string }) => {
          const loc = (d.loc ?? d.field?.split('.') ?? []).filter((x) => x !== 'body').join('.');
          const spec = ALL_FIELDS.find((s) => s.key === loc);
          return `${spec ? fieldLabel(spec) : loc || tr('err.input')}: ${(d.msg ?? d.message ?? '').replace(/^Value error, /, '')}`;
        })
        .join(' · ');
    }
    if (typeof det === 'string') return det;
  }
  if (e.status === 404) return tr('err.notFound');
  if (e.status && e.status >= 500) return tr('err.server', { status: e.status });
  if (e.message?.includes('Failed to fetch')) return tr('err.unreachable');
  return e.message ?? tr('err.failed');
}

export const METHOD_COLORS: Record<string, string> = {
  stop_flow: '#ef6a4c',
  pressure_controlled: '#e8b04a',
  equalized: '#3fc1c9',
};
export const METHOD_ORDER = ['stop_flow', 'pressure_controlled', 'equalized'];
/** Localized topology names (getters, so they follow the active language). */
export const METHOD_LABEL: Record<string, string> = {
  get stop_flow() { return tr('method.stop_flow'); },
  get pressure_controlled() { return tr('method.pressure_controlled'); },
  get equalized() { return tr('method.equalized'); },
};

export function fmt(v: number | null | undefined, d = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.001 || a >= 1e6)) return v.toExponential(2);
  if (a < 0.1 && a !== 0) return v.toPrecision(3);
  return v.toFixed(d);
}

export function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(getLang() === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
