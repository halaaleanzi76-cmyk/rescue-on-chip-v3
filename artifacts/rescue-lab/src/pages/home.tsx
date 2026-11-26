import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowLeft, FlaskConical, ShieldCheck, Presentation, Activity } from 'lucide-react';
import { solveVascularNetwork, useGetVascularNetwork, type VascularSolveResult } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '@/components/shell';
import { Logo, BRAND } from '@/components/brand';
import { useI18n } from '@/lib/i18n';
import { apiJson } from '@/lib/auth';
import { fmt } from '@/lib/lab';

/** Capillaries blocked by the "no-reflow" demo (a plausible plugging pattern inside the capillary bed). */
const NO_REFLOW_SET = ['capillary_u_1_2', 'capillary_anastomosis_1', 'capillary_l_2_3'];

function NetworkHero() {
  const { t } = useI18n();
  const net = useGetVascularNetwork();
  const [blocked, setBlocked] = useState(false);
  const [open, setOpen] = useState<VascularSolveResult | null>(null);
  const [cur, setCur] = useState<VascularSolveResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { solveVascularNetwork({}).then((r) => { setOpen(r); setCur(r); }).catch(() => {}); }, []);
  const toggle = async () => {
    setBusy(true);
    try {
      const next = !blocked;
      const r = await solveVascularNetwork(next ? { occluded_segment_ids: NO_REFLOW_SET } : {});
      setCur(r); setBlocked(next);
    } finally { setBusy(false); }
  };

  const view = useMemo(() => {
    const segs = net.data?.segments ?? [];
    if (!segs.length) return null;
    const xs = segs.flatMap((s) => [s.start_position_m[0], s.end_position_m[0]]);
    const ys = segs.flatMap((s) => [s.start_position_m[1], s.end_position_m[1]]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const W = 520, H = 300, pad = 26;
    const sx = (x: number) => pad + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * pad);
    const sy = (y: number) => H - pad - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * pad);
    const rmax = Math.max(...segs.map((s) => s.radius_m));
    return { W, H, segs, sx, sy, rmax };
  }, [net.data]);

  /** Colour = this vessel's flow as a fraction of its own flow in the fully open network (perfusion ratio). */
  const color = (id: string, q: number, occluded: boolean) => {
    if (occluded) return '#C2410C';
    const q0 = Math.abs(open?.segments.find((x) => x.segment_id === id)?.flow_rate_ul_min ?? 0);
    const f = q0 > 0 ? Math.min(1, Math.abs(q) / q0) : 0;
    const mix = (a: number, b: number) => Math.round(a + (b - a) * f);
    return `rgb(${mix(203, 8)}, ${mix(213, 127)}, ${mix(225, 140)})`;
  };
  const clean = (x: number) => (Math.abs(x) < 1e-9 ? 0 : x);
  const pctOfOpen = cur && open ? clean((100 * cur.inlet_flow_ul_min) / open.inlet_flow_ul_min) : null;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-[0_14px_40px_rgba(16,36,58,.08)]" data-testid="home-network">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#087F8C]" />
        <h2 className="text-sm font-semibold text-[#10243A]">{t('home.vizTitle')}</h2>
        <span className="ms-auto text-[11px] text-muted-foreground">{t('home.vizFlow')}: <b className="font-num text-[#10243A]" dir="ltr" data-testid="home-inflow">{cur ? `${fmt(clean(cur.inlet_flow_ul_min), 4)} µL/min` : '—'}</b></span>
      </div>
      {view ? (
        <svg viewBox={`0 0 ${view.W} ${view.H}`} className="mt-2 w-full h-auto" role="img" aria-label={t('home.vizTitle')} style={{ direction: 'ltr' }}>
          <defs>
            <linearGradient id="bgFade" x1="0" x2="1"><stop offset="0" stopColor="#F8FAFC" /><stop offset="1" stopColor="#EEF6F7" /></linearGradient>
          </defs>
          <rect width={view.W} height={view.H} rx="14" fill="url(#bgFade)" />
          {view.segs.map((s) => {
            const r = cur?.segments.find((x) => x.segment_id === s.segment_id);
            const w = 1.6 + 7 * (s.radius_m / view.rmax);
            return (
              <line key={s.segment_id} x1={view.sx(s.start_position_m[0])} y1={view.sy(s.start_position_m[1])}
                x2={view.sx(s.end_position_m[0])} y2={view.sy(s.end_position_m[1])}
                stroke={color(s.segment_id, r?.flow_rate_ul_min ?? 0, !!r?.occluded)} strokeWidth={w} strokeLinecap="round"
                strokeDasharray={r?.occluded ? '3 4' : undefined} style={{ transition: 'stroke .5s ease' }}>
                <title>{`${s.segment_id}: ${r ? fmt(r.flow_rate_ul_min, 5) : '—'} µL/min`}</title>
              </line>
            );
          })}
        </svg>
      ) : <div className="mt-2 h-[240px] grid place-items-center text-xs text-muted-foreground">{t('home.vizLoading')}</div>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggle} disabled={busy || !open} data-testid="button-home-noreflow"
          className="rounded-full bg-[#10243A] text-white px-4 py-2 text-xs font-medium hover:bg-[#16314f] disabled:opacity-50">
          {busy ? t('home.vizLoading') : blocked ? t('home.vizRestore') : t('home.vizBlock')}
        </button>
        {pctOfOpen !== null && <span className="text-xs text-[#10243A]" data-testid="home-pct">{t('home.vizOfBaseline', { p: fmt(pctOfOpen, 1) })}</span>}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{t('home.vizNote')}</p>
    </div>
  );
}

