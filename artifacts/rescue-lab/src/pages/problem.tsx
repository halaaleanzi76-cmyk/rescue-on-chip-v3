import { Link } from 'wouter';
import { Network } from 'lucide-react';
import { usePageTitle } from '@/components/shell';
import { useI18n, type MessageKey } from '@/lib/i18n';

export function PageHeader({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) {
  return (
    <header className="mb-8">
      <div className="text-[12px] font-medium tracking-wide text-[#087F8C]">{kicker}</div>
      <h1 className="mt-2 text-3xl md:text-[38px] font-extrabold tracking-tight text-[#10243A]">{title}</h1>
      {lead && <p className="mt-3 text-base text-[#3B5268] leading-relaxed max-w-[75ch]">{lead}</p>}
    </header>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-white p-6 ${className}`}>
      {title && <h2 className="text-lg font-bold text-[#10243A] mb-3">{title}</h2>}
      {children}
    </section>
  );
}

export default function Problem() {
  const { t } = useI18n();
  usePageTitle(t('nav2.problem'));
  const stats: [string, MessageKey][] = [['43.3 %', 'pb2.s1'], ['67.5 %', 'pb2.s2'], ['0.31', 'pb2.s3']];
  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 space-y-5">
      <PageHeader kicker={t('pb2.kicker')} title={t('pb2.h1')} lead={t('pb2.p1')} />
      <Card title={t('pb2.statsTitle')}>
        <div className="grid sm:grid-cols-3 gap-3" data-testid="problem-stats">
          {stats.map(([v, k]) => (
            <div key={k} className="rounded-xl bg-[#F8FAFC] border p-4">
              <div className="text-3xl font-extrabold text-[#087F8C] font-num" dir="ltr">{v}</div>
              <div className="mt-1 text-xs text-[#3B5268] leading-snug">{t(k)}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">{t('pb2.source')}</p>
      </Card>
      <Card title={t('pb2.q')}><p className="text-sm leading-relaxed text-[#3B5268]">{t('pb2.qBody')}</p></Card>
      <Card title={t('pb2.mech')}>
        <div className="flex flex-wrap gap-2">
          {(['pb2.m1', 'pb2.m2', 'pb2.m3', 'pb2.m4'] as const).map((k) => (
            <span key={k} className="rounded-full border px-3 py-1 text-xs text-[#10243A] bg-[#F8FAFC]">{t(k)}</span>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{t('pb2.caveat')}</p>
        <Link href="/vascular" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#087F8C] hover:underline" data-testid="link-vascular">
          <Network className="h-4 w-4" />{t('pb2.explore')}
        </Link>
      </Card>
    </div>
  );
}
