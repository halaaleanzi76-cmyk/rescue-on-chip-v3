import { useState } from 'react';
import { useListRuns } from '@workspace/api-client-react';
import { ChevronDown, Save, Undo2, RotateCcw, FileJson, FileText, FileSpreadsheet, Lock, FolderOpen,
  Fingerprint, SlidersHorizontal, Droplets, Timer, Cpu, Layers } from 'lucide-react';
import { GROUPS, ALL_FIELDS, type FieldGroup, fmtDate, groupTitle, groupNote, fieldLabel, fieldHint, fieldUnit } from '@/lib/lab';
import { useI18n } from '@/lib/i18n';
import type { LabSession } from '@/hooks/use-lab-session';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBox } from '@/pages/workbench';
import { cn } from '@/lib/utils';

/** Guided mode: only the inputs that drive the proposal's central comparison. */
export const GUIDED_KEYS = ['pressure_pa', 'radius_um', 'offset_pct', 'equalization_s', 'dead_volume_ul'] as const;
const GUIDED_GROUP: FieldGroup = { id: 'guided', title: 'Key parameters', note: '', fields: ALL_FIELDS.filter((f) => (GUIDED_KEYS as readonly string[]).includes(f.key)) };
const MODE_KEY = 'roc.labMode';

const GROUP_ICON: Record<string, typeof Cpu> = { guided: SlidersHorizontal,  identity: Fingerprint, geometry: Droplets, protocol: Timer, controllers: Cpu, barrier: Layers };

