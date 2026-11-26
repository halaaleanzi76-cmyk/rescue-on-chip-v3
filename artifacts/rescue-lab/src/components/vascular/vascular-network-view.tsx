import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MonitorX, RotateCcw } from 'lucide-react';
import type { VascularNetwork, VascularSolveResult } from '@workspace/api-client-react';
import { tr } from '@/lib/i18n';

type Vec3 = [number, number, number];
export type VascularColorMetric = 'flow' | 'pressure' | 'shear';

const vesselWidths: Record<string, number> = {
  artery: 0.105,
  arteriole: 0.082,
  capillary: 0.05,
  venule: 0.075,
  vein: 0.1,
};

function coordinates(network: VascularNetwork) {
  const points = network.nodes.map((node) => node.position_m);
  if (!points.length) return new Map<string, Vec3>();
  const mins: Vec3 = [0, 1, 2].map((axis) => Math.min(...points.map((p) => p[axis]))) as Vec3;
  const maxs: Vec3 = [0, 1, 2].map((axis) => Math.max(...points.map((p) => p[axis]))) as Vec3;
  const center = mins.map((min, i) => (min + maxs[i]) / 2) as Vec3;
  const span = Math.max(...maxs.map((max, i) => max - mins[i]), 1e-8);
  const scale = 9 / span;
  return new Map(network.nodes.map((node) => [
    node.node_id,
    node.position_m.map((v, i) => (v - center[i]) * scale) as Vec3,
  ]));
}

function metricValue(
  result: NonNullable<VascularSolveResult['segments'][number]>,
  metric: VascularColorMetric,
) {
  if (metric === 'pressure') return (result.pressure_start_pa + result.pressure_end_pa) / 2;
  if (metric === 'shear') return result.wall_shear_stress_pa;
  return Math.abs(result.flow_rate_ul_min);
}

function resultColor(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || max <= min) return '#55d6ce';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (t < 0.55) return new THREE.Color('#278f91').lerp(new THREE.Color('#55d6ce'), t / 0.55).getStyle();
  return new THREE.Color('#55d6ce').lerp(new THREE.Color('#e6b65f'), (t - 0.55) / 0.45).getStyle();
}

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function SegmentTube({ start, end, width, color, selected, occluded, onClick }: {
  start: Vec3;
  end: Vec3;
  width: number;
  color: string;
  selected: boolean;
  occluded: boolean;
  onClick: () => void;
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.LineCurve3(new THREE.Vector3(...start), new THREE.Vector3(...end));
    return new THREE.TubeGeometry(curve, 24, width, 8, false);
  }, [start, end, width]);
  return (
    <mesh
      geometry={geometry}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <meshStandardMaterial
        color={occluded ? '#b47f4e' : color}
        emissive={selected ? '#1d9f9f' : '#000000'}
        emissiveIntensity={selected ? 0.42 : 0}
        roughness={0.42}
        metalness={0.12}
        transparent={occluded}
        opacity={occluded ? 0.34 : 0.96}
      />
    </mesh>
  );
}

function NetworkScene({ network, result, selectedId, onSelect, metric }: {
  network: VascularNetwork;
  result: VascularSolveResult | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  metric: VascularColorMetric;
}) {
  const positions = useMemo(() => coordinates(network), [network]);
  const resultById = useMemo(() => new Map(result?.segments.map((segment) => [segment.segment_id, segment]) ?? []), [result]);
  const metricValues = result?.segments.map((segment) => metricValue(segment, metric)) ?? [];
  const metricMin = metric === 'pressure' ? Math.min(...metricValues) : 0;
  const metricMax = Math.max(...metricValues, metricMin);

  return (
    <>
      <color attach="background" args={['#08151b']} />
      <fog attach="fog" args={['#08151b', 16, 34]} />
      <ambientLight intensity={0.68} />
      <hemisphereLight args={['#b5dadd', '#10242b', 0.6]} />
      <directionalLight position={[5, 8, 7]} intensity={1.2} color="#d4eff0" />
      <directionalLight position={[-6, 3, -5]} intensity={0.55} color="#4ab8b0" />
      <gridHelper args={[22, 22, '#22434a', '#142b32']} position={[0, -4.9, 0]} />
      {network.segments.map((segment) => {
        const start = positions.get(segment.start_node_id);
        const end = positions.get(segment.end_node_id);
        if (!start || !end) return null;
        const solved = resultById.get(segment.segment_id);
        const baseColor = solved ? resultColor(metricValue(solved, metric), metricMin, metricMax) : '#50717b';
        const radiusScale = solved ? Math.max(0.12, Math.min(2.5, solved.radius_m / segment.radius_m)) : 1;
        return (
          <SegmentTube
            key={segment.segment_id}
            start={start}
            end={end}
            width={(vesselWidths[segment.vessel_class] ?? 0.065) * radiusScale}
            color={baseColor}
            selected={selectedId === segment.segment_id}
            occluded={!!solved?.occluded}
            onClick={() => onSelect(segment.segment_id)}
          />
        );
      })}
      {network.nodes.map((node) => {
        const position = positions.get(node.node_id);
        if (!position) return null;
        const color = node.role === 'inlet' ? '#63d7cc' : node.role === 'outlet' ? '#e5b45e' : '#9cb7bc';
        return (
          <mesh key={node.node_id} position={position}>
            <sphereGeometry args={[node.role === 'junction' ? 0.075 : 0.13, 16, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={node.role === 'junction' ? 0.05 : 0.24} roughness={0.4} />
          </mesh>
        );
      })}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={5} maxDistance={26} />
    </>
  );
}

export function VascularNetworkView({ network, result, selectedId, onSelect, metric }: {
  network: VascularNetwork;
  result: VascularSolveResult | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  metric: VascularColorMetric;
}) {
  const [hasWebgl] = useState(webglAvailable);
  const [contextLost, setContextLost] = useState(false);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvasElement) return;
    const handleLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    canvasElement.addEventListener('webglcontextlost', handleLost);
    return () => canvasElement.removeEventListener('webglcontextlost', handleLost);
  }, [canvasElement]);
  if (!hasWebgl || contextLost) {
    return (
      <div className="vascular-canvas" data-testid="vascular-network-visualization">
        <div className="vascular-webgl-fallback" role="status" data-testid="status-vascular-webgl-fallback">
          <MonitorX size={28} />
          <strong>{tr('nv.unavailable')}</strong>
          <span>{contextLost ? tr('nv.contextLost') : tr('av.noWebgl')}</span>
          <span>{tr('nv.remain')}</span>
          <button onClick={() => setContextLost(false)} data-testid="button-retry-vascular-webgl"><RotateCcw size={12} />{tr('nv.retry')}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="vascular-canvas" data-testid="vascular-network-visualization">
      <Canvas camera={{ position: [0, 5.8, 12], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'default' }}
        onCreated={({ gl, camera, size }) => {
          const aspect = Math.max(0.75, size.width / Math.max(size.height, 1));
          const distance = Math.max(5.5, 10.8 / (2 * Math.tan((38 * Math.PI / 180) / 2) * aspect));
          camera.position.set(0, distance * 0.35, distance * 0.937);
          camera.lookAt(0, 0, 0);
          setCanvasElement(gl.domElement);
        }}>
        <NetworkScene network={network} result={result} selectedId={selectedId} onSelect={onSelect} metric={metric} />
      </Canvas>
      <div className="vascular-viewport-caption">
        <span>{tr('nv.idealized')}</span>
        <span className="vascular-caption-divider" />
        <span>{tr('nv.orbit')}</span>
      </div>
    </div>
  );
}
