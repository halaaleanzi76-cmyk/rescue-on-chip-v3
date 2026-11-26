import { useEffect, useState } from 'react';

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
type Kind = 'tick' | 'control';

/**
 * Simulation clock. `t` is simulated seconds on the Python trace axis.
 * Advances only while playing, at `speed` simulated seconds per real second.
 */
export class Playback {
  t = 0; tMin = 0; tMax = 1; playing = false; speed = 1;
  private ls = new Set<(k: Kind) => void>();
  subscribe(fn: (k: Kind) => void) { this.ls.add(fn); return () => { this.ls.delete(fn); }; }
  private emit(k: Kind) { this.ls.forEach((f) => f(k)); }
  setRange(a: number, b: number, keepTime: boolean) {
    this.tMin = a; this.tMax = Math.max(b, a + 1e-6);
    this.t = keepTime ? Math.min(this.tMax, Math.max(this.tMin, this.t)) : a;
    this.emit('control');
  }
  play() { if (this.t >= this.tMax) this.t = this.tMin; this.playing = true; this.emit('control'); }
  pause() { this.playing = false; this.emit('control'); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  restart() { this.t = this.tMin; this.emit('control'); }
  seek(t: number) { this.t = Math.min(this.tMax, Math.max(this.tMin, t)); this.emit('control'); }
  setSpeed(s: number) { this.speed = s; this.emit('control'); }
  advance(dt: number) {
    if (!this.playing) return;
    this.t += dt * this.speed;
    if (this.t >= this.tMax) { this.t = this.tMax; this.playing = false; this.emit('control'); }
    else this.emit('tick');
  }
}

export function usePlaybackDriver(pb: Playback) {
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      // Preserve the selected simulated-seconds/real-second speed at low FPS.
      // Background tabs do not accrue a large unseen playback jump.
      const dt = Math.max(0, (now - last) / 1000); last = now;
      if (!document.hidden) pb.advance(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pb]);
}

export interface PlaybackSnap { t: number; playing: boolean; speed: number; tMin: number; tMax: number }
const snap = (pb: Playback): PlaybackSnap => ({ t: pb.t, playing: pb.playing, speed: pb.speed, tMin: pb.tMin, tMax: pb.tMax });

/** React view of the clock, throttled for ticks so charts do not re-render every frame. */
export function usePlaybackState(pb: Playback, ms = 100): PlaybackSnap {
  const [s, setS] = useState(() => snap(pb));
  useEffect(() => {
    let lastT = 0;
    setS(snap(pb));
    return pb.subscribe((k) => {
      const now = performance.now();
      if (k === 'control' || now - lastT >= ms) { lastT = now; setS(snap(pb)); }
    });
  }, [pb, ms]);
  return s;
}
