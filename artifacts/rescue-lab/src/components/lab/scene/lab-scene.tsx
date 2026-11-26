import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { RunVisualization } from '@workspace/api-client-react';
import type { Playback } from '@/lib/playback';
import { CHANNEL_SPACING, displayCount, visualRadius, type MethodFrames, type Scale, type ViewMode } from '@/lib/viz';
import { Apparatus } from './apparatus';
import { Channels } from './channels';

export interface SceneProps {
  vis: RunVisualization | null; mf: MethodFrames | undefined; pb: Playback; scale: Scale; mode: ViewMode;
  opacity: number; crossOn: boolean; crossPos: number; showLabels: boolean; showTracers: boolean;
  channelsTotal: number; radiusUm: number; selected: string | null; onSelect: (id: string | null) => void;
  resetSignal: number;
}

type Controls = { target: { set: (x: number, y: number, z: number) => void }; update: () => void };

export function LabScene(p: SceneProps) {
  const nTotal = p.vis?.geometry.channels ?? p.channelsTotal;
  const nDisp = displayCount(nTotal);
  const rv = visualRadius(p.vis?.geometry.radius_um ?? p.radiusUm);
  const width = (nDisp - 1) * CHANNEL_SPACING + 0.2;
  const controls = useRef<Controls | null>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const distance = Math.max(16, 22 / Math.max(0.4, size.width / size.height));
    camera.position.set(-1.2 + distance * 0.08, distance * 0.48, distance * 0.87);
    controls.current?.target.set(-1.2, 0, 0);
    camera.lookAt(-1.2, 0, 0);
    controls.current?.update();
  }, [camera, p.resetSignal, size.width, size.height]);

  return (
    <>
      <color attach="background" args={['#10243A']} />
      <fog attach="fog" args={['#071116', 30, 90]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#bfe9ee', '#0b1d24', 0.55]} />
      <directionalLight position={[6, 10, 6]} intensity={1.2} color="#f3f7f8" />
      <directionalLight position={[-8, 4, -6]} intensity={0.5} color="#7fd1d8" />
      <pointLight position={[0, 2.5, 0]} intensity={8} distance={9} color="#9fe6ec" />
      <gridHelper args={[40, 40, '#1d4a55', '#10262e']} position={[0, -0.26, 0]} />
      <Apparatus width={width} selected={p.selected} onSelect={p.onSelect} showLabels={p.showLabels} />
      <Channels vis={p.vis} mf={p.mf} pb={p.pb} scale={p.scale} mode={p.mode} opacity={p.opacity} crossOn={p.crossOn} crossPos={p.crossPos}
        nDisp={nDisp} nTotal={nTotal} rv={rv} showTracers={p.showTracers} selected={p.selected} onSelect={p.onSelect} showLabels={p.showLabels} />
      <OrbitControls ref={controls as never} makeDefault target={[-1.2, 0, 0]} enableDamping dampingFactor={0.08} minDistance={3} maxDistance={60} maxPolarAngle={Math.PI * 0.49} />
    </>
  );
}
