/**
 * Stroke geometry → SVG path data.
 *
 * A stroke is a closed polyline whose vertices turn 0° (crossing) or 90°
 * (bounce). The curvature knob t ∈ [0, 1] rounds every corner with a quadratic
 * Bézier: entry/exit points sit at fraction t/2 along each incident segment,
 * control point at the vertex. t = 0 is the angular kambi style; at t = 1 the
 * curve pieces meet at segment midpoints G1-continuously: the flowing sikku
 * style, where the bounces around an isolated dot fuse into a ring.
 */
import type { Stroke } from '@muggula-prastaram/core';

const EPS = 1e-9;

function fmt(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

/**
 * Path data for one closed stroke. `flipHeight` maps the core's y-up frame to
 * SVG's y-down screen frame (y ↦ flipHeight − y).
 */
export function strokePathData(stroke: Stroke, curvature: number, flipHeight: number): string {
  const f = Math.min(Math.max(curvature, 0), 1) / 2;
  const L = stroke.length;
  const X = (i: number) => stroke[((i % L) + L) % L]![0];
  const Y = (i: number) => flipHeight - stroke[((i % L) + L) % L]![1];
  // Entry point A(i) at fraction f from vertex i back toward vertex i−1;
  // exit point B(i) at fraction f toward vertex i+1.
  const ax = (i: number) => X(i) + (X(i - 1) - X(i)) * f;
  const ay = (i: number) => Y(i) + (Y(i - 1) - Y(i)) * f;
  const bx = (i: number) => X(i) + (X(i + 1) - X(i)) * f;
  const by = (i: number) => Y(i) + (Y(i + 1) - Y(i)) * f;

  let d = `M${fmt(ax(0))} ${fmt(ay(0))}`;
  for (let i = 0; i < L; i++) {
    if (f > EPS) d += `Q${fmt(X(i))} ${fmt(Y(i))} ${fmt(bx(i))} ${fmt(by(i))}`;
    if (Math.abs(bx(i) - ax(i + 1)) > EPS || Math.abs(by(i) - ay(i + 1)) > EPS)
      d += `L${fmt(ax(i + 1))} ${fmt(ay(i + 1))}`;
  }
  return d + 'Z';
}