export function downloadConfig(cfg: unknown, meta: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify({ ...meta, config: cfg }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `rescue-config-${(meta.run_id as string ?? 'draft').slice(0, 16)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ConfigPanel({ s }: { s: LabSession }) {
  const { t } = useI18n();
  const runs = useListRuns();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [mode, setModeState] = useState<'guided' | 'advanced'>(() => (localStorage.getItem(MODE_KEY) === 'advanced' ? 'advanced' : 'guided'));
  const setMode = (m: 'guided' | 'advanced') => { localStorage.setItem(MODE_KEY, m); setModeState(m); };
  const groups = mode === 'guided' ? [GUIDED_GROUP] : GROUPS;
  const { form, v, changed, touched, run, displayed } = s;
  const saved = displayed?.kind === 'saved' ? displayed.run : null;

  return (
    <aside className="flex flex-col min-h-0 h-full bg-card/80 border-e" aria-label={t('cfg.aria')} data-testid="panel-config">
      <div className="px-4 pt-3 pb-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h1 className="font-semibold tracking-tight">{t('cfg.title')}</h1>
          <div className="ms-auto flex rounded-md border overflow-hidden text-[10.5px]" role="group" aria-label={t('mode.aria')}>
            {(['guided', 'advanced'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} data-testid={`button-mode-${m}-config`}
                className={cn('px-2 py-0.5', mode === m ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary')}>{t(`mode.${m}`)}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select value={s.runId} onChange={(e) => e.target.value && s.loadRun(e.target.value)} data-testid="select-saved-run" aria-label={t('cfg.loadRun')}
            className="flex-1 min-w-0 bg-background border rounded px-2 py-1 text-xs">
            {!s.runId && <option value="">{t('cfg.noRunLoaded')}</option>}
            {(runs.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => (
              <option key={r.id} value={r.id}>{r.name} · {fmtDate(r.created_at)}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {s.pending && <span className="stamp px-1.5 py-0.5 rounded-[3px] bg-primary/15 text-primary border border-primary/40" data-testid="status-computing">{t('cfg.computing')}</span>}
          {displayed?.kind === 'preview' && <span className="stamp px-1.5 py-0.5 rounded-[3px] bg-[#e8b04a]/15 text-[#f0c674] border border-[#e8b04a]/50" data-testid="status-preview">{t('cfg.unsavedPreview')}</span>}
          {run.data && changed.length > 0 && <span className="stamp px-1.5 py-0.5 rounded-[3px] border text-muted-foreground" data-testid="status-modified">{t('cfg.changed', { n: changed.length })}</span>}
          {run.data && changed.length === 0 && <span className="stamp px-1.5 py-0.5 rounded-[3px] border border-primary/30 text-primary" data-testid="status-matches">{t('cfg.matches')}</span>}
        </div>
        {s.previewError && <ErrorBox msg={t('cfg.previewFailed', { msg: s.previewError })} />}
      </div>

      {!form ? (
        <div className="p-4 space-y-3">
          {s.model.isError ? <ErrorBox msg={t('cfg.defaultsFailed')} onRetry={() => s.model.refetch()} /> : Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
        </div>
      ) : (
        <form noValidate onSubmit={(e) => { e.preventDefault(); s.save(); }} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto lab-scroll">
            {groups.map((g) => {
              const Icon = GROUP_ICON[g.id] ?? Cpu;
              const isOpen = !g.advanced || open[g.id] || g.fields.some((f) => (touched || changed.includes(f.key)) && v.errors[f.key]);
              const nChanged = g.fields.filter((f) => changed.includes(f.key)).length;
              return (
                <fieldset key={g.id} className="border-b border-dashed">
                  <button type="button" onClick={() => g.advanced && setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))} aria-expanded={!!isOpen}
                    data-testid={`button-group-${g.id}`} className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-start', g.advanced && 'hover:bg-secondary/50')}>
                    <Icon className="h-3.5 w-3.5 text-primary/80" />
                    <legend className="font-medium text-[13px]">{groupTitle(g)}</legend>
                    {g.advanced && <span className="stamp text-[8px] text-muted-foreground">{t('cfg.advanced')}</span>}
                    {nChanged > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#e8b04a]" title={t('cfg.nChanged', { n: nChanged })} />}
                    {g.advanced && <ChevronDown className={cn('ms-auto h-4 w-4 transition-transform', isOpen && 'rotate-180')} />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3">
                      <p className="text-[10.5px] text-muted-foreground mb-2.5 leading-snug">{groupNote(g)}</p>
                      <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5">
                        {g.fields.map((f) => {
                          const err = touched || changed.includes(f.key) ? v.errors[f.key] : undefined;
                          const mod = changed.includes(f.key);
                          return (
                            <label key={f.key} className={cn('block min-w-0', (f.text || f.key === 'barrier_margin_pct') && 'col-span-2')} title={fieldHint(f)}>
                              <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground leading-tight mb-1 truncate">
                                {mod && <span className="h-1.5 w-1.5 rounded-full bg-[#e8b04a] shrink-0" />}{fieldLabel(f)}
                              </span>
                              <span className={cn('flex items-stretch border rounded bg-background/70 focus-within:ring-2 focus-within:ring-ring/40',
                                err ? 'border-destructive' : mod ? 'border-[#e8b04a]/60' : 'border-input')}>
                                <input value={form[f.key] ?? ''} onChange={(e) => s.setField(f.key, e.target.value)}
                                  type="text" inputMode={f.text ? 'text' : 'decimal'} lang={f.text ? undefined : 'en'} dir={f.text ? undefined : 'ltr'} spellCheck={false} autoComplete="off" min={f.min} max={f.max} step={f.step ?? 'any'}
                                  maxLength={f.text ? 100 : undefined} aria-invalid={!!err} aria-label={fieldLabel(f)} data-testid={`input-${f.key}`}
                                  className={cn('w-full min-w-0 bg-transparent px-2 py-1 text-[13px] outline-none', !f.text && 'font-num')} />
                                {f.unit && <span className="px-1.5 grid place-items-center text-[9.5px] font-num text-muted-foreground border-s bg-secondary/40">{fieldUnit(f)}</span>}
                              </span>
                              <span className={cn('block text-[9.5px] mt-0.5 leading-snug', err ? 'text-destructive' : 'text-muted-foreground/70')}>
                                {err ?? (f.text ? fieldHint(f) : mode === 'guided' ? `${fieldHint(f)} · ${f.min}–${f.max}` : `${f.min}–${f.max}${f.key === 'barrier_margin_pct' ? ' · ' + fieldHint(f) : ''}`)}
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
            <div className="px-4 py-2.5">
              <button type="button" onClick={() => setMode(mode === 'guided' ? 'advanced' : 'guided')} data-testid="button-toggle-config-mode"
                className="text-[11px] text-primary hover:underline">{mode === 'guided' ? t('mode.showAll', { n: ALL_FIELDS.length }) : t('mode.backGuided')}</button>
            </div>
          </div>

          <div className="border-t p-3 space-y-2 bg-card">
            {s.create.isError && <ErrorBox msg={t('cfg.saveFailed')} />}
            <div className="flex gap-2">
              <button type="submit" disabled={s.create.isPending || !v.data} data-testid="button-save"
                className="relative overflow-hidden flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 text-sm font-semibold rounded-md hover:brightness-110 active:translate-y-px disabled:opacity-50">
                {s.create.isPending && <span className="absolute inset-y-0 left-0 w-1/3 bg-white/20 scanbar" />}
                <Save className="h-4 w-4" />{s.create.isPending ? t('cfg.saving') : t('cfg.save')}
              </button>
              <button type="button" onClick={s.revert} disabled={!run.data || (changed.length === 0 && displayed?.kind !== 'preview')}
                title={t('cfg.revert')} aria-label={t('cfg.revert')} data-testid="button-revert" className="px-2.5 border rounded-md hover:bg-secondary disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
              <button type="button" onClick={s.resetDefaults} disabled={!s.model.data} title={t('cfg.defaults')} aria-label={t('cfg.defaults')}
                data-testid="button-defaults" className="px-2.5 border rounded-md hover:bg-secondary disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <button type="button" disabled={!v.data} data-testid="button-export-config" title={t('cfg.exportTitle')}
                onClick={() => downloadConfig(v.data, { run_id: saved?.id ?? 'unsaved-draft', saved: !!saved, model_version: displayed?.run.model_version ?? s.model.data?.version, fingerprint: saved?.fingerprint ?? null, exported_at: new Date().toISOString() })}
                className="flex flex-col items-center gap-0.5 border rounded py-1.5 text-[9.5px] hover:bg-secondary disabled:opacity-40"><FileJson className="h-3.5 w-3.5" />{t('cfg.dl.config')}</button>
              {([['html', t('cfg.dl.report'), FileText], ['csv', t('cfg.dl.traces'), FileSpreadsheet], ['json', t('cfg.dl.repro'), FileJson]] as const).map(([f, l, I]) =>
                saved ? (
                  <a key={f} href={`/api/runs/${saved.id}/report?format=${f}`} download data-testid={`link-download-${f}`}
                    className="flex flex-col items-center gap-0.5 border rounded py-1.5 text-[9.5px] hover:bg-secondary"><I className="h-3.5 w-3.5" />{l}</a>
                ) : (
                  <span key={f} title={t('cfg.dl.locked')} data-testid={`link-download-${f}-locked`}
                    className="flex flex-col items-center gap-0.5 border border-dashed rounded py-1.5 text-[9.5px] text-muted-foreground/60"><Lock className="h-3.5 w-3.5" />{l}</span>
                ))}
            </div>
            <p className="text-[9.5px] text-muted-foreground leading-snug">{t('cfg.footnote')}</p>
          </div>
        </form>
      )}
    </aside>
  );
}
