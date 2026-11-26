import { useMemo, type ReactNode } from 'react';
import { EngineText } from '@/components/engine-text';
import { Link } from 'wouter';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import type { ExperimentInput, RunVisualization, SimulationRun } from '@workspace/api-client-react';
import { Activity, ArrowRight, Gauge, Waves, Droplet, Thermometer, Ruler, FlaskRound, Info, Scissors, GitCompareArrows } from 'lucide-react';
import { type Playback, usePlaybackState } from '@/lib/playback';
import { type MethodFrames, sampleAt, interpUniform, interpGrid } from '@/lib/viz';
import { METHOD_LABEL, METHOD_COLORS, fmt } from '@/lib/lab';
import { TimeChart } from './time-chart';
import { Inspector } from './inspector';
import { useI18n } from '@/lib/i18n';

function Section({ title, icon: Icon, children, right }: { title: string; icon: typeof Gauge; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="border-b px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-primary/80" /><h3 className="stamp text-[9.5px] text-muted-foreground">{title}</h3>
        <div className="ms-auto">{right}</div>
      </div>
      {children}
    </section>
  );
}

function Readout({ label, value, unit, tid, icon: Icon }: { label: string; value: string; unit: string; tid: string; icon: typeof Gauge }) {
  return (
    <div className="rounded-md border bg-background/40 px-2.5 py-2 min-w-0">
      <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground truncate"><Icon className="h-3 w-3 shrink-0" />{label}</div>
      <div className="font-num text-[15px] leading-tight mt-0.5 truncate" data-testid={tid}>{value}<span className="text-[10px] text-muted-foreground ms-1">{unit}</span></div>
    </div>
  );
}

