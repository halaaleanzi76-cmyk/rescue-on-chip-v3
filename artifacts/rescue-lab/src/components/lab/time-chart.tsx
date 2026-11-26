import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from 'recharts';
import type { VisualizationFrame } from '@workspace/api-client-react';
import type { MethodFrames } from '@/lib/viz';
import { METHOD_COLORS, METHOD_LABEL, fmt } from '@/lib/lab';

const AXIS = { fontSize: 10, fontFamily: 'Geist Mono, monospace', fill: 'hsl(198 14% 58%)' };
type Key = keyof Pick<VisualizationFrame, 'pressure_pa' | 'flow_ul_min' | 'mean_velocity_mm_s' | 'carryover_pct' | 'wall_shear_pa' | 'displacement_mm'>;

export interface Series { id: string; mf: MethodFrames; color?: string; label?: string; dashed?: boolean }

export function TimeChart({ series, field, unit, t, height = 120, switchS, testId, active }: {
  series: Series[]; field: Key; unit: string; t: number; height?: number; switchS?: number; testId: string; active?: string;
}) {
  const data = useMemo(() => {
    const m = new Map<number, Record<string, number>>();
    for (const s of series) for (const f of s.mf.frames) {
      const row = m.get(f.time_s) ?? { time_s: f.time_s };
      row[s.id] = f[field];
      m.set(f.time_s, row);
    }
    return Array.from(m.values()).sort((a, b) => a.time_s - b.time_s);
  }, [series, field]);
  return (
    <div style={{ height }} data-testid={testId}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(200 22% 15%)" strokeDasharray="2 4" />
          <XAxis dataKey="time_s" type="number" domain={['dataMin', 'dataMax']} tick={AXIS} tickCount={5} height={18} />
          <YAxis tick={AXIS} width={44} domain={['auto', 'auto']} tickFormatter={(v) => fmt(Number(v), 1)} />
          <Tooltip contentStyle={{ background: 'hsl(205 30% 10%)', border: '1px solid hsl(200 22% 22%)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
            labelFormatter={(l) => `t = ${fmt(Number(l), 2)} s`} formatter={(v, n) => [`${fmt(Number(v), 3)} ${unit}`, String(n)]} />
          {switchS !== undefined && <ReferenceLine x={switchS} stroke="#ef7a5a" strokeDasharray="3 3" />}
          {series.map((s) => (
            <Line key={s.id} dataKey={s.id} name={s.label ?? METHOD_LABEL[s.mf.method] ?? s.id} stroke={s.color ?? METHOD_COLORS[s.mf.method] ?? '#8ab'}
              dot={false} strokeWidth={active && active !== s.id ? 1 : 1.8} strokeOpacity={active && active !== s.id ? 0.4 : 1}
              strokeDasharray={s.dashed ? '4 3' : undefined} isAnimationActive={false} connectNulls />
          ))}
          <ReferenceLine x={t} stroke="#e8f6f8" strokeWidth={1.2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
