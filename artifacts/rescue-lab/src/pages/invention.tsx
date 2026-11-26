import { Link } from 'wouter';
import { Sigma } from 'lucide-react';
import { usePageTitle } from '@/components/shell';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { PageHeader, Card } from './problem';

/** Figure 1 of the proposal, redrawn (conceptual architecture). */
export function Architecture() {
  const { t } = useI18n();
  const box = (x: number, y: number, w: number, title: string, sub: string, fill: string, stroke: string) => (
    <g>
      <rect x={x} y={y} width={w} height="62" rx="12" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <text x={x + w / 2} y={y + 27} textAnchor="middle" fontSize="13" fontWeight="700" fill="#10243A">{title}</text>
      <text x={x + w / 2} y={y + 45} textAnchor="middle" fontSize="11" fill="#3B5268">{sub}</text>
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#087F8C" strokeWidth="2" markerEnd="url(#arr)" />
  );
  return (
    <svg viewBox="0 0 900 250" className="w-full h-auto" role="img" aria-label={t('inv.archTitle')} style={{ direction: 'ltr' }} data-testid="invention-architecture">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#087F8C" /></marker></defs>
      {box(10, 30, 170, t('inv.resA'), t('inv.resAsub'), '#F1F8F9', '#9FCFD4')}
      {box(10, 158, 170, t('inv.resB'), t('inv.resBsub'), '#FBF6EC', '#E5CC97')}
      {box(238, 94, 244, t('inv.manifold'), t('inv.manifoldSub'), '#E3F3F4', '#087F8C')}
      {box(540, 30, 180, t('inv.chip1'), t('inv.chipSub'), '#F4F8FB', '#A9C3D6')}
      {box(540, 158, 180, t('inv.chip2'), t('inv.chipSub'), '#F4F8FB', '#A9C3D6')}
      <g>
        <rect x="770" y="80" width="120" height="90" rx="12" fill="#10243A" />
        <foreignObject x="776" y="86" width="108" height="78">
          <div style={{ color: '#DCEBF0', fontSize: 11, lineHeight: 1.35, textAlign: 'center', fontWeight: 600, paddingTop: 6 }}>{t('inv.readout')}</div>
        </foreignObject>
      </g>
      {arrow(180, 61, 236, 115)}{arrow(180, 189, 236, 135)}
      {arrow(482, 115, 538, 61)}{arrow(482, 135, 538, 189)}
      {arrow(720, 61, 768, 110)}{arrow(720, 189, 768, 140)}
    </svg>
  );
}

export default function Invention() {
  const { t } = useI18n();
  usePageTitle(t('nav2.invention'));
  const subs: [MessageKey, MessageKey][] = [['inv.subA', 'inv.subAd'], ['inv.subB', 'inv.subBd'], ['inv.subC', 'inv.subCd'], ['inv.subD', 'inv.subDd'], ['inv.subE', 'inv.subEd']];
  const states: [MessageKey, MessageKey][] = [['inv.s0', 'inv.s0d'], ['inv.s1', 'inv.s1d'], ['inv.s2', 'inv.s2d'], ['inv.s3', 'inv.s3d'], ['inv.s4', 'inv.s4d']];
  const cells: [MessageKey, string][] = [['inv.refIntact', '#EAF5F6'], ['inv.altIntact', '#EEF3FA'], ['inv.refInj', '#FBF4E8'], ['inv.altInj', '#FBEDEA']];
  return (
    <div className="max-w-[1150px] mx-auto px-4 md:px-6 py-10 space-y-5">
      <PageHeader kicker={t('inv.kicker')} title={t('inv.h1')} lead={t('inv.lead')} />
      <Card title={t('inv.archTitle')}>
        <Architecture />
        <p className="mt-2 text-[11px] text-muted-foreground">{t('inv.archNote')}</p>
      </Card>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title={t('inv.subTitle')}>
          <dl className="space-y-3" data-testid="invention-subsystems">
            {subs.map(([k, d]) => (
              <div key={k}><dt className="text-sm font-semibold text-[#10243A]">{t(k)}</dt><dd className="text-xs text-[#3B5268] leading-relaxed">{t(d)}</dd></div>
            ))}
          </dl>
        </Card>
        <Card title={t('inv.statesTitle')}>
          <ol className="space-y-3" data-testid="invention-states">
            {states.map(([k, d], i) => (
              <li key={k} className="flex gap-3">
                <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-[#087F8C] text-white text-[11px] font-bold grid place-items-center">{i}</span>
                <div><div className="text-sm font-semibold text-[#10243A]">{t(k)}</div><div className="text-xs text-[#3B5268] leading-relaxed">{t(d)}</div></div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title={t('inv.x2Title')}>
          <div className="grid grid-cols-2 gap-2" data-testid="invention-2x2">
            {cells.map(([k, bg]) => <div key={k} className="rounded-xl border p-4 text-center text-sm font-semibold text-[#10243A]" style={{ background: bg }}>{t(k)}</div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t('inv.x2Note')}</p>
        </Card>
        <Card title={t('inv.abcTitle')}>
          <ul className="space-y-2 text-sm text-[#10243A]">
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#C2410C]" />{t('inv.abcA')}</li>
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#B7791F]" />{t('inv.abcB')}</li>
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#087F8C]" />{t('inv.abcC')}</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{t('inv.abcNote')}</p>
        </Card>
      </div>
      <Card title={t('inv.modelMap')}>
        <p className="text-sm text-[#3B5268] leading-relaxed">{t('inv.modelMapBody')}</p>
        <Link href="/model" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#087F8C] hover:underline"><Sigma className="h-4 w-4" />{t('inv.methods')}</Link>
      </Card>
    </div>
  );
}
