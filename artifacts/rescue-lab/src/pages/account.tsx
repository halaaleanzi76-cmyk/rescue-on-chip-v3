import { useEffect, useState } from 'react';
import { Link, Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, usePageTitle } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import { useI18n, type Lang } from '@/lib/i18n';
import { apiJson, useAuth, type Profile } from '@/lib/auth';

export default function AccountPage() {
  const { t, fmtDate, setLang } = useI18n();
  const { ready, session, profile, profileError, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [locale, setLocale] = useState<Lang>('ar');
  const [busy, setBusy] = useState(false);
  usePageTitle(t('account.title'));
  useEffect(() => { if (profile) { setName(profile.display_name ?? ''); setLocale(profile.locale); } }, [profile]);

  if (ready && !session) return <Redirect to="/login" />;
  if (profileError) return <Panel title={t('account.title')}><p role="alert" className="text-sm text-destructive">{profileError}</p></Panel>;
  if (!profile) return <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin" aria-label={t('common.loading')} /></div>;

  const save = async () => {
    setBusy(true);
    try {
      await apiJson<Profile>('/api/me', { method: 'PATCH', body: JSON.stringify({ display_name: name.trim() || null, locale }) });
      setLang(locale); refreshProfile();
      toast({ title: t('account.saved') });
    } catch (e) {
      toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 border-b border-dashed last:border-0 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-end">{v}</dd></div>
  );
  return (
    <div className="max-w-3xl mx-auto grid gap-6">
      <Panel title={t('account.title')} kicker={profile.email}>
        <dl data-testid="account-details">
          {row(t('auth.email'), <span dir="ltr">{profile.email}</span>)}
          {row(t('account.role'), t(`role.${profile.role}`))}
          {row(t('account.status'), t(`status.${profile.status}`))}
          {row(t('account.verified'), profile.email_verified_at ? fmtDate(profile.email_verified_at) : t('common.no'))}
          {row(t('account.memberSince'), fmtDate(profile.created_at))}
        </dl>
      </Panel>
      <Panel title={t('account.save')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label htmlFor="dn">{t('auth.displayName')}</Label><Input id="dn" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">{t('account.language')}</Label>
            <select id="loc" value={locale} onChange={(e) => setLocale(e.target.value as Lang)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="ar">العربية</option><option value="en">English</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={save} disabled={busy}>{t('account.save')}</Button>
          <Button variant="outline" asChild><Link href="/reset-password">{t('account.changePassword')}</Link></Button>
          <Button variant="outline" onClick={signOut} data-testid="button-signout">{t('auth.signOut')}</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('account.sessionNote')}</p>
      </Panel>
    </div>
  );
}
