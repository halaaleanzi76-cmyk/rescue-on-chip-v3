import { Edges } from '@react-three/drei';
import { tr } from '@/lib/i18n';
import { CHIP_LEN } from '@/lib/viz';
import { Part, Pipe, Glass, Solid, type Vec3 } from './parts';

interface Props { width: number; selected: string | null; onSelect: (id: string | null) => void; showLabels: boolean }

/**
 * Conceptual perfusion apparatus. Layout, proportions and styling are illustrative
 * (not to scale, not CAD). Nothing here carries computed velocity or pressure.
 */
export function Apparatus({ width, selected, onSelect, showLabels }: Props) {
  const hx = CHIP_LEN / 2;
  const chipW = width + 1.0;
  const p = { selected, onSelect, showLabels };
  const hot = (id: string) => selected === id;
  const resA: Vec3 = [-8.2, 0.9, -1.3];
  const resB: Vec3 = [-8.2, 0.9, 1.3];
  const man: Vec3 = [-6.2, 0.15, 0];
  const trap: Vec3 = [-4.8, 0.35, 0];

  return (
    <group>
      {/* Chip body */}
      <Part id="chip" label={tr('sc.chip')} labelPos={[0, 0.55, -chipW / 2]} concept {...p}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[CHIP_LEN + 1.3, 0.38, chipW]} />
          <Glass hot={hot('chip')} opacity={0.09} />
          <Edges color={hot('chip') ? '#7ff0f5' : '#3a8c96'} threshold={15} />
        </mesh>
        <mesh position={[0, -0.215, 0]}>
          <boxGeometry args={[CHIP_LEN + 1.5, 0.05, chipW + 0.2]} />
          <meshStandardMaterial color="#14303a" transparent opacity={0.85} roughness={0.6} />
        </mesh>
        {/* inlet / outlet distribution headers */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (hx + 0.3), 0, 0]}>
            <boxGeometry args={[0.22, 0.16, Math.max(0.3, width + 0.4)]} />
            <Glass hot={hot('chip')} opacity={0.22} color="#9fd8de" />
          </mesh>
        ))}
      </Part>

      {/* Barrier layer under channels (conceptual) */}
      <Part id="barrier" label={tr('sc.barrier')} labelPos={[hx - 0.4, -0.35, chipW / 2]} concept {...p}>
        <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CHIP_LEN, Math.max(0.3, width + 0.4)]} />
          <meshStandardMaterial color="#d98a8a" transparent opacity={hot('barrier') ? 0.4 : 0.16} side={2} depthWrite={false} />
        </mesh>
      </Part>

      {/* Reservoirs */}
      {([['reservoir-a', resA, '#3fc1c9', tr('sc.reservoirA')], ['reservoir-b', resB, '#e8b04a', tr('sc.reservoirB')]] as const).map(([id, pos, col, lab]) => (
        <Part key={id} id={id} label={lab} labelPos={[pos[0], pos[1] + 1.15, pos[2]]} concept {...p}>
          <group position={pos}>
            <mesh><cylinderGeometry args={[0.5, 0.5, 1.6, 32, 1, true]} /><Glass hot={hot(id)} opacity={0.2} /></mesh>
            <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.46, 0.46, 1.1, 32]} /><meshStandardMaterial color={col} transparent opacity={0.55} roughness={0.2} /></mesh>
            <mesh position={[0, 0.84, 0]}><cylinderGeometry args={[0.54, 0.54, 0.1, 32]} /><Solid color="#2a4652" hot={hot(id)} /></mesh>
            <mesh position={[0, -0.84, 0]}><cylinderGeometry args={[0.56, 0.56, 0.08, 32]} /><Solid color="#1d3540" /></mesh>
          </group>
          <Pipe points={[[pos[0], pos[1] - 0.85, pos[2]], [pos[0] + 0.6, 0.15, pos[2]], [man[0] - 0.3, man[1], pos[2] * 0.2]]} radius={0.045} color={col} opacity={0.6} hot={hot(id)} />
        </Part>
      ))}

      {/* Selector / equalization manifold */}
      <Part id="manifold" label={tr('sc.manifold')} labelPos={[man[0], man[1] + 0.75, man[2]]} concept {...p}>
        <group position={man}>
          <mesh><boxGeometry args={[0.7, 0.36, 1.0]} /><Solid color="#24434f" hot={hot('manifold')} metal={0.7} rough={0.3} /></mesh>
          {[-0.25, 0.25].map((z) => (
            <group key={z} position={[0, 0.3, z]}>
              <mesh><cylinderGeometry args={[0.09, 0.09, 0.25, 16]} /><Solid color="#8fb3bd" /></mesh>
              <mesh position={[0, 0.15, 0]} rotation={[0, z > 0 ? 0.6 : -0.6, 0]}><boxGeometry args={[0.34, 0.04, 0.06]} /><Solid color={z > 0 ? '#e8b04a' : '#3fc1c9'} metal={0.2} /></mesh>
            </group>
          ))}
        </group>
      </Part>

      {/* Bypass line (equalization / waste) */}
      <Part id="bypass" label={tr('sc.bypass')} labelPos={[-1, 0.3, -chipW / 2 - 1.1]} concept {...p}>
        <Pipe points={[[man[0], man[1], -0.45], [man[0] + 0.4, 0.1, -chipW / 2 - 0.9], [0, 0.1, -chipW / 2 - 1.1], [hx + 1.9, 0.1, -chipW / 2 - 0.6], [hx + 2.6, 0.2, -0.4]]} radius={0.04} color="#6d8b95" opacity={0.5} hot={hot('bypass')} />
      </Part>

      {/* Bubble trap */}
      <Part id="bubble-trap" label={tr('sc.bubbleTrap')} labelPos={[trap[0], trap[1] + 0.95, trap[2]]} concept {...p}>
        <group position={trap}>
          <mesh><capsuleGeometry args={[0.2, 0.55, 8, 20]} /><Glass hot={hot('bubble-trap')} opacity={0.24} /></mesh>
          <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.17, 0.17, 0.4, 20]} /><meshStandardMaterial color="#3fc1c9" transparent opacity={0.45} /></mesh>
          {[0.18, 0.3, 0.38].map((y, i) => <mesh key={i} position={[0.04 * (i - 1), y, 0.03 * i]}><sphereGeometry args={[0.035 - i * 0.006, 10, 10]} /><meshStandardMaterial color="#e8f6f8" transparent opacity={0.7} /></mesh>)}
        </group>
        <Pipe points={[[man[0] + 0.35, man[1], 0], [trap[0] - 0.2, 0.05, 0], [trap[0], trap[1] - 0.45, 0]]} radius={0.045} />
        <Pipe points={[[trap[0], trap[1] - 0.45, 0.02], [trap[0] + 0.5, 0.0, 0], [-hx - 0.45, 0, 0]]} radius={0.045} />
      </Part>

      {/* Pressure taps (readings are the Python inlet trace and the fixed 0 Pa outlet) */}
      {([['tap-in', -hx - 0.75, tr('sc.tapIn')], ['tap-out', hx + 0.75, tr('sc.tapOut')]] as const).map(([id, x, lab]) => (
        <Part key={id} id={id} label={lab} labelPos={[x, 1.05, 0]} {...p}>
          <group position={[x, 0, 0]}>
            <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.04, 0.04, 0.5, 12]} /><Solid color="#9fb9c1" hot={hot(id)} /></mesh>
            <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.17, 0.17, 0.07, 28]} /><Solid color="#1c3a45" hot={hot(id)} /></mesh>
            <mesh position={[0, 0.6, 0.037]}><circleGeometry args={[0.14, 28]} /><meshStandardMaterial color="#d8eef1" emissive="#3fc1c9" emissiveIntensity={0.15} /></mesh>
          </group>
        </Part>
      ))}

      {/* Outlet + waste */}
      <Part id="outlet" label={tr('sc.outlet')} labelPos={[hx + 2.7, 1.2, 0]} concept {...p}>
        <Pipe points={[[hx + 0.45, 0, 0], [hx + 1.6, 0, 0], [hx + 2.4, 0.2, 0], [hx + 2.7, 0.55, 0]]} radius={0.045} hot={hot('outlet')} />
        <group position={[hx + 2.7, 0.35, 0]}>
          <mesh><cylinderGeometry args={[0.4, 0.34, 0.9, 28, 1, true]} /><Glass hot={hot('outlet')} opacity={0.2} /></mesh>
          <mesh position={[0, -0.22, 0]}><cylinderGeometry args={[0.36, 0.34, 0.42, 28]} /><meshStandardMaterial color="#7a9aa3" transparent opacity={0.35} /></mesh>
        </group>
      </Part>
    </group>
  );
}
