/**
 * Supabase-backed session state for the SPA.
 * - Public Supabase URL/anon key come from the API (/api/auth/config), so .env.local is the single source.
 * - The access token is attached to every API request; the server re-validates it with Supabase
 *   and applies roles from its own database (the client never decides permissions).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export type Profile = {
  id: string; email: string; role: 'admin' | 'researcher' | 'reviewer' | 'viewer';
  status: 'active' | 'suspended'; locale: 'ar' | 'en'; display_name: string | null;
  created_at: string; last_seen_at: string; email_verified_at: string | null;
};

type AuthState = {
  ready: boolean;
  configured: boolean;
  client: SupabaseClient | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => void;
  /** True after Supabase reports PASSWORD_RECOVERY (user arrived via a reset link). */
  recovery: boolean;
  clearRecovery: () => void;
};

const AuthContext = createContext<AuthState | null>(null);
let currentToken: string | null = null;
setAuthTokenGetter(() => currentToken);

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && (data.detail || data.error)) || res.statusText) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

/**
 * Everything user-scoped (runs, summary) is refetched under the new identity. The profile query is
 * dropped on sign-out instead of refetched: refetching it then would fire a token-less /api/me (401).
 */
function refetchForIdentity(qc: QueryClient, signedIn: boolean) {
  if (!signedIn) qc.removeQueries({ queryKey: ['me'] });
  qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' || signedIn });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const config = useQuery({
    queryKey: ['auth-config'],
    queryFn: () => apiJson<{ configured: boolean; supabase_url: string | null; supabase_anon_key: string | null }>('/api/auth/config'),
    staleTime: Infinity, retry: 2,
  });
  const client = useMemo(() => {
    const c = config.data;
    if (!c?.configured || !c.supabase_url || !c.supabase_anon_key) return null;
    return createClient(c.supabase_url, c.supabase_anon_key, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }, [config.data]);

  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!client) { if (config.isFetched) setSessionReady(true); return; }
    let alive = true;
    client.auth.getSession().then(({ data }) => {
      if (!alive) return;
      currentToken = data.session?.access_token ?? null;
      setSession(data.session); setSessionReady(true);
    });
    const { data: sub } = client.auth.onAuthStateChange((event, s) => {
      currentToken = s?.access_token ?? null;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      setSession(s);
      refetchForIdentity(qc, Boolean(s));
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [client, config.isFetched, qc]);

  const profileQuery = useQuery({
    queryKey: ['me', session?.user.id ?? 'anon'],
    queryFn: () => apiJson<Profile>('/api/me'),
    enabled: Boolean(session),
    retry: false,
  });

  // The account's saved interface language wins once per sign-in (e.g. on a new device).
  const { setLang } = useI18n();
  const appliedLocaleFor = useRef<string | null>(null);
  useEffect(() => {
    const p = profileQuery.data;
    if (p && appliedLocaleFor.current !== p.id) {
      appliedLocaleFor.current = p.id;
      setLang(p.locale);
    }
    if (!session) appliedLocaleFor.current = null;
  }, [profileQuery.data, session, setLang]);

  const value: AuthState = {
    ready: config.isFetched && sessionReady,
    configured: Boolean(config.data?.configured),
    client, session,
    profile: session ? profileQuery.data ?? null : null,
    profileError: session && profileQuery.error ? (profileQuery.error as Error).message : null,
    signOut: async () => {
      await client?.auth.signOut();
      currentToken = null;
      setSession(null);
      refetchForIdentity(qc, false);
    },
    refreshProfile: () => { qc.invalidateQueries({ queryKey: ['me'] }); },
    recovery,
    clearRecovery: () => setRecovery(false),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Absolute URL inside this SPA (respects BASE_URL) for Supabase email redirects. */
export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}${path}`;
}

/** Variables for auth error messages (e.g. the cooldown seconds Supabase reports). */
export function authErrorVars(err: { message?: string } | null | undefined): Record<string, string | number> {
  const s = /after (\d+) seconds?/i.exec(err?.message || '');
  return { seconds: s ? Number(s[1]) : 60 };
}

/** Map Supabase auth errors to translation keys. */
export function authErrorKey(err: { message?: string; status?: number; code?: string } | null | undefined) {
  const m = (err?.message || '').toLowerCase();
  const code = err?.code || '';
  if (code === 'invalid_credentials' || m.includes('invalid login')) return 'auth.err.invalidCredentials' as const;
  if (code === 'email_not_confirmed' || m.includes('not confirmed')) return 'auth.err.notConfirmed' as const;
  // Supabase rate limits: a per-address cooldown ("only request this after N seconds") vs the project's hourly email cap.
  if (code === 'over_email_send_rate_limit' || m.includes('email rate limit')) return 'auth.err.emailQuota' as const;
  if (/after \d+ seconds?/.test(m)) return 'auth.err.cooldown' as const;
  if (err?.status === 429 || m.includes('rate limit')) return 'auth.err.rateLimit' as const;
  if (code === 'same_password' || m.includes('different from the old')) return 'auth.err.samePassword' as const;
  if (code === 'weak_password' || m.includes('weak')) return 'auth.err.weakPassword' as const;
  if (m.includes('password') && m.includes('6')) return 'auth.err.passwordShort' as const;
  return 'auth.err.generic' as const;
}
