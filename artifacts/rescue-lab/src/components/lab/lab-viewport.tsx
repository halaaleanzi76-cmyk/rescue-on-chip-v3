import { useState, type ReactNode } from 'react';
import type { RunVisualization } from '@workspace/api-client-react';
import { Gauge, Waves, Sparkles, Scissors, Tag, Crosshair, Eye } from 'lucide-react';
import type { Playback } from '@/lib/playback';
import { type MethodFrames, type Scale, type ViewMode, PRESSURE_STOPS, VELOCITY_STOPS, gradientCss, displayCount } from '@/lib/viz';
import { METHOD_COLORS, METHOD_LABEL, fmt } from '@/lib/lab';
import { cn } from '@/lib/utils';
import { ViewportCanvas } from './viewport-canvas';
import { useI18n, tr } from '@/lib/i18n';

export interface ViewState {
  mode: ViewMode; opacity: number; crossOn: boolean; crossPos: number; showLabels: boolean; showTracers: boolean;
  method: string; selected: string | null; resetSignal: number;
}

const MODES: { id: ViewMode; icon: typeof Gauge }[] = [
  { id: 'pressure', icon: Gauge },
  { id: 'velocity', icon: Waves },
  { id: 'tracer', icon: Sparkles },
];

export function Legend({ mode, scale, hasData }: { mode: ViewMode; scale: Scale; hasData: boolean }) {
  const { t } = useI18n();
  if (!hasData) return null;
  if (mode === 'tracer') {
    return (
      <div className="glass rounded-md px-3 py-2 text-[10px] max-w-[260px]" data-testid="legend-scale">
        <div className="stamp text-[9px] text-muted-foreground">{t('vp.tracersTitle')}</div>
        <p className="mt-1 text-muted-foreground leading-snug">{t('vp.tracersBody')}</p>
      </div>
    );
  }
  const p = mode === 'pressure';
  return (
    <div className="glass rounded-md px-3 py-2 w-[240px]" data-testid="legend-scale">
      <div className="stamp text-[9px] text-muted-foreground">{p ? t('vp.legend.pressure') : t('vp.legend.velocity')}</div>
      <div className="h-2.5 rounded-sm mt-1.5" style={{ background: gradientCss(p ? PRESSURE_STOPS : VELOCITY_STOPS) }} />
      <div className="flex justify-between font-num text-[10px] mt-1" dir="ltr">
        <span data-testid="text-legend-min">{p ? fmt(scale.pMin, 1) : `−${fmt(scale.vMax, 2)}`}</span>
        {!p && <span>0</span>}
        <span data-testid="text-legend-max">{p ? fmt(scale.pMax, 1) : `+${fmt(scale.vMax, 2)}`}</span>
      </div>
      {!p && <div className="text-[9px] text-muted-foreground mt-0.5">{t('vp.legend.velocityNote')}</div>}
    </div>
  );
}

