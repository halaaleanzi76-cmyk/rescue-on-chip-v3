import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { type Playback, SPEEDS, usePlaybackState } from '@/lib/playback';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

export function PlaybackBar({ pb, switchS, disabled, idPrefix = '' }: { pb: Playback; switchS?: number; disabled?: boolean; idPrefix?: string }) {
  const { t } = useI18n();
  const s = usePlaybackState(pb, 50);
  const span = s.tMax - s.tMin || 1;
  const pct = ((s.t - s.tMin) / span) * 100;
  const swPct = switchS !== undefined ? ((switchS - s.tMin) / span) * 100 : null;
  return (
    <div className={cn('glass rounded-md px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2', disabled && 'opacity-50 pointer-events-none')} aria-label={t('pb.aria')}>
      <button onClick={() => pb.toggle()} data-testid={`${idPrefix}button-${s.playing ? 'pause' : 'play'}`} aria-label={s.playing ? t('pb.pause') : s.t > s.tMin ? t('pb.resume') : t('pb.start')}
        className="h-8 w-8 grid place-items-center rounded-md bg-primary text-primary-foreground hover:brightness-110 active:translate-y-px">
        {s.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>
      <button onClick={() => pb.restart()} data-testid={`${idPrefix}button-restart`} aria-label={t('pb.restart')} title={t('pb.restartTitle')}
        className="h-8 w-8 grid place-items-center rounded-md border hover:bg-secondary"><RotateCcw className="h-4 w-4" /></button>
      {switchS !== undefined && (
        <button onClick={() => pb.seek(Math.max(s.tMin, switchS - 2))} data-testid={`${idPrefix}button-jump-switch`} title={t('pb.jumpTitle')}
          className="h-8 px-2 inline-flex items-center gap-1 rounded-md border text-[11px] hover:bg-secondary"><SkipForward className="h-3.5 w-3.5 rtl:-scale-x-100" />{t('pb.switch')}</button>
      )}
      <div dir="ltr" className="font-num text-xs w-[118px] tabular-nums" data-testid={`${idPrefix}text-time`}>
        t = <b className="text-foreground">{s.t.toFixed(2)}</b><span className="text-muted-foreground"> / {s.tMax.toFixed(1)} s</span>
      </div>
      <div className="relative flex-1 min-w-[160px]" dir="ltr">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded bg-secondary" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded bg-primary/70" style={{ width: `${pct}%` }} />
        {swPct !== null && swPct >= 0 && swPct <= 100 && <div className="absolute top-0 bottom-0 w-px bg-[#ef7a5a]" style={{ left: `${swPct}%` }} title={t('pb.switch')} />}
        <input type="range" min={s.tMin} max={s.tMax} step={span / 1000} value={s.t} onChange={(e) => pb.seek(Number(e.target.value))}
          aria-label={t('pb.scrub')} data-testid={`${idPrefix}input-scrub`} className="lab-range relative w-full opacity-0 h-6 cursor-pointer" />
        <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-background" style={{ left: `${pct}%` }} />
      </div>
      <div className="flex rounded-md border overflow-hidden" role="group" aria-label={t('pb.speed')} dir="ltr">
        {SPEEDS.map((sp) => (
          <button key={sp} onClick={() => pb.setSpeed(sp)} data-testid={`${idPrefix}button-speed-${sp}`} aria-pressed={s.speed === sp}
            className={cn('px-2 py-1 font-num text-[11px]', s.speed === sp ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary')}>{sp}x</button>
        ))}
      </div>
    </div>
  );
}
