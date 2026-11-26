import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, MinusCircle, Loader2, RefreshCw, Download } from 'lucide-react';
import { usePageTitle } from '@/components/shell';
import { useI18n } from '@/lib/i18n';
import { apiJson } from '@/lib/auth';
import { PageHeader, Card } from './problem';
import { cn } from '@/lib/utils';

export type SuiteRow = { category: 'A' | 'S'; group: string; check: string; metric: string; value: number; tolerance: number; pass: boolean; detail?: Record<string, unknown> };
export type Suite = {
  suite_version: string; generated_at_utc: string; engine_versions: Record<string, string>;
  verdicts: Record<string, { status: string; passed?: number; total?: number; statement?: string }>;
  results: SuiteRow[];
};

export function useValidation() {
  return useQuery({ queryKey: ['validation'], queryFn: () => apiJson<Suite>('/api/validation/run'), staleTime: 300_000 });
}

const sci = (v: number) => (v === 0 ? '0' : Math.abs(v) >= 0.01 && Math.abs(v) < 1000 ? v.toPrecision(4) : v.toExponential(2));

export function VerdictCards({ s, compact = false }: { s?: Suite; compact?: boolean }) {
  const { t } = useI18n();
  const v = s?.verdicts;
  const card = (title: string, desc: string, st: string | undefined, count?: string, tid?: string) => {
    const ok = st === 'PASS', bad = st === 'FAIL';
    const Icon = ok ? CheckCircle2 : bad ? XCircle : MinusCircle;
    const label = ok ? t('val.pass') : bad ? t('val.fail') : st === 'NOT_POSSIBLE' ? t('val.notPossible') : st === 'NOT_PERFORMED' ? t('val.notPerformed') : '…';
    return (
      <div className={cn('rounded-2xl border bg-white p-4', ok && 'border-[#087F8C]/40', bad && 'border-[#C2410C]/40')} data-testid={tid}>
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', ok ? 'text-[#087F8C]' : bad ? 'text-[#C2410C]' : 'text-[#7A8CA0]')} />
          <span className={cn('text-sm font-bold', ok ? 'text-[#087F8C]' : bad ? 'text-[#C2410C]' : 'text-[#5B6F84]')}>{label}</span>
          {count && <span className="ms-auto font-num text-sm font-semibold text-[#10243A]" dir="ltr">{count}</span>}
        </div>
        <div className="mt-2 text-sm font-semibold text-[#10243A]">{title}</div>
        {!compact && <div className="text-xs text-[#3B5268] mt-0.5">{desc}</div>}
      </div>
    );
  };
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {card(t('val.A'), t('val.Ad'), v?.A_mathematical_verification?.status, v ? `${v.A_mathematical_verification.passed}/${v.A_mathematical_verification.total}` : undefined, 'verdict-A')}
      {card(t('val.S'), t('val.Sd'), v?.S_synthetic_benchmarks?.status, v ? `${v.S_synthetic_benchmarks.passed}/${v.S_synthetic_benchmarks.total}` : undefined, 'verdict-S')}
      {card(t('val.B'), t('val.Bd'), v?.B_independent_empirical_validation?.status, undefined, 'verdict-B')}
      {card(t('val.C'), t('val.Cd'), v?.C_clinical_validation?.status, undefined, 'verdict-C')}
    </div>
  );
}

