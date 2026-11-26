import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import { Loader2, History, Columns2 } from 'lucide-react';
import { usePageTitle } from '@/components/shell';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { apiJson } from '@/lib/auth';
import { METHOD_COLORS, METHOD_LABEL, fmt } from '@/lib/lab';
import { PageHeader, Card } from '@/components/page-parts';
import { VerdictCards, useValidation } from './validation';
import Workbench from './workbench';

const PARAMS = ['equalization_s', 'regulated_wait_s', 'offset_pct', 'dead_volume_ul', 'narrowing_pct', 'occlusion_pct', 'altered_viscosity_ratio', 'radius_um'] as const;
type Sweep = { parameter: string; rows: { value: number; peak: Record<string, number>; carryover: Record<string, number>; pressure_goal_met: Record<string, boolean> }[] };
const PALETTE: Record<string, string> = { stop_flow: '#C2410C', pressure_controlled: '#B7791F', equalized: '#087F8C' };

export function SensitivityPanel() {
  const { t } = useI18n();
  const [param, setParam] = useState<(typeof PARAMS)[number]>('equalization_s');
  const sweep = useMutation({ mutationFn: (p: string) => apiJson<Sweep>(`/api/sensitivity?parameter=${p}&points=9`), meta: { handled: true } });
  const data = sweep.data?.rows.map((r) => ({ x: +r.value.toFixed(3), ...r.peak })) ?? [];
  const ok = sweep.data?.rows.filter((r) => r.pressure_goal_met.equalized).map((r) => r.value) ?? [];
  const label = t(`res.p.${param}` as MessageKey);
  const verdict = !sweep.data ? null : ok.length === 0 ? t('res.verdictNever') : ok.length === sweep.data.rows.length ? t('res.verdictAlways')
    : t('res.verdictRange', { p: label, lo: fmt(Math.min(...ok), 2), hi: fmt(Math.max(...ok), 2) });
  return (
    <Card title={t('res.sensTitle')}>
      <p className="text-sm text-[#3B5268] mb-3">{t('res.sensLead')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor="sens-param">{t('res.param')}</label>
        <select id="sens-param" value={param} onChange={(e) => setParam(e.target.value as typeof param)} data-testid="select-sensitivity-param"
          className="rounded-lg border bg-white px-2 py-1.5 text-sm">
          {PARAMS.map((p) => <option key={p} value={p}>{t(`res.p.${p}` as MessageKey)}</option>)}
        </select>
        <button type="button" onClick={() => sweep.mutate(param)} disabled={sweep.isPending} data-testid="button-run-sensitivity"
          className="inline-flex items-center gap-2 rounded-full bg-[#087F8C] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {sweep.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{sweep.isPending ? t('res.sweeping') : t('res.runSweep')}
        </button>
      </div>
      {sweep.error && <p className="mt-2 text-sm text-destructive">{(sweep.error as Error).message}</p>}
      {sweep.data && (
        <>
          <div className="mt-4 h-[300px]" data-testid="chart-sensitivity">
            <div className="text-xs text-muted-foreground mb-1">{t('res.peakChart')}</div>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 18 }}>
                <CartesianGrid stroke="#E2EAF0" />
                <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11, fill: '#3B5268' }} label={{ value: label, position: 'insideBottom', offset: -8, fontSize: 11, fill: '#3B5268' }} />
                <YAxis scale="log" domain={[0.001, 'auto']} allowDataOverflow tick={{ fontSize: 11, fill: '#3B5268' }} tickFormatter={(v) => fmt(Number(v), 2)} width={56} />
                <Tooltip formatter={(v, n) => [`${fmt(Number(v), 3)} %`, METHOD_LABEL[String(n)] ?? String(n)]} />
                <Legend formatter={(v) => METHOD_LABEL[String(v)] ?? String(v)} wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={5} stroke="#10243A" strokeDasharray="4 4" label={{ value: t('res.goalLine'), fontSize: 10, fill: '#10243A', position: 'insideTopRight' }} />
                {Object.keys(PALETTE).map((m) => <Line key={m} dataKey={m} stroke={PALETTE[m] ?? METHOD_COLORS[m]} strokeWidth={2.2} dot={{ r: 3 }} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm font-medium text-[#10243A]" data-testid="text-sensitivity-verdict"><b>{t('res.verdict')}: </b>{verdict}</p>
        </>
      )}
    </Card>
  );
}

export default function Results() {
  const { t } = useI18n();
  usePageTitle(t('nav2.results'));
  const v = useValidation();
  return (
    <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-10 space-y-6">
      <PageHeader kicker={t('res.kicker')} title={t('res.h1')} />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/runs" className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[#10243A] hover:border-[#087F8C]"><History className="h-4 w-4 text-[#087F8C]" />{t('res.history')}</Link>
        <Link href="/compare" className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[#10243A] hover:border-[#087F8C]"><Columns2 className="h-4 w-4 text-[#087F8C]" />{t('res.compare')}</Link>
      </div>
      <VerdictCards s={v.data} compact />
      <Workbench />
      <SensitivityPanel />
      <Card title={t('res.limits')}>
        <ul className="list-disc ps-5 space-y-1.5 text-sm text-[#3B5268]">
          {(['model.lim1', 'model.lim2', 'model.lim3', 'model.lim4', 'model.lim5'] as const).map((k) => <li key={k}>{t(k)}</li>)}
        </ul>
      </Card>
    </div>
  );
}
