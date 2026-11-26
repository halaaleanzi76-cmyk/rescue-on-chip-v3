import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Loader2, MailCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/components/shell';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { appUrl, authErrorKey, authErrorVars, useAuth } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthCard({ title, lead, children, icon }: { title: string; lead?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-10">
      <section className="w-full max-w-[420px] bg-card border border-card-border rounded-md rise" aria-labelledby="auth-title">
        <div className="px-6 pt-6 pb-4 border-b border-dashed">
          {icon}
          <h1 id="auth-title" className="font-semibold tracking-tight text-xl">{title}</h1>
          {lead && <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{lead}</p>}
        </div>
        <div className="p-6">{children}</div>
      </section>
    </div>
  );
}

function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.ComponentProps<'input'>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error && <p id={`${id}-err`} className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function FormError({ msgKey, vars }: { msgKey: MessageKey | null; vars?: Record<string, string | number> }) {
  const { t } = useI18n();
  if (!msgKey) return null;
  return <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">{t(msgKey, vars)}</p>;
}

function NotConfigured() {
  const { t } = useI18n();
  return (
    <AuthCard title={t('auth.signIn')} icon={<ShieldAlert className="h-6 w-6 text-amber-400 mb-3" />}>
      <p className="text-sm leading-relaxed" data-testid="auth-not-configured">{t('auth.notConfigured')}</p>
    </AuthCard>
  );
}

function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Button type="submit" className="w-full" disabled={busy}>
      {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.working')}</> : children}
    </Button>
  );
}

export function SignInPage() {
  const { t } = useI18n();
  const { client, configured, ready, session } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<MessageKey | null>(null);
  usePageTitle(t('auth.signIn'));
  useEffect(() => { if (session) setLocation('/'); }, [session, setLocation]);
  if (ready && !configured) return <NotConfigured />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!EMAIL_RE.test(email)) return setErr('auth.err.email');
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(authErrorKey(error)); else setLocation('/');
  };
  return (
    <AuthCard title={t('auth.signInTitle')} lead={t('auth.signInLead')}>
      <form onSubmit={submit} className="space-y-4" noValidate data-testid="form-signin">
        <Field id="email" type="email" autoComplete="email" dir="ltr" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field id="password" type="password" autoComplete="current-password" dir="ltr" label={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <FormError msgKey={err} />
        <Submit busy={busy}>{t('auth.signIn')}</Submit>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">{t('auth.forgot')}</Link>
          <span className="text-muted-foreground">{t('auth.noAccount')} <Link href="/signup" className="text-primary hover:underline">{t('auth.signUp')}</Link></span>
        </div>
      </form>
    </AuthCard>
  );
}

