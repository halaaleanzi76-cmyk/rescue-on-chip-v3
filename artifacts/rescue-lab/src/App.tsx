import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
const Workbench = lazy(() => import('@/pages/workbench'));
const Laboratory = lazy(() => import('@/pages/laboratory'));
const Compare = lazy(() => import('@/pages/compare'));
const Runs = lazy(() => import('@/pages/runs'));
const Model = lazy(() => import('@/pages/model'));
const Vascular = lazy(() => import('@/pages/vascular'));
import Home from '@/pages/home';
const Validation = lazy(() => import('@/pages/validation'));
const Results = lazy(() => import('@/pages/results'));
const AccountPage = lazy(() => import('@/pages/account'));
const AdminPage = lazy(() => import('@/pages/admin'));
import { AuthCallbackPage, ForgotPasswordPage, ResetPasswordPage, SignInPage, SignUpPage } from '@/pages/auth';
import { Shell } from '@/components/shell';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from 'wouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });


function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <Shell>
    <RoutedErrorBoundary>
      <Suspense fallback={<div className="p-10 text-sm text-muted-foreground" role="status">…</div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/lab" component={Laboratory} />
        <Route path="/validation" component={Validation} />
        <Route path="/results" component={Results} />
        <Route path="/problem"><Redirect to="/" replace /></Route>
        <Route path="/invention"><Redirect to="/" replace /></Route>
        <Route path="/evidence"><Redirect to="/" replace /></Route>
        <Route path="/judge"><Redirect to="/" replace /></Route>
        <Route path="/vascular" component={Vascular} />
        <Route path="/analysis" component={Workbench} />
        <Route path="/compare" component={Compare} />
        <Route path="/runs" component={Runs} />
        <Route path="/model" component={Model} />
        <Route path="/login" component={SignInPage} />
        <Route path="/signup" component={SignUpPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/auth/callback" component={AuthCallbackPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </RoutedErrorBoundary>
    </Shell>
  );
}

/**
 * Email-link safety net. If Supabase falls back to the Site URL (redirect not allow-listed),
 * the PKCE ?code= lands on an arbitrary page: forward it to the callback. A recovery session
 * (PASSWORD_RECOVERY) always ends on the reset form, wherever the link landed.
 */
function AuthRedirects() {
  const [location, setLocation] = useLocation();
  const { recovery } = useAuth();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && location !== '/auth/callback') {
      setLocation(`/auth/callback${window.location.search}`, { replace: true });
    } else if (recovery && location !== '/reset-password' && location !== '/auth/callback') {
      setLocation('/reset-password', { replace: true });
    }
  }, [location, recovery, setLocation]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/** One place that turns failed mutations into clear, translated feedback (401 → sign in, 403 → no permission). */
function MutationErrorBridge() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { session } = useAuth();
  useEffect(() => qc.getMutationCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'error') return;
    if (event.mutation.meta?.handled) return;
    const err = event.action.error as { status?: number; message?: string; data?: { error?: string; detail?: unknown } };
    if (err?.status === 401) {
      toast({ title: t('auth.requiredTitle'), description: session ? t('auth.sessionExpired') : t('save.signInToSave'), variant: 'destructive' });
    } else if (err?.status === 403) {
      toast({ title: t('auth.forbiddenTitle'), description: typeof err.data?.detail === 'string' ? err.data.detail : t('auth.forbiddenBody'), variant: 'destructive' });
    } else if (err?.status === 422) {
      return; // validation errors are rendered next to the form fields by each page
    } else {
      toast({ title: t('common.error'), description: err?.data?.error ?? (err?.status ? t('err.server') : t('err.network')), variant: 'destructive' });
    }
  }), [qc, t, session]);
  return null;
}

function App() {
  if (typeof document !== 'undefined') document.documentElement.classList.remove('dark');
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AuthRedirects />
              <Router />
            </WouterRouter>
            <MutationErrorBridge />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
