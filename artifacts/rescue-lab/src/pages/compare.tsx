import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  useListRuns, useGetSummary, useGetRun, getGetRunQueryKey, useGetRunVisualization, getGetRunVisualizationQueryKey,
} from '@workspace/api-client-react';
import { Columns2, Layers3, GitBranch } from 'lucide-react';
import { usePageTitle } from '@/components/shell';
import { Playback, usePlaybackDriver, usePlaybackState } from '@/lib/playback';
import { groupFrames, methodsOf, scaleOf, timeRange, sampleAt, type ViewMode, type MethodFrames } from '@/lib/viz';
import { METHOD_COLORS, METHOD_LABEL, METHOD_ORDER, fmt, fmtDate, humanError } from '@/lib/lab';
import { ViewportCanvas } from '@/components/lab/viewport-canvas';
import { Legend } from '@/components/lab/lab-viewport';
import { PlaybackBar } from '@/components/lab/playback-bar';
import { TimeChart, type Series } from '@/components/lab/time-chart';
import { ErrorBox } from '@/pages/workbench';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type CmpMode = 'topology' | 'runs';

function useRunVis(id: string) {
  const run = useGetRun(id, { query: { enabled: !!id, queryKey: getGetRunQueryKey(id) } });
  const vis = useGetRunVisualization(id, { query: { enabled: !!id, queryKey: getGetRunVisualizationQueryKey(id) } });
  return { run, vis };
}

