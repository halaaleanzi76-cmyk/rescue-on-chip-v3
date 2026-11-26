import type { ExperimentInput, RunVisualization } from '@workspace/api-client-react';
import { X } from 'lucide-react';
import { displayCount, type Sample } from '@/lib/viz';
import { fmt } from '@/lib/lab';
import { tr, trd, useI18n } from '@/lib/i18n';

interface Ctx { config: ExperimentInput | undefined; vis: RunVisualization | null; s: Sample | null }
interface Info { title: string; quantitative: boolean; text: string; rows: (c: Ctx) => [string, string][] }
const R = (k: string) => tr(`in.r.${k}` as never);

const INFO: Record<string, Info> = {
  'reservoir-a': { title: 'Reservoir A · base perfusate', quantitative: false, text: 'Source of F0 perfusate before the switch. Shown as a conceptual vessel; liquid level and colour are decorative.',
    rows: (c) => [[R('baseViscosity'), `${fmt(c.config?.viscosity_mpas)} mPa·s`]] },
  'reservoir-b': { title: 'Reservoir B · incoming line', quantitative: false, text: 'Line selected at the switch. Its pressure mismatch is the configured offset; the model treats reservoirs as ideal pressure sources.',
    rows: (c) => [[R('offset'), `${fmt(c.config?.offset_pct, 0)} %`], [R('alteredRatio'), `${fmt(c.config?.altered_viscosity_ratio, 1)} ×`]] },
  manifold: { title: 'Selector + equalization manifold', quantitative: false, text: 'Represents the three switching topologies (stop-flow, pressure-controlled, equalized). Valve motion is not modelled; topology behaviour enters only through the first-order τ and waits.',
    rows: (c) => [[R('regulated'), `${fmt(c.config?.regulated_tau_s, 1)} s / ${fmt(c.config?.regulated_wait_s, 1)} s`], [R('equalized'), `${fmt(c.config?.equalized_tau_s, 1)} s / ${fmt(c.config?.equalization_s, 1)} s`], [R('stopPause'), `${fmt(c.config?.stop_duration_s, 1)} s`]] },
  bypass: { title: 'Bypass line', quantitative: false, text: 'Illustrative equalization / waste path. No flow is computed for it and none is animated.', rows: () => [] },
  'bubble-trap': { title: 'Bubble trap', quantitative: false, text: 'Conceptual component from the proposal. Dead volume upstream of the chip is modelled as a well-mixed volume that drives carryover.',
    rows: (c) => [[R('deadVolume'), `${fmt(c.config?.dead_volume_ul)} µL`], [R('carryoverNow'), c.s ? `${fmt(c.s.carryover_pct)} %` : '—']] },
  'tap-in': { title: 'Inlet pressure tap', quantitative: true, text: 'Reads the Python inlet pressure trace for the selected topology, interpolated at the playback time.',
    rows: (c) => [[R('inletPressure'), c.s ? `${fmt(c.s.pressure_pa, 1)} Pa` : '—'], [R('setPoint'), `${fmt(c.config?.pressure_pa, 0)} Pa`]] },
  'tap-out': { title: 'Outlet tap', quantitative: true, text: 'Outlet is the model pressure reference (0 Pa gauge).', rows: (c) => [[R('outletPressure'), `${fmt(c.vis?.geometry.outlet_pressure_pa ?? 0, 1)} Pa`]] },
  chip: { title: 'Transparent chip housing', quantitative: false, text: 'Conceptual body. Wall thickness, spacing and headers are exaggerated for legibility; not manufactured CAD.', rows: (c) => [[R('channelLength'), `${fmt(c.vis?.geometry.length_mm ?? c.config?.length_mm, 1)} mm`]] },
  barrier: { title: 'Endothelial barrier layer', quantitative: false, text: 'Conceptual. Barrier transport is computed separately from user-prescribed permeability (see Analysis), not predicted from this geometry.',
    rows: (c) => [[R('prescribedP'), `${fmt(c.config?.permeability_um_s, 4)} µm/s`], [R('injury'), `${fmt(c.config?.injury_permeability_ratio, 1)} ×`]] },
  outlet: { title: 'Outlet + waste', quantitative: false, text: 'Fixed 0 Pa reference reservoir. Collection is illustrative.', rows: () => [] },
  channels: { title: 'Parallel microchannels', quantitative: true, text: 'Straight circular channels with Hagen-Poiseuille flow. Pressure falls linearly along x; velocity is parabolic in r. Quasi-steady analytical reconstruction from Python traces, not CFD.',
    rows: (c) => {
      const n = c.vis?.geometry.channels ?? c.config?.channels ?? 0;
      return [[R('shownTotal'), tr('in.r.shownOf', { shown: displayCount(n), total: n })], [R('radius'), `${fmt(c.vis?.geometry.radius_um ?? c.config?.radius_um, 1)} µm`], [R('length'), `${fmt(c.vis?.geometry.length_mm ?? c.config?.length_mm, 1)} mm`],
        [R('flowAll'), c.s ? `${fmt(c.s.flow_ul_min, 3)} µL/min` : '—'], [R('meanVelocity'), c.s ? `${fmt(c.s.mean_velocity_mm_s, 3)} mm/s` : '—'], [R('wallShear'), c.s ? `${fmt(c.s.wall_shear_pa, 3)} Pa` : '—']];
    } },
};

export function Inspector({ id, onClose, ...ctx }: Ctx & { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const info = INFO[id];
  if (!info) return null;
  const rows = info.rows(ctx);
  return (
    <div className="border rounded-md p-3 bg-secondary/40 rise" data-testid="panel-inspector">
      <div className="flex items-start gap-2">
        <div>
          <div className={`stamp text-[9px] ${info.quantitative ? 'text-primary' : 'text-[#e8b04a]'}`}>{info.quantitative ? t('in.python') : t('in.conceptual')}</div>
          <div className="font-semibold text-sm" data-testid="text-inspector-title">{trd(`in.${id}.title`, info.title)}</div>
        </div>
        <button onClick={onClose} className="ms-auto p-1 rounded hover:bg-secondary" aria-label={t('in.close')} data-testid="button-inspector-close"><X className="h-3.5 w-3.5" /></button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{trd(`in.${id}.text`, info.text)}</p>
      {rows.length > 0 && (
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 font-num text-[11px]">
          {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="text-end" dir="ltr">{v}</dd></div>)}
        </dl>
      )}
    </div>
  );
}
