import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Pause, Play, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import type { ExperimentInput, SimulationRun } from '@workspace/api-client-react';
import { usePageTitle } from '@/components/shell';
import { Logo } from '@/components/brand';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { apiJson } from '@/lib/auth';
import { METHOD_LABEL, fmt } from '@/lib/lab';
import { Architecture } from './invention';
import { VerdictCards, useValidation } from './validation';
import { cn } from '@/lib/utils';

/** Chapter start times (s) from the brief: 0:00, 0:25, 0:50, 1:35, 2:15, 2:40 → end 3:00. */
const CHAPTERS: { at: number; title: MessageKey; body: MessageKey }[] = [
  { at: 0, title: 'jm.ch1', body: 'jm.c1' }, { at: 25, title: 'jm.ch2', body: 'jm.c2' }, { at: 50, title: 'jm.ch3', body: 'jm.c3' },
  { at: 95, title: 'jm.ch4', body: 'jm.c4' }, { at: 135, title: 'jm.ch5', body: 'jm.c5' }, { at: 160, title: 'jm.ch6', body: 'jm.c6' },
];
const TOTAL = 180;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Live engine call (stateless preview, nothing stored). */
function useLiveRun(overrides: Partial<ExperimentInput>) {
  const model = useQuery({ queryKey: ['model-defaults'], queryFn: () => apiJson<{ defaults: ExperimentInput }>('/api/model'), staleTime: Infinity });
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(overrides);
  const seq = useRef(0);
  useEffect(() => {
    if (!model.data) return;
    const id = ++seq.current;
    setBusy(true);
    const tm = setTimeout(() => {
      apiJson<{ run: SimulationRun }>('/api/preview', { method: 'POST', body: JSON.stringify({ ...model.data.defaults, ...overrides, name: 'Judge mode (live preview)' }) })
        .then((r) => { if (id === seq.current) setRun(r.run); }).finally(() => { if (id === seq.current) setBusy(false); });
    }, 250);
    return () => clearTimeout(tm);
  }, [model.data, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { run, busy };
}

function Slider({ label, value, min, max, step, onChange, tid }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; tid: string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-[#3B5268]"><span>{label}</span><b className="font-num text-[#10243A]" dir="ltr">{value}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={tid}
        className="w-full accent-[#087F8C]" />
    </label>
  );
}

function CrossoverLive() {
  const { t } = useI18n();
  const [narrowing, setNarrowing] = useState(20);
  const [visc, setVisc] = useState(1.8);
  const { run, busy } = useLiveRun({ narrowing_pct: narrowing, altered_viscosity_ratio: visc });
  const arm = (a: string) => run?.arms.find((x) => x.arm === a);
  const cells: [string, MessageKey, string][] = [['F0V0', 'inv.refIntact', '#EAF5F6'], ['F1V0', 'inv.altIntact', '#EEF3FA'], ['F0V1', 'inv.refInj', '#FBF4E8'], ['F1V1', 'inv.altInj', '#FBEDEA']];
  const effects: MessageKey[] = ['jm.effect.fluid', 'jm.effect.vessel', 'jm.effect.inter'];
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <div className="space-y-4">
        <Slider label={t('jm.narrowing')} value={narrowing} min={0} max={60} step={5} onChange={setNarrowing} tid="judge-narrowing" />
        <Slider label={t('jm.viscosity')} value={visc} min={1} max={4} step={0.1} onChange={(v) => setVisc(+v.toFixed(1))} tid="judge-viscosity" />
        {busy && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{t('jm.computing')}</span>}
      </div>
      <div>
        <div className="grid grid-cols-2 gap-2" data-testid="judge-2x2">
          {cells.map(([a, k, bg]) => (
            <div key={a} className="rounded-xl border p-3" style={{ background: bg }}>
              <div className="text-xs font-semibold text-[#10243A]">{t(k)}</div>
              <div className="mt-1 text-2xl font-extrabold text-[#10243A] font-num" dir="ltr">{arm(a) ? fmt(arm(a)!.mean_flow_ul_min, 3) : '—'}</div>
              <div className="text-[10px] text-muted-foreground">{t('jm.armFlow')}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2" data-testid="judge-effects">
          {effects.map((k, i) => (
            <div key={k} className="rounded-xl border bg-white p-2 text-center">
              <div className="text-[11px] text-muted-foreground">{t(k)}</div>
              <div className="font-num font-bold text-[#087F8C]" dir="ltr">{run ? fmt(run.contrasts[i]?.value, 3) : '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AbcLive() {
  const { t } = useI18n();
  const [reg, setReg] = useState(0);
  const [eq, setEq] = useState(5);
  const { run, busy } = useLiveRun({ regulated_wait_s: reg, equalization_s: eq });
  const ms = run ? [...run.metrics].sort((a, b) => ['stop_flow', 'pressure_controlled', 'equalized'].indexOf(a.method) - ['stop_flow', 'pressure_controlled', 'equalized'].indexOf(b.method)) : [];
  const best = ms.length ? ms.reduce((a, b) => (b.peak_deviation_pct < a.peak_deviation_pct ? b : a)) : null;
  const color: Record<string, string> = { stop_flow: '#C2410C', pressure_controlled: '#B7791F', equalized: '#087F8C' };
  const maxLog = Math.log10(101);
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <div className="space-y-4">
        <Slider label={t('jm.regWait')} value={reg} min={0} max={20} step={1} onChange={setReg} tid="judge-regwait" />
        <Slider label={t('jm.eqWait')} value={eq} min={0} max={15} step={1} onChange={setEq} tid="judge-eqwait" />
        {busy && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{t('jm.computing')}</span>}
      </div>
      <div className="space-y-2" data-testid="judge-abc">
        {ms.map((m) => (
          <div key={m.method}>
            <div className="flex justify-between text-xs"><span className="font-semibold text-[#10243A]">{METHOD_LABEL[m.method]}</span>
              <span className="font-num" dir="ltr">{fmt(m.peak_deviation_pct, 3)} % {m.pressure_target_met ? '✓ ≤5 %' : '✗'}</span></div>
            <div className="h-3 rounded-full bg-[#EEF3F7] overflow-hidden" dir="ltr">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, (100 * Math.log10(1 + m.peak_deviation_pct)) / maxLog)}%`, background: color[m.method] }} />
            </div>
          </div>
        ))}
        {best && <p className="pt-2 text-sm font-semibold text-[#10243A]" data-testid="judge-best">{t('jm.best', { m: METHOD_LABEL[best.method] })}</p>}
      </div>
    </div>
  );
}

export default function JudgeMode() {
  const { t, dir } = useI18n();
  usePageTitle(t('jm.title'));
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const v = useValidation();
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setTime((x) => (x + 1 >= TOTAL ? (setPlaying(false), TOTAL) : x + 1)), 1000);
    return () => clearInterval(iv);
  }, [playing]);
  const idx = useMemo(() => CHAPTERS.reduce((acc, c, i) => (time >= c.at ? i : acc), 0), [time]);
  const ch = CHAPTERS[idx];
  const go = (i: number) => setTime(CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, i))].at);
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft, Next = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-[calc(100dvh-60px)] bg-[#F8FAFC]" data-testid="judge-mode">
      <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Logo size={34} />
          <span className="ms-2 rounded-full bg-[#10243A] px-3 py-1 text-xs font-semibold text-white">{t('jm.title')}</span>
          <span className="ms-auto font-num text-sm text-[#10243A]" dir="ltr" data-testid="judge-clock">{mmss(time)} / {mmss(TOTAL)}</span>
          <button type="button" onClick={() => setPlaying((p) => !p)} data-testid="judge-play" className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? t('jm.pause') : t('jm.play')}
          </button>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#3B5268] hover:text-[#10243A]" data-testid="judge-exit"><X className="h-4 w-4" />{t('jm.exit')}</Link>
        </div>

        <div className="mt-4 h-1.5 rounded-full bg-[#E2EAF0] overflow-hidden" dir="ltr"><div className="h-full bg-[#087F8C] transition-all" style={{ width: `${(100 * time) / TOTAL}%` }} /></div>
        <ol className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-1.5">
          {CHAPTERS.map((c, i) => (
            <li key={c.title}>
              <button type="button" onClick={() => go(i)} data-testid={`judge-chapter-${i}`}
                className={cn('w-full rounded-lg border px-2 py-1.5 text-start text-[11px] leading-tight', i === idx ? 'border-[#087F8C] bg-[#E6F4F5] text-[#10243A] font-semibold' : 'bg-white text-[#3B5268]')}>
                <span className="font-num block text-[10px] text-[#087F8C]" dir="ltr">{mmss(c.at)}</span>{t(c.title)}
              </button>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-3xl border bg-white p-6 md:p-8 shadow-[0_14px_40px_rgba(16,36,58,.07)]" aria-live="polite">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#10243A]" data-testid="judge-title">{t(ch.title)}</h1>
          <p className="mt-3 text-base text-[#3B5268] leading-relaxed max-w-[80ch]">{t(ch.body)}</p>
          <div className="mt-6">
            {idx === 0 && (
              <div className="grid sm:grid-cols-3 gap-3">
                {([['≈30 %', 'pb2.s1'], ['43.3 % vs 67.5 %', 'pb2.s2'], ['aOR 0.31', 'pb2.s3']] as const).map(([v_, k]) => (
                  <div key={k} className="rounded-xl bg-[#F8FAFC] border p-4"><div className="text-2xl font-extrabold text-[#087F8C] font-num" dir="ltr">{v_}</div><div className="text-xs text-[#3B5268] mt-1">{t(k)}</div></div>
                ))}
                <p className="sm:col-span-3 text-[11px] text-muted-foreground">{t('pb2.source')}</p>
              </div>
            )}
            {idx === 1 && <Architecture />}
            {idx === 2 && <CrossoverLive />}
            {idx === 3 && <AbcLive />}
            {idx === 4 && <><VerdictCards s={v.data} /><p className="mt-3 text-sm text-[#10243A]">{t('val.Bstatement')}</p></>}
            {idx === 5 && (
              <ol className="grid md:grid-cols-3 gap-3">
                {(['jm.next1', 'jm.next2', 'jm.next3'] as const).map((k, i) => (
                  <li key={k} className="rounded-xl border p-4 bg-[#F8FAFC]"><span className="text-[#087F8C] font-bold">{i + 1}</span><div className="mt-1 text-sm font-semibold text-[#10243A]">{t(k)}</div></li>
                ))}
              </ol>
            )}
          </div>
          <div className="mt-8 flex justify-between">
            <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} data-testid="judge-prev" className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm disabled:opacity-40"><Prev className="h-4 w-4" />{t('jm.prev')}</button>
            <button type="button" onClick={() => go(idx + 1)} disabled={idx === CHAPTERS.length - 1} data-testid="judge-next" className="inline-flex items-center gap-1 rounded-full bg-[#087F8C] text-white px-4 py-2 text-sm disabled:opacity-40">{t('jm.next')}<Next className="h-4 w-4" /></button>
          </div>
        </section>
        <p className="mt-4 text-xs text-muted-foreground">{t('site.disclaimer')}</p>
      </div>
    </div>
  );
}
