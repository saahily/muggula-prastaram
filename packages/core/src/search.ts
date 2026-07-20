/**
 * Seeded random patterns and stroke-target search.
 *
 * The unconstrained search rests on the merge lemma: toggling a gate where two
 * different strokes pass always fuses them, so stroke count decreases by
 * exactly one per toggle. Constrained (symmetric) search toggles whole orbits
 * and hill-climbs with a small escape probability, tracking the best pattern
 * seen; if the target is unreachable it honestly returns the nearest achieved.
 */
import type { Grid } from './grid.js';
import { traceGates } from './trace.js';
import { orbitsFor, type SymClass } from './symmetry.js';
import { createRng } from './rng.js';

export interface RandomOptions {
  seed: string;
  symmetry?: SymClass;
}

export interface SearchOptions {
  seed: string;
  /** Target stroke count; default 1 (sikku). */
  strokes?: number;
  symmetry?: SymClass;
  maxIterations?: number;
}

/** @internal */
export function randomGates(grid: Grid, opts: RandomOptions): Uint8Array {
  const rng = createRng(opts.seed);
  const gates = new Uint8Array(grid.sites);
  for (const orbit of orbitsFor(grid, opts.symmetry ?? 'none'))
    if (rng() < 0.5) for (const s of orbit) gates[s] = 1;
  return gates;
}

/** @internal */
export function searchGates(
  grid: Grid,
  opts: SearchOptions,
): { gates: Uint8Array; achieved: number } {
  const { seed, strokes: target = 1, symmetry = 'none', maxIterations = 512 } = opts;
  if (!Number.isInteger(target) || target < 1)
    throw new RangeError('strokes target must be a positive integer');
  const rng = createRng(seed);
  const orbits = orbitsFor(grid, symmetry);
  const siteOrbit = new Int32Array(grid.sites);
  orbits.forEach((orbit, oi) => {
    for (const s of orbit) siteOrbit[s] = oi;
  });
  const gates = new Uint8Array(grid.sites);
  for (const orbit of orbits) if (rng() < 0.5) for (const s of orbit) gates[s] = 1;
  const toggleOrbit = (oi: number) => {
    for (const s of orbits[oi]!) gates[s] ^= 1;
  };

  let detail = traceGates(grid, gates, 'detail');
  let bestGates = gates.slice();
  let bestCount = detail.count;

  for (let iter = 0; detail.count !== target && iter < maxIterations; iter++) {
    const wantMerge = detail.count > target;
    const pass = detail.nodePass!;
    // Candidate orbits: those containing a node whose two passages are from
    // different strokes (merge) or the same stroke (split).
    const seen = new Set<number>();
    const cand: number[] = [];
    for (let node = 0; node < grid.nodeCount; node++) {
      const site = grid.gateSite[node]!;
      if (site < 0) continue;
      const a = pass[node * 2]!;
      const b = pass[node * 2 + 1]!;
      if (a < 0 || b < 0) continue;
      if ((a !== b) === wantMerge) {
        const oi = siteOrbit[site]!;
        if (!seen.has(oi)) {
          seen.add(oi);
          cand.push(oi);
        }
      }
    }
    const pool = cand.length > 0 ? cand : orbits.map((_, i) => i);
    if (pool.length === 0) break; // S = 0: nothing to toggle
    const pick = pool[Math.floor(rng() * pool.length)]!;
    toggleOrbit(pick);
    const after = traceGates(grid, gates, 'detail');
    const accept =
      (symmetry === 'none' && wantMerge && cand.length > 0) || // guaranteed merge
      Math.abs(after.count - target) < Math.abs(detail.count - target) ||
      rng() < 0.2; // escape plateaus
    if (accept) {
      detail = after;
      if (Math.abs(detail.count - target) < Math.abs(bestCount - target)) {
        bestCount = detail.count;
        bestGates = gates.slice();
      }
    } else {
      toggleOrbit(pick);
    }
  }
  if (detail.count === target) {
    bestCount = detail.count;
    bestGates = gates.slice();
  }
  return { gates: bestGates, achieved: bestCount };
}
