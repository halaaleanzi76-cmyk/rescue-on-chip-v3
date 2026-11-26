import { Component, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Expand, Focus, Minimize, MonitorX, RotateCcw } from 'lucide-react';
import type { VascularNetwork, VascularSolveResult } from '@workspace/api-client-react';
import type { VascularColorMetric } from './vascular-network-view';
import './anatomical-vascular-view.css';
import { tr } from '@/lib/i18n';

type Vec3 = [number, number, number];
type VesselClass = VascularNetwork['segments'][number]['vessel_class'];

const classColor: Record<VesselClass, string> = {
  artery: '#d77972',
  arteriole: '#ce8d78',
  capillary: '#63c5bd',
  venule: '#719eae',
  vein: '#5e9ba7',
};

const displayRadius: Record<VesselClass, number> = {
  artery: 0.16,
  arteriole: 0.105,
  capillary: 0.052,
  venule: 0.085,
  vein: 0.14,
};

const classLabel: Record<VesselClass, string> = {
  get artery() { return tr('vcT.artery'); },
  get arteriole() { return tr('vcT.arteriole'); },
  get capillary() { return tr('vcT.capillary'); },
  get venule() { return tr('vcT.venule'); },
  get vein() { return tr('vcT.vein'); },
};

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function fitPositions(network: VascularNetwork) {
  const points = network.nodes.map((node) => node.position_m);
  if (!points.length) return new Map<string, Vec3>();
  const minX = Math.min(...points.map((point) => point[0]));
  const maxX = Math.max(...points.map((point) => point[0]));
  const minY = Math.min(...points.map((point) => point[1]));
  const maxY = Math.max(...points.map((point) => point[1]));
  const minZ = Math.min(...points.map((point) => point[2]));
  const maxZ = Math.max(...points.map((point) => point[2]));
  const spanX = Math.max(maxX - minX, 1e-8);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const fallback = new Map(network.nodes.map((node) => [
    node.node_id,
    [
      ((node.position_m[0] - centerX) / spanX) * 11.2,
      ((node.position_m[1] - centerY) / spanX) * 8.5,
      ((node.position_m[2] - centerZ) / spanX) * 8.5,
    ] as Vec3,
  ]));
  const capillaryColumn = (nodeId: string, prefix: 'cap_u' | 'cap_l') => {
    const match = nodeId.match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) return null;
    const column = Number(match[1]);
    const x = -1.5 + column;
    const rowY = prefix === 'cap_u' ? 1.42 : -1.42;
    const depth = ((column % 2) * 2 - 1) * 0.18 * (prefix === 'cap_u' ? 1 : -1);
    return [x, rowY, depth] as Vec3;
  };
  const displayLayout: Record<string, Vec3> = {
    inlet: [-5.6, 0, 0],
    arterial_split: [-4.15, 0, 0],
    arteriole_upper: [-2.75, 1.42, 0.08],
    arteriole_lower: [-2.75, -1.42, -0.08],
    venous_join: [3.9, 0, 0],
    outlet: [5.6, 0, 0],
  };
  return new Map(network.nodes.map((node) => [
    node.node_id,
    displayLayout[node.node_id]
      ?? capillaryColumn(node.node_id, 'cap_u')
      ?? capillaryColumn(node.node_id, 'cap_l')
      ?? fallback.get(node.node_id)!,
  ]));
}

function hashId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeCenterline(start: Vec3, end: Vec3, id: string, amount: number, depthBias = 0) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const perpendicular = new THREE.Vector3(-delta.y, delta.x, 0).normalize();
  if (perpendicular.lengthSq() < 0.01) perpendicular.set(0, 1, 0);
  const sign = hashId(id) % 2 === 0 ? 1 : -1;
  const bend = Math.min(amount, delta.length() * 0.12) * sign;
  const depth = new THREE.Vector3(0, 0, depthBias);
  const p1 = a.clone().lerp(b, 0.28).addScaledVector(perpendicular, bend).add(depth);
  const p2 = a.clone().lerp(b, 0.72).addScaledVector(perpendicular, bend * 0.55).addScaledVector(depth, 0.55);
  return new THREE.CatmullRomCurve3([a, p1, p2, b], false, 'centripetal');
}

