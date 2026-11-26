import { useMemo, useState } from 'react';
import { EngineText, useEngineText } from '@/components/engine-text';
import { Activity, AlertTriangle, ArrowDownRight, LoaderCircle, RotateCcw, Waves } from 'lucide-react';
import {
  getGetVascularNetworkQueryKey,
  useGetVascularNetwork,
  useSolveVascularNetwork,
  type VascularSolveInput,
  type VascularSolveResult,
} from '@workspace/api-client-react';
import { usePageTitle } from '@/components/shell';
import { AnatomicalVascularView } from '@/components/vascular/anatomical-vascular-view';
import { VascularNetworkView, type VascularColorMetric } from '@/components/vascular/vascular-network-view';
import './vascular.css';
import { getLang, tr, trd, useI18n } from '@/lib/i18n';

type BoundaryMode = 'fixed_pressure' | 'fixed_inlet_flow';
const initialForm = {
  boundaryMode: 'fixed_pressure' as BoundaryMode,
  inletPressure: '1000',
  outletPressure: '0',
  inletFlow: '1',
  viscosity: '1.2',
};

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function format(value: number | null | undefined, digits = 3) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(getLang() === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { maximumFractionDigits: digits });
}

function userError(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  // Translate the solver's well-defined rejections; anything else is shown as returned.
  if (/isolated internal vessel component/i.test(msg)) return tr('vs.err.disconnected');
  if (/Fixed-inlet-flow mode requires/i.test(msg)) return tr('vs.err.flowDisconnected');
  if (/do not define a unique solution/i.test(msg)) return tr('vs.err.noUnique');
  if (error instanceof Error) return error.message;
  return tr('vs.err.request');
}

