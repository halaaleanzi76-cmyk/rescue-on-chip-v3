import { useEffect, useMemo, useRef, useState } from 'react';
import { usePageTitle } from '@/components/shell';
import { useLabSession } from '@/hooks/use-lab-session';
import { Playback, usePlaybackDriver } from '@/lib/playback';
import { groupFrames, methodsOf, scaleOf, timeRange } from '@/lib/viz';
import { humanError } from '@/lib/lab';
import { ConfigPanel } from '@/components/lab/config-panel';
import { MetricsPanel } from '@/components/lab/metrics-panel';
import { LabViewport, type ViewState } from '@/components/lab/lab-viewport';
import { PlaybackBar } from '@/components/lab/playback-bar';
import { ErrorBox } from '@/pages/workbench';
import { ExperimentGuide } from '@/components/lab/experiment-guide';
import { BookOpenCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Laboratory() {
  const { t } = useI18n();
  usePageTitle(t('nav.lab'));
  const s = useLabSession();
  const [pb] = useState(() => new Playback());
  usePlaybackDriver(pb);
  useEffect(() => () => pb.pause(), [pb]);

  const [view, setViewState] = useState<ViewState>({
    mode: 'pressure', opacity: 0.85, crossOn: false, crossPos: 0.5,
    showLabels: window.matchMedia('(min-width: 640px)').matches, showTracers: true,
    method: 'equalized', selected: null, resetSignal: 0,
  });
  const setView = (p: Partial<ViewState>) => setViewState((v) => ({ ...v, ...p }));
  // First visit opens the explanation automatically; afterwards it stays one click away.
  const [guideOpen, setGuideOpen] = useState(() => !localStorage.getItem('roc.guideSeen'));
  const closeGuide = () => { localStorage.setItem('roc.guideSeen', '1'); setGuideOpen(false); };

  const d = s.displayed;
  const vis = d?.vis ?? null;
  const groups = useMemo(() => groupFrames(vis), [vis]);
  const methods = useMemo(() => methodsOf(groups), [groups]);
  const scale = useMemo(() => scaleOf(vis), [vis]);

  useEffect(() => { if (methods.length && !methods.includes(view.method)) setView({ method: methods[methods.length - 1] }); }, [methods, view.method]);

  // New saved run: restart and auto-play. Preview update: keep the playback time so the change is visible in place.
  const lastVisId = useRef<string | null>(null);
  useEffect(() => {
    if (!vis) return;
    const [a, b] = timeRange(vis);
    if (lastVisId.current === vis.run_id) return;
    const isPreview = d?.kind === 'preview';
    const wasPreviewChain = lastVisId.current?.startsWith('preview') || isPreview;
    pb.setRange(a, b, !!wasPreviewChain && lastVisId.current !== null);
    lastVisId.current = vis.run_id;
    if (!isPreview) pb.play();
  }, [vis, d?.kind, pb]);

  const cfg = d?.run.config ?? s.run.data?.config;
  const base = cfg ?? s.model.data?.defaults;

  const status = (
    <div className="glass rounded-md px-2.5 py-1.5 text-[11px] flex items-center gap-2" data-testid="status-viewport">
      {s.pending ? <><span className="h-2 w-2 rounded-full bg-primary animate-pulse" />{t('lab.status.computing')}</>
        : d?.kind === 'preview' ? <><span className="h-2 w-2 rounded-full bg-[#e8b04a]" />{t('lab.status.preview')}</>
        : d && !vis && s.vis.isLoading ? <><span className="h-2 w-2 rounded-full bg-primary animate-pulse" />{t('lab.status.loadingFrames')}</>
        : d && vis ? <><span className="h-2 w-2 rounded-full bg-[#3fc1c9]" />{t('lab.status.saved', { id: d.run.id.slice(0, 8) })}</>
        : s.summary.isSuccess && !s.runId ? <><span className="h-2 w-2 rounded-full bg-muted-foreground" />{t('lab.status.noRuns')}</>
        : <><span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />{t('lab.status.connecting')}</>}
    </div>
  );

  return (
    <div className="lg:h-[calc(100dvh-86px)] grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_350px] xl:grid-cols-[340px_minmax(0,1fr)_370px]">
      <div className="order-2 lg:order-none min-h-0 lg:h-full max-h-[80dvh] lg:max-h-none"><ConfigPanel s={s} /></div>
      <div className="order-1 lg:order-none min-h-0 flex flex-col gap-2 p-2 lab-grid-bg">
        {(s.run.isError || s.vis.isError || s.summary.isError) && (
          <ErrorBox msg={humanError(s.run.error ?? s.vis.error ?? s.summary.error)} onRetry={() => { s.run.refetch(); s.vis.refetch(); s.summary.refetch(); }} />
        )}
        <div className="relative flex-1 min-h-[58dvh] lg:min-h-0">
          <div className="absolute z-10 bottom-14 inset-x-0 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full flex justify-center">
              {guideOpen
                ? <ExperimentGuide s={s} pb={pb} run={d?.run ?? null} setView={setView} onClose={closeGuide} />
                : <button type="button" onClick={() => setGuideOpen(true)} data-testid="button-open-guide"
                    className="glass inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs text-primary hover:bg-primary/15">
                    <BookOpenCheck className="h-3.5 w-3.5" />{t('guide.open')}
                  </button>}
            </div>
          </div>
          <LabViewport vis={vis} groups={groups} methods={methods} pb={pb} scale={scale} view={view} setView={setView}
            channelsTotal={base?.channels ?? 12} radiusUm={base?.radius_um ?? 25} status={status} />
        </div>
        <PlaybackBar pb={pb} switchS={vis ? d?.run.config.switch_s : undefined} disabled={!vis} />
      </div>
      <div className="order-3 lg:order-none min-h-0 lg:h-full">
        <MetricsPanel run={d?.run ?? null} kind={d?.kind ?? null} vis={vis} groups={groups} methods={methods} method={view.method} pb={pb}
          crossOn={view.crossOn} crossPos={view.crossPos} selected={view.selected} onCloseInspector={() => setView({ selected: null })} config={cfg} />
      </div>
    </div>
  );
}
