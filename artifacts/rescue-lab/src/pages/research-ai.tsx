import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { EngineText, useEngineText } from '@/components/engine-text';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Quaternion, Vector3 } from 'three';
import {
  useGetAIResearchOverview,
  useGetAITrainingStatus,
  useStartAITraining,
  getGetAIResearchOverviewQueryKey,
  getGetAITrainingStatusQueryKey,
  searchPubChemCompounds,
  describeCompound,
  generateCompoundConformer,
  predictCompoundResponse,
  type CompoundSearchItem,
  type AIPredictionResponse,
  type CompoundDescription,
  type MoleculeConformerResponse,
} from '@workspace/api-client-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, BrainCircuit, Check, Database, Download, FlaskConical,
  Fingerprint, LoaderCircle, Search, ShieldAlert, Sparkles, Box,
} from 'lucide-react';
import { Panel, SimBadge, usePageTitle } from '@/components/shell';
import { cn } from '@/lib/utils';
import { tr, useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';

type NumericMap = Record<string, number>;
type AnyMap = Record<string, unknown>;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return tr('ai.err.generic');
}

function n(value: unknown, digits = 3) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function CardMetric({ label, value, unit, tone = 'normal' }: { label: string; value: string; unit?: string; tone?: 'normal' | 'warning' }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-background/60 p-3">
      <div className="stamp break-words text-[9px] text-muted-foreground">{label}</div>
      <div className={cn('font-num mt-1 break-words text-xl', tone === 'warning' ? 'text-[#e8b04a]' : 'text-foreground')}>
        {value}<span className="ms-1 text-[11px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

const atomColors: Record<string, string> = {
  C: '#aab7c2', N: '#62a5ff', O: '#f16a5b', S: '#e9c64c', P: '#ed9954',
  F: '#64cc83', Cl: '#64cc83', Br: '#a974c8', I: '#9865ae',
};

function MolecularConformerViewer({ molecule }: { molecule: MoleculeConformerResponse }) {
  const { atoms, bonds } = useMemo(() => {
    const radius = Math.max(1, ...molecule.atoms.map((atom) => Math.hypot(atom.x, atom.y, atom.z)));
    const scale = 2.7 / radius;
    const fitted = molecule.atoms.map((atom) => new Vector3(atom.x * scale, atom.y * scale, atom.z * scale));
    const bondGeometry = molecule.bonds.map((bond) => {
      const from = fitted[bond.begin];
      const to = fitted[bond.end];
      const delta = to.clone().sub(from);
      return {
        position: from.clone().add(to).multiplyScalar(0.5),
        quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.clone().normalize()),
        length: delta.length(),
        order: bond.order,
      };
    });
    return { atoms: fitted, bonds: bondGeometry };
  }, [molecule]);

  return (
    <div className="h-[280px] overflow-hidden rounded-md border bg-[#080e12]">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10], fov: 42, near: 0.1, far: 60 }}>
        <color attach="background" args={['#080e12']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 6, 7]} intensity={2.1} />
        <directionalLight position={[-5, -3, -4]} intensity={0.75} color="#68bfc5" />
        {bonds.map((bond, index) => (
          <mesh key={`bond-${index}`} position={bond.position} quaternion={bond.quaternion}>
            <cylinderGeometry args={[0.026 + Math.max(0, bond.order - 1) * 0.009, 0.026 + Math.max(0, bond.order - 1) * 0.009, bond.length, 8]} />
            <meshStandardMaterial color="#8998a2" roughness={0.78} />
          </mesh>
        ))}
        {molecule.atoms.map((atom, index) => (
          <mesh key={`atom-${atom.index}`} position={atoms[index]}>
            <sphereGeometry args={[atom.element === 'C' ? 0.135 : 0.16, 16, 12]} />
            <meshStandardMaterial color={atomColors[atom.element] ?? '#d8dfe3'} roughness={0.32} metalness={0.06} />
          </mesh>
        ))}
        <OrbitControls enableDamping dampingFactor={0.12} />
      </Canvas>
    </div>
  );
}