function EvidenceStrip() {
  const { t } = useI18n();
  const v = useQuery({ queryKey: ['validation'], queryFn: () => apiJson<{ verdicts: Record<string, { status: string; passed?: number; total?: number }> }>('/api/validation/run'), staleTime: 300_000 });
  const d = v.data?.verdicts;
  const cell = (label: string, st?: { status: string; passed?: number; total?: number }, fallback?: string) => (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#10243A]">
        {st ? (st.total ? `${st.passed}/${st.total} ${st.status === 'PASS' ? '✓' : '·'}` : fallback) : '…'}
      </div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" data-testid="home-evidence">
      {cell(t('home.evA'), d?.A_mathematical_verification)}
      {cell(t('home.evS'), d?.S_synthetic_benchmarks)}
      {cell(t('home.evB'), d?.B_independent_empirical_validation, t('home.evNotPossible'))}
      {cell(t('home.evC'), d?.C_clinical_validation, t('home.evNotDone'))}
    </div>
  );
}

export default function Home() {
  const { t, dir } = useI18n();
  usePageTitle(t('nav2.home'));
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const blocks: [string, string, string?][] = [
    [t('home.problemTitle'), t('home.problemBody'), t('home.problemCite')],
    [t('home.inventionTitle'), t('home.inventionBody')],
    [t('home.diffTitle'), t('home.diffBody')],
    [t('home.todayTitle'), t('home.todayBody')],
  ];
  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12">
      <section className="grid lg:grid-cols-[1.05fr_1fr] gap-8 items-center">
        <div>
          <Logo size={52} className="mb-6" />
          <div className="text-[12px] font-medium tracking-wide text-[#087F8C]">{t('home.kicker')}</div>
          <h1 className="mt-3 text-[34px] md:text-[46px] leading-[1.12] font-extrabold tracking-tight text-[#10243A]" data-testid="home-headline">{t('home.h1')}</h1>
          <p className="mt-4 text-base md:text-lg text-[#3B5268] leading-relaxed max-w-[56ch]">{t('home.sub')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/lab" data-testid="cta-simulation" className="inline-flex items-center gap-2 rounded-full bg-[#087F8C] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#066e79]">
              <FlaskConical className="h-4 w-4" />{t('home.ctaSim')}<Arrow className="h-4 w-4" />
            </Link>
            <Link href="/evidence" data-testid="cta-evidence" className="inline-flex items-center gap-2 rounded-full border border-[#10243A]/20 bg-white px-5 py-3 text-sm font-semibold text-[#10243A] hover:border-[#087F8C]">
              <ShieldCheck className="h-4 w-4 text-[#087F8C]" />{t('home.ctaEvidence')}
            </Link>
            <Link href="/judge" data-testid="cta-judge" className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-[#087F8C] hover:underline">
              <Presentation className="h-4 w-4" />{t('home.ctaJudge')}
            </Link>
          </div>
        </div>
        <NetworkHero />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {blocks.map(([h, b, c]) => (
          <article key={h} className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-bold text-[#10243A]">{h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#3B5268]">{b}</p>
            {c && <p className="mt-3 text-[11px] text-muted-foreground">{c}</p>}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#10243A]">{t('home.evidenceTitle')}</h2>
        <EvidenceStrip />
        <p className="text-sm text-[#3B5268] max-w-[80ch]"><b className="text-[#10243A]">{t('home.valueTitle')}: </b>{t('home.valueBody')}</p>
      </section>

      <p className="rounded-xl border border-[#E2EAF0] bg-white px-4 py-3 text-xs text-[#3B5268]" data-testid="home-disclaimer" style={{ borderInlineStart: `4px solid ${BRAND.teal}` }}>
        {t('site.disclaimer')}
      </p>
    </div>
  );
}