export function LabViewport({ vis, groups, methods, pb, scale, view, setView, channelsTotal, radiusUm, status }: {
  vis: RunVisualization | null; groups: Record<string, MethodFrames>; methods: string[]; pb: Playback; scale: Scale;
  view: ViewState; setView: (p: Partial<ViewState>) => void; channelsTotal: number; radiusUm: number; status: ReactNode;
}) {
  const { t } = useI18n();
  const nTotal = vis?.geometry.channels ?? channelsTotal;
  const [toolsOpen, setToolsOpen] = useState(false);
  return (
    <div className="relative h-full min-h-[460px] rounded-lg overflow-hidden border border-[hsl(190_40%_30%/.35)] bg-[#071116]" data-testid="viewport-3d">
      <ViewportCanvas vis={vis} mf={groups[view.method]} pb={pb} scale={scale} mode={view.mode} opacity={view.opacity}
        crossOn={view.crossOn} crossPos={view.crossPos} showLabels={view.showLabels} showTracers={view.showTracers}
        channelsTotal={channelsTotal} radiusUm={radiusUm} selected={view.selected} onSelect={(id) => setView({ selected: id })} resetSignal={view.resetSignal} />

      {/* top-left: identity + honesty labels */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 max-w-[calc(100%_-_120px)] sm:max-w-[60%] pointer-events-none">
        <div className="pointer-events-auto">{status}</div>
        <div className="flex flex-wrap gap-1.5">
          <span className="stamp text-[9px] px-1.5 py-0.5 rounded-[3px] border border-[#e8b04a]/50 text-[#e8b04a] bg-[#071116]/70" data-testid="label-conceptual">{t('vp.conceptual')}</span>
          <span className="stamp text-[9px] px-1.5 py-0.5 rounded-[3px] border border-primary/50 text-primary bg-[#071116]/70" data-testid="label-analytical">{t('vp.analytical')}</span>
        </div>
        <span className="font-num text-[10px] text-muted-foreground" data-testid="text-channel-count">
          {t('vp.channelCount', { shown: displayCount(nTotal), total: nTotal })}
        </span>
      </div>

      {/* top-right: tools */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <button type="button" aria-expanded={toolsOpen} aria-controls="viewport-tools" data-testid="button-mobile-view-tools"
          onClick={() => setToolsOpen((open) => !open)}
          className="sm:hidden glass rounded-md px-2.5 py-2 text-xs text-primary">
          {toolsOpen ? t('vp.closeControls') : t('vp.viewControls')}
        </button>
        <div id="viewport-tools" className={cn('flex-col items-end gap-2', toolsOpen ? 'flex' : 'hidden', 'sm:flex')}>
        <div className="glass rounded-md p-1 flex" role="group" aria-label={t('vp.viewMode')}>
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setView({ mode: m.id })} data-testid={`button-mode-${m.id}`} aria-pressed={view.mode === m.id}
              className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded text-xs', view.mode === m.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
              <m.icon className="h-3.5 w-3.5" />{t(`vp.mode.${m.id}`)}
            </button>
          ))}
        </div>
        {methods.length > 0 && (
          <div className="glass rounded-md p-1 flex" role="group" aria-label={t('vp.topology')}>
            {methods.map((m) => (
              <button key={m} onClick={() => setView({ method: m })} data-testid={`button-method-${m}`} aria-pressed={view.method === m}
                className={cn('flex items-center gap-1.5 px-2 py-1 rounded text-[11px]', view.method === m ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <span className="h-2 w-2 rounded-full" style={{ background: METHOD_COLORS[m] }} />{METHOD_LABEL[m] ?? m}
              </button>
            ))}
          </div>
        )}
        <div className="glass rounded-md p-2 w-[230px] space-y-2 text-[11px]">
          <label className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-muted-foreground" /><span className="w-16">{t('vp.opacity')}</span>
            <input type="range" min={0.15} max={1} step={0.05} value={view.opacity} onChange={(e) => setView({ opacity: Number(e.target.value) })}
              className="lab-range flex-1" aria-label={t('vp.opacityAria')} data-testid="input-opacity" /></label>
          <div className="flex gap-1">
            <Toggle on={view.crossOn} onClick={() => setView({ crossOn: !view.crossOn })} icon={Scissors} label={t('vp.section')} tid="button-cross-section" />
            <Toggle on={view.showTracers} onClick={() => setView({ showTracers: !view.showTracers })} icon={Sparkles} label={t('vp.tracers')} tid="button-tracers" />
            <Toggle on={view.showLabels} onClick={() => setView({ showLabels: !view.showLabels })} icon={Tag} label={t('vp.labels')} tid="button-labels" />
          </div>
          {view.crossOn && (
            <label className="flex items-center gap-2"><span className="w-16 text-muted-foreground">x / L</span>
              <input type="range" min={0.02} max={0.98} step={0.01} value={view.crossPos} onChange={(e) => setView({ crossPos: Number(e.target.value) })}
                className="lab-range flex-1" aria-label={t('vp.crossAria')} data-testid="input-cross-position" />
              <span className="font-num w-9 text-end">{view.crossPos.toFixed(2)}</span></label>
          )}
          <button onClick={() => setView({ resetSignal: view.resetSignal + 1 })} data-testid="button-reset-view"
            className="w-full flex items-center justify-center gap-1.5 border rounded px-2 py-1 hover:bg-secondary"><Crosshair className="h-3.5 w-3.5" />{t('vp.reset')}</button>
        </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3"><Legend mode={view.mode} scale={scale} hasData={!!vis} /></div>
      <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground font-num hidden md:block pointer-events-none">{t('vp.hint')}</div>
    </div>
  );
}

function Toggle({ on, onClick, icon: Icon, label, tid }: { on: boolean; onClick: () => void; icon: typeof Gauge; label: string; tid: string }) {
  return (
    <button onClick={onClick} aria-pressed={on} data-testid={tid}
      className={cn('flex-1 flex items-center justify-center gap-1 rounded border px-1.5 py-1', on ? 'border-primary/60 bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}>
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );
}
