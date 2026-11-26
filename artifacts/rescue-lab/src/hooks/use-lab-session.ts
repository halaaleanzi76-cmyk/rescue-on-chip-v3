import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetModel, useGetSummary, useGetRun, getGetRunQueryKey, useGetRunVisualization, getGetRunVisualizationQueryKey,
  usePreviewSimulation, useCreateRun, getListRunsQueryKey, getGetSummaryQueryKey,
  type SimulationPreview, type SimulationRun, type RunVisualization, type ExperimentInput,
} from '@workspace/api-client-react';
import { type FormState, toForm, validate, changedKeys, humanError } from '@/lib/lab';
import { useToast } from '@/hooks/use-toast';
import { tr } from '@/lib/i18n';
import { ALL_FIELDS, fieldLabel } from '@/lib/lab';

export interface Displayed { run: SimulationRun; vis: RunVisualization | null; kind: 'saved' | 'preview' }

export function useLabSession() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const paramRun = new URLSearchParams(search).get('run');

  const model = useGetModel();
  const summary = useGetSummary();
  const runId = paramRun ?? summary.data?.latest_run_id ?? '';
  const run = useGetRun(runId, { query: { enabled: !!runId, queryKey: getGetRunQueryKey(runId) } });
  const vis = useGetRunVisualization(runId, { query: { enabled: !!runId, queryKey: getGetRunVisualizationQueryKey(runId) } });

  const [form, setForm] = useState<FormState | null>(null);
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState<SimulationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editTick, setEditTick] = useState(0);
  const loadedFor = useRef<string | null>(null);
  const seq = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; seq.current++; }; }, []);

  const baseline: ExperimentInput | undefined = run.data?.config ?? (runId ? undefined : model.data?.defaults);
  const formRef = useRef(form); formRef.current = form;
  const baselineRef = useRef(baseline); baselineRef.current = baseline;
  const hasSavedRef = useRef(!!run.data); hasSavedRef.current = !!run.data;

  useEffect(() => {
    if (run.data && loadedFor.current !== run.data.id) {
      loadedFor.current = run.data.id;
      seq.current++;
      setForm(toForm(run.data.config));
      setTouched(false); setPreview(null); setPreviewError(null); setPending(false);
    } else if (!runId && !form && model.data && summary.isSuccess) {
      setForm(toForm(model.data.defaults));
    }
  }, [run.data, runId, model.data, summary.isSuccess, form]);

  const previewM = usePreviewSimulation();
  const previewRef = useRef(previewM.mutate); previewRef.current = previewM.mutate;

  // Debounced Python preview after user edits. Only the latest request may update the display.
  useEffect(() => {
    if (editTick === 0) return;
    const id = ++seq.current;
    const timer = setTimeout(() => {
      const f = formRef.current; if (!f) return;
      const vv = validate(f);
      if (!vv.data) { setPending(false); return; }
      if (hasSavedRef.current && changedKeys(f, baselineRef.current).length === 0) {
        setPreview(null); setPreviewError(null); setPending(false); return;
      }
      setPending(true);
      previewRef.current({ data: vv.data }, {
        onSuccess: (p) => { if (!alive.current || id !== seq.current) return; setPreview(p); setPreviewError(null); setPending(false); },
        onError: (e) => { if (!alive.current || id !== seq.current) return; setPreviewError(humanError(e)); setPending(false); },
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [editTick]);

  const v = useMemo(() => (form ? validate(form) : { errors: {} as Record<string, string>, data: null }), [form]);
  const changed = useMemo(() => (form ? changedKeys(form, baseline) : []), [form, baseline]);

  const setField = (k: string, val: string) => { setForm((f) => (f ? { ...f, [k]: val } : f)); setEditTick((x) => x + 1); };
  const revert = () => {
    if (!run.data) return;
    seq.current++;
    setForm(toForm(run.data.config)); setTouched(false); setPreview(null); setPreviewError(null); setPending(false);
  };
  const resetDefaults = () => { if (model.data) { setForm(toForm(model.data.defaults)); setTouched(false); setEditTick((x) => x + 1); } };

  const create = useCreateRun();
  const save = () => {
    setTouched(true);
    if (!v.data) {
      toast({ title: tr('cfg.checkConfig'), description: Object.entries(v.errors).map(([k, e]) => { const f = ALL_FIELDS.find((x) => x.key === k); return `${f ? fieldLabel(f) : k}: ${e}`; }).join(' · '), variant: 'destructive' });
      return;
    }
    create.mutate({ data: v.data }, {
      onSuccess: (r) => {
        qc.setQueryData(getGetRunQueryKey(r.id), r);
        qc.invalidateQueries({ queryKey: getListRunsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        seq.current++;
        setPreview(null); setPending(false);
        setLocation(`/?run=${r.id}`);
        toast({ title: tr('cfg.savedToast'), description: tr('cfg.savedToastBody', { id: r.id.slice(0, 8), fp: r.fingerprint.slice(0, 12) }) });
      },
    });
  };

  const displayed: Displayed | null = preview
    ? { run: preview.run, vis: preview.visualization, kind: 'preview' }
    : run.data ? { run: run.data, vis: vis.data ?? null, kind: 'saved' } : null;

  return {
    model, summary, runId, run, vis, form, touched, v, changed, baseline,
    setField, revert, resetDefaults, save, create,
    preview, previewError, pending, displayed,
    loadRun: (id: string) => setLocation(`/?run=${id}`),
  };
}
export type LabSession = ReturnType<typeof useLabSession>;