export function SignUpPage() {
  const { t } = useI18n();
  const { client, configured, ready } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<MessageKey | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  usePageTitle(t('auth.signUp'));
  if (ready && !configured) return <NotConfigured />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!EMAIL_RE.test(email)) return setErr('auth.err.email');
    if (password.length < 8) return setErr('auth.err.passwordShort');
    if (password !== confirm) return setErr('auth.err.passwordMismatch');
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: appUrl('/auth/callback'), data: name.trim() ? { display_name: name.trim() } : undefined },
    });
    setBusy(false);
    // Supabase deliberately does not reveal whether an address is already registered; neither do we.
    if (error) setErr(authErrorKey(error)); else setSentTo(email.trim());
  };
  const resend = async () => {
    if (!client || !sentTo) return;
    setBusy(true);
    const { error } = await client.auth.resend({ type: 'signup', email: sentTo, options: { emailRedirectTo: appUrl('/auth/callback') } });
    setBusy(false);
    toast(error ? { title: t('common.error'), description: t(authErrorKey(error), authErrorVars(error)), variant: 'destructive' } : { title: t('auth.resent') });
  };
  if (sentTo) {
    return (
      <AuthCard title={t('auth.checkEmailTitle')} icon={<MailCheck className="h-7 w-7 text-primary mb-3" />}>
        <p className="text-sm leading-relaxed" data-testid="text-check-email">{t('auth.checkEmail', { email: sentTo })}</p>
        <Button variant="outline" className="w-full mt-5" onClick={resend} disabled={busy}>{t('auth.resend')}</Button>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t('auth.signUpTitle')} lead={t('auth.signUpLead')}>
      <form onSubmit={submit} className="space-y-4" noValidate data-testid="form-signup">
        <Field id="name" autoComplete="name" label={t('auth.displayName')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Field id="email" type="email" autoComplete="email" dir="ltr" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field id="password" type="password" autoComplete="new-password" dir="ltr" label={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <Field id="confirm" type="password" autoComplete="new-password" dir="ltr" label={t('auth.passwordConfirm')} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <FormError msgKey={err} />
        <Submit busy={busy}>{t('auth.signUp')}</Submit>
        <p className="text-sm text-muted-foreground">{t('auth.haveAccount')} <Link href="/login" className="text-primary hover:underline">{t('auth.signIn')}</Link></p>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const { client, configured, ready } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<MessageKey | null>(null);
  const [sent, setSent] = useState(false);
  const [errVars, setErrVars] = useState<Record<string, string | number>>();
  usePageTitle(t('auth.forgotTitle'));
  if (ready && !configured) return <NotConfigured />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!EMAIL_RE.test(email)) return setErr('auth.err.email');
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('/auth/callback?next=/reset-password') });
    setBusy(false);
    // Only rate limits are surfaced; any other outcome shows the same neutral message (never reveal account existence).
    if (error && error.status === 429) { setErr(authErrorKey(error)); setErrVars(authErrorVars(error)); } else setSent(true);
  };
  return (
    <AuthCard title={t('auth.forgotTitle')} lead={sent ? undefined : t('auth.forgotLead')}>
      {sent ? <p className="text-sm leading-relaxed" data-testid="text-reset-sent">{t('auth.resetSent', { email: email.trim() })}</p> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="email" type="email" autoComplete="email" dir="ltr" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FormError msgKey={err} vars={errVars} />
          <Submit busy={busy}>{t('auth.sendReset')}</Submit>
          <Link href="/login" className="text-sm text-primary hover:underline">{t('auth.signIn')}</Link>
        </form>
      )}
    </AuthCard>
  );
}

/** Target of every Supabase email link (verification and recovery). Exchanges the PKCE code for a session. */
export function AuthCallbackPage() {
  const { t } = useI18n();
  const { client, ready } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [failed, setFailed] = useState(false);
  usePageTitle(t('auth.callbackWorking'));
  useEffect(() => {
    if (!ready || !client) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const next = params.get('next');
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
    if (params.get('error') || !code) { setFailed(true); return; }
    client.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) { setFailed(true); return; }
      if (!safeNext) toast({ title: t('auth.verified') });
      setLocation(safeNext ?? '/');
    });
  }, [ready, client]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AuthCard title={failed ? t('auth.callbackFailed') : t('auth.callbackWorking')}>
      {failed
        ? <div className="flex gap-3 text-sm"><Link href="/login" className="text-primary hover:underline">{t('auth.signIn')}</Link><Link href="/forgot-password" className="text-primary hover:underline">{t('auth.forgot')}</Link></div>
        : <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label={t('common.loading')} />}
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const { t } = useI18n();
  const { client, session, ready, clearRecovery } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<MessageKey | null>(null);
  usePageTitle(t('auth.resetTitle'));
  if (ready && !session) {
    return <AuthCard title={t('auth.resetTitle')}><p className="text-sm">{t('auth.resetNeedsLink')}</p></AuthCard>;
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (password.length < 8) return setErr('auth.err.passwordShort');
    if (password !== confirm) return setErr('auth.err.passwordMismatch');
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(authErrorKey(error)); else { clearRecovery(); toast({ title: t('auth.resetDone') }); setLocation('/account'); }
  };
  return (
    <AuthCard title={t('auth.resetTitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="password" type="password" autoComplete="new-password" dir="ltr" label={t('auth.newPassword')} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field id="confirm" type="password" autoComplete="new-password" dir="ltr" label={t('auth.passwordConfirm')} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <FormError msgKey={err} />
        <Submit busy={busy}>{t('auth.resetSave')}</Submit>
      </form>
    </AuthCard>
  );
}
