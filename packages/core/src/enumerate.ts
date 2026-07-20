/**
 * Lazy enumeration of a grid's prastāra.
 *
 * The full space is walked in ascending canonical index order via a binary
 * odometer over the gate vector (no bigint arithmetic in the loop). With a
 * symmetry filter, the walk covers the symmetric subspace (an odometer over
 * orbit bits) in family order, which is not global index order.
 */
import type { Grid } from './grid.js';
import { Pattern } from './pattern.js';
import { traceGates } from './trace.js';
import { orbitsFor, type SymClass } from './symmetry.js';

export interface EnumFilter {
  strokes?: number;
  symmetry?: SymClass;
}

export function* enumerate(grid: Grid, filter: EnumFilter = {}): Generator<Pattern, void, void> {
  const { strokes, symmetry = 'none' } = filter;
  const orbits = orbitsFor(grid, symmetry);
  const gates = new Uint8Array(grid.sites);
  for (;;) {
    let count = -1;
    if (
      strokes === undefined ||
      (count = traceGates(grid, gates, 'count').count) === strokes
    ) {
      yield Pattern._fromGates(grid, gates.slice(), count);
    }
    let o = 0;
    while (o < orbits.length && gates[orbits[o]![0]!] === 1) {
      for (const s of orbits[o]!) gates[s] = 0;
      o++;
    }
    if (o === orbits.length) return;
    for (const s of orbits[o]!) gates[s] = 1;
  }
}
