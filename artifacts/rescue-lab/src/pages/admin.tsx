import { useMemo, useState } from 'react';
import { Redirect } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel, usePageTitle } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { apiJson, useAuth, type Profile } from '@/lib/auth';

type AuditEntry = { id: number; actor_email: string | null; action: string; target_type: string | null; target_id: string | null; detail: Record<string, unknown>; created_at: string };
const ROLES: Profile['role'][] = ['admin', 'researcher', 'reviewer', 'viewer'];

export default function AdminPage() {
  const { t, fmtDate } = useI18n();
  const { ready, session, profile } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  usePageTitle(t('admin.title'));
  const isAdmin = profile?.role === 'admin';
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => apiJson<Profile[]>('/api/admin/users'), enabled: isAdmin });
  const audit = useQuery({ queryKey: ['admin-audit'], queryFn: () => apiJson<AuditEntry[]>('/api/admin/audit?limit=200'), enabled: isAdmin });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pick<Profile, 'role' | 'status'>> }) =>
      apiJson<Profile>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    meta: { handled: true },
    onSuccess: () => { toast({ title: t('admin.updated') }); qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-audit'] }); },
    onError: (e: Error & { status?: number }) => toast({ title: t('common.error'), description: e.status === 409 ? t('admin.lastAdmin') : e.message, variant: 'destructive' }),
  });
  const shown = useMemo(() => (users.data ?? []).filter((u) => u.email.toLowerCase().includes(filter.trim().toLowerCase())), [users.data, filter]);

  if (ready && !session) return <Redirect to="/login" />;
  if (profile && !isAdmin) {
    return <Panel title={t('auth.forbiddenTitle')}><p className="text-sm" data-testid="admin-forbidden">{t('auth.forbiddenBody')}</p></Panel>;
  }
  if (!profile) return <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin" aria-label={t('common.loading')} /></div>;

  return (
    <div className="grid gap-6">
      <Panel title={t('admin.users')} kicker={t('admin.title')}
        right={<Input placeholder={t('admin.search')} value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 w-56" aria-label={t('admin.search')} />}>
        {users.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : shown.length === 0 ? <p className="text-sm text-muted-foreground">{t('admin.empty')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-users">
              <thead><tr className="text-muted-foreground text-start border-b">
                {(['admin.colEmail', 'admin.colRole', 'admin.colStatus', 'admin.colVerified', 'admin.colLastSeen'] as const).map((k) => <th key={k} className="text-start font-medium py-2 pe-4">{t(k)}</th>)}
                <th />
              </tr></thead>
              <tbody>
                {shown.map((u) => {
                  const self = u.id === profile.id;
                  return (
                    <tr key={u.id} className="border-b border-dashed last:border-0">
                      <td className="py-2 pe-4" dir="ltr">{u.email}{self && <span className="ms-2 text-xs text-primary">({t('admin.you')})</span>}</td>
                      <td className="py-2 pe-4">
                        <select aria-label={`${t('admin.colRole')} ${u.email}`} value={u.role} disabled={update.isPending}
                          onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value as Profile['role'] } })}
                          className="h-8 rounded border border-input bg-transparent px-2">
                          {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pe-4">{t(`status.${u.status}`)}</td>
                      <td className="py-2 pe-4">{u.email_verified_at ? t('common.yes') : t('common.no')}</td>
                      <td className="py-2 pe-4 font-num text-xs">{fmtDate(u.last_seen_at)}</td>
                      <td className="py-2">
                        <Button size="sm" variant="outline" disabled={update.isPending}
                          onClick={() => update.mutate({ id: u.id, body: { status: u.status === 'active' ? 'suspended' : 'active' } })}>
                          {u.status === 'active' ? t('admin.suspend') : t('admin.activate')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title={t('admin.audit')}>
        {audit.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-xs font-num" data-testid="table-audit">
              <thead><tr className="text-muted-foreground border-b">
                {(['admin.colTime', 'admin.colAction', 'admin.colActor', 'admin.colTarget'] as const).map((k) => <th key={k} className="text-start font-medium py-2 pe-4">{t(k)}</th>)}
              </tr></thead>
              <tbody>
                {(audit.data ?? []).map((a) => (
                  <tr key={a.id} className="border-b border-dashed last:border-0">
                    <td className="py-1.5 pe-4 whitespace-nowrap">{fmtDate(a.created_at)}</td>
                    <td className="py-1.5 pe-4" dir="ltr">{a.action}</td>
                    <td className="py-1.5 pe-4" dir="ltr">{a.actor_email ?? '-'}</td>
                    <td className="py-1.5 pe-4" dir="ltr">{a.target_type ? `${a.target_type}:${(a.target_id ?? '').slice(0, 8)}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
