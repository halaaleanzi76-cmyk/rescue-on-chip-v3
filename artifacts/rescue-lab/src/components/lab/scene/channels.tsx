import { useMemo, useRef } from 'react';
import { tr } from '@/lib/i18n';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { RunVisualization } from '@workspace/api-client-react';
import type { Playback } from '@/lib/playback';
import {
  CHIP_LEN, CHANNEL_SPACING, type MethodFrames, type Scale, type ViewMode, sampleAt, interpUniform, interpGrid,
  pressureRGB, velocityRGB, TRACER_RGB, NEUTRAL_RGB, halton,
} from '@/lib/viz';
import { Part } from './parts';

interface Props {
  vis: RunVisualization | null; mf: MethodFrames | undefined; pb: Playback; scale: Scale; mode: ViewMode;
  opacity: number; crossOn: boolean; crossPos: number; nDisp: number; nTotal: number; rv: number;
  showTracers: boolean; selected: string | null; onSelect: (id: string | null) => void; showLabels: boolean;
}

const PER_CHANNEL = 14;

/**
 * Quantitative layer: straight circular channels. Colours come only from the Python frames
 * (axial_pressure_pa, mean/radial velocity, displacement_mm), linearly interpolated in time.
 */
export function Channels(props: Props) {
  const { vis, mf, pb, scale, mode, opacity, crossOn, crossPos, nDisp, nTotal, rv, showTracers, selected, onSelect, showLabels } = props;
  const half = CHIP_LEN / 2;
  const zs = useMemo(() => Array.from({ length: nDisp }, (_, i) => (i - (nDisp - 1) / 2) * CHANNEL_SPACING), [nDisp]);

  const tube = useMemo(() => {
    const g = new THREE.CylinderGeometry(rv, rv, CHIP_LEN, 18, 24, true);
    g.rotateZ(Math.PI / 2);
    const pos = g.attributes.position;
    const frac = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) frac[i] = (pos.getX(i) + half) / CHIP_LEN;
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    return { g, frac };
  }, [rv, half]);

  const disc = useMemo(() => {
    const g = new THREE.RingGeometry(0, rv, 28, 16);
    const pos = g.attributes.position;
    const rho = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) rho[i] = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / rv);
    g.rotateY(Math.PI / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    return { g, rho };
  }, [rv]);

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1000), []);
  const planes = useMemo(() => [plane], [plane]);

  const seeds = useMemo(() => {
    const n = nDisp * PER_CHANNEL; const out = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      out[i * 4] = halton(i, 2);                         // initial axial fraction
      out[i * 4 + 1] = Math.sqrt(halton(i, 3)) * 0.86;   // radial fraction rho (area-uniform)
      out[i * 4 + 2] = halton(i, 5) * Math.PI * 2;       // angle
      out[i * 4 + 3] = Math.floor(i / PER_CHANNEL);      // channel index
    }
    return out;
  }, [nDisp]);

  const inst = useRef<THREE.InstancedMesh>(null);
  const discGroup = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const L = vis?.geometry.length_mm ?? 1;

  useFrame(() => {
    const s = sampleAt(mf, pb.t);
    const cutX = -half + crossPos * CHIP_LEN;
    plane.constant = crossOn ? cutX : 1000;

    const col = tube.g.attributes.color as THREE.BufferAttribute;
    const arr = col.array as Float32Array;
    for (let i = 0; i < tube.frac.length; i++) {
      let c = NEUTRAL_RGB;
      if (s) {
        if (mode === 'pressure') c = pressureRGB(interpUniform(s.axial, tube.frac[i]), scale);
        else if (mode === 'velocity') c = velocityRGB(s.mean_velocity_mm_s, scale);
        else c = TRACER_RGB;
      }
      arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2];
    }
    col.needsUpdate = true;

    const dcol = disc.g.attributes.color as THREE.BufferAttribute;
    const darr = dcol.array as Float32Array;
    const pAt = s ? interpUniform(s.axial, crossPos) : 0;
    for (let i = 0; i < disc.rho.length; i++) {
      let c = NEUTRAL_RGB;
      if (s && vis) c = mode === 'pressure' ? pressureRGB(pAt, scale) : velocityRGB(interpGrid(vis.radial_fractions, s.radial, disc.rho[i]), scale);
      darr[i * 3] = c[0]; darr[i * 3 + 1] = c[1]; darr[i * 3 + 2] = c[2];
    }
    dcol.needsUpdate = true;
    if (discGroup.current) { discGroup.current.position.x = cutX; discGroup.current.visible = crossOn; }

    const im = inst.current;
    if (im) {
      const d = s ? s.displacement_mm / L : 0;
      const n = seeds.length / 4;
      for (let i = 0; i < n; i++) {
        const x0 = seeds[i * 4], rho = seeds[i * 4 + 1], th = seeds[i * 4 + 2], ch = seeds[i * 4 + 3];
        // u(r) = 2·ū·(1-ρ²): local displacement = 2(1-ρ²)·∫ū dt. Wrapped for display (re-enters at inlet).
        const raw = x0 + d * 2 * (1 - rho * rho);
        const f = ((raw % 1) + 1) % 1;
        const x = -half + f * CHIP_LEN;
        dummy.position.set(x, Math.cos(th) * rho * rv, zs[ch] + Math.sin(th) * rho * rv);
        const hidden = !showTracers || !s || (crossOn && x > cutX);
        dummy.scale.setScalar(hidden ? 0 : 1);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
  });

  const hot = selected === 'channels';
  return (
    <Part id="channels" label={tr('sc.channels', { shown: nDisp, total: nTotal })} labelPos={[0, 0.5, zs[0] ?? 0]} selected={selected} onSelect={onSelect} showLabels={showLabels}>
      {zs.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh geometry={tube.g} renderOrder={2}>
            <meshStandardMaterial vertexColors transparent opacity={opacity} roughness={0.3} side={THREE.DoubleSide} depthWrite={false}
              clippingPlanes={planes} emissive={hot ? '#3fc1c9' : '#000000'} emissiveIntensity={hot ? 0.3 : 0} />
          </mesh>
          <mesh renderOrder={1} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[rv * 1.45, rv * 1.45, CHIP_LEN, 18, 1, true]} />
            <meshStandardMaterial color="#cdeff2" transparent opacity={0.07} roughness={0.05} depthWrite={false} side={THREE.DoubleSide} clippingPlanes={planes} />
          </mesh>
        </group>
      ))}
      <group ref={discGroup}>
        {zs.map((z) => (
          <mesh key={z} geometry={disc.g} position={[0.001, 0, z]}>
            <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh>
          <boxGeometry args={[0.005, 0.5, (nDisp - 1) * CHANNEL_SPACING + 0.7]} />
          <meshBasicMaterial color="#7ff0f5" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>
      <instancedMesh ref={inst} args={[undefined, undefined, nDisp * PER_CHANNEL]} renderOrder={3} key={nDisp}>
        <sphereGeometry args={[Math.max(0.012, rv * 0.16), 8, 8]} />
        <meshBasicMaterial color="#f4fbfc" />
      </instancedMesh>
    </Part>
  );
}