export default function Vascular() {
  const { t } = useI18n();
  const et = useEngineText();
  usePageTitle(t('vs.title'));
  const networkQuery = useGetVascularNetwork({ query: { queryKey: getGetVascularNetworkQueryKey() } });
  const solver = useSolveVascularNetwork();
  const network = networkQuery.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [radiusDrafts, setRadiusDrafts] = useState<Record<string, string>>({});
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<VascularSolveResult | null>(null);
  const [colorMetric, setColorMetric] = useState<VascularColorMetric>('flow');
  const [viewMode, setViewMode] = useState<'anatomical' | 'computational'>('anatomical');
  const [inputError, setInputError] = useState('');
  const [occluded, setOccluded] = useState<string[]>([]);

  const selectedSegment = useMemo(
    () => network?.segments.find((segment) => segment.segment_id === selectedId) ?? network?.segments[0] ?? null,
    [network, selectedId],
  );
  const selectedResult = useMemo(
    () => result?.segments.find((segment) => segment.segment_id === selectedSegment?.segment_id) ?? null,
    [result, selectedSegment],
  );
  const selectedRadius = selectedSegment
    ? radiusDrafts[selectedSegment.segment_id] ?? (selectedSegment.radius_m * 1e6).toFixed(2)
    : '';

  const validation = useMemo(() => {
    const pressureIn = numberValue(form.inletPressure);
    const pressureOut = numberValue(form.outletPressure);
    const flow = numberValue(form.inletFlow);
    const viscosity = numberValue(form.viscosity);
    const radius = numberValue(selectedRadius);
    if (!selectedSegment) return t('vs.val.select');
    if (!Number.isFinite(radius) || radius <= 0 || radius > 500) return t('vs.val.radius');
    if (!Number.isFinite(viscosity) || viscosity <= 0 || viscosity > 100) return t('vs.val.viscosity');
    if (!Number.isFinite(pressureIn) || pressureIn < 0 || pressureIn > 100000) return t('vs.val.inlet');
    if (!Number.isFinite(pressureOut) || pressureOut < 0 || pressureOut > 100000) return t('vs.val.outlet');
    if (form.boundaryMode === 'fixed_inlet_flow' && (!Number.isFinite(flow) || flow <= 0 || flow > 1000000)) return t('vs.val.flow');
    return '';
  }, [form, selectedRadius, selectedSegment, t]);

  const applySolve = () => {
    setInputError('');
    setResult(null);
    if (!selectedSegment) {
      setInputError(t('vs.val.noSegments'));
      return;
    }
    if (validation) {
      setInputError(validation);
      return;
    }
    const payload: VascularSolveInput = {
      boundary_mode: form.boundaryMode,
      inlet_pressure_pa: numberValue(form.inletPressure),
      outlet_pressure_pa: numberValue(form.outletPressure),
      inlet_flow_ul_min: numberValue(form.inletFlow),
      viscosity_pa_s: numberValue(form.viscosity) / 1000,
      radius_overrides_um: { [selectedSegment.segment_id]: numberValue(selectedRadius) },
      occluded_segment_ids: occluded,
    };
    solver.mutate({ data: payload }, {
      onSuccess: (nextResult) => setResult(nextResult),
      onError: (error) => setInputError(userError(error)),
    });
  };

  const setField = (key: keyof typeof form, value: string | BoundaryMode) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
    setInputError('');
  };

  const toggleOcclusion = (id: string) => {
    setOccluded((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setResult(null);
    setInputError('');
  };
  const selectedIsOccluded = !!selectedSegment && occluded.includes(selectedSegment.segment_id);

  const selectedRadiusIsOverride = !!selectedSegment && radiusDrafts[selectedSegment.segment_id] != null;
  const metricBounds = useMemo(() => {
    if (!result?.segments.length) return null;
    const values = result.segments.map((segment) => {
      if (colorMetric === 'pressure') return (segment.pressure_start_pa + segment.pressure_end_pa) / 2;
      if (colorMetric === 'shear') return segment.wall_shear_stress_pa;
      return Math.abs(segment.flow_rate_ul_min);
    });
    return { min: colorMetric === 'pressure' ? Math.min(...values) : 0, max: Math.max(...values) };
  }, [result, colorMetric]);
  const metricUnit = colorMetric === 'flow' ? 'µL/min' : 'Pa';
  const segmentCount = network?.segments.length ?? 0;
  const nodeCount = network?.nodes.length ?? 0;
  const isLoading = networkQuery.isLoading;

  return (
    <div className="vascular-page">
      <header className="vascular-header">
        <div className="vascular-title-wrap">
          <div className="vascular-kicker">{t('vs.kicker')}</div>
          <h1>{t('vs.h1')}</h1>
          <p>{t('vs.lead')}</p>
          <div className="vascular-topology-note">{t('vs.topology')}</div>
        </div>
        <div className="vascular-status-chip" data-testid="status-vascular-mode">
          <span className="vascular-status-dot" />
          <span>{t('vs.concept')}</span>
        </div>
      </header>

      <div className="vascular-notice" role="note" data-testid="notice-illustrative-geometry">
        <span className="vascular-notice-mark">!</span>
        <div><strong>{t('vs.noticeStrong')}</strong> {t('vs.noticeBody')}</div>
      </div>

      {networkQuery.isError && (
        <div className="vascular-error" role="alert" data-testid="status-network-error">
          <span>{userError(networkQuery.error)}</span>
          <button onClick={() => networkQuery.refetch()} data-testid="button-retry-network">{t('vs.retryNetwork')}</button>
        </div>
      )}

      <div className="vascular-workspace">
        <section className="vascular-left" aria-label={t('vs.leftAria')}>
          <div className="vascular-panel vascular-network-panel">
            <div className="vascular-panel-head">
              <div>
                <div className="vascular-panel-heading">{t('vs.graphHeading')}</div>
                <div className="vascular-panel-subhead">{network ? t('vs.graphSub', { scope: et(network.tissue_scope), version: network.network_version }) : t('vs.loadingGraph')}</div>
              </div>
              <div className="vascular-legend" aria-label={t('vs.legendAria')}>
                <span className="vascular-legend-item"><i className="vascular-swatch" style={{ background: '#63d7cc' }} />{t('vs.inlet')}</span>
                <span className="vascular-legend-item"><i className="vascular-swatch" style={{ background: '#e5b45e' }} />{t('vs.outlet')}</span>
              </div>
            </div>
            <div className="vascular-view-mode-row" data-testid="vascular-view-mode">
              <span className="vascular-mode-label">{t('vs.view3d')}</span>
              <div className="vascular-view-mode-toggle" role="group" aria-label={t('vs.modeAria')}>
                <button type="button" aria-pressed={viewMode === 'anatomical'} onClick={() => setViewMode('anatomical')} data-testid="button-vascular-mode-anatomical">{t('vs.anatomical')}</button>
                <button type="button" aria-pressed={viewMode === 'computational'} onClick={() => setViewMode('computational')} data-testid="button-vascular-mode-computational">{t('vs.computational')}</button>
              </div>
              <span className="vascular-view-mode-caption">
                {viewMode === 'anatomical'
                  ? t('vs.anatCaption')
                  : t('vs.compCaption')}
              </span>
            </div>
            {isLoading ? (
              <div className="vascular-skeleton vascular-skeleton-stage" aria-label={t('vs.loadingAria')} />
            ) : network && network.segments.length > 0 ? (
              viewMode === 'anatomical' ? (
                <AnatomicalVascularView
                  network={network}
                  result={result}
                  metric={colorMetric}
                  selectedId={selectedSegment?.segment_id ?? selectedId}
                  onSelect={(id) => { setSelectedId(id); setInputError(''); }}
                />
              ) : (
                <VascularNetworkView
                  network={network}
                  result={result}
                  metric={colorMetric}
                  selectedId={selectedSegment?.segment_id ?? selectedId}
                  onSelect={(id) => { setSelectedId(id); setInputError(''); }}
                />
              )
            ) : networkQuery.isError ? (
              <div className="vascular-empty">
                <div><strong>{t('vs.unavailableStrong')}</strong><p>{t('vs.unavailableBody')}</p><button onClick={() => networkQuery.refetch()}>{t('vs.retryNetwork')}</button></div>
              </div>
            ) : (
              <div className="vascular-empty">
                <div><strong>{t('vs.noSegStrong')}</strong><p>{t('vs.noSegBody')}</p></div>
              </div>
            )}
            <div className="vascular-panel-head" style={{ borderTop: '1px solid rgba(54, 82, 89, .55)', borderBottom: 0 }}>
              <div className="vascular-legend">
                <span className="vascular-legend-item"><i className="vascular-swatch" style={{ background: '#607d86' }} />{t('vs.unsolved')}</span>
                <span className="vascular-legend-item"><i className="vascular-swatch" style={{ background: '#b47f4e' }} />{t('vs.occluded')}</span>
                <span className="vascular-legend-item">
                  {t('vs.colorLabel', { metric: t(`vs.metric.${colorMetric}`) })}
                  {metricBounds ? ` · ${format(metricBounds.min, 4)}–${format(metricBounds.max, 4)} ${metricUnit}` : t('vs.solveForRange')}
                </span>
                <span className="vascular-flow-scale" aria-hidden="true" />
              </div>
              <span className="vascular-concept-chip">{t('vs.illustrative')}</span>
            </div>
            <div className="vascular-map-controls">
              <span className="vascular-field-label">{t('vs.colorBy')}</span>
              <div className="vascular-metric-toggle" role="group" aria-label={t('vs.colorAria')}>
                {(['flow', 'pressure', 'shear'] as const).map((metric) => (
                  <button type="button" key={metric} aria-pressed={colorMetric === metric}
                    onClick={() => setColorMetric(metric)} data-testid={`button-vascular-color-${metric}`}>
                    {t(`vs.btn.${metric}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="vascular-summary-strip" data-testid="vascular-network-summary">
            <div className="vascular-summary-cell">
              <div className="vascular-metric-label">{t('vs.nodes')}</div>
              <div className="vascular-metric-value">{isLoading ? '···' : nodeCount}</div>
              <div className="vascular-metric-note">{t('vs.nodesNote')}</div>
            </div>
            <div className="vascular-summary-cell">
              <div className="vascular-metric-label">{t('vs.segments')}</div>
              <div className="vascular-metric-value">{isLoading ? '···' : segmentCount}</div>
              <div className="vascular-metric-note">{t('vs.capLinks', { n: network?.segments.filter((s) => s.vessel_class === 'capillary').length ?? 0 })}</div>
            </div>
            <div className="vascular-summary-cell">
              <div className="vascular-metric-label">{t('vs.residual')}</div>
              <div className="vascular-metric-value">{result ? format(result.max_normalized_mass_balance_residual, 2) : '—'}</div>
              <div className="vascular-metric-note">{result ? t('vs.residualNote') : t('vs.afterSolve')}</div>
            </div>
          </div>

          <div className="vascular-panel vascular-result-panel">
            <div className="vascular-panel-head">
              <div>
                <div className="vascular-panel-heading">{t('vs.resultHeading')}</div>
                <div className="vascular-panel-subhead">{t('vs.resultSub')}</div>
              </div>
              {result && <span className="vascular-mono" style={{ fontSize: 9, color: '#82999d' }}>{t('vs.modelTag', { v: result.model_version })}</span>}
            </div>
            <div className="vascular-result-content">
              {solver.isPending ? (
                <div className="vascular-result-state" role="status"><LoaderCircle size={14} className="vascular-spin" />{t('vs.solving')}</div>
              ) : result ? (
                <>
                  <div className="vascular-result-state"><Activity size={14} />{t('vs.completed')} <span className="vascular-mono">{result.input_fingerprint.slice(0, 16)}</span></div>
                  {occluded.length > 0 && Math.abs(result.inlet_flow_ul_min) < 1e-12 && (
                    <div className="vascular-validation" role="status" data-testid="status-no-flow">{t('vs.noFlow')}</div>
                  )}
                  <div className="vascular-result-grid">
                    <div className="vascular-result-item"><span>{t('vs.r.inletFlow')}</span><strong dir="ltr">{format(result.inlet_flow_ul_min, 5)} µL/min</strong></div>
                    <div className="vascular-result-item"><span>{t('vs.r.inletPressure')}</span><strong dir="ltr">{format(result.inlet_pressure_pa, 1)} Pa · {format(result.inlet_pressure_mmhg, 2)} mmHg</strong></div>
                    <div className="vascular-result-item"><span>{t('vs.r.outletPressure')}</span><strong dir="ltr">{format(result.outlet_pressure_pa, 1)} Pa · {format(result.outlet_pressure_mmhg, 2)} mmHg</strong></div>
                    <div className="vascular-result-item"><span>{t('vs.r.boundary')}</span><strong>{result.boundary_mode === 'fixed_pressure' ? t('vs.fixedPressure') : t('vs.fixedInletFlow')}</strong></div>
                  </div>
                  {(result.warnings.length > 0 || result.assumptions.length > 0) && (
                    <div className="vascular-run-note">
                      {result.warnings.length > 0 && <div><strong style={{ color: '#e0b66e' }}>{t('vs.solverWarnings')}</strong> {result.warnings.map(et).join(' · ')}</div>}
                      {result.assumptions.length > 0 && <div style={{ marginTop: 5 }}><strong style={{ color: '#9bb7bb' }}>{t('vs.assumptions')}</strong> {result.assumptions.map(et).join(' · ')}</div>}
                    </div>
                  )}
                </>
              ) : (
                <div className="vascular-result-state" style={{ color: '#879da1' }}><ArrowDownRight size={14} className="rtl:-scale-x-100" />{t('vs.configure')}</div>
              )}
            </div>
          </div>
          <div className="vascular-footnote"><strong>{t('vs.boundaryStrong')}</strong>{t('vs.boundaryBody')}</div>
        </section>

        <aside className="vascular-panel vascular-control-panel" aria-label={t('vs.controlsAria')}>
          <div className="vascular-panel-head">
            <div>
              <div className="vascular-panel-heading">{t('vs.inputs')}</div>
              <div className="vascular-panel-subhead">{t('vs.inputsSub')}</div>
            </div>
            <Waves size={15} color="#69c9c1" />
          </div>
          <div className="vascular-control-content">
            <div className="vascular-field">
              <div className="vascular-field-label"><span>{t('vs.selected')}</span><span>{t('vs.clickVessel')}</span></div>
              <div className="vascular-segment-card" data-testid="selected-vessel-readout">
                {selectedSegment ? (
                  <>
                    <select aria-label={t('vs.selected')} data-testid="select-segment" dir="ltr" value={selectedSegment.segment_id}
                      onChange={(e) => { setSelectedId(e.target.value); setInputError(''); }}
                      style={{ width: '100%', marginBottom: 6, background: 'transparent', border: '1px solid #2c4650', borderRadius: 4, padding: '3px 6px', fontSize: 12, color: 'inherit' }}>
                      {network?.segments.map((seg) => (
                        <option key={seg.segment_id} value={seg.segment_id} style={{ color: '#000' }}>
                          {seg.segment_id}{occluded.includes(seg.segment_id) ? ' ⛔' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="vascular-segment-name" dir="ltr">{selectedSegment.segment_id}</div>
                    <div className="vascular-segment-meta">{trd(`vc.${selectedSegment.vessel_class}`, selectedSegment.vessel_class)} · <span dir="ltr">{selectedSegment.start_node_id} → {selectedSegment.end_node_id}</span></div>
                    <div className="vascular-selected-values">
                      <div className="vascular-value-box"><span>{t('vs.v.length')}</span><strong dir="ltr">{format(selectedSegment.length_m * 1000, 3)} mm</strong></div>
                      <div className="vascular-value-box"><span>{t('vs.v.radius')}</span><strong dir="ltr">{format(numberValue(selectedRadius), 2)} µm</strong></div>
                      <div className="vascular-value-box"><span>{t('vs.v.flow')}</span><strong>{selectedResult ? <><span dir="ltr">{format(selectedResult.flow_rate_ul_min, 5)} µL/min</span> · {trd(`fd.${selectedResult.flow_direction}`, selectedResult.flow_direction)}</> : '—'}</strong></div>
                      <div className="vascular-value-box"><span>{t('vs.v.velocity')}</span><strong dir="ltr">{selectedResult ? `${format(selectedResult.mean_velocity_mm_s, 5)} mm/s` : '—'}</strong></div>
                      <div className="vascular-value-box"><span>{t('vs.v.pressure')}</span><strong dir="ltr">{selectedResult ? `${format(selectedResult.pressure_start_pa, 2)} → ${format(selectedResult.pressure_end_pa, 2)} Pa` : '—'}</strong></div>
                      <div className="vascular-value-box"><span>{t('vs.v.shear')}</span><strong dir="ltr">{selectedResult ? `${format(selectedResult.wall_shear_stress_pa, 5)} Pa` : '—'}</strong></div>
                      <div className="vascular-value-box"><span>{t('vs.v.resistance')}</span><strong dir="ltr">{selectedResult?.hydraulic_resistance_pa_s_m3 == null ? selectedResult?.occluded ? t('vs.blocked') : '—' : `${format(selectedResult.hydraulic_resistance_pa_s_m3, 3)} Pa·s/m³`}</strong></div>
                    </div>
                  </>
                ) : <div className="vascular-segment-meta">{t('vs.noSelection')}</div>}
              </div>
              {selectedSegment && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="vascular-inline-button" aria-pressed={selectedIsOccluded}
                    onClick={() => toggleOcclusion(selectedSegment.segment_id)} data-testid="button-toggle-occlusion">
                    {selectedIsOccluded ? t('vs.reopen') : t('vs.occlude')}
                  </button>
                  {occluded.length > 0 && (
                    <span className="vascular-run-note" style={{ marginInlineStart: 8 }} data-testid="text-occluded-count">
                      {t('vs.occludedCount', { n: occluded.length })} · <button type="button" className="vascular-inline-button" onClick={() => { setOccluded([]); setResult(null); setInputError(''); }} data-testid="button-clear-occlusions">{t('vs.clearOcclusions')}</button>
                    </span>
                  )}
                  <div className="vascular-run-note">{t('vs.occludeNote')}</div>
                </div>
              )}
            </div>

            <div className="vascular-field">
              <label className="vascular-field-label" htmlFor="vascular-radius"><span>{t('vs.selRadius')}</span><span>{t('vs.selRadiusUnit')}</span></label>
              <div className="vascular-input-wrap has-unit">
                <input id="vascular-radius" data-testid="input-selected-radius" type="text" inputMode="decimal" lang="en" dir="ltr" spellCheck={false} autoComplete="off" min="0.001" max="500" step="0.1" value={selectedRadius}
                  disabled={!selectedSegment}
                  onChange={(event) => {
                    if (!selectedSegment) return;
                    setRadiusDrafts((current) => ({ ...current, [selectedSegment.segment_id]: event.target.value }));
                    setResult(null);
                  }} />
                <span className="vascular-unit">µm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="vascular-run-note" style={{ marginTop: 0 }}>{t('vs.netDefault', { v: selectedSegment ? format(selectedSegment.radius_m * 1e6, 2) : '—' })}</span>
                {selectedRadiusIsOverride && <button className="vascular-inline-button" onClick={() => {
                  if (!selectedSegment) return;
                  setRadiusDrafts((current) => {
                    const next = { ...current };
                    delete next[selectedSegment.segment_id];
                    return next;
                  });
                  setResult(null);
                }} data-testid="button-reset-radius">{t('vs.reset')}</button>}
              </div>
            </div>

            <div className="vascular-field">
              <div className="vascular-field-label"><span>{t('vs.boundaryCond')}</span><span>{t('vs.oneMode')}</span></div>
              <div className="vascular-mode-toggle" role="group" aria-label={t('vs.boundaryAria')}>
                <button type="button" aria-pressed={form.boundaryMode === 'fixed_pressure'} onClick={() => setField('boundaryMode', 'fixed_pressure')} data-testid="button-boundary-pressure">{t('vs.fixedPressure')}</button>
                <button type="button" aria-pressed={form.boundaryMode === 'fixed_inlet_flow'} onClick={() => setField('boundaryMode', 'fixed_inlet_flow')} data-testid="button-boundary-flow">{t('vs.fixedFlow')}</button>
              </div>
            </div>

            <div className="vascular-field">
              <label className="vascular-field-label" htmlFor="vascular-inlet-pressure"><span>{t('vs.inletPressure')}</span><span>Pa</span></label>
              <div className="vascular-input-wrap has-unit">
                <input id="vascular-inlet-pressure" data-testid="input-inlet-pressure" type="text" inputMode="decimal" lang="en" dir="ltr" spellCheck={false} autoComplete="off" min="0" max="100000" step="100" value={form.inletPressure} onChange={(event) => setField('inletPressure', event.target.value)} disabled={form.boundaryMode !== 'fixed_pressure'} />
                <span className="vascular-unit">Pa</span>
              </div>
              {form.boundaryMode === 'fixed_inlet_flow' && <div className="vascular-run-note">{t('vs.fixedFlowNote')}</div>}
            </div>
            <div className="vascular-field">
              <label className="vascular-field-label" htmlFor="vascular-outlet-pressure"><span>{t('vs.outletPressure')}</span><span>Pa</span></label>
              <div className="vascular-input-wrap has-unit">
                <input id="vascular-outlet-pressure" data-testid="input-outlet-pressure" type="text" inputMode="decimal" lang="en" dir="ltr" spellCheck={false} autoComplete="off" min="0" max="100000" step="100" value={form.outletPressure} onChange={(event) => setField('outletPressure', event.target.value)} />
                <span className="vascular-unit">Pa</span>
              </div>
            </div>
            <div className="vascular-field">
              <label className="vascular-field-label" htmlFor="vascular-inlet-flow"><span>{t('vs.inletFlow')}</span><span>µL/min</span></label>
              <div className="vascular-input-wrap has-unit">
                <input id="vascular-inlet-flow" data-testid="input-inlet-flow" type="text" inputMode="decimal" lang="en" dir="ltr" spellCheck={false} autoComplete="off" min="0.001" max="1000000" step="0.05" value={form.inletFlow}
                  onChange={(event) => setField('inletFlow', event.target.value)} disabled={form.boundaryMode !== 'fixed_inlet_flow'} />
                <span className="vascular-unit">µL/min</span>
              </div>
            </div>
            <div className="vascular-field">
              <label className="vascular-field-label" htmlFor="vascular-viscosity"><span>{t('vs.viscosity')}</span><span>mPa·s</span></label>
              <div className="vascular-input-wrap has-unit">
                <input id="vascular-viscosity" data-testid="input-viscosity" type="text" inputMode="decimal" lang="en" dir="ltr" spellCheck={false} autoComplete="off" min="0.001" max="100" step="0.0001" value={form.viscosity} onChange={(event) => setField('viscosity', event.target.value)} />
                <span className="vascular-unit">mPa·s</span>
              </div>
            </div>

            {inputError && <div className="vascular-validation" role="alert" data-testid="status-solver-validation"><AlertTriangle size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />{inputError}</div>}
            {!inputError && validation && <div className="vascular-validation" data-testid="text-input-guidance">{validation}</div>}
            <button className="vascular-submit" onClick={applySolve} disabled={!network || !selectedSegment || !!validation || solver.isPending} data-testid="button-run-vascular-solver">
              {solver.isPending ? <><LoaderCircle size={14} className="vascular-spin" />{t('vs.solvingNetwork')}</> : <><Activity size={14} />{t('vs.run')}</>}
            </button>
            <div className="vascular-run-note">{t('vs.runNote1')}</div>
            <div className="vascular-run-note">{t('vs.runNote2')}</div>
            {network && (
              <div className="vascular-run-note" style={{ borderTop: '1px solid #243c43', paddingTop: 10, marginTop: 12 }}>
                {t('vs.geometryBasis')} <EngineText text={network.geometry_note} />
              </div>
            )}
            {networkQuery.isError && <button className="vascular-inline-button" style={{ marginTop: 12 }} onClick={() => networkQuery.refetch()}><RotateCcw size={11} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />{t('vs.retryLoading')}</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}