export function MetricsPanel({ run, kind, vis, groups, methods, method, pb, crossOn, crossPos, selected, onCloseInspector, config }: {
  run: SimulationRun | null; kind: 'saved' | 'preview' | null; vis: RunVisualization | null; groups: Record<string, MethodFrames>; methods: string[];
  method: string; pb: Playback; crossOn: boolean; crossPos: number; selected: string | null; onCloseInspector: () => void; config: ExperimentInput | undefined;
}) {
  const { t } = useI18n();
  const snap = usePlaybackState(pb, 120);
  const mf = groups[method];
  const s = sampleAt(mf, snap.t);
  const s0 = sampleAt(mf, snap.tMin);
  const series = useMemo(() => methods.map((m) => ({ id: m, mf: groups[m] })), [methods, groups]);
  const switchS = run?.config.switch_s;

  const profile = useMemo(() => {
    if (!s || !vis) return [];
    const rows: { r: number; u: number }[] = [];
    const rf = vis.radial_fractions;
    for (let i = rf.length - 1; i >= 0; i--) rows.push({ r: -rf[i], u: s.radial[i] });
    for (let i = 1; i < rf.length; i++) rows.push({ r: rf[i], u: s.radial[i] });
    return rows;
  }, [s, vis]);

  if (!run || !vis) {
    return (
      <aside className="h-full border-s bg-card/80 p-5 flex flex-col gap-3" data-testid="panel-metrics">
        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><h2 className="font-semibold">{t('m.live')}</h2></div>
        <p className="text-sm text-muted-foreground">{run ? t('m.loadingFrames') : t('m.noRun')}</p>
        {selected && <Inspector id={selected} onClose={onCloseInspector} config={config} vis={null} s={null} />}
      </aside>
    );
  }

  const xMm = crossPos * vis.geometry.length_mm;
  const pAtX = s ? interpUniform(s.axial, crossPos) : null;
  const cmp: [string, number | undefined, number | undefined, string][] = [
    [t('m.q.inletPressure'), s0?.pressure_pa, s?.pressure_pa, 'Pa'], [t('m.q.flow'), s0?.flow_ul_min, s?.flow_ul_min, 'µL/min'],
    [t('m.q.meanVelocity'), s0?.mean_velocity_mm_s, s?.mean_velocity_mm_s, 'mm/s'], [t('m.q.wallShear'), s0?.wall_shear_pa, s?.wall_shear_pa, 'Pa'],
    [t('m.q.viscosity'), s0?.viscosity_mpas, s?.viscosity_mpas, 'mPa·s'], [t('m.q.carryover'), s0?.carryover_pct, s?.carryover_pct, '%'],
  ];

  return (
    <aside className="h-full min-h-0 overflow-y-auto lab-scroll border-s bg-card/80" data-testid="panel-metrics">
      <div className="px-4 pt-3 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /><h2 className="font-semibold tracking-tight truncate" data-testid="text-run-name">{run.config.name ?? t('m.untitled')}</h2>
          <span className={kind === 'preview' ? 'ms-auto stamp text-[9px] px-1.5 py-0.5 rounded-[3px] border border-[#e8b04a]/50 text-[#f0c674]' : 'ms-auto stamp text-[9px] px-1.5 py-0.5 rounded-[3px] border border-primary/40 text-primary'}
            data-testid="status-run-kind">{kind === 'preview' ? t('m.unsavedPreview') : t('m.savedRun')}</span>
        </div>
        <div className="mt-1.5 font-num text-[10px] text-muted-foreground space-y-0.5">
          <div data-testid="text-run-id">{t('m.meta', { run: kind === 'preview' ? t('m.previewNotStored') : t('m.run', { id: run.id.slice(0, 8) }), model: run.model_version, viz: vis.visualization_version, seed: run.config.seed ?? '—' })}</div>
          <div className="truncate" title={run.fingerprint} data-testid="text-fingerprint">sha256 {run.fingerprint.slice(0, 24)}…</div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10.5px] text-[#ef7a5a]"><Info className="h-3 w-3" />{t('m.honesty')}</div>
      </div>

      <Section title={t('m.liveTitle', { method: METHOD_LABEL[method] ?? method, t: snap.t.toFixed(2) })} icon={Gauge}
        right={<span className="h-2 w-2 rounded-full inline-block" style={{ background: METHOD_COLORS[method] }} />}>
        <div className="grid grid-cols-2 gap-1.5">
          <Readout icon={Gauge} label={t('m.inletPressure')} value={fmt(s?.pressure_pa, 1)} unit="Pa" tid="text-live-pressure" />
          <Readout icon={Droplet} label={t('m.totalFlow')} value={fmt(s?.flow_ul_min, 3)} unit="µL/min" tid="text-live-flow" />
          <Readout icon={Waves} label={t('m.meanVelocity')} value={fmt(s?.mean_velocity_mm_s, 3)} unit="mm/s" tid="text-live-velocity" />
          <Readout icon={Waves} label={t('m.centerline')} value={fmt(s?.centerline_velocity_mm_s, 3)} unit="mm/s" tid="text-live-centerline" />
          <Readout icon={Ruler} label={t('m.wallShear')} value={fmt(s?.wall_shear_pa, 3)} unit="Pa" tid="text-live-shear" />
          <Readout icon={Thermometer} label={t('m.viscosity')} value={fmt(s?.viscosity_mpas, 3)} unit="mPa·s" tid="text-live-viscosity" />
          <Readout icon={FlaskRound} label={t('m.carryover')} value={fmt(s?.carryover_pct, 2)} unit="%" tid="text-live-carryover" />
          <Readout icon={ArrowRight} label={t('m.displacement')} value={fmt(s?.displacement_mm, 3)} unit="mm" tid="text-live-displacement" />
        </div>
      </Section>

      <Section title={t('m.chart.pressure')} icon={Activity}>
        <TimeChart series={series} field="pressure_pa" unit="Pa" t={snap.t} switchS={switchS} testId="chart-live-pressure" active={method} />
      </Section>
      <Section title={t('m.chart.flow')} icon={Droplet}>
        <TimeChart series={series} field="flow_ul_min" unit="µL/min" t={snap.t} switchS={switchS} testId="chart-live-flow" active={method} height={105} />
      </Section>
      <Section title={t('m.chart.carryover')} icon={FlaskRound}>
        <TimeChart series={series} field="carryover_pct" unit="%" t={snap.t} switchS={switchS} testId="chart-live-carryover" active={method} height={95} />
      </Section>

      <Section title={t('m.section', { x: fmt(xMm, 2) })} icon={Scissors} right={!crossOn && <span className="text-[9.5px] text-muted-foreground">{t('m.enableSection')}</span>}>
        <div className="flex gap-4 font-num text-[11px] mb-1">
          <span>p(x) <b data-testid="text-section-pressure">{fmt(pAtX, 2)}</b> Pa</span>
          <span>u(0) <b>{fmt(s ? interpGrid(vis.radial_fractions, s.radial, 0) : null, 3)}</b> mm/s</span>
        </div>
        <div className="h-[110px]" data-testid="chart-radial-profile">
          <ResponsiveContainer>
            <LineChart data={profile} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(200 22% 15%)" strokeDasharray="2 4" />
              <XAxis dataKey="r" type="number" domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} tick={{ fontSize: 10, fill: 'hsl(198 14% 58%)' }} height={18} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(198 14% 58%)' }} width={44} domain={[-vis.velocity_abs_max_mm_s, vis.velocity_abs_max_mm_s]} tickFormatter={(v) => fmt(Number(v), 1)} />
              <ReferenceLine y={0} stroke="hsl(200 22% 30%)" />
              <Line dataKey="u" stroke="#f6cf7c" dot={false} strokeWidth={1.8} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[9.5px] text-muted-foreground mt-1">{t('m.profileNote')}</p>
      </Section>

      <Section title={t('m.beforeAfter')} icon={GitCompareArrows}>
        <table className="w-full font-num text-[11px]" data-testid="table-before-after">
          <thead><tr className="text-muted-foreground text-[9.5px]"><th className="text-start font-normal">{t('m.quantity')}</th><th className="text-end font-normal">t={fmt(snap.tMin, 1)} s</th><th className="text-end font-normal">t={snap.t.toFixed(1)} s</th><th className="text-end font-normal">Δ</th></tr></thead>
          <tbody>{cmp.map(([k, a, b, u]) => (
            <tr key={k} className="border-t border-dashed"><td className="py-1 font-sans">{k} <span className="text-muted-foreground">{u}</span></td>
              <td className="text-end">{fmt(a, 2)}</td><td className="text-end">{fmt(b, 2)}</td>
              <td className={`text-end ${a !== undefined && b !== undefined && b - a < 0 ? 'text-[#7fb2ef]' : 'text-[#f0c674]'}`}>{a !== undefined && b !== undefined ? fmt(b - a, 2) : '—'}</td></tr>
          ))}</tbody>
        </table>
        <p className="text-[9.5px] text-muted-foreground mt-1.5">{t('m.beforeAfterNote')}</p>
      </Section>

      {selected && <div className="px-4 py-3 border-b"><Inspector id={selected} onClose={onCloseInspector} config={run.config} vis={vis} s={s} /></div>}

      <Section title={t('m.vizNotes')} icon={Info}>
        <ul className="space-y-1 text-[10.5px] text-muted-foreground list-disc ps-4" data-testid="list-viz-notes">
          {vis.notes.map((n, i) => <li key={i}><EngineText text={n} /></li>)}
          <li>{t('m.tracerNote')}</li>
        </ul>
        <div className="mt-2 text-[10.5px]">
          {run.warnings.length > 0 && <span className="text-[#ef7a5a] me-2">{t('m.warnings', { n: run.warnings.length })}</span>}
          {kind === 'saved'
            ? <Link href={`/analysis?run=${run.id}`} className="text-primary underline" data-testid="link-open-analysis">{t('m.openAnalysis')}</Link>
            : <span className="text-muted-foreground">{t('m.saveToAnalyze')}</span>}
        </div>
      </Section>
    </aside>
  );
}
