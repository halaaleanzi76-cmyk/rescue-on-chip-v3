import { useMemo, useState } from 'react';
import { EngineText } from '@/components/engine-text';
import type { SimulationRun } from '@workspace/api-client-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ComposedChart, Bar, ErrorBar, Scatter, ScatterChart, Cell, ReferenceArea,
} from 'recharts';
import { Check, X, AlertTriangle, FileText, FileSpreadsheet, FileJson, Printer } from 'lucide-react';
import { Link } from 'wouter';
import { Panel, SimBadge } from '@/components/shell';
import { METHOD_COLORS, METHOD_LABEL, METHOD_ORDER, fmt, fmtDate } from '@/lib/lab';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const AXIS = { fontSize: 11, fontFamily: 'Geist Mono, monospace', fill: 'hsl(198 14% 62%)' };
const TT = {
  contentStyle: { background: 'hsl(205 30% 10%)', border: '1px solid hsl(200 22% 22%)', borderRadius: 2, fontSize: 12, fontFamily: 'Geist Mono, monospace' },
  labelStyle: { fontWeight: 600 },
};
const GRID = 'hsl(200 22% 16%)';

function Stat({ label, value, unit, tid }: { label: string; value: string; unit?: string; tid: string }) {
  return (
    <div className="min-w-0">
      <div className="stamp text-[9px] text-muted-foreground truncate">{label}</div>
      <div className="font-num text-[17px] font-medium" data-testid={tid}>{value}<span className="text-[11px] text-muted-foreground ms-1">{unit}</span></div>
    </div>
  );
}

export function RunHeader({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  const base = `/api/runs/${run.id}/report`;
  const dl = [
    { f: 'html', label: t('rs.dl.html'), icon: FileText },
    { f: 'csv', label: t('rs.dl.csv'), icon: FileSpreadsheet },
    { f: 'json', label: t('rs.dl.json'), icon: FileJson },
  ];
  return (
    <Panel kicker={t('rs.kicker', { id: run.id.slice(0, 8), date: fmtDate(run.created_at) })} title={run.config.name ?? t('rs.untitled')} right={<SimBadge />}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label={t('rs.baselineFlow')} value={fmt(run.baseline_flow_ul_min, 3)} unit="µL/min" tid="text-baseline-flow" />
        <Stat label={t('rs.reynolds')} value={fmt(run.reynolds_number, 4)} tid="text-reynolds" />
        <Stat label={t('rs.wallShear')} value={fmt(run.wall_shear_pa, 3)} unit="Pa" tid="text-wall-shear" />
        <Stat label={t('rs.resistance')} value={run.resistance_pa_s_m3.toExponential(3)} unit="Pa·s/m³" tid="text-resistance" />
      </div>
      <div className="mt-4 grid gap-1 font-num text-[11px] text-muted-foreground">
        <div className="break-all" dir="ltr" data-testid="text-fingerprint"><span className="text-foreground">sha256</span> {run.fingerprint}</div>
        <div>{t('rs.meta', { model: run.model_version, seed: run.config.seed ?? '—', n: run.config.replicates ?? '—', np: run.software.numpy, sp: run.software.scipy, pd: run.software.pandas })}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {dl.map((d) => (
          <a key={d.f} href={`${base}?format=${d.f}`} download data-testid={`link-download-${d.f}`}
            className="inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs rounded-sm hover:bg-secondary transition-colors">
            <d.icon className="h-3.5 w-3.5" />{d.label}
          </a>
        ))}
        <Link href={`/lab?run=${run.id}`} data-testid="link-open-3d" className="inline-flex items-center gap-1.5 border border-primary/50 text-primary px-2.5 py-1.5 text-xs rounded-sm hover:bg-primary/10">{t('rs.open3d')}</Link>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
          <Printer className="h-3.5 w-3.5" />{t('rs.pdfHint')}
        </span>
      </div>
    </Panel>
  );
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-num', ok ? 'text-primary' : 'text-[#ef7a5a]')}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{label}
    </span>
  );
}

export function MetricsTable({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  const rows = [...run.metrics].sort((a, b) => METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method));
  return (
    <Panel kicker={t('mt.kicker')} title={t('mt.title')}
      right={<span className="text-[11px] text-muted-foreground">{t('mt.goals')}</span>}>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-start stamp text-[9px] text-muted-foreground border-b">
              <th className="py-2 pe-3 text-start">{t('mt.col.topology')}</th>
              <th className="py-2 px-2 text-end">{t('mt.col.peak')}</th>
              <th className="py-2 px-2 text-end">{t('mt.col.carry')}</th>
              <th className="py-2 px-2 text-end">{t('mt.col.washout')}</th>
              <th className="py-2 px-2 text-end">{t('mt.col.flush')}</th>
              <th className="py-2 px-2 text-end">{t('mt.col.interrupt')}</th>
              <th className="py-2 ps-2 text-start">{t('mt.col.reversal')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.method} className="border-b border-dashed last:border-0 hover:bg-secondary/50" data-testid={`row-metric-${m.method}`}>
                <td className="py-2.5 pe-3">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: METHOD_COLORS[m.method] ?? '#888' }} />{METHOD_LABEL[m.method] ?? m.label}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-end font-num">{fmt(m.peak_deviation_pct)}<div><Flag ok={m.pressure_target_met} label={m.pressure_target_met ? t('mt.within') : t('mt.exceeds')} /></div></td>
                <td className="py-2.5 px-2 text-end font-num">{fmt(m.carryover_pct)}<div><Flag ok={m.carryover_target_met} label={m.carryover_target_met ? t('mt.within') : t('mt.exceeds')} /></div></td>
                <td className="py-2.5 px-2 text-end font-num">{m.washout_s === null ? <span className="text-muted-foreground" title={t('mt.notReachedTitle')}>{t('mt.notReached')}</span> : fmt(m.washout_s)}</td>
                <td className="py-2.5 px-2 text-end font-num">{fmt(m.flush_volume_ul, 3)}</td>
                <td className="py-2.5 px-2 text-end font-num">{fmt(m.interruption_s)}</td>
                <td className="py-2.5 ps-2">{m.reversal_detected
                  ? <span className="inline-flex items-center gap-1 text-[#ef7a5a] text-xs"><AlertTriangle className="h-3 w-3" />{t('mt.detected')}</span>
                  : <span className="text-xs text-muted-foreground">{t('mt.none')}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{t('mt.footnote')}</p>
    </Panel>
  );
}

