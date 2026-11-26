import { type ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck, getHealthCheckQueryKey, useGetSummary } from '@workspace/api-client-react';
import { Home, Network, FlaskConical, ShieldCheck as Shield, BarChart3, History, Sigma, Languages, LogIn, UserRound, ShieldCheck } from 'lucide-react';
import { Logo as BrandLogo } from '@/components/brand';
import { cn } from '@/lib/utils';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { apiJson, useAuth } from '@/lib/auth';

const NAV: { href: string; label: MessageKey; icon: typeof Home; id: string; match?: string[] }[] = [
  { href: '/', label: 'nav2.home', icon: Home, id: 'home' },
  { href: '/lab', label: 'nav2.simulation', icon: FlaskConical, id: 'lab', match: ['/compare'] },
  { href: '/vascular', label: 'nav2.vascular', icon: Network, id: 'vascular' },
  { href: '/results', label: 'nav2.results', icon: BarChart3, id: 'results', match: ['/analysis'] },
  { href: '/runs', label: 'nav2.runs', icon: History, id: 'runs' },
  { href: '/validation', label: 'nav2.validation', icon: Shield, id: 'validation' },
  { href: '/model', label: 'nav2.model', icon: Sigma, id: 'model' },
];

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  const { session, refreshProfile } = useAuth();
  const toggle = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    // Signed-in users keep the choice on their account (applies on other devices too).
    if (session) apiJson('/api/me', { method: 'PATCH', body: JSON.stringify({ locale: next }) }).then(refreshProfile).catch(() => {});
  };
  return (
    <button type="button" onClick={toggle} data-testid="button-lang"
      className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent"
      aria-label={t('lang.label')} lang={lang === 'ar' ? 'en' : 'ar'}>
      <Languages className="h-4 w-4" />{t('lang.switch')}
    </button>
  );
}

function AccountMenu() {
  const { t } = useI18n();
  const { ready, session, profile } = useAuth();
  if (!ready) return null;
  if (!session) {
    return (
      <Link href="/login" data-testid="link-signin" className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border border-sidebar-border hover:bg-sidebar-accent">
        <LogIn className="h-4 w-4" />{t('auth.signIn')}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {profile?.role === 'admin' && (
        <Link href="/admin" data-testid="link-admin" className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-md hover:bg-sidebar-accent">
          <ShieldCheck className="h-4 w-4 text-[#e8b04a]" />{t('nav.admin')}
        </Link>
      )}
      <Link href="/account" data-testid="link-account" className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-md hover:bg-sidebar-accent max-w-[180px]">
        <UserRound className="h-4 w-4 shrink-0" /><span className="truncate" dir="ltr">{profile?.display_name || session.user.email}</span>
      </Link>
    </div>
  );
}

export function usePageTitle(t: string) {
  useEffect(() => { document.title = `${t} · Rescue-on-Chip`; }, [t]);
}

function Health() {
  const { t } = useI18n();
  const h = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000, retry: 0 } });
  const ok = h.data && /ok|healthy|up/i.test(h.data.status);
  const state = h.isLoading ? t('health.checking') : ok ? t('health.online') : t('health.offline');
  return (
    <span data-testid="status-health" className="hidden lg:flex items-center gap-2 text-[11px] text-[#3B5268]">
      <span className={cn('relative h-2 w-2 rounded-full', h.isLoading ? 'bg-amber-400' : ok ? 'bg-[#24B6B7]' : 'bg-[#C2410C]')}>
        {ok && <span className="absolute inset-0 rounded-full bg-[#24B6B7] animate-ping opacity-50" />}
      </span>
      {state}
    </span>
  );
}

export function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <rect x="1" y="5" width="28" height="20" rx="3" fill="hsl(182 60% 50% / .08)" stroke="#3fc1c9" strokeWidth="1.3" />
      <path d="M1 11h28M1 15h28M1 19h28" stroke="#3fc1c9" strokeOpacity=".55" strokeWidth=".8" />
      <circle cx="9" cy="15" r="1.4" fill="#e8b04a" /><circle cx="17" cy="11" r="1.1" fill="#e8b04a" /><circle cx="22" cy="19" r="1.1" fill="#e8b04a" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { t } = useI18n();
  const summary = useGetSummary();
  const wide = loc === '/' || ['/lab', '/compare', '/vascular', '/validation', '/results'].some((p) => loc.startsWith(p));
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2">{t('nav.lab')}</a>
      <div className="bg-[#F1F8F9] text-[#10243A] border-b border-[#E2EAF0] text-[11px] text-center py-1 px-3" data-testid="banner-ruo">
        {t('site.disclaimer')}
      </div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E2EAF0]">
        <div className="mx-auto max-w-none px-4 md:px-5 flex flex-wrap items-center gap-x-5 gap-y-2 py-2.5">
          <Link href="/" className="flex items-center" data-testid="link-home" aria-label={t('nav2.home')}>
            <BrandLogo size={34} className="hidden sm:inline-flex" />
            <BrandLogo size={30} compact className="sm:hidden" />
          </Link>
          <nav className="flex gap-0.5 order-3 xl:order-none w-full xl:w-auto overflow-x-auto" aria-label="Main">
            {NAV.map((n) => {
              const active = n.href === '/' ? loc === '/' : loc.startsWith(n.href) || (n.match ?? []).some((m) => loc.startsWith(m));
              return (
                <Link key={n.href} href={n.href} data-testid={`link-nav-${n.id}`} aria-current={active ? 'page' : undefined}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-full whitespace-nowrap transition-colors',
                    active ? 'bg-[#E6F4F5] text-[#087F8C] font-semibold' : 'text-[#3B5268] hover:text-[#10243A] hover:bg-[#F1F5F8]')}>
                  <n.icon className="h-4 w-4" />{t(n.label)}
                </Link>
              );
            })}
          </nav>
          <div className="ms-auto flex items-center gap-3">
            <Health />
            <LanguageSwitch />
            <AccountMenu />
          </div>
        </div>
      </header>
      <main id="main" className={cn('flex-1 w-full mx-auto', wide ? 'max-w-none p-0' : 'max-w-[1500px] px-4 md:px-6 py-6')}>{children}</main>
      {!wide && (
        <footer className="border-t text-[11px] text-muted-foreground">
          <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-4 flex flex-wrap gap-x-6 gap-y-1">
            <span>{t('footer.source')}</span>
            <span>{t('footer.evidence')}</span>
          </div>
        </footer>
      )}
    </div>
  );
}

export function SimBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex items-center border border-[#ef7a5a]/60 text-[#ef7a5a] bg-[#ef7a5a]/10 px-1.5 py-0.5 stamp text-[9px] rounded-[3px]', className)}>
      {t('sim.badge')}
    </span>
  );
}

export function Panel({ title, kicker, right, children, className, id }: { title: string; kicker?: string; right?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('bg-card border border-card-border rounded-md rise', className)}>
      <div className="flex flex-wrap items-start gap-2 px-4 pt-3 pb-2 border-b border-dashed">
        <div>
          {kicker && <div className="stamp text-[9px] text-muted-foreground">{kicker}</div>}
          <h2 className="font-semibold tracking-tight text-[15px]">{title}</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
