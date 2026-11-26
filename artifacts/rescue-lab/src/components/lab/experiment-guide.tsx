import { useState } from 'react';
import { BookOpenCheck, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { SimulationRun } from '@workspace/api-client-react';
import type { Playback } from '@/lib/playback';
import type { LabSession } from '@/hooks/use-lab-session';
import { METHOD_COLORS, METHOD_LABEL, METHOD_ORDER, fmt } from '@/lib/lab';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ViewState } from './lab-viewport';

const STEPS = 8;

/** Step-by-step tour of the reference experiment. Every button drives the real lab (session, 3D view, playback). */
export function ExperimentGuide({ s, pb, run, setView, onClose }: {
  s: LabSession; pb: Playback; run: SimulationRun | null;
  setView: (p: Partial<ViewState>) => void; onClose: () => void;
}) {
  const { t, dir } = useI18n();
  const [step, setStep] = useState(0);
  const k = (suffix: string) => `guide.s${step}.${suffix}` as MessageKey;
  const watch = (method: string) => {
    if (!run) return;
    setView({ method, mode: 'pressure' });
    pb.seek(Math.max(0, (run.config.switch_s ?? 10) - 2));
    pb.play();
  };
  const Btn = ({ onClick, label, tid }: { onClick: () => void; label: string; tid: string }) => (
    <button type="button" onClick={onClick} data-testid={tid}
      className="rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11.5px] text-primary hover:bg-primary/20">{label}</button>
  );
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const metrics = run ? [...run.metrics].sort((a, b) => METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method)) : [];

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="guide-title" data-testid="panel-experiment-guide"
      className="glass rounded-lg border border-primary/30 p-3.5 w-[min(560px,calc(100%-1.5rem))] shadow-xl rise">
      <div className="flex items-start gap-2">
        <BookOpenCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground" data-testid="text-guide-step">{t('guide.step', { n: step + 1, total: STEPS })}</div>
          <h2 id="guide-title" className="font-semibold text-sm">{t(k('title'))}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={t('guide.close')} data-testid="button-guide-close"
          className="ms-auto p-1 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/90" data-testid="text-guide-body">{t(k('body'))}</p>

      {step === 5 && (
        metrics.length ? (
          <table className="mt-2 w-full text-[11.5px]" data-testid="table-guide-results">
            <thead><tr className="text-muted-foreground">
              <th className="text-start font-normal py-1">{t('guide.s5.topology')}</th>
              <th className="text-end font-normal">{t('guide.s5.peak')}</th>
              <th className="text-end font-normal">{t('guide.s5.carry')}</th>
            </tr></thead>
            <tbody>{metrics.map((m) => (
              <tr key={m.method} className="border-t border-dashed">
                <td className="py-1"><span className="inline-block h-2 w-2 rounded-full me-1.5" style={{ background: METHOD_COLORS[m.method] }} />{METHOD_LABEL[m.method] ?? m.method}</td>
                <td className="text-end"><span dir="ltr" className="font-num">{fmt(m.peak_deviation_pct)} %</span> <Verdict ok={m.pressure_target_met} /></td>
                <td className="text-end"><span dir="ltr" className="font-num">{fmt(m.carryover_pct)} %</span> <Verdict ok={m.carryover_target_met} /></td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="mt-2 text-xs text-muted-foreground">{t('guide.s5.none')}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {step === 0 && <Btn onClick={s.resetDefaults} label={t('guide.s0.action')} tid="button-guide-load-reference" />}
        {step === 2 && <>
          <Btn onClick={() => setView({ selected: 'manifold', showLabels: true })} label={t('guide.s2.manifold')} tid="button-guide-show-manifold" />
          <Btn onClick={() => setView({ selected: 'channels', showLabels: true })} label={t('guide.s2.channels')} tid="button-guide-show-channels" />
        </>}
        {step === 3 && <>
          <Btn onClick={() => setView({ mode: 'pressure' })} label={t('guide.s3.pressure')} tid="button-guide-pressure" />
          <Btn onClick={() => setView({ mode: 'velocity' })} label={t('guide.s3.velocity')} tid="button-guide-velocity" />
        </>}
        {step === 4 && <>
          <Btn onClick={() => watch('stop_flow')} label={t('guide.s4.stop')} tid="button-guide-watch-stop" />
          <Btn onClick={() => watch('equalized')} label={t('guide.s4.eq')} tid="button-guide-watch-eq" />
        </>}
        {step === 6 && <>
          <Btn onClick={() => s.setField('equalization_s', '0')} label={t('guide.s6.action')} tid="button-guide-zero-wait" />
          <Btn onClick={s.resetDefaults} label={t('guide.s6.back')} tid="button-guide-restore" />
        </>}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t pt-2.5">
        <button type="button" disabled={step === 0} onClick={() => setStep((x) => x - 1)} data-testid="button-guide-prev"
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border disabled:opacity-40"><Prev className="h-3.5 w-3.5" />{t('guide.prev')}</button>
        <div className="flex gap-1 mx-auto" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === step ? 'bg-primary' : 'bg-muted-foreground/30')} />)}
        </div>
        {step < STEPS - 1
          ? <button type="button" onClick={() => setStep((x) => x + 1)} data-testid="button-guide-next"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground">{t('guide.next')}<Next className="h-3.5 w-3.5" /></button>
          : <button type="button" onClick={onClose} data-testid="button-guide-finish"
              className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground">{t('guide.finish')}</button>}
      </div>
    </section>
  );
}

function Verdict({ ok }: { ok: boolean }) {
  const { t } = useI18n();
  return <span className={cn('text-[10px]', ok ? 'text-primary' : 'text-[#ef7a5a]')}>{ok ? t('guide.s5.met') : t('guide.s5.missed')}</span>;
}
