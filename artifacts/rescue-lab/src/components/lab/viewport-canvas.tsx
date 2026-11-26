import { Component, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { MonitorX, RotateCcw } from 'lucide-react';
import { LabScene, type SceneProps } from './scene/lab-scene';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export function WebGLFallback({ reason, onRetry }: { reason: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center lab-grid-bg bg-[#10243A] theme-instrument p-6" data-testid="status-webgl-fallback">
      <div className="max-w-md text-center">
        <MonitorX className="h-8 w-8 mx-auto text-[#e8b04a]" />
        <h3 className="mt-3 font-semibold">3D viewport unavailable</h3>
        <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          The interactive apparatus needs WebGL. All Python-computed values, the playback clock, graphs and cross-section profile
          in the side panels still work and remain synchronized. Nothing shown here is a static substitute for the 3D model.
        </p>
        {onRetry && (
          <button onClick={onRetry} data-testid="button-webgl-retry" className="mt-4 inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs hover:bg-secondary">
            <RotateCcw className="h-3.5 w-3.5" />Try to restore the viewport
          </button>
        )}
      </div>
    </div>
  );
}

class CanvasBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: e instanceof Error ? e.message : String(e) }; }
  render() {
    if (this.state.err) return <WebGLFallback reason={`The renderer stopped: ${this.state.err}`} onRetry={() => { this.setState({ err: null }); this.props.onRetry(); }} />;
    return this.props.children;
  }
}

export function ViewportCanvas(props: SceneProps & { cameraPos?: [number, number, number] }) {
  const [ok] = useState(webglAvailable);
  const [lost, setLost] = useState(false);
  const [gen, setGen] = useState(0);
  if (!ok) return <WebGLFallback reason="This browser or device did not provide a WebGL context (hardware acceleration may be disabled)." />;
  if (lost) return <WebGLFallback reason="The graphics context was lost (GPU reset or memory pressure)." onRetry={() => { setLost(false); setGen((g) => g + 1); }} />;
  return (
    <CanvasBoundary onRetry={() => setGen((g) => g + 1)}>
      <Canvas key={gen} dpr={[1, 1.5]} camera={{ position: props.cameraPos ?? [1.5, 6.2, 10.5], fov: 40, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
        onCreated={({ gl, camera, size }) => {
          // Fit the entire apparatus, not only the chip, in narrow and split views.
          const distance = Math.max(16, 22 / Math.max(0.4, size.width / size.height));
          camera.position.set(-1.2 + distance * 0.08, distance * 0.48, distance * 0.87);
          camera.lookAt(-1.2, 0, 0);
          gl.localClippingEnabled = true;
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setLost(true); });
        }}
        onPointerMissed={() => props.onSelect(null)}
        data-testid="canvas-3d">
        <LabScene {...props} />
      </Canvas>
    </CanvasBoundary>
  );
}
