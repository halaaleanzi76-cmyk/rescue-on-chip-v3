import { useGetModel } from '@workspace/api-client-react';
import { EngineText, useEngineText } from '@/components/engine-text';
import { Download } from 'lucide-react';
import { Panel, SimBadge, usePageTitle } from '@/components/shell';
import { ErrorBox } from '@/pages/workbench';
import { Skeleton } from '@/components/ui/skeleton';
import { ALL_FIELDS, humanError, fieldLabel, fieldUnit } from '@/lib/lab';
import { useI18n } from '@/lib/i18n';

export default function Model() {
  const { t } = useI18n();
  const et = useEngineText();
  usePageTitle(t('nav.model'));
  const m = useGetModel();
  if (m.isLoading) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (m.isError || !m.data) return <Panel title={t('model.unavailable')}><ErrorBox msg={humanError(m.error)} onRetry={() => m.refetch()} /></Panel>;
  const d = m.data;
  return (
    <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 items-start">
      <div className="space-y-6">
        <Panel kicker={t('model.kicker', { v: d.version, status: et(d.status) })} title={d.source_title} right={<SimBadge />}>
          <p className="font-serif italic text-lg leading-snug">{t('model.lead')}</p>
          <p className="mt-3 text-sm text-muted-foreground">{t('model.sourceNote', { date: d.source_date })}</p>
          <a href="/api/source" download data-testid="link-download-source" className="mt-4 inline-flex items-center gap-2 border rounded-sm px-3 py-1.5 text-sm hover:bg-secondary">
            <Download className="h-4 w-4" />{t('model.download')}
          </a>
        </Panel>
        <Panel kicker={t('model.eqKicker')} title={t('model.eqTitle')}>
          <ol className="space-y-2">
            {d.equations.map((e, i) => (
              <li key={i} className="flex gap-3 items-baseline" data-testid={`text-equation-${i}`}>
                <span className="font-num text-[10px] text-muted-foreground w-6">({i + 1})</span>
                <code dir="ltr" className="font-num text-[13px] bg-secondary/60 px-2 py-1 rounded-sm break-words flex-1 text-left">{e}</code>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel kicker={t('model.asKicker')} title={t('model.asTitle')}>
          <ol className="list-decimal ps-5 space-y-1.5 text-sm">{d.assumptions.map((a, i) => <li key={i}><EngineText text={a} /></li>)}</ol>
        </Panel>
      </div>
      <div className="space-y-6">
        <Panel kicker={t('model.limKicker')} title={t('model.limTitle')}>
          <ul className="space-y-2 text-sm list-disc ps-5">
            <li>{t('model.lim1')}</li>
            <li>{t('model.lim2')}</li>
            <li>{t('model.lim3')}</li>
            <li>{t('model.lim4')}</li>
            <li>{t('model.lim5')}</li>
          </ul>
        </Panel>
        <Panel kicker="GET /api/model" title={t('model.defaultsTitle')}>
          <table className="w-full text-xs font-num">
            <tbody>
              {ALL_FIELDS.map((f) => (
                <tr key={f.key} className="border-b border-dashed last:border-0">
                  <td className="py-1 pe-2 font-sans">{fieldLabel(f)}</td>
                  <td className="py-1 text-end" dir="ltr">{String(d.defaults[f.key] ?? '—')} <span className="text-muted-foreground">{f.unit && f.unit !== 'count' ? fieldUnit(f) : ''}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