type Var = 'pressure_pa' | 'flow_ul_min' | 'carryover_pct';
const VARS: { k: Var; unit: string }[] = [
  { k: 'pressure_pa', unit: 'Pa' },
  { k: 'flow_ul_min', unit: 'µL/min' },
  { k: 'carryover_pct', unit: '%' },
];

export function TraceChart({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  const [v, setV] = useState<Var>('pressure_pa');
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const methods = useMemo(() => {
    const s = Array.from(new Set(run.traces.map((t) => t.method)));
    return s.sort((a, b) => METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b));
  }, [run.traces]);
  const data = useMemo(() => {
    const m = new Map<number, Record<string, number>>();
    for (const t of run.traces) {
      const row = m.get(t.time_s) ?? { time_s: t.time_s };
      row[`${t.method}:pressure_pa`] = t.pressure_pa;
      row[`${t.method}:flow_ul_min`] = t.flow_ul_min;
      row[`${t.method}:carryover_pct`] = t.carryover_pct;
      m.set(t.time_s, row);
    }
    return Array.from(m.values()).sort((a, b) => a.time_s - b.time_s);
  }, [run.traces]);
  const meta = { ...VARS.find((x) => x.k === v)!, label: t(`tc.v.${v}`) };
  const sw = run.config.switch_s ?? 0;
  const target = v === 'pressure_pa' ? (run.config.pressure_pa ?? 0) : null;
  return (
    <Panel kicker={t('tc.kicker')} title={t('tc.vsTime', { q: meta.label })}
      right={
        <div className="flex border rounded-sm overflow-hidden" role="tablist">
          {VARS.map((x) => (
            <button key={x.k} role="tab" aria-selected={v === x.k} onClick={() => setV(x.k)} data-testid={`button-trace-${x.k}`}
              className={cn('px-2.5 py-1 text-xs transition-colors', v === x.k ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{t(`tc.v.${x.k}`)}</button>
          ))}
        </div>
      }>
      {data.length === 0 ? <ChartEmpty msg={t('tc.empty')} /> : (
        <div className="h-[320px]" data-testid="chart-traces">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 18 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="2 4" />
              <XAxis dataKey="time_s" type="number" domain={['dataMin', 'dataMax']} tick={AXIS}
                label={{ value: t('tc.time'), position: 'insideBottom', offset: -10, style: AXIS }} />
              <YAxis tick={AXIS} width={64} domain={['auto', 'auto']}
                label={{ value: `${meta.label} (${meta.unit})`, angle: -90, position: 'insideLeft', style: { ...AXIS, textAnchor: 'middle' } }} />
              <Tooltip {...TT} labelFormatter={(l) => `t = ${fmt(Number(l), 2)} s`}
                formatter={(val, name) => [`${fmt(Number(val), 3)} ${meta.unit}`, String(name)]} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                onClick={(e) => { const key = String((e as { dataKey?: unknown }).dataKey ?? '').split(':')[0]; setHidden((h) => ({ ...h, [key]: !h[key] })); }} />
              <ReferenceLine x={sw} stroke="#ef7a5a" strokeDasharray="4 3" label={{ value: t('tc.switchAt', { s: sw }), position: 'top', style: { ...AXIS, fill: '#ef7a5a' } }} />
              {target !== null && <ReferenceArea y1={target * 0.95} y2={target * 1.05} fill="#3fc1c9" fillOpacity={0.06} />}
              {v === 'carryover_pct' && <ReferenceLine y={5} stroke="#3fc1c9" strokeDasharray="2 2" />}
              {methods.map((m) => (
                <Line key={m} dataKey={`${m}:${v}`} name={METHOD_LABEL[m] ?? m} stroke={METHOD_COLORS[m] ?? '#888'}
                  dot={false} strokeWidth={1.8} connectNulls isAnimationActive={false} hide={!!hidden[m]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        {v === 'pressure_pa' ? t('tc.bandPressure') : v === 'carryover_pct' ? t('tc.bandCarry') : ''}
        {t('tc.toggle')}
      </p>
    </Panel>
  );
}

function ChartEmpty({ msg }: { msg: string }) {
  return <div className="h-[200px] grid place-items-center border border-dashed rounded-sm text-sm text-muted-foreground">{msg}</div>;
}

const ARM_COLORS: Record<string, string> = { F0V0: '#3fc1c9', F0V1: '#7fa9c9', F1V0: '#e8b04a', F1V1: '#ef6a4c' };

export function ArmsPanel({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  const arm = (f: number, v: number) => run.arms.find((a) => a.fluid === f && a.vessel === v);
  const rescueOn = (run.config.rescue_fraction ?? 0) > 0;
  const chartData = run.arms.map((a) => ({ ...a, err: [a.mean_flow_ul_min - a.ci_low, a.ci_high - a.mean_flow_ul_min] }));
  const armIdx = Object.fromEntries(run.arms.map((a, i) => [a.arm, i]));
  const chips = run.replicates.map((c) => ({ ...c, x: (armIdx[c.arm] ?? 0) + ((c.replicate % 7) - 3) * 0.04 }));
  const Cell2 = ({ f, v }: { f: number; v: number }) => {
    const a = arm(f, v);
    if (!a) return <div className="p-3 text-xs text-muted-foreground border border-dashed">{t('ar.missing')}</div>;
    return (
      <div className="p-3 border rounded-sm bg-background/60 hover:border-primary transition-colors" data-testid={`card-arm-${a.arm}`}>
        <div className="flex items-center gap-2">
          <span className="font-num text-xs font-semibold px-1 rounded-[2px] text-white" style={{ background: ARM_COLORS[a.arm] ?? '#666' }}>{a.arm}</span>
          <span className="text-[11px] text-muted-foreground truncate">{t(a.fluid ? 'ar.F1' : 'ar.F0')} / {t(a.vessel ? 'ar.V1' : 'ar.V0')}</span>
        </div>
        <div className="mt-2 font-num text-xl">{fmt(a.mean_flow_ul_min, 3)}<span className="text-[11px] text-muted-foreground"> µL/min</span></div>
        <div className="font-num text-[11px] text-muted-foreground">{t('ar.ci', { lo: fmt(a.ci_low, 3), hi: fmt(a.ci_high, 3), n: a.n })}</div>
        <div className="mt-2 grid grid-cols-2 gap-x-2 font-num text-[11px]">
          <span className="text-muted-foreground font-sans">{t('ar.normalized')}</span><span className="text-end">{fmt(a.normalized_flow_pct, 1)} %</span>
          <span className="text-muted-foreground font-sans">{t('ar.prescribed')}</span><span className="text-end">{fmt(a.permeability_um_s, 4)} µm/s</span>
          {rescueOn && <><span className="text-muted-foreground font-sans">{t('ar.withReversal')}</span><span className="text-end">{fmt(a.rescue_flow_ul_min, 3)} µL/min</span></>}
        </div>
      </div>
    );
  };
  return (
    <Panel kicker={t('ar.kicker')} title={t('ar.title')} right={<SimBadge />}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
        <div>
          <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-stretch">
            <div />
            <div className="stamp text-[9px] text-center text-muted-foreground">{t('ar.colV0')}</div>
            <div className="stamp text-[9px] text-center text-muted-foreground">{t('ar.colV1')}</div>
            <div className="stamp text-[9px] text-muted-foreground [writing-mode:vertical-rl] rotate-180 text-center">{t('ar.rowF0')}</div>
            <Cell2 f={0} v={0} /><Cell2 f={0} v={1} />
            <div className="stamp text-[9px] text-muted-foreground [writing-mode:vertical-rl] rotate-180 text-center">{t('ar.rowF1')}</div>
            <Cell2 f={1} v={0} /><Cell2 f={1} v={1} />
          </div>
          {run.contrasts.length > 0 && (
            <div className="mt-4">
              <div className="stamp text-[9px] text-muted-foreground mb-1">{t('ar.contrasts')}</div>
              <div className="grid gap-1">
                {run.contrasts.map((c, ci) => (
                  <div key={c.name} className="flex justify-between font-num text-xs border-b border-dashed py-1" data-testid={`text-contrast-${c.name}`}>
                    <span className="font-sans">{ci < 3 ? t(`ar.c.${ci as 0 | 1 | 2}`) : c.name.replace(/_/g, ' ')}</span><span className={c.value < 0 ? 'text-[#ef7a5a]' : ''}>{c.value > 0 ? '+' : ''}{fmt(c.value, 4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="h-[300px]" data-testid="chart-arms">
            <ResponsiveContainer>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 18 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="arm" tick={AXIS} label={{ value: t('ar.axisArm'), position: 'insideBottom', offset: -10, style: AXIS }} />
                <YAxis tick={AXIS} width={60} domain={[0, 'auto']} label={{ value: t('ar.axisMean'), angle: -90, position: 'insideLeft', style: { ...AXIS, textAnchor: 'middle' } }} />
                <Tooltip {...TT} formatter={(val, _n, p) => {
                  const a = (p as { payload?: { ci_low: number; ci_high: number } }).payload;
                  return [`${fmt(Number(val), 3)} µL/min  [${fmt(a?.ci_low, 3)}, ${fmt(a?.ci_high, 3)}]`, t('ar.meanCi')];
                }} />
                <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mean_flow_ul_min" name={t('ar.barMean')} maxBarSize={56} isAnimationActive={false}>
                  {chartData.map((a) => <Cell key={a.arm} fill={ARM_COLORS[a.arm] ?? '#888'} fillOpacity={0.8} />)}
                  <ErrorBar dataKey="err" width={8} strokeWidth={1.5} stroke="#cfe3e6" />
                </Bar>
                {rescueOn && <Bar dataKey="rescue_flow_ul_min" name={t('ar.barRescue')} maxBarSize={20} fill="#cfe3e6" fillOpacity={0.25} isAnimationActive={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {chips.length > 0 && (
            <div className="h-[170px] mt-2" data-testid="chart-chips">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 4, right: 8, left: 8, bottom: 18 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="2 4" />
                  <XAxis type="number" dataKey="x" domain={[-0.5, run.arms.length - 0.5]} ticks={run.arms.map((_, i) => i)}
                    tickFormatter={(i) => run.arms[i]?.arm ?? ''} tick={AXIS} label={{ value: t('ar.axisChips'), position: 'insideBottom', offset: -10, style: AXIS }} />
                  <YAxis type="number" dataKey="flow_ul_min" tick={AXIS} width={60} domain={['auto', 'auto']} label={{ value: 'µL/min', angle: -90, position: 'insideLeft', style: { ...AXIS, textAnchor: 'middle' } }} />
                  <Tooltip {...TT} cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                    const c = payload?.[0]?.payload as (typeof chips)[number] | undefined;
                    if (!c) return null;
                    return <div style={TT.contentStyle} className="p-2"><b>{c.arm} · {t('ar.chip', { n: c.replicate })}</b><br />r = {fmt(c.radius_um, 3)} µm<br />Q = {fmt(c.flow_ul_min, 4)} µL/min</div>;
                  }} />
                  <Scatter data={chips} isAnimationActive={false}>
                    {chips.map((c, i) => <Cell key={i} fill={ARM_COLORS[c.arm] ?? '#888'} fillOpacity={0.7} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {t('ar.footnote', { cv: run.config.radius_cv_pct ?? '—', n: run.config.replicates ?? '—' })}
        {rescueOn && t('ar.footRescue', { f: run.config.rescue_fraction ?? 0 })}
      </p>
    </Panel>
  );
}

export function TracerChart({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  const data = useMemo(() => {
    const m = new Map<number, Record<string, number>>();
    for (const t of run.tracer) {
      const row = m.get(t.time_s) ?? { time_s: t.time_s };
      row[`${t.condition}_recv`] = t.receiver_fraction * 100;
      row[`${t.condition}_donor`] = t.donor_fraction * 100;
      m.set(t.time_s, row);
    }
    return Array.from(m.values()).sort((a, b) => a.time_s - b.time_s);
  }, [run.tracer]);
  return (
    <Panel kicker={t('tr.kicker')} title={t('tr.title')}>
      {data.length === 0 ? <ChartEmpty msg={t('tr.empty')} /> : (
        <div className="h-[280px]" data-testid="chart-tracer">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 18 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="2 4" />
              <XAxis dataKey="time_s" type="number" domain={['dataMin', 'dataMax']} tick={AXIS} label={{ value: t('tc.time'), position: 'insideBottom', offset: -10, style: AXIS }} />
              <YAxis tick={AXIS} width={60} label={{ value: t('tr.axisY'), angle: -90, position: 'insideLeft', style: { ...AXIS, textAnchor: 'middle' } }} />
              <Tooltip {...TT} labelFormatter={(l) => `t = ${fmt(Number(l), 2)} s`} formatter={(val, name) => [`${fmt(Number(val), 4)} %`, String(name)]} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="healthy_recv" name={t('tr.recvHealthy')} stroke="#3fc1c9" dot={false} strokeWidth={1.8} isAnimationActive={false} connectNulls />
              <Line dataKey="injured_recv" name={t('tr.recvInjured')} stroke="#ef6a4c" dot={false} strokeWidth={1.8} isAnimationActive={false} connectNulls />
              <Line dataKey="healthy_donor" name={t('tr.donorHealthy')} stroke="#3fc1c9" strokeDasharray="4 3" dot={false} strokeWidth={1.2} isAnimationActive={false} connectNulls />
              <Line dataKey="injured_donor" name={t('tr.donorInjured')} stroke="#ef6a4c" strokeDasharray="4 3" dot={false} strokeWidth={1.2} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">{t('tr.footnote', { r: run.config.injury_permeability_ratio ?? '—' })}</p>
    </Panel>
  );
}

export function NotesPanel({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  return (
    <Panel kicker={t('np.kicker')} title={t('np.title')}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="stamp text-[9px] text-[#ef7a5a] mb-2">{t('np.warnings', { n: run.warnings.length })}</div>
          {run.warnings.length === 0 ? <p className="text-sm text-muted-foreground">{t('np.noWarnings')}</p> : (
            <ul className="space-y-1.5" data-testid="list-warnings">
              {run.warnings.map((w, i) => <li key={i} className="flex gap-2 text-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-[#ef7a5a] mt-0.5" /><EngineText text={w} /></li>)}
            </ul>
          )}
        </div>
        <div>
          <div className="stamp text-[9px] text-muted-foreground mb-2">{t('np.assumptions', { n: run.assumptions.length })}</div>
          <ol className="space-y-1.5 list-decimal ps-5 text-sm marker:font-num marker:text-muted-foreground" data-testid="list-assumptions">
            {run.assumptions.map((a, i) => <li key={i}><EngineText text={a} /></li>)}
          </ol>
        </div>
      </div>
    </Panel>
  );
}