export default function Validation() {
  const { t, fmtDate } = useI18n();
  usePageTitle(t('nav2.validation'));
  const qc = useQueryClient();
  const q = useValidation();
  const [rerunning, setRerunning] = useState(false);
  const rerun = async () => {
    setRerunning(true);
    try { qc.setQueryData(['validation'], await apiJson<Suite>('/api/validation/run?fresh=true')); } finally { setRerunning(false); }
  };
  const s = q.data;
  const failed = s?.results.filter((r) => !r.pass) ?? [];
  const busy = q.isLoading || rerunning;
  const download = () => {
    if (!s) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }));
    a.download = `rescue-on-chip-validation-${s.generated_at_utc.slice(0, 19)}.json`; a.click();
  };
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-10 space-y-5">
      <PageHeader kicker={t('val.kicker')} title={t('val.h1')} lead={t('val.lead')} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={rerun} disabled={busy} data-testid="button-run-validation"
          className="inline-flex items-center gap-2 rounded-full bg-[#087F8C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{busy ? t('val.running') : t('val.run')}
        </button>
        {s && <span className="text-xs text-muted-foreground" data-testid="text-validation-meta">{t('val.lastRun', { t: fmtDate(s.generated_at_utc), v: s.suite_version, e: s.engine_versions.switching })}</span>}
        {s && <button type="button" onClick={download} className="ms-auto inline-flex items-center gap-1.5 text-xs text-[#087F8C] hover:underline"><Download className="h-3.5 w-3.5" />{t('val.download')}</button>}
      </div>
      <VerdictCards s={s} />
      <div className="grid md:grid-cols-2 gap-3">
        <Card><p className="text-sm text-[#10243A] font-medium" data-testid="text-verdict-B">{t('val.Bstatement')}</p><p className="mt-2 text-xs text-muted-foreground">{t('val.Bsources')}</p></Card>
        <Card><p className="text-sm text-[#10243A]">{t('val.Cstatement')}</p><p className="mt-2 text-xs text-muted-foreground">{t('val.never')}</p></Card>
      </div>

      <Card title={t('val.neg')}>
        {!s ? <Loader2 className="h-4 w-4 animate-spin" /> : failed.length === 0 ? <p className="text-sm text-muted-foreground">{t('val.noNeg')}</p> : (
          <ul className="space-y-3" data-testid="list-negative-findings">
            {failed.map((r) => {
              const diag = r.detail?.posthoc_multi_seed_diagnostic as Record<string, unknown> | undefined;
              return (
                <li key={r.check} className="rounded-xl border border-[#C2410C]/30 bg-[#FFF7F4] p-3">
                  <div className="text-sm font-semibold text-[#10243A]" dir="ltr">{r.check}</div>
                  <div className="text-xs text-[#3B5268] mt-1 font-num" dir="ltr">{r.metric} = {sci(r.value)} · tolerance {sci(r.tolerance)}
                    {typeof r.detail?.posthoc_z === 'number' && ` · z = ${(r.detail.posthoc_z as number).toFixed(2)}`}</div>
                  {diag && (
                    <div className="mt-2 text-xs text-[#3B5268]">
                      <b>{t('val.diag')}: </b>
                      <span dir="ltr" className="font-num">seeds {String(diag.seeds)} · mean z {(diag.mean_z as number).toFixed(2)} · |z|&gt;1.96: {String(diag.count_abs_z_gt_1_96)}/20 · mean bias {(100 * (diag.mean_relative_bias as number)).toFixed(2)} % (expected {(100 * (diag.expected_jensen_bias_r4_lognormal as number)).toFixed(2)} %)</span>
                      <div className="mt-1" dir="ltr">{String(diag.interpretation)}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]" data-testid="table-validation">
            <thead><tr className="text-start text-muted-foreground border-b">
              <th className="py-2 pe-3 text-start font-medium">{t('val.colStatus')}</th>
              <th className="py-2 pe-3 text-start font-medium">{t('val.colGroup')}</th>
              <th className="py-2 pe-3 text-start font-medium">{t('val.colCheck')}</th>
              <th className="py-2 pe-3 text-end font-medium">{t('val.colValue')}</th>
              <th className="py-2 text-end font-medium">{t('val.colTol')}</th>
            </tr></thead>
            <tbody>
              {(s?.results ?? []).map((r) => (
                <tr key={r.check} className="border-b border-dashed last:border-0">
                  <td className="py-1.5 pe-3">{r.pass ? <span className="text-[#087F8C] font-semibold">✓ {t('val.pass')}</span> : <span className="text-[#C2410C] font-semibold">✗ {t('val.fail')}</span>}</td>
                  <td className="py-1.5 pe-3 font-num" dir="ltr">{r.category} · {r.group}</td>
                  <td className="py-1.5 pe-3" dir="ltr">{r.check}</td>
                  <td className="py-1.5 pe-3 text-end font-num" dir="ltr">{r.metric} = {sci(r.value)}</td>
                  <td className="py-1.5 text-end font-num" dir="ltr">{r.metric.includes('identical') || r.metric.includes('differs') || r.metric.includes('better') || r.metric.includes('failed') || r.metric.includes('ordered') || r.metric === 'ok' ? '= 1' : `≤ ${sci(r.tolerance)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
