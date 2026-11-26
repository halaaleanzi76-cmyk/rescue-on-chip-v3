import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getClinicalEvidenceOverview,
  searchClinicalEvidence,
  type ClinicalEvidenceOverview,
  type ClinicalEvidenceSearchResponse,
} from '@workspace/api-client-react';
import { AlertTriangle, Database, ExternalLink, FileCheck2, Search, ShieldAlert } from 'lucide-react';
import { Panel, usePageTitle } from '@/components/shell';
import { cn } from '@/lib/utils';
import { getLang, tr, useI18n } from '@/lib/i18n';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : tr('ev.err');
}

function dateText(value: string | null | undefined) {
  if (!value) return tr('ev.notRecorded');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(getLang() === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB');
}

function hashText(value: string | null | undefined) {
  return value || tr('ev.noHash');
}

function EvidenceSearchResults({ data }: { data: ClinicalEvidenceSearchResponse }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4" data-testid="panel-evidence-results">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [t('ev.c.trials'), data.trials.length],
          [t('ev.c.labels'), data.labels.length],
          [t('ev.c.faers'), data.safety_signals.length],
          [t('ev.c.fetches'), data.fetches.length],
        ].map(([label, count]) => (
          <div key={label} className="rounded border bg-background/60 p-3">
            <div className="stamp text-[9px] text-muted-foreground">{label}</div>
            <div className="font-num mt-1 text-xl">{count}</div>
          </div>
        ))}
      </div>

      <section aria-labelledby="trials-heading">
        <h3 id="trials-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileCheck2 className="h-4 w-4 text-primary" /> ClinicalTrials.gov
        </h3>
        {data.trials.length ? (
          <div className="space-y-2">
            {data.trials.map((trial) => (
              <article key={trial.nct_id} className="rounded border bg-background/50 p-3" data-testid={`trial-${trial.nct_id}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <a href={trial.record_url} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">
                      <span lang="en" dir="auto">{trial.study_title || trial.nct_id}</span> <ExternalLink className="inline h-3 w-3" />
                    </a>
                    <div className="mt-1 text-[10px] text-muted-foreground">{t('ev.retrieved', { id: trial.nct_id, date: dateText(trial.fetched_at) })}</div>
                  </div>
                  <span className={cn('stamp rounded border px-2 py-1 text-[9px]', trial.has_posted_results ? 'border-primary/40 text-primary' : 'border-muted text-muted-foreground')}>
                    {trial.has_posted_results ? t('ev.posted', { n: trial.outcome_count }) : t('ev.noPosted')}
                  </span>
                </div>
                <div className="mt-2 grid gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
                  <div><span className="text-muted-foreground">{t('ev.statusPhase')}</span>{trial.overall_status || t('ev.unknown')} · {trial.phase || t('ev.notStated')}</div>
                  <div><span className="text-muted-foreground">{t('ev.enrollment')}</span>{trial.enrollment?.toLocaleString('en-US') ?? t('ev.notStated')}</div>
                  <div><span className="text-muted-foreground">{t('ev.conditions')}</span><span lang="en" dir="auto">{trial.condition_names.join(', ') || t('ev.notStated')}</span></div>
                  <div><span className="text-muted-foreground">{t('ev.interventions')}</span><span lang="en" dir="auto">{trial.intervention_names.join(', ') || t('ev.notStated')}</span></div>
                  {trial.source_version_date && <div><span className="text-muted-foreground">{t('ev.registry')}</span>{trial.source_version_date}</div>}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] text-muted-foreground">{t('ev.checksum')}</summary>
                  <code dir="ltr" className="mt-1 block break-all text-[10px]">{trial.raw_sha256}</code>
                </details>
              </article>
            ))}
          </div>
        ) : <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">{t('ev.noTrials', { q: data.query })}</p>}
      </section>

      <section aria-labelledby="labels-heading">
        <h3 id="labels-heading" className="mb-2 text-sm font-semibold">{t('ev.labeling')}</h3>
        {data.labels.length ? (
          <div className="space-y-2">
            {data.labels.map((label) => (
              <article key={label.label_key} className="rounded border bg-background/50 p-3" data-testid={`label-${label.label_key}`}>
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <b lang="en" dir="auto">{label.drug_names.join(' / ') || label.query_compound}</b>
                  <span className="text-muted-foreground">{t('ev.effective', { date: label.effective_time || t('ev.dateNotStated'), fetched: dateText(label.fetched_at) })}</span>
                </div>
                {label.indications_text && <p className="mt-2 text-xs"><span className="text-muted-foreground">{t('ev.indications')}</span><span lang="en" dir="auto">{label.indications_text}</span></p>}
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">{t('ev.warningsDetail')}</summary>
                  <div className="mt-2 space-y-2" lang="en" dir="auto">
                    {label.warnings_text && <p><b>{t('ev.warnings')}</b>{label.warnings_text}</p>}
                    {label.contraindications_text && <p><b>{t('ev.contra')}</b>{label.contraindications_text}</p>}
                    {label.adverse_reactions_text && <p><b>{t('ev.adverse')}</b>{label.adverse_reactions_text}</p>}
                    {label.clinical_studies_text && <p><b>{t('ev.studies')}</b>{label.clinical_studies_text}</p>}
                  </div>
                </details>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                  <a href={label.source_url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{t('ev.openfda')}</a>
                  <span className="text-muted-foreground break-all">{t('ev.canonical', { h: label.raw_sha256 })}</span>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">{t('ev.noLabels', { q: data.query })}</p>}
      </section>

      <section aria-labelledby="faers-heading" className="rounded border border-[#e8b04a]/35 bg-[#e8b04a]/[0.04] p-3">
        <h3 id="faers-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#e8b04a]">
          <AlertTriangle className="h-4 w-4" /> {t('ev.faers')}
        </h3>
        <p className="mb-3 text-[11px] text-muted-foreground">
          {t('ev.faersNote')}
        </p>
        {data.safety_signals.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.safety_signals.map((signal, index) => (
              <div key={`${signal.signal_name}-${index}`} className="flex justify-between gap-3 border-b border-dashed pb-1 text-xs">
                <span lang="en" dir="auto">{signal.signal_name || t('ev.unspecified')}</span>
                <span className="shrink-0">{t('ev.reports', { n: signal.report_count?.toLocaleString('en-US') ?? '—' })}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">{t('ev.noFaers', { q: data.query })}</p>}
      </section>

      <section aria-labelledby="fetches-heading">
        <h3 id="fetches-heading" className="mb-2 text-sm font-semibold">{t('ev.provenance')}</h3>
        {data.fetches.length ? (
          <div className="space-y-2">
            {data.fetches.map((fetch, index) => (
              <article key={`${fetch.source_id}-${fetch.fetched_at}-${index}`} className="rounded border bg-background/50 p-3">
                <div className="flex flex-wrap justify-between gap-1 text-xs">
                  <b>{fetch.source_id}</b>
                  <span>{t('ev.fetchLine', { outcome: fetch.outcome, status: fetch.http_status ?? t('ev.notReturned'), n: fetch.count_records })}</span>
                </div>
                <a href={fetch.request_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[10px] text-primary underline underline-offset-2">{t('ev.openRequest')}</a>
                <div className="mt-1 text-[10px] text-muted-foreground break-all">{t('ev.fetchMeta', { date: dateText(fetch.fetched_at), h: hashText(fetch.response_sha256) })}</div>
                {fetch.detail && <p className="mt-1 text-[10px] text-muted-foreground">{fetch.detail}</p>}
              </article>
            ))}
          </div>
        ) : <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">{t('ev.noFetches')}</p>}
      </section>
    </div>
  );
}

export default function ClinicalEvidence() {
  const { t } = useI18n();
  usePageTitle(t('ev.title'));
  const [input, setInput] = useState('aspirin');
  const [query, setQuery] = useState('aspirin');
  const overview = useQuery({
    queryKey: ['clinical-evidence-overview'],
    queryFn: getClinicalEvidenceOverview,
  });
  const search = useQuery({
    queryKey: ['clinical-evidence-search', query],
    queryFn: () => searchClinicalEvidence({ q: query }),
    enabled: query.length > 0,
  });
  const dashboard: ClinicalEvidenceOverview | undefined = overview.data;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setQuery(input.trim());
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1420px] space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-primary/40 bg-primary/10 p-2 text-primary"><Database className="h-5 w-5" /></div>
          <div>
            <div className="stamp text-[10px] text-muted-foreground">{t('ev.kicker')}</div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('ev.h1')}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('ev.lead')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#ef7a5a]/40 bg-[#ef7a5a]/[0.06] p-3 text-xs">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#ef7a5a]" />
          <p><b>{t('ev.noticeStrong')}</b>{t('ev.noticeBody')}</p>
        </div>
        <div className="mt-2 flex items-start gap-2 text-muted-foreground" data-testid="note-original-language">
          <span className="w-4 shrink-0" />
          <p>{t('ev.originalLang')}</p>
        </div>
      </div>

      {overview.isError && <div role="alert" className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{t('ev.dbErr', { msg: errorMessage(overview.error) })}</div>}
      {dashboard && (
        <Panel title={t('ev.connections')} kicker={t('ev.liveStatus')} right={
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <a className="text-primary underline underline-offset-2" href="/api/evidence/report" download>{t('ev.report')}</a>
            <a className="text-primary underline underline-offset-2" href="/api/evidence/import-log" download>{t('ev.rawLog')}</a>
            <Database className="h-4 w-4 text-primary" />
          </div>
        }>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Count label={t('ev.catalog')} value={dashboard.sources.length} />
            <Count label={t('ev.liveConfirmed')} value={dashboard.sources.filter((source) => source.integration_state === 'LIVE_FETCH_CONFIRMED').length} />
            <Count label={t('ev.catalogOnly')} value={dashboard.sources.filter((source) => source.integration_state !== 'LIVE_FETCH_CONFIRMED').length} />
            <Count label={t('ev.trials')} value={dashboard.table_counts.clinical_trials ?? 0} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {['clinical_outcomes', 'fda_labels', 'safety_signals', 'fetch_log'].map((table) => (
              <Count key={table} label={t(`ev.t.${table as 'fetch_log'}`)} value={dashboard.table_counts[table] ?? 0} />
            ))}
          </div>
          <div className="mt-3 rounded border border-primary/30 bg-primary/5 p-2 text-xs">
            {t('ev.policy')} <b>{dashboard.clinical_use_classification}</b> · {t('ev.patientRec')} <b>{dashboard.patient_specific_recommendations_allowed ? t('common.yes') : t('common.no')}</b> · {t('ev.claims')} <b>{dashboard.safety_efficacy_claims_allowed ? t('common.yes') : t('common.no')}</b>
          </div>
          <div className="mt-4 space-y-2">
            {dashboard.sources.map((source) => (
              <details key={source.source_id} className="rounded border bg-background/50 p-3" data-testid={`source-${source.source_id}`}>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium"><span lang="en" dir="auto">{source.name}</span> <span className="font-num text-muted-foreground">· {source.source_id}</span></span>
                  <span className={cn('stamp rounded border px-2 py-1 text-[9px]', source.integration_state === 'LIVE_FETCH_CONFIRMED' ? 'border-primary/40 text-primary' : 'border-muted text-muted-foreground')}>
                    {source.integration_state === 'LIVE_FETCH_CONFIRMED' ? t('ev.live', { s: source.latest_http_status ?? '—' }) : t('ev.notConnected')}
                  </span>
                </summary>
                <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-2">
                  <div><b>{t('ev.domain')}</b> <span lang="en" dir="auto">{source.domain}</span></div>
                  <div><b>{t('ev.access')}</b> <span lang="en" dir="auto">{source.access_mode}</span></div>
                  {source.contents && <div className="sm:col-span-2"><b>{t('ev.data')}</b> <span lang="en" dir="auto">{source.contents}</span></div>}
                  {source.critical_limitations && <div className="sm:col-span-2"><b>{t('ev.limitations')}</b> <span lang="en" dir="auto">{source.critical_limitations}</span></div>}
                  <div><b>{t('ev.lastFetched')}</b> {dateText(source.latest_fetched_at)}</div>
                  <div><b>{t('ev.lastCount')}</b> {source.latest_record_count ?? t('ev.noFetch')}</div>
                  <div className="sm:col-span-2"><a className="break-all text-primary underline underline-offset-2" href={source.latest_request_url || source.official_url} target="_blank" rel="noreferrer">{source.latest_request_url || source.official_url}</a></div>
                  <code className="break-all text-muted-foreground sm:col-span-2">{t('ev.respHash', { h: hashText(source.latest_response_sha256) })}</code>
                </div>
              </details>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">{t('ev.liveNote')}</p>
        </Panel>
      )}

      <Panel title={t('ev.search')} kicker={t('ev.searchKicker')} right={<Search className="h-4 w-4 text-primary" />}>
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={100} minLength={1}
            aria-label={t('ev.termAria')} placeholder={t('ev.searchPh')} data-testid="input-evidence-query"
            className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm" />
          <button type="submit" disabled={!input.trim() || search.isFetching} data-testid="button-search-evidence"
            className="inline-flex items-center gap-2 rounded border border-primary/50 bg-primary/10 px-4 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50">
            <Search className="h-3.5 w-3.5" /> {t('ev.searchBtn')}
          </button>
        </form>
        <p className="mt-2 text-[10px] text-muted-foreground">{t('ev.bounded')}</p>
        {search.isError && <div role="alert" className="mt-3 rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{errorMessage(search.error)}</div>}
        {search.isLoading && <p className="mt-3 text-xs text-muted-foreground">{t('ev.searching')}</p>}
        {search.data && <div className="mt-4"><EvidenceSearchResults data={search.data} /></div>}
      </Panel>

      <Panel title={t('ev.notCovered')} kicker={t('ev.scope')} right={<AlertTriangle className="h-4 w-4 text-[#e8b04a]" />}>
        <ul className="space-y-2 text-xs text-muted-foreground">
          {[t('ev.nc1'), t('ev.nc2'), t('ev.nc3'), t('ev.nc4')].map((limit) => <li key={limit} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e8b04a]" />{limit}</li>)}
        </ul>
      </Panel>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded border bg-background/60 p-3">
      <div className="stamp break-words text-[9px] text-muted-foreground">{label}</div>
      <div className="font-num mt-1 text-xl">{value.toLocaleString('en-US')}</div>
    </div>
  );
}