export default function ResearchAI() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const et = useEngineText();
  usePageTitle(t('ai.title'));
  const queryClient = useQueryClient();
  const overview = useGetAIResearchOverview({ query: { refetchInterval: 30000 } });
  const training = useGetAITrainingStatus({
    query: {
      refetchInterval: (query) => query.state.data?.status === 'running' ? 1200 : 15000,
    },
  });
  const startTraining = useStartAITraining({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAITrainingStatusQueryKey() });
      },
    },
  });
  const search = useMutation({ mutationFn: (query: string) => searchPubChemCompounds({ q: query }) });
  const describe = useMutation({ mutationFn: (input: { structure: string; representation: 'smiles' | 'inchi' }) => describeCompound(input) });
  const conformer = useMutation({ mutationFn: (input: { structure: string; representation: 'smiles' | 'inchi' }) => generateCompoundConformer(input) });
  const predict = useMutation({ mutationFn: (input: { structure: string; representation: 'smiles' | 'inchi' }) => predictCompoundResponse(input) });

  const [queryText, setQueryText] = useState('');
  const [structure, setStructure] = useState('');
  const [representation, setRepresentation] = useState<'smiles' | 'inchi'>('smiles');
  const [lastAction, setLastAction] = useState<'describe' | 'predict' | null>(null);

  const dataset = overview.data?.dataset as AnyMap | undefined;
  const audit = dataset?.audit as AnyMap | undefined;
  const model = overview.data?.latest_model as AnyMap | null | undefined;
  const modelMetrics = model?.metrics as AnyMap | undefined;
  const testMetrics = modelMetrics?.test_metrics as AnyMap | undefined;
  const comparison = modelMetrics?.algorithm_comparison as Record<string, AnyMap> | undefined;
  const latestLog = training.data?.log ?? [];
  const result: AIPredictionResponse | undefined = predict.data;
  const described: CompoundDescription | undefined = describe.data;
  const searchResults = search.data?.results ?? [];
  const knownEvidence = result?.evidence as AnyMap | null | undefined;
  const activeResult = lastAction === 'predict' ? result : null;
  const descriptors = (activeResult?.descriptors ?? described?.descriptors) as NumericMap | undefined;

  useEffect(() => {
    if (training.data?.status === 'completed') {
      queryClient.invalidateQueries({ queryKey: getGetAIResearchOverviewQueryKey() });
    }
  }, [training.data?.status, training.data?.updated_at_utc, queryClient]);

  const submitCompound = (event: FormEvent, action: 'describe' | 'predict') => {
    event.preventDefault();
    runCompound(action);
  };

  const runCompound = (action: 'describe' | 'predict') => {
    setLastAction(action);
    describe.reset();
    predict.reset();
    const input = { structure: structure.trim(), representation };
    (action === 'describe' ? describe : predict).mutate(input);
  };

  const chooseSearchResult = (hit: CompoundSearchItem) => {
    if (!hit.canonical_smiles) return;
    setStructure(hit.canonical_smiles);
    setRepresentation('smiles');
    setLastAction(null);
    predict.reset();
    describe.reset();
    conformer.reset();
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    search.mutate(queryText.trim());
  };

  const compoundError = lastAction === 'predict' ? predict.error : describe.error;
  const currentTraining = training.data?.status === 'running';
  const fullReportUrl = model?.model_version
    ? `/api/ai/models/${encodeURIComponent(String(model.model_version))}/report`
    : null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1420px] space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-primary/40 bg-primary/10 p-2 text-primary"><BrainCircuit className="h-5 w-5" /></div>
          <div>
            <div className="stamp text-[10px] text-muted-foreground">{t('ai.kicker')}</div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('ai.h1')}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {t('ai.lead')}
            </p>
          </div>
        </div>
        <div className="ms-auto"><SimBadge /></div>
      </div>

      <div className="rounded-md border border-[#ef7a5a]/50 bg-[#ef7a5a]/[0.07] p-3 text-sm" data-testid="notice-research-limit">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#ef7a5a]" />
          <p><b>{t('ai.limitStrong')}</b>{t('ai.limitBody')}</p>
        </div>
      </div>

      {overview.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {t('ai.serviceErr', { msg: errorMessage(overview.error) })}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Panel className="min-w-0" title={t('ai.evidence')} kicker="PUBCHEM BIOASSAY · AID 1288" right={<Database className="h-4 w-4 text-primary" />}>
          {overview.isLoading ? <div className="text-sm text-muted-foreground">{t('ai.loadingManifest')}</div> : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CardMetric label={t('ai.valid')} value={String(audit?.valid_binary_assay_records ?? '—')} />
                <CardMetric label={t('ai.active')} value={String(audit?.active_count ?? '—')} tone="warning" />
                <CardMetric label={t('ai.inactive')} value={String(audit?.inactive_count ?? '—')} />
                <CardMetric label={t('ai.activeFraction')} value={n(audit?.active_prevalence, 3)} />
              </div>
              <dl className="mt-4 grid gap-x-3 gap-y-2 text-xs sm:grid-cols-[150px_1fr]">
                <dt className="text-muted-foreground">{t('ai.system')}</dt><dd>{dataset?.cell_model ? <EngineText text={String(dataset.cell_model)} /> : t('ai.notDownloaded')}</dd>
                <dt className="text-muted-foreground">{t('ai.endpoint')}</dt><dd>{dataset?.endpoint ? <EngineText text={String(dataset.endpoint)} /> : '—'}</dd>
                <dt className="text-muted-foreground">{t('ai.conditions')}</dt><dd>{dataset?.protocol_summary ? <EngineText text={String(dataset.protocol_summary)} /> : '—'}</dd>
                <dt className="text-muted-foreground">{t('ai.label')}</dt><dd>{dataset?.label_definition ? <EngineText text={String(dataset.label_definition)} /> : '—'}</dd>
                <dt className="text-muted-foreground">{t('ai.record')}</dt>
                <dd>
                  {dataset?.source_url ? <a className="text-primary underline underline-offset-2" href={String(dataset.source_url)} target="_blank" rel="noreferrer">{t('ai.openProv')}</a> : '—'}
                </dd>
                <dt className="text-muted-foreground">{t('ai.snapshot')}</dt>
                <dd className="font-num break-all text-[10px]" dir="ltr">{String(dataset?.csv_sha256 ?? '—')}</dd>
              </dl>
              <div className="mt-4 space-y-2 rounded border border-[#e8b04a]/40 bg-[#e8b04a]/[0.06] p-3 text-xs text-muted-foreground">
                {Array.isArray(dataset?.limitations) && dataset.limitations.map((item, index) => (
                  <p key={index} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e8b04a]" /><EngineText text={String(item)} /></p>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel className="min-w-0"
          title={t('ai.training')}
          kicker={model?.model_version ? String(model.model_version) : t('ai.noModel')}
          right={isAdmin ? <button
            type="button"
            onClick={() => startTraining.mutate()}
            disabled={currentTraining || startTraining.isPending}
            data-testid="button-train-model"
            className="inline-flex items-center gap-2 rounded border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {currentTraining || startTraining.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {currentTraining ? t('ai.trainingNow') : model?.model_version ? t('ai.retrain') : t('ai.train')}
          </button> : <span className="text-[10px] text-muted-foreground" data-testid="text-train-admin-only">{t('ai.adminOnly')}</span>}
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span data-testid="status-ai-model" className="rounded border border-[#e8b04a]/40 bg-[#e8b04a]/10 px-2 py-1 stamp text-[9px] text-[#e8b04a]">
              {String(model?.status ?? 'candidate_unvalidated') === 'candidate_unvalidated' ? t('ai.status.candidate_unvalidated') : String(model?.status).replaceAll('_', ' ')}
            </span>
            <span className="text-xs text-muted-foreground">{modelMetrics?.selected_algorithm ? et(String(modelMetrics.selected_algorithm)) : t('ai.candidate')}</span>
            {typeof model?.prediction_policy === 'string' && <span className="text-[11px] text-muted-foreground"><EngineText text={model.prediction_policy} /></span>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CardMetric label={t('ai.heldOut')} value={String(modelMetrics?.test_records ?? '—')} />
            <CardMetric label={t('ai.heldOutActive')} value={String(modelMetrics?.test_active ?? '—')} tone="warning" />
            <CardMetric label={t('ai.prAuc')} value={n(testMetrics?.pr_auc_average_precision)} />
            <CardMetric label={t('ai.rocAuc')} value={n(testMetrics?.roc_auc)} />
          </div>
          {testMetrics && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <CardMetric label={t('ai.precision')} value={n(testMetrics.precision)} />
              <CardMetric label={t('ai.recall')} value={`${n(testMetrics.recall_sensitivity)} · ${Array.isArray(testMetrics.recall_wilson_95_ci) ? testMetrics.recall_wilson_95_ci.map((x) => n(x, 2)).join('–') : '—'}`} />
              <CardMetric label={t('ai.brier')} value={`${n(testMetrics.raw_score_brier)} / ${n(testMetrics.null_prevalence_brier)}`} />
            </div>
          )}
          {comparison && (
            <div className="mt-4">
              <div className="stamp mb-2 text-[9px] text-muted-foreground">{t('ai.cv')}</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[330px] text-xs">
                  <thead className="text-start text-muted-foreground"><tr><th className="pb-1 text-start">{t('ai.algorithm')}</th><th className="text-start">{t('ai.meanPr')}</th><th className="text-start">{t('ai.meanRoc')}</th></tr></thead>
                  <tbody>{Object.entries(comparison).map(([name, stats]) => (
                    <tr key={name} className="border-t border-dashed"><td className="py-1.5">{et(name)}</td><td className="font-num">{n(stats.mean_fold_pr_auc)}</td><td className="font-num">{n(stats.mean_fold_roc_auc)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>{t('ai.scaffold')}</span>
            <span>{training.data?.status === 'running' ? t('ai.runningStage') : t('ai.onlyRetrain')}</span>
            {fullReportUrl && <a href={fullReportUrl} download className="inline-flex items-center gap-1 text-primary underline underline-offset-2" data-testid="link-ai-report"><Download className="h-3.5 w-3.5" />{t('ai.reproJson')}</a>}
          </div>
          {(startTraining.error || training.data?.error) && (
            <div className="mt-3 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {errorMessage(startTraining.error ?? training.data?.error)}
            </div>
          )}
          <div className="mt-3 max-h-48 overflow-auto rounded border bg-background/70 p-2.5" data-testid="panel-training-log">
            <div className="mb-1 flex items-center gap-1.5 stamp text-[9px] text-muted-foreground"><Activity className="h-3 w-3" />{t('ai.log')}</div>
            {latestLog.length ? <pre dir="ltr" className="whitespace-pre-wrap break-words font-num text-[10px] leading-5 text-muted-foreground text-left">{latestLog.join('\n')}</pre>
              : <p className="text-xs text-muted-foreground">{t('ai.logEmpty')}</p>}
          </div>
        </Panel>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel className="min-w-0" title={t('ai.find')} kicker={t('ai.findKicker')} right={<Search className="h-4 w-4 text-primary" />}>
          <form onSubmit={submitSearch} className="flex gap-2">
            <input value={queryText} onChange={(event) => setQueryText(event.target.value)} maxLength={100} placeholder={t('ai.searchPh')}
              data-testid="input-compound-search" className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm" />
            <button disabled={!queryText.trim() || search.isPending} className="rounded border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-50" data-testid="button-compound-search">
              {search.isPending ? t('ai.searching') : t('ai.search')}
            </button>
          </form>
          {search.error && <p className="mt-2 text-xs text-destructive">{errorMessage(search.error)}</p>}
          {search.data && searchResults.length === 0 && <p className="mt-3 text-xs text-muted-foreground">{t('ai.noMatch')}</p>}
          {!!searchResults.length && (
            <ul className="mt-3 divide-y rounded border">
              {searchResults.map((hit) => (
                <li key={hit.cid} className="flex flex-wrap items-center gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{hit.iupac_name || hit.molecular_formula || t('ai.cid', { cid: hit.cid })}</div>
                    <div className="font-num text-[10px] text-muted-foreground">CID {hit.cid} · {hit.molecular_formula || t('ai.formulaNa')} · {n(hit.molecular_weight_da, 1)} Da</div>
                  </div>
                  <button type="button" onClick={() => chooseSearchResult(hit)} disabled={!hit.canonical_smiles}
                    className="rounded border border-primary/40 px-2 py-1 text-[10px] text-primary hover:bg-primary/10 disabled:opacity-50" data-testid={`button-use-compound-${hit.cid}`}>
                    {t('ai.useStructure')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[10px] text-muted-foreground">{t('ai.searchNote')}</p>
        </Panel>

        <Panel className="min-w-0" title={t('ai.inspect')} kicker={t('ai.inspectKicker')} right={<Fingerprint className="h-4 w-4 text-primary" />}>
          <form onSubmit={(event) => submitCompound(event, 'describe')} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="structure-kind" className="text-xs text-muted-foreground">{t('ai.inputType')}</label>
              <select id="structure-kind" value={representation} onChange={(event) => {
                setRepresentation(event.target.value as 'smiles' | 'inchi');
                conformer.reset();
              }}
                className="rounded border bg-background px-2 py-1.5 text-xs" data-testid="select-structure-format">
                <option value="smiles">SMILES</option><option value="inchi">InChI</option>
              </select>
              <span className="ms-auto text-[10px] text-muted-foreground">{t('ai.maxChars')}</span>
            </div>
            <textarea value={structure} onChange={(event) => {
              setStructure(event.target.value);
              conformer.reset();
            }} maxLength={2048} required rows={3}
              placeholder={representation === 'smiles' ? t('ai.phSmiles') : t('ai.phInchi')} dir="ltr"
              data-testid="input-compound-structure" className="w-full resize-y rounded border bg-background px-3 py-2 font-num text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!structure.trim() || describe.isPending || predict.isPending}
                className="inline-flex items-center gap-2 rounded border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-50" data-testid="button-describe-structure">
                {describe.isPending && lastAction === 'describe' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                {t('ai.validate')}
              </button>
              <button type="button" disabled={!structure.trim() || predict.isPending || describe.isPending}
                onClick={() => runCompound('predict')}
                className="inline-flex items-center gap-2 rounded border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50" data-testid="button-screen-structure">
                {predict.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {t('ai.check')}
              </button>
            </div>
          </form>
          {compoundError && <div className="mt-3 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive" role="alert">{errorMessage(compoundError)}</div>}
          <div className="mt-3">
            <button type="button" disabled={!structure.trim() || conformer.isPending}
              onClick={() => conformer.mutate({ structure: structure.trim(), representation })}
              className="inline-flex items-center gap-2 rounded border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-50"
              data-testid="button-generate-conformer">
              {conformer.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Box className="h-3.5 w-3.5" />}
              {t('ai.conformer')}
            </button>
            {conformer.error && <div className="mt-2 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive" role="alert">{errorMessage(conformer.error)}</div>}
            {conformer.data && (
              <div className="mt-3 space-y-2" data-testid="panel-molecular-conformer">
                <MolecularConformerViewer molecule={conformer.data} />
                <div className="flex flex-wrap justify-between gap-1 text-[10px] text-muted-foreground">
                  <span>{conformer.data.method} · {t('ai.seed', { s: conformer.data.seed })}{conformer.data.force_field_energy !== null ? ` · ${t('ai.energy', { e: n(conformer.data.force_field_energy, 2) })}` : ''}</span>
                  <span>{t('ai.rotate')}</span>
                </div>
                <p className="text-[10px] text-muted-foreground"><EngineText text={conformer.data.note} /></p>
              </div>
            )}
          </div>
          {described && lastAction === 'describe' && (
            <div className="mt-4 rounded border bg-background/50 p-3" data-testid="panel-compound-description">
              <div className="flex items-center gap-2 text-xs text-primary"><Check className="h-3.5 w-3.5" />{t('ai.validStructure')}</div>
              <code dir="ltr" className="mt-2 block break-all font-num text-[10px] text-muted-foreground text-left">{described.canonical_smiles}</code>
              {described.inchi_key && <div className="mt-1 font-num text-[10px] text-muted-foreground">InChIKey · {described.inchi_key}</div>}
              <p className="mt-2 text-[10px] text-muted-foreground"><EngineText text={described.descriptor_note} /></p>
            </div>
          )}
        </Panel>
      </div>

      {(activeResult || (descriptors && lastAction === 'describe')) && (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel className="min-w-0" title={t('ai.output')} kicker={t('ai.outputKicker')} right={<Activity className="h-4 w-4 text-primary" />}>
            {activeResult && (
              <div data-testid="panel-ai-result">
                <div className={cn('rounded border p-3 text-sm', knownEvidence ? 'border-primary/40 bg-primary/5' : 'border-[#e8b04a]/40 bg-[#e8b04a]/[0.05]')}>
                  {knownEvidence ? (
                    <>
                      <div className="font-medium">{t('ai.match', { cid: String(knownEvidence.cid) })}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <span>{t('ai.outcome')} <b>{String(knownEvidence.outcome)}</b></span>
                        <span>{t('ai.inhibition')} <b dir="ltr">{n(knownEvidence.normalized_mean_inhibition_pct_at_2um, 2)}%</b></span>
                        <span>{t('ai.replicates')} <b>{n(knownEvidence.replicates, 0)}</b></span>
                        <span>{t('ai.ic50')} <b dir="ltr">{knownEvidence.ic50_um ? `${String(knownEvidence.ic50_qualifier ?? '')}${n(knownEvidence.ic50_um, 3)} µM` : t('ai.notMeasured')}</b></span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground"><EngineText text={String(knownEvidence.interpretation)} /></p>
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-[#e8b04a]"><EngineText text={activeResult.message} /></div>
                      {activeResult.exploratory_score !== null && activeResult.exploratory_score !== undefined && (
                        <div className="mt-2">{t('ai.score', { s: n(activeResult.exploratory_score, 3) })} <span className="text-[10px] text-muted-foreground">{t('ai.notProb')}</span></div>
                      )}
                      {activeResult.applicability && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {t('ai.nearest', { t: n(activeResult.applicability.nearest_training_tanimoto), f: n(activeResult.applicability.training_oof_tenth_percentile_floor) })}
                        </div>
                      )}
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {t('ai.uncertainty')}
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-3 rounded border bg-background/50 p-3">
                  <div className="stamp text-[9px] text-muted-foreground">{t('ai.separation')}</div>
                  <div className="mt-1 text-xs"><EngineText text={activeResult.physics_integration} /></div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{t('ai.modelVersion', { v: activeResult.model_version ?? t('ai.none') })}</div>
                </div>
                {!!activeResult.nearest_compounds.length && (
                  <div className="mt-3">
                    <div className="mb-1 stamp text-[9px] text-muted-foreground">{t('ai.closest')}</div>
                    {activeResult.nearest_compounds.map((ref, index) => {
                      const item = ref as AnyMap;
                      return <div key={index} className="flex justify-between border-b border-dashed py-1.5 text-xs last:border-0">
                        <span>PubChem CID {String(item.cid)} · {String(item.outcome)}</span>
                        <span className="font-num text-muted-foreground" dir="ltr">Tanimoto {n(item.tanimoto)}</span>
                      </div>;
                    })}
                  </div>
                )}
              </div>
            )}
            {!activeResult && <p className="text-sm text-muted-foreground">{t('ai.runCheck')}</p>}
          </Panel>
          <Panel className="min-w-0" title={t('ai.descriptors')} kicker={t('ai.descKicker')} right={<Fingerprint className="h-4 w-4 text-primary" />}>
            {descriptors ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3" data-testid="table-molecular-descriptors">
                {Object.entries(descriptors).map(([key, value]) => (
                  <div key={key} className="border-b border-dashed pb-1">
                    <dt className="text-[10px] text-muted-foreground" dir="ltr">{key.replaceAll('_', ' ')}</dt>
                    <dd className="font-num mt-0.5">{n(value, 3)}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="text-sm text-muted-foreground">{t('ai.descEmpty')}</p>}
            <p className="mt-3 text-[10px] text-muted-foreground">{t('ai.descNote')}</p>
          </Panel>
        </div>
      )}
    </div>
  );
}
