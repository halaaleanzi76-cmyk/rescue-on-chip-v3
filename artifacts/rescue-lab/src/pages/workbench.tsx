import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useLocation, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetModel, useGetSummary, useGetRun, getGetRunQueryKey, useCreateRun,
  getListRunsQueryKey, getGetSummaryQueryKey, type SimulationRun,
} from '@workspace/api-client-react';
import { Play, RotateCcw, Undo2, ChevronDown, AlertCircle, Beaker } from 'lucide-react';
import { Panel, usePageTitle } from '@/components/shell';
import { RunHeader, MetricsTable, TraceChart, ArmsPanel, TracerChart, NotesPanel } from '@/components/results';
import { GROUPS, ALL_FIELDS, fieldLabel, groupTitle, groupNote, fieldHint, fieldUnit, type FormState, toForm, validate, changedKeys, humanError } from '@/lib/lab';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Workbench() {
  const { t } = useI18n();
  usePageTitle(t('nav.analysis'));
  const search = useSearch();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const paramRun = new URLSearchParams(search).get('run');

  const model = useGetModel();
  const summary = useGetSummary();
  const runId = paramRun ?? summary.data?.latest_run_id ?? '';
  const run = useGetRun(runId, { query: { enabled: !!runId, queryKey: getGetRunQueryKey(runId) } });

  const [form, setForm] = useState<FormState | null>(null);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (run.data && loadedFor.current !== run.data.id) {
      loadedFor.current = run.data.id;
      setForm(toForm(run.data.config));
      setTouched(false);
    } else if (!runId && !form && model.data && summary.isSuccess) {
      setForm(toForm(model.data.defaults));
    }
  }, [run.data, runId, model.data, summary.isSuccess, form]);

  const create = useCreateRun();
  const v = useMemo(() => (form ? validate(form) : { errors: {}, data: null }), [form]);
  const changed = useMemo(() => (form ? changedKeys(form, run.data?.config) : []), [form, run.data]);

  const submit = () => {
    setTouched(true);
    if (!v.data) {
      toast({ title: t('cfg.checkConfig'), description: Object.entries(v.errors).map(([k, e]) => { const f = ALL_FIELDS.find((x) => x.key === k); return `${f ? fieldLabel(f) : k}: ${e}`; }).join(' · '), variant: 'destructive' });
      return;
    }
    create.mutate({ data: v.data }, {
      onSuccess: (r: SimulationRun) => {
        qc.setQueryData(getGetRunQueryKey(r.id), r);
        qc.invalidateQueries({ queryKey: getListRunsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        setLocation(`/analysis?run=${r.id}`);
        toast({ title: t('wb.simComplete'), description: t('cfg.savedToastBody', { id: r.id.slice(0, 8), fp: r.fingerprint.slice(0, 12) }) });
      },
    });
  };

  const set = (k: string, val: string) => setForm((f) => (f ? { ...f, [k]: val } : f));

  return (
    <div className="grid xl:grid-cols-[400px_minmax(0,1fr)] gap-6 items-start">
      <aside className="xl:sticky xl:top-4 bg-card border border-card-border rounded-sm rise" aria-label={t('wb.title')}>
        <div className="px-4 pt-3 pb-2 border-b border-dashed flex items-start gap-2">
          <div>
            <div className="stamp text-[9px] text-muted-foreground">{t('wb.contract')}</div>
            <h1 className="font-bold tracking-tight">{t('wb.title')}</h1>
          </div>
          {run.data && changed.length > 0 && (
            <span className="ms-auto stamp text-[9px] px-1.5 py-0.5 bg-[#e8b04a]/15 text-[#f0c674] border border-[#e8b04a]/50 rounded-[2px]" data-testid="status-modified">
              {t('wb.changed', { n: changed.length })}
            </span>
          )}
          {run.data && changed.length === 0 && (
            <span className="ms-auto stamp text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 rounded-[2px]" data-testid="status-matches">{t('wb.matches')}</span>
          )}
        </div>
        {!form ? (
          <div className="p-4 space-y-3">
            {model.isError ? (
              <ErrorBox msg={t('wb.defaultsFailed', { msg: humanError(model.error) })} onRetry={() => model.refetch()} />
            ) : Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
          </div>
        ) : (
          <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="max-h-none xl:max-h-[calc(100dvh-220px)] overflow-y-auto">
            {GROUPS.map((g) => {
              const isOpen = !g.advanced || open[g.id] || g.fields.some((f) => touched && v.errors[f.key]);
              const nChanged = g.fields.filter((f) => changed.includes(f.key)).length;
              return (
                <fieldset key={g.id} className="border-b border-dashed last:border-0">
                  <button type="button" onClick={() => g.advanced && setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
                    aria-expanded={!!isOpen} data-testid={`button-group-${g.id}`}
                    className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-start', g.advanced && 'hover:bg-secondary/60')}>
                    <legend className="font-semibold text-sm">{groupTitle(g)}</legend>
                    {g.advanced && <span className="stamp text-[9px] text-muted-foreground">{t('cfg.advanced')}</span>}
                    {nChanged > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#e8b04a]" title={t('cfg.nChanged', { n: nChanged })} />}
                    {g.advanced && <ChevronDown className={cn('ms-auto h-4 w-4 transition-transform', isOpen && 'rotate-180')} />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <p className="text-[11px] text-muted-foreground mb-3">{groupNote(g)}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                        {g.fields.map((f) => {
                          const err = touched || changed.includes(f.key) ? v.errors[f.key] : undefined;
                          const mod = changed.includes(f.key);
                          return (
                            <label key={f.key} className={cn('block', (f.text || f.key === 'barrier_margin_pct') && 'col-span-2')} title={fieldHint(f)}>
                              <span className="flex items-center gap-1 text-[11px] font-medium leading-tight mb-1">
                                {mod && <span className="h-1.5 w-1.5 rounded-full bg-[#e8b04a] shrink-0" />}{fieldLabel(f)}
                              </span>
                              <span className={cn('flex items-stretch border rounded-sm bg-background focus-within:ring-2 focus-within:ring-ring/40 transition-shadow',
                                err ? 'border-destructive' : mod ? 'border-[#e8b04a]/70' : 'border-input')}>
                                <input
                                  value={form[f.key] ?? ''}
                                  onChange={(e) => set(f.key, e.target.value)}
                                  type="text" spellCheck={false} autoComplete="off"
                                  inputMode={f.text ? 'text' : 'decimal'}
                                  lang={f.text ? undefined : 'en'} dir={f.text ? undefined : 'ltr'}
                                  aria-label={fieldLabel(f)}
                                  min={f.min} max={f.max} step={f.step ?? 'any'}
                                  maxLength={f.text ? 100 : undefined}
                                  aria-invalid={!!err}
                                  data-testid={`input-${f.key}`}
                                  className={cn('w-full min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none', !f.text && 'font-num')}
                                />
                                {f.unit && <span className="px-2 grid place-items-center text-[10px] font-num text-muted-foreground border-s bg-secondary/50">{fieldUnit(f)}</span>}
                              </span>
                              <span className={cn('block text-[10px] mt-0.5 leading-snug', err ? 'text-destructive' : 'text-muted-foreground')}>
                                {err ?? (f.text ? fieldHint(f) : `${f.min}–${f.max}${f.key === 'barrier_margin_pct' ? ' · ' + fieldHint(f) : ''}`)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </fieldset>
              );
            })}
            <div className="sticky bottom-0 bg-card border-t p-3 space-y-2">
              {create.isError && <ErrorBox msg={humanError(create.error)} />}
              <div className="flex gap-2">
                <button type="submit" disabled={create.isPending} data-testid="button-run"
                  className="relative overflow-hidden flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 text-sm font-semibold rounded-sm hover:brightness-110 active:translate-y-px disabled:opacity-80 transition">
                  {create.isPending && <span className="absolute inset-y-0 left-0 w-1/3 bg-white/20 scanbar" />}
                  <Play className="h-4 w-4" />{create.isPending ? t('wb.simulating') : t('wb.run')}
                </button>
                {run.data && (
                  <button type="button" onClick={() => { setForm(toForm(run.data!.config)); setTouched(false); }} disabled={changed.length === 0}
                    title={t('wb.revert')} aria-label={t('wb.revert')} data-testid="button-revert" className="px-2.5 border rounded-sm hover:bg-secondary disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
                )}
                <button type="button" disabled={!model.data} onClick={() => { if (model.data) { setForm(toForm(model.data.defaults)); setTouched(false); } }}
                  title={t('cfg.defaults')} aria-label={t('cfg.defaults')} data-testid="button-defaults" className="px-2.5 border rounded-sm hover:bg-secondary disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
              </div>
              <p className="text-[10px] text-muted-foreground">{t('wb.footnote')}</p>
            </div>
          </form>
        )}
      </aside>

      <div className="space-y-6 min-w-0">
        {runId && run.isLoading && <ResultsSkeleton />}
        {runId && run.isError && <Panel title={t('wb.openFailed')}><ErrorBox msg={humanError(run.error)} onRetry={() => run.refetch()} /></Panel>}
        {!runId && summary.isLoading && <ResultsSkeleton />}
        {!runId && summary.isError && <Panel title={t('wb.unavailable')}><ErrorBox msg={humanError(summary.error)} onRetry={() => summary.refetch()} /></Panel>}
        {!runId && summary.isSuccess && (
          <div className="border border-dashed rounded-sm p-10 text-center rise bg-card/60">
            <Beaker className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="mt-3 font-bold">{t('wb.emptyTitle')}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">{t('wb.emptyBody')}</p>
          </div>
        )}
        {run.data && (
          <>
            {create.isPending && <div className="text-xs text-muted-foreground">{t('wb.computing')}</div>}
            <div className={cn('space-y-6 transition-opacity', create.isPending && 'opacity-50')}>
              <RunHeader run={run.data} />
              <MetricsTable run={run.data} />
              <TraceChart run={run.data} />
              <ArmsPanel run={run.data} />
              <TracerChart run={run.data} />
              <NotesPanel run={run.data} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex gap-2 items-start text-sm border border-destructive/40 bg-destructive/5 text-destructive p-2.5 rounded-sm" data-testid="text-error">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="flex-1">{msg}</span>
      {onRetry && <button onClick={onRetry} className="underline text-xs" data-testid="button-retry">{t('common.retry')}</button>}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40" />
      <Skeleton className="h-48" />
      <Skeleton className="h-80" />
    </div>
  );
}