function metricValue(segment: NonNullable<VascularSolveResult['segments'][number]>, metric: VascularColorMetric) {
  if (metric === 'pressure') return (segment.pressure_start_pa + segment.pressure_end_pa) / 2;
  if (metric === 'shear') return segment.wall_shear_stress_pa;
  return Math.abs(segment.flow_rate_ul_min);
}

function interpolateMetric(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || max <= min) return '#72d8ce';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return new THREE.Color('#347c83').lerp(new THREE.Color('#68d7ce'), t * 0.65)
    .lerp(new THREE.Color('#e1b66d'), Math.max(0, (t - 0.65) / 0.35)).getStyle();
}

function VesselSegment({ segment, start, end, solved, metricColor, selected, onSelect }: {
  segment: VascularNetwork['segments'][number];
  start: Vec3;
  end: Vec3;
  solved: NonNullable<VascularSolveResult['segments'][number]> | undefined;
  metricColor?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const curve = useMemo(
    () => makeCenterline(start, end, segment.segment_id, segment.vessel_class === 'capillary' ? 0.18 : 0.12),
    [start, end, segment.segment_id, segment.vessel_class],
  );
  const radius = displayRadius[segment.vessel_class];
  const radiusScale = solved && Number.isFinite(solved.radius_m) && segment.radius_m > 0
    ? THREE.MathUtils.clamp(solved.radius_m / segment.radius_m, 0.4, 2.5)
    : 1;
  const layeredWall = segment.vessel_class === 'artery' || segment.vessel_class === 'vein';
  const geometries = useMemo(() => ({
    outerWall: layeredWall ? new THREE.TubeGeometry(curve, 32, radius * radiusScale * 1.44, 10, false) : null,
    media: layeredWall ? new THREE.TubeGeometry(curve, 32, radius * radiusScale * 1.19, 10, false) : null,
    vessel: new THREE.TubeGeometry(curve, 32, radius * radiusScale, 10, false),
    lumen: new THREE.TubeGeometry(curve, 32, radius * radiusScale * 0.64, 10, false),
    selection: selected ? new THREE.TubeGeometry(curve, 32, radius * radiusScale * 1.62, 10, false) : null,
  }), [curve, radius, radiusScale, layeredWall, selected]);
  const base = metricColor ?? classColor[segment.vessel_class];
  const vesselColor = solved?.occluded ? '#bd8c59' : base;
  return (
    <group
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
      userData={{ segmentId: segment.segment_id }}
    >
      {layeredWall && (
        <mesh geometry={geometries.outerWall!}>
          <meshStandardMaterial color={segment.vessel_class === 'artery' ? '#8e5559' : '#416d78'} roughness={0.72} transparent opacity={0.82} />
        </mesh>
      )}
      {layeredWall && (
        <mesh geometry={geometries.media!}>
          <meshStandardMaterial color={segment.vessel_class === 'artery' ? '#b86c69' : '#568a92'} roughness={0.5} />
        </mesh>
      )}
      <mesh geometry={geometries.vessel}>
        <meshStandardMaterial
          color={vesselColor}
          emissive={selected ? '#2bc6bb' : solved ? '#145d5c' : '#071a1c'}
          emissiveIntensity={selected ? 0.52 : solved ? 0.12 : 0.04}
          roughness={0.32}
          metalness={0.1}
          transparent
          opacity={0.97}
        />
      </mesh>
      <mesh geometry={geometries.lumen}>
        <meshStandardMaterial
          color={segment.vessel_class === 'capillary' ? '#d9b77f' : '#132e35'}
          emissive={segment.vessel_class === 'capillary' ? '#583f22' : '#081719'}
          emissiveIntensity={0.13}
          roughness={0.36}
          side={THREE.DoubleSide}
        />
      </mesh>
      {selected && geometries.selection && (
        <mesh geometry={geometries.selection}>
          <meshBasicMaterial color="#8cf1e6" transparent opacity={0.19} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function VisualCapillaryMesh({ network, positions }: { network: VascularNetwork; positions: Map<string, Vec3> }) {
  const geometry = useMemo(() => {
    const upper = Array.from({ length: 4 }, (_, index) => positions.get(`cap_u${index}`));
    const lower = Array.from({ length: 4 }, (_, index) => positions.get(`cap_l${index}`));
    if (upper.some((point) => !point) || lower.some((point) => !point)) return null;
    if (network.segments.filter((segment) => segment.vessel_class === 'capillary').length < 10) return null;

    const rows = 6;
    const subdivisionsPerInterval = 4;
    const columns = 3 * subdivisionsPerInterval;
    const grid: Vec3[][] = Array.from({ length: rows + 1 }, () => Array.from({ length: columns + 1 }, () => [0, 0, 0] as Vec3));
    for (let column = 0; column <= columns; column += 1) {
      const interval = Math.min(2, Math.floor(column / subdivisionsPerInterval));
      const fraction = column === columns ? 1 : (column % subdivisionsPerInterval) / subdivisionsPerInterval;
      const upperPoint = new THREE.Vector3(...upper[interval]!).lerp(new THREE.Vector3(...upper[interval + 1]!), fraction);
      const lowerPoint = new THREE.Vector3(...lower[interval]!).lerp(new THREE.Vector3(...lower[interval + 1]!), fraction);
      for (let row = 0; row <= rows; row += 1) {
        const point = upperPoint.clone().lerp(lowerPoint, row / rows);
        const graphAnchor = column % subdivisionsPerInterval === 0 && (row === 0 || row === rows);
        if (!graphAnchor) {
          point.x += Math.sin(column * 0.31 + row * 1.17) * 0.045;
          point.y += Math.cos(column * 0.83 + row * 0.39) * 0.055;
          point.z += Math.sin(column * 0.77 + row * 1.21) * 0.28;
        }
        grid[row][column] = [point.x, point.y, point.z];
      }
    }

    const edges: { start: Vec3; end: Vec3; id: string }[] = [];
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        edges.push({ start: grid[row][column], end: grid[row][column + 1], id: `visual-capillary-row-${row}-${column}` });
      }
    }
    for (let column = 0; column <= columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        edges.push({ start: grid[row][column], end: grid[row + 1][column], id: `visual-capillary-column-${column}-${row}` });
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const forward = (row + column) % 2 === 0;
        edges.push({
          start: grid[row][column + (forward ? 0 : 1)],
          end: grid[row + 1][column + (forward ? 1 : 0)],
          id: `visual-capillary-link-${row}-${column}`,
        });
      }
    }
    const tubes = edges.map(({ start, end, id }) => {
      const curve = makeCenterline(start, end, id, 0.11);
      return new THREE.TubeGeometry(curve, 10, 0.012, 5, false);
    });
    const merged = mergeGeometries(tubes, false);
    tubes.forEach((tube) => tube.dispose());
    return merged;
  }, [network.segments, positions]);
  return (
    <group>
      {geometry && (
        <mesh geometry={geometry} renderOrder={1} raycast={() => null}>
          <meshStandardMaterial color="#8d9f9a" transparent opacity={0.3} roughness={0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function TissueContext() {
  return (
    <group>
      <mesh position={[0, 0, -1.05]} scale={[5.8, 2.5, 0.28]}>
        <sphereGeometry args={[1, 32, 18]} />
        <meshStandardMaterial color="#164044" transparent opacity={0.13} roughness={1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.87]} scale={[5.2, 2.1, 0.035]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color="#477875" wireframe transparent opacity={0.11} />
      </mesh>
    </group>
  );
}

function NetworkScene({ network, result, selectedId, onSelect, metric, cells, cameraMode, controlsRef }: {
  network: VascularNetwork;
  result: VascularSolveResult | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  metric: VascularColorMetric;
  cells: boolean;
  cameraMode: 'overview' | 'lumen';
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>;
}) {
  const positions = useMemo(() => fitPositions(network), [network]);
  const junctionRadii = useMemo(() => {
    const largestByNode = new Map<string, number>();
    network.segments.forEach((segment) => {
      const radius = displayRadius[segment.vessel_class];
      largestByNode.set(segment.start_node_id, Math.max(largestByNode.get(segment.start_node_id) ?? 0, radius));
      largestByNode.set(segment.end_node_id, Math.max(largestByNode.get(segment.end_node_id) ?? 0, radius));
    });
    return largestByNode;
  }, [network.segments]);
  const resultById = useMemo(() => new Map(result?.segments.map((segment) => [segment.segment_id, segment]) ?? []), [result]);
  const metricValues = useMemo(() => [...resultById.values()].map((segment) => metricValue(segment, metric)), [resultById, metric]);
  const range = useMemo(() => ({
    min: metric === 'pressure' && metricValues.length ? Math.min(...metricValues) : 0,
    max: metricValues.length ? Math.max(...metricValues) : 0,
  }), [metric, metricValues]);
  const selectedSegment = network.segments.find((segment) => segment.segment_id === selectedId);
  const selectedCenter = selectedSegment ? positions.get(selectedSegment.start_node_id) : undefined;
  const selectedEnd = selectedSegment ? positions.get(selectedSegment.end_node_id) : undefined;
  const { camera } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (cameraMode === 'lumen' && selectedCenter && selectedEnd) {
      const start = new THREE.Vector3(...selectedCenter);
      const end = new THREE.Vector3(...selectedEnd);
      const direction = end.clone().sub(start).normalize();
      const length = start.distanceTo(end);
      const centerlinePoint = start.clone().lerp(end, 0.38);
      const lookDistance = Math.max(0.035, Math.min(length * 0.58, 0.85));
      camera.up.set(0, 1, 0);
      camera.position.copy(centerlinePoint);
      controls.target.copy(centerlinePoint).addScaledVector(direction, lookDistance);
      controls.minDistance = 0.015;
      controls.maxDistance = 5.5;
    } else {
      camera.up.set(0, 1, 0);
      camera.position.set(0, 5.3, 13.8);
      controls.target.set(0, 0, 0);
      controls.minDistance = 5;
      controls.maxDistance = 25;
    }
    controls.update();
  }, [camera, cameraMode, controlsRef, selectedCenter, selectedEnd]);

  return (
    <>
      <color attach="background" args={['#10243A']} />
      <fog attach="fog" args={['#08151b', 18, 34]} />
      <ambientLight intensity={0.76} />
      <hemisphereLight args={['#b7d9d8', '#0b242a', 0.64]} />
      <directionalLight position={[4, 7, 8]} intensity={1.18} color="#d8eeee" />
      <directionalLight position={[-7, 3, -4]} intensity={0.55} color="#54b7ae" />
      <TissueContext />
      <VisualCapillaryMesh network={network} positions={positions} />
      {network.segments.map((segment) => {
        const start = positions.get(segment.start_node_id);
        const end = positions.get(segment.end_node_id);
        if (!start || !end) return null;
        const solved = resultById.get(segment.segment_id);
        const color = solved && !solved.occluded ? interpolateMetric(metricValue(solved, metric), range.min, range.max) : undefined;
        return (
          <VesselSegment
            key={segment.segment_id}
            segment={segment}
            start={start}
            end={end}
            solved={solved}
            metricColor={color}
            selected={selectedId === segment.segment_id}
            onSelect={() => onSelect(segment.segment_id)}
          />
        );
      })}
      {network.nodes.map((node) => {
        const position = positions.get(node.node_id);
        if (!position) return null;
        const radius = (junctionRadii.get(node.node_id) ?? 0.045) * 0.88;
        return (
          <mesh key={`junction-${node.node_id}`} position={position} raycast={() => null}>
            <sphereGeometry args={[radius, 14, 10]} />
            <meshStandardMaterial color="#688d8c" roughness={0.48} metalness={0.08} />
          </mesh>
        );
      })}
      {cells && <ConceptCells positions={positions} />}
      <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} minDistance={5} maxDistance={25} enablePan />
    </>
  );
}

function ConceptCells({ positions }: { positions: Map<string, Vec3> }) {
  const centers = useMemo(() => {
    const capillaryPoints = [...positions.entries()].filter(([id]) => id.startsWith('cap_')).map(([, position]) => position);
    if (!capillaryPoints.length) return [];
    const minX = Math.min(...capillaryPoints.map((point) => point[0]));
    const maxX = Math.max(...capillaryPoints.map((point) => point[0]));
    const minY = Math.min(...capillaryPoints.map((point) => point[1]));
    const maxY = Math.max(...capillaryPoints.map((point) => point[1]));
    return Array.from({ length: 12 }, (_, index) => {
      const col = index % 6;
      const row = Math.floor(index / 6);
      return [
        minX + (maxX - minX) * (0.08 + col * 0.17),
        minY + (maxY - minY) * (0.18 + row * 0.64),
        0.35 + ((index * 7) % 5) * 0.045,
      ] as Vec3;
    });
  }, [positions]);
  return (
    <group>
      {centers.map((position, index) => (
        <mesh key={index} position={position} rotation={[0.12, 0.2, (index % 4) * 0.42]} scale={[0.15, 0.075, 0.055]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#d8ad79" transparent opacity={0.22} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

class RendererBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { message: string | null }> {
  state = { message: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : tr('av.rendererFailed') };
  }
  render() {
    if (this.state.message) {
      return <Fallback message={tr('av.rendererStopped', { msg: this.state.message })} onRetry={() => { this.setState({ message: null }); this.props.onRetry(); }} />;
    }
    return this.props.children;
  }
}

function Fallback({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="anatomical-fallback" role="status" data-testid="status-anatomical-webgl-fallback">
      <MonitorX size={26} />
      <strong>{tr('av.unavailable')}</strong>
      <span>{message}</span>
      <span>{tr('av.unchanged')}</span>
      {onRetry && <button type="button" onClick={onRetry} data-testid="button-anatomical-webgl-retry"><RotateCcw size={13} />{tr('av.retry')}</button>}
    </div>
  );
}

function CrossSection({ vesselClass }: { vesselClass: VesselClass | null }) {
  const activeClass = vesselClass;
  if (!activeClass) {
    return (
      <section className="anatomical-cross-section" aria-label={tr('av.sectionAria')} data-testid="anatomical-cross-section">
        <div className="anatomical-cross-head">
          <span className="anatomical-eyebrow">{tr('av.cutaway')}</span>
          <span>{tr('av.selectSegment')}</span>
        </div>
        <div className="anatomical-section-empty">{tr('av.chooseVessel')}</div>
        <p>{tr('av.sectionNote')}</p>
      </section>
    );
  }
  const capillary = activeClass === 'capillary';
  const arteryVein = activeClass === 'artery' || activeClass === 'vein';
  return (
    <section className="anatomical-cross-section" aria-label={tr('av.sectionAria')} data-testid="anatomical-cross-section">
      <div className="anatomical-cross-head">
        <span className="anatomical-eyebrow">{tr('av.cutaway')}</span>
        <span>{vesselClass ? classLabel[vesselClass] : tr('av.selectSegment')}</span>
      </div>
      <div className={`anatomical-section-art ${capillary ? 'is-capillary' : arteryVein ? 'is-large-vessel' : 'is-small-vessel'}`} aria-hidden="true">
        <div className="anatomical-section-ring">
          <div className="anatomical-section-inner">
            {capillary && <span className="anatomical-endothelial-mark" />}
          </div>
        </div>
      </div>
      <div className="anatomical-layer-list">
        {capillary ? (
          <>
            <span><i className="layer-endothelium" />{tr('av.endothelium')}</span>
            <span><i className="layer-lumen" />{tr('av.lumen')}</span>
          </>
        ) : arteryVein ? (
          <>
            <span><i className="layer-adventitia" />{tr('av.outer')}</span>
            <span><i className="layer-media" />{tr('av.media')}</span>
            <span><i className="layer-lumen" />{tr('av.lumen')}</span>
          </>
        ) : (
          <>
            <span><i className="layer-endothelium" />{tr('av.endothelium')}</span>
            <span><i className="layer-lumen" />{tr('av.lumen')}</span>
          </>
        )}
      </div>
      <p>{tr('av.sectionNote')}</p>
    </section>
  );
}

export interface AnatomicalVascularViewProps {
  network: VascularNetwork;
  result: VascularSolveResult | null;
  selectedId: string | null;
  onSelect: (segmentId: string) => void;
  metric?: VascularColorMetric;
}

export function AnatomicalVascularView({ network, result, selectedId, onSelect, metric = 'flow' }: AnatomicalVascularViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [hasWebgl, setHasWebgl] = useState(webglAvailable);
  const [contextLost, setContextLost] = useState(false);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [generation, setGeneration] = useState(0);
  const [showCells, setShowCells] = useState(false);
  const [lumenMode, setLumenMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const selectedSegment = useMemo(
    () => network.segments.find((segment) => segment.segment_id === selectedId) ?? null,
    [network.segments, selectedId],
  );

  useEffect(() => {
    if (!canvasElement) return;
    const handleLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    canvasElement.addEventListener('webglcontextlost', handleLost);
    return () => canvasElement.removeEventListener('webglcontextlost', handleLost);
  }, [canvasElement]);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    document.body.style.cursor = '';
    return () => { document.body.style.cursor = ''; };
  }, []);

  const resetCamera = useCallback(() => {
    setLumenMode(false);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.object.position.set(0, 5.3, 13.8);
      controls.minDistance = 5;
      controls.maxDistance = 25;
      controls.update();
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement === rootRef.current) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      setFullscreen(false);
    }
  }, []);

  const retryRenderer = useCallback(() => {
    const available = webglAvailable();
    setHasWebgl(available);
    setContextLost(false);
    if (available) setGeneration((current) => current + 1);
  }, []);

  const solvedCount = useMemo(() => {
    const ids = new Set(result?.segments.map((segment) => segment.segment_id) ?? []);
    return network.segments.filter((segment) => ids.has(segment.segment_id)).length;
  }, [network.segments, result]);

  return (
    <div className="anatomical-vascular-view theme-instrument" ref={rootRef} data-testid="anatomical-vascular-view">
      <div className="anatomical-viewport">
        {!hasWebgl || contextLost ? (
          <Fallback
            message={contextLost ? tr('av.contextLost') : tr('av.noWebgl')}
            onRetry={retryRenderer}
          />
        ) : (
          <RendererBoundary onRetry={retryRenderer}>
            <Canvas
              key={generation}
              data-testid="canvas-anatomical-vascular"
              camera={{ position: [0, 5.3, 13.8], fov: 39, near: 0.1, far: 80 }}
              dpr={[1, 1.5]}
              gl={{ antialias: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
              onCreated={({ gl, camera, size }) => {
                const distance = Math.max(12, 13.8 / Math.max(0.55, size.width / Math.max(size.height, 1)));
                camera.position.set(0, distance * 0.38, distance);
                camera.lookAt(0, 0, 0);
                setCanvasElement(gl.domElement);
              }}
              onPointerMissed={() => setLumenMode(false)}
            >
              <NetworkScene
                network={network}
                result={result}
                selectedId={selectedId}
                onSelect={(id) => { onSelect(id); setLumenMode(false); }}
                metric={metric}
                cells={showCells}
                cameraMode={lumenMode ? 'lumen' : 'overview'}
                controlsRef={controlsRef}
              />
            </Canvas>
          </RendererBoundary>
        )}
        <div className="anatomical-viewport-topline">
          <div className="anatomical-view-badge"><span className="anatomical-live-dot" />{tr('av.badge')}</div>
          <div className="anatomical-action-cluster">
            <button
              type="button"
              onClick={() => { setLumenMode((current) => !current); }}
              disabled={!selectedSegment || !hasWebgl || contextLost}
              aria-pressed={lumenMode}
              data-testid="button-anatomical-lumen"
            >
              <Focus size={13} />{lumenMode ? tr('av.exitLumen') : tr('av.enterLumen')}
            </button>
            <button type="button" onClick={resetCamera} data-testid="button-anatomical-reset-camera" aria-label={tr('av.resetCamera')}>
              <RotateCcw size={13} /><span className="anatomical-button-label">{tr('av.reset')}</span>
            </button>
            <button type="button" onClick={toggleFullscreen} data-testid="button-anatomical-fullscreen" aria-label={fullscreen ? tr('av.exitFull') : tr('av.enterFull')}>
              {fullscreen ? <Minimize size={13} /> : <Expand size={13} />}<span className="anatomical-button-label">{fullscreen ? tr('av.exit') : tr('av.full')}</span>
            </button>
          </div>
        </div>
        <div className="anatomical-viewport-bottom">
          <span>{lumenMode ? tr('av.closeView') : tr('av.orbitHint')}</span>
          <span className="anatomical-bottom-divider" />
          <label className="anatomical-cell-toggle">
            <input type="checkbox" checked={showCells} onChange={(event) => setShowCells(event.target.checked)} data-testid="toggle-anatomical-cells" />
            <span className="anatomical-switch" />
            <span>{tr('av.cells')}</span>
          </label>
        </div>
        {lumenMode && <div className="anatomical-lumen-notice" role="status" data-testid="status-anatomical-lumen">{tr('av.lumenNotice')}</div>}
      </div>
      <div className="anatomical-info-rail">
        <div className="anatomical-pathway" aria-label={tr('av.pathwayAria')}>
          {(['artery', 'arteriole', 'capillary', 'venule', 'vein'] as const).map((vesselClass, index) => (
            <div className="anatomical-path-step" key={vesselClass}>
              <span className="anatomical-path-dot" style={{ background: classColor[vesselClass] }} />
              <span>{classLabel[vesselClass]}</span>
              {index < 4 && <i aria-hidden="true" className="rtl:-scale-x-100 inline-block">›</i>}
            </div>
          ))}
        </div>
        <div className="anatomical-info-grid">
          <div className="anatomical-selection-summary" data-testid="anatomical-selected-segment">
            <span className="anatomical-eyebrow">{tr('av.connection')}</span>
            {selectedSegment ? (
              <>
                <strong dir="ltr">{selectedSegment.segment_id}</strong>
                <span>{tr('av.selectableSeg', { cls: classLabel[selectedSegment.vessel_class] })}</span>
              </>
            ) : (
              <>
                <strong>{tr('av.noSegment')}</strong>
                <span>{tr('av.selectToConnect')}</span>
              </>
            )}
          </div>
          <CrossSection vesselClass={selectedSegment?.vessel_class ?? null} />
        </div>
        <div className="anatomical-legend" aria-label={tr('av.legendAria')}>
          <div className="anatomical-legend-item"><i className="anatomical-legend-line solved-line" />{tr('av.graphSegments')}{result ? tr('av.withData', { n: solvedCount }) : tr('av.selectable')}</div>
          <div className="anatomical-legend-item"><i className="anatomical-legend-line detail-line" />{tr('av.visualOnly')}</div>
          <p>{tr('av.legendNote1')} <code>segment_id</code>{tr('av.legendNote2')}</p>
        </div>
      </div>
    </div>
  );
}

export default AnatomicalVascularView;
