/**
 * The tracing engine: walks the ray dynamics and decomposes a pattern into its
 * closed strokes. Closure, no-revisit, and exactly-once coverage are theorems
 * of the model, so they are asserted on every trace; a violation here is an
 * implementation bug, never bad input.
 */
import { FLIP_X, FLIP_Y, type Grid } from './grid.js';

export interface TraceOutput {
  /** Number of strokes (closed curves). */
  count: number;
  /** Strokes as node-id polylines (closed; first node not repeated), or null. */
  strokes: number[][] | null;
  /** Two stroke-id slots per node (−1 = empty), or null. */
  nodePass: Int32Array | null;
}

export function traceGates(
  grid: Grid,
  gates: Uint8Array,
  mode: 'count' | 'strokes' | 'detail',
): TraceOutput {
  if (grid.stampGen >= 0x7ffffffe) {
    grid.segStamp.fill(0);
    grid.stampGen = 0;
  }
  const gen = ++grid.stampGen;
  const stamp = grid.segStamp;
  const { nbr, gateSite, nodeTypeX: typeX, nodeCount } = grid;
  const strokes: number[][] | null = mode === 'strokes' ? [] : null;
  const nodePass: Int32Array | null =
    mode === 'detail' ? new Int32Array(nodeCount * 2).fill(-1) : null;
  let count = 0;
  let covered = 0;
  for (let p = 0; p < nodeCount; p++) {
    for (let d0 = 0; d0 < 4; d0++) {
      const q0 = nbr[p * 4 + d0]!;
      if (q0 < 0) continue;
      const s0 = d0 < 2 ? p * 2 + d0 : q0 * 2 + (d0 === 2 ? 1 : 0);
      if (stamp[s0] === gen) continue;
      const poly: number[] | null = strokes ? [p] : null;
      let cur = p;
      let dir = d0;
      let steps = 0;
      for (;;) {
        const q = nbr[cur * 4 + dir]!;
        if (q < 0) throw new Error('muggula-prastaram internal invariant: ray left region');
        const s = dir < 2 ? cur * 2 + dir : q * 2 + (dir === 2 ? 1 : 0);
        if (stamp[s] === gen)
          throw new Error('muggula-prastaram internal invariant: segment revisited');
        stamp[s] = gen;
        covered++;
        const site = gateSite[q]!;
        if (site < 0 || gates[site] === 1) dir = typeX[q] ? FLIP_X[dir]! : FLIP_Y[dir]!;
        cur = q;
        if (nodePass) {
          if (nodePass[q * 2]! < 0) nodePass[q * 2] = count;
          else nodePass[q * 2 + 1] = count;
        }
        if (cur === p && dir === d0) break;
        if (poly) poly.push(q);
        if (++steps > grid.segCount)
          throw new Error('muggula-prastaram internal invariant: no closure');
      }
      count++;
      if (poly && strokes) strokes.push(poly);
    }
  }
  if (covered !== grid.segCount)
    throw new Error('muggula-prastaram internal invariant: segment coverage mismatch');
  return { count, strokes, nodePass };
}