export default function Compare() {
  const { t } = useI18n();
  usePageTitle(t('nav.compare'));
  const runs = useListRuns();
  const summary = useGetSummary();
  const sorted = useMemo(() => [...(runs.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)), [runs.data]);
  const [cmp, setCmp] = useState<CmpMode>('topology');
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [mA, setMA] = useState('stop_flow');
  const [mB, setMB] = useState('equalized');
  const [mode, setMode] = useState<ViewMode>('pressure');

  useEffect(() => {
    if (!idA && (summary.data?.latest_run_id || sorted[0])) setIdA(summary.data?.latest_run_id ?? sorted[0].id);
    if (!idB && sorted.length) setIdB(sorted[1]?.id ?? sorted[0].id);
  }, [summary.data, sorted, idA, idB]);

  const effB = cmp === 'topology' ? idA : idB;
  const A = useRunVis(idA);
  const B = useRunVis(effB);
  const gA = useMemo(() => groupFrames(A.vis.data), [A.vis.data]);
  const gB = useMemo(() => groupFrames(B.vis.data), [B.vis.data]);
  const methodsA = methodsOf(gA);
  const methodsB = methodsOf(gB);
  const methodB = cmp === 'runs' ? mA : mB;
  const scale = useMemo(() => scaleOf(A.vis.data, B.vis.data), [A.vis.data, B.vis.data]);

  const [pb] = useState(() => new Playback());
  usePlaybackDriver(pb);
  useEffect(() => () => pb.pause(), [pb]);
  useEffect(() => {
    if (!A.vis.data || !B.vis.data) return;
    const [a1, b1] = timeRange(A.vis.data); const [a2, b2] = timeRange(B.vis.data);
    pb.setRange(Math.min(a1, a2), Math.max(b1, b2), false); pb.play();
  }, [A.vis.data, B.vis.data, pb]);

  const sides = [
    { key: 'A', run: A.run.data, vis: A.vis.data ?? null, mf: gA[mA], method: mA, err: A.run.error ?? A.vis.error, loading: A.vis.isLoading },
    { key: 'B', run: B.run.data, vis: B.vis.data ?? null, mf: gB[methodB], method: methodB, err: B.run.error ?? B.vis.error, loading: B.vis.isLoading },
  ];
  const series: Series[] = sides.filter((x) => x.mf).map((x) => ({ id: x.key, mf: x.mf as MethodFrames, label: `${x.key} · ${METHOD_LABEL[x.method]}`, color: x.key === 'A' ? METHOD_COLORS[x.method] : '#e8f6f8', dashed: x.key === 'B' }));
  const snap = usePlaybackState(pb, 120);

  return (
    <div className="p-3 space-y-3 lab-grid-bg min-h-[calc(100dvh-86px)]">
      <div className="glass rounded-md p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 me-2"><Columns2 className="h-4 w-4 text-primary" /><h1 className="font-semibold">{t('cmp.title')}</h1></div>
        <div className="flex rounded-md border overflow-hidden" role="group" aria-label={t('cmp.typeAria')}>
          <button onClick={() => setCmp('topology')} data-testid="button-compare-topology" aria-pressed={cmp === 'topology'}
            className={cn('px-3 py-1.5 text-xs flex items-center gap-1.5', cmp === 'topology' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}><GitBranch className="h-3.5 w-3.5" />{t('cmp.twoTopologies')}</button>
          <button onClick={() => setCmp('runs')} data-testid="button-compare-runs" aria-pressed={cmp === 'runs'}
            className={cn('px-3 py-1.5 text-xs flex items-center gap-1.5', cmp === 'runs' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}><Layers3 className="h-3.5 w-3.5" />{t('cmp.twoRuns')}</button>
        </div>
        <RunSelect label={t('cmp.runA')} value={idA} onChange={setIdA} runs={sorted} tid="select-compare-run-a" />
        {cmp === 'runs' && <RunSelect label={t('cmp.runB')} value={idB} onChange={setIdB} runs={sorted} tid="select-compare-run-b" />}
        <MethodSelect label={cmp === 'runs' ? t('cmp.topologyBoth') : 'A'} value={mA} onChange={setMA} methods={methodsA.length ? methodsA : METHOD_ORDER} tid="select-compare-method-a" />
        {cmp === 'topology' && <MethodSelect label="B" value={mB} onChange={setMB} methods={methodsB.length ? methodsB : METHOD_ORDER} tid="select-compare-method-b" />}
        <div className="flex rounded-md border overflow-hidden ms-auto" role="group" aria-label={t('vp.viewMode')}>
          {(['pressure', 'velocity', 'tracer'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} data-testid={`button-compare-mode-${m}`} aria-pressed={mode === m}
              className={cn('px-2.5 py-1.5 text-xs', mode === m ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}>{t(`vp.mode.${m}`)}</button>
          ))}
        </div>
      </div>

      {runs.isSuccess && sorted.length === 0 && <div className="glass rounded-md p-8 text-center text-sm text-muted-foreground">{t('cmp.empty')}</div>}
      {runs.isError && <ErrorBox msg={humanError(runs.error)} onRetry={() => runs.refetch()} />}

      <div className="grid md:grid-cols-2 gap-3">
        {sides.map((x) => {
          const smp = sampleAt(x.mf, snap.t);
          return (
            <div key={x.key} className="space-y-2" data-testid={`panel-compare-${x.key}`}>
              <div className="relative h-[46dvh] min-h-[320px] rounded-lg overflow-hidden border border-[hsl(190_40%_30%/.35)] bg-[#10243A] theme-instrument">
                {x.err ? <div className="p-4"><ErrorBox msg={humanError(x.err)} /></div>
                  : x.loading || !x.vis ? <Skeleton className="absolute inset-0 rounded-none bg-secondary/40" />
                  : <ViewportCanvas vis={x.vis} mf={x.mf} pb={pb} scale={scale} mode={mode} opacity={0.85} crossOn={false} crossPos={0.5} showLabels={false} showTracers
                      channelsTotal={x.vis.geometry.channels} radiusUm={x.vis.geometry.radius_um} selected={null} onSelect={() => {}} resetSignal={0} cameraPos={[1, 7, 11.5]} />}
                <div className="absolute top-2 start-2 glass rounded-md px-2 py-1 text-[11px] flex items-center gap-2">
                  <b className="font-num">{x.key}</b><span className="h-2 w-2 rounded-full" style={{ background: METHOD_COLORS[x.method] }} />
                  {METHOD_LABEL[x.method]} · <span className="truncate max-w-[180px]">{x.run?.config.name ?? '…'}</span>
                </div>
                <div className="absolute bottom-2 left-2 scale-90 origin-bottom-left" dir="ltr"><Legend mode={mode} scale={scale} hasData={!!x.vis} /></div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 font-num text-[11px]">
                {([['p', smp?.pressure_pa, 'Pa'], ['Q', smp?.flow_ul_min, 'µL/min'], ['u', smp?.mean_velocity_mm_s, 'mm/s'], ['carry', smp?.carryover_pct, '%']] as const).map(([k, v, u]) => (
                  <div key={k} className="glass rounded px-2 py-1"><div className="text-muted-foreground text-[9.5px]">{t(`cmp.q.${k}`)} · {u}</div><div data-testid={`text-compare-${x.key}-${k === 'u' ? 'ū' : k}`}>{fmt(v, 3)}</div></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <PlaybackBar pb={pb} disabled={!A.vis.data || !B.vis.data} />

      <div className="grid md:grid-cols-2 gap-3">
        <div className="glass rounded-md p-3"><div className="stamp text-[9px] text-muted-foreground mb-1">{t('cmp.chartPressure')}</div>
          <TimeChart series={series} field="pressure_pa" unit="Pa" t={snap.t} testId="chart-compare-pressure" height={170} /></div>
        <div className="glass rounded-md p-3"><div className="stamp text-[9px] text-muted-foreground mb-1">{t('cmp.chartCarryover')}</div>
          <TimeChart series={series} field="carryover_pct" unit="%" t={snap.t} testId="chart-compare-carryover" height={170} /></div>
      </div>
      <p className="text-[11px] text-muted-foreground">{t('cmp.footnote')}</p>
    </div>
  );
}

function RunSelect({ label, value, onChange, runs, tid }: { label: string; value: string; onChange: (v: string) => void; runs: { id: string; name: string; created_at: string }[]; tid: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={tid} className="bg-background border rounded px-2 py-1 text-xs max-w-[220px]">
        {runs.map((r) => <option key={r.id} value={r.id}>{r.name} · {fmtDate(r.created_at)}</option>)}
      </select></label>
  );
}
function MethodSelect({ label, value, onChange, methods, tid }: { label: string; value: string; onChange: (v: string) => void; methods: string[]; tid: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={tid} className="bg-background border rounded px-2 py-1 text-xs">
        {methods.map((m) => <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>)}
      </select></label>
  );
}
