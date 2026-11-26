import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { cn } from '@/lib/utils';

export type Vec3 = [number, number, number];

/** DOM labels projected from the scene, without nested React roots in WebGL.
 * Drei Html uses a second React root whose synchronous cleanup can conflict
 * with React 19's commit phase when the event target changes.
 */
function ProjectedLabel({ position, text, className }: { position: Vec3; text: string; className: string }) {
  const group = useRef<THREE.Group>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const point = useMemo(() => new THREE.Vector3(), []);
  const { gl, camera, size } = useThree();
  useEffect(() => {
    const node = document.createElement('div');
    Object.assign(node.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', zIndex: '4' });
    gl.domElement.parentElement?.appendChild(node);
    element.current = node;
    return () => { element.current = null; node.remove(); };
  }, [gl]);
  useEffect(() => {
    if (element.current) {
      element.current.textContent = text;
      element.current.className = className;
    }
  }, [text, className]);
  useFrame(() => {
    if (!group.current || !element.current) return;
    group.current.getWorldPosition(point);
    point.project(camera);
    element.current.style.display = point.z > 1 || point.z < -1 ? 'none' : '';
    element.current.style.transform = `translate3d(${(point.x + 1) * size.width / 2}px,${(1 - point.y) * size.height / 2}px,0) translate(-50%,-50%)`;
  });
  return <group ref={group} position={position} />;
}

export function Pipe({ points, radius = 0.05, color = '#7fb8c2', opacity = 0.55, hot = false }: { points: Vec3[]; radius?: number; color?: string; opacity?: number; hot?: boolean }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.1);
    return new THREE.TubeGeometry(c, Math.max(24, points.length * 12), radius, 10, false);
  }, [points, radius]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.25} metalness={0.1} emissive={hot ? '#3fc1c9' : '#000000'} emissiveIntensity={hot ? 0.5 : 0} depthWrite={false} />
    </mesh>
  );
}

export function Glass({ hot, opacity = 0.16, color = '#bfe9ee' }: { hot?: boolean; opacity?: number; color?: string }) {
  return <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.08} metalness={0.05} emissive={hot ? '#3fc1c9' : '#000000'} emissiveIntensity={hot ? 0.35 : 0} depthWrite={false} side={THREE.DoubleSide} />;
}

export function Solid({ color, hot, metal = 0.6, rough = 0.35 }: { color: string; hot?: boolean; metal?: number; rough?: number }) {
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough} emissive={hot ? '#3fc1c9' : '#000000'} emissiveIntensity={hot ? 0.45 : 0} />;
}

export function Part({ id, selected, onSelect, label, labelPos, concept, showLabels, children }: {
  id: string; selected: string | null; onSelect: (id: string | null) => void; label: string; labelPos: Vec3;
  concept?: boolean; showLabels: boolean; children: ReactNode;
}) {
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(id); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      {children}
      {showLabels && (
        <ProjectedLabel position={labelPos} text={label} className={cn('lab-label', concept && 'concept', selected === id && 'sel')} />
      )}
    </group>
  );
}
