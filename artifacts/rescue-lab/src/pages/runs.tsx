import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useListRuns } from '@workspace/api-client-react';
import { Search, ArrowUpRight, Check, X, Inbox } from 'lucide-react';
import { Panel, SimBadge, usePageTitle } from '@/components/shell';
import { ErrorBox } from '@/pages/workbench';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, fmtDate, humanError } from '@/lib/lab';
import { useI18n } from '@/lib/i18n';

export default function Runs() {
  const { t } = useI18n();
  usePageTitle(t('nav.runs'));
  const runs = useListRuns();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const list = [...(runs.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const s = q.trim().toLowerCase();
    return s ? list.filter((r) => r.name.toLowerCase().includes(s) || r.id.includes(s) || r.fingerprint.includes(s)) : list;
  }, [runs.data, q]);

  return (
    <Panel kicker={t('runs.kicker')} title={t('runs.title')} right={<SimBadge />}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="flex items-center gap-2 border rounded-sm px-2 bg-background w-full sm:w-80">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('runs.filter')} className="py-1.5 text-sm bg-transparent outline-none w-full" data-testid="input-search-runs" />
        </label>
        <span className="text-xs text-muted-foreground font-num">{t('runs.count', { shown: rows.length, total: runs.data?.length ?? 0 })}</span>
      </div>
      {runs.isLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>}
      {runs.isError && <ErrorBox msg={humanError(runs.error)} onRetry={() => runs.refetch()} />}
      {runs.isSuccess && rows.length === 0 && (
        <div className="py-12 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 font-semibold">{q ? t('runs.noMatch') : t('runs.none')}</p>
          <Link href="/lab" className="text-sm text-primary underline" data-testid="link-empty-workbench">{t('runs.openLab')}</Link>
        </div>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-start stamp text-[9px] text-muted-foreground border-b">
                <th className="py-2 pe-3 text-start">{t('runs.col.name')}</th><th className="py-2 px-2 text-start">{t('runs.col.created')}</th><th className="py-2 px-2 text-end">{t('runs.col.seed')}</th>
                <th className="py-2 px-2 text-end">{t('runs.col.n')}</th><th className="py-2 px-2 text-end">{t('runs.col.peak')}</th>
                <th className="py-2 px-2 text-start">{t('runs.col.goal')}</th><th className="py-2 px-2 text-start">{t('runs.col.fp')}</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-dashed hover:bg-secondary/50 group" data-testid={`row-run-${r.id}`}>
                  <td className="py-2.5 pe-3 font-semibold">{r.name}<div className="font-num text-[10px] text-muted-foreground font-normal">{r.id}</div></td>
                  <td className="py-2.5 px-2 text-xs">{fmtDate(r.created_at)}</td>
                  <td className="py-2.5 px-2 text-end font-num">{r.seed}</td>
                  <td className="py-2.5 px-2 text-end font-num">{r.replicates}</td>
                  <td className="py-2.5 px-2 text-end font-num">{fmt(r.equalized_peak_pct)}</td>
                  <td className="py-2.5 px-2 text-xs">{r.pressure_target_met
                    ? <span className="inline-flex items-center gap-1 text-primary"><Check className="h-3 w-3" />{t('runs.goalMet')}</span>
                    : <span className="inline-flex items-center gap-1 text-[#ef7a5a]"><X className="h-3 w-3" />{t('runs.goalExceeds')}</span>}</td>
                  <td className="py-2.5 px-2 font-num text-[11px] text-muted-foreground" title={r.fingerprint}>{r.fingerprint.slice(0, 16)}…</td>
                  <td className="py-2.5 ps-2 text-end whitespace-nowrap">
                    <Link href={`/lab?run=${r.id}`} data-testid={`link-open-run-${r.id}`} className="inline-flex items-center gap-1 text-xs border rounded-sm px-2 py-1 hover:bg-primary hover:text-primary-foreground transition-colors">
                      {t('runs.open3d')} <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" />
                    </Link>
                    <Link href={`/analysis?run=${r.id}`} data-testid={`link-analysis-run-${r.id}`} className="ms-1 inline-flex items-center gap-1 text-xs border rounded-sm px-2 py-1 hover:bg-secondary transition-colors">
                      {t('runs.analysis')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-[11px] text-muted-foreground">{t('runs.footnote')}</p>
    </Panel>
  );
}
