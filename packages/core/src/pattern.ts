/**
 * A pattern: one point of a grid's prastāra. Immutable; all derived data
 * (index, strokes, symmetry) is computed on demand and cached.
 */
import type { Grid, Point } from './grid.js';
import { traceGates } from './trace.js';
import {
  detect,
  sitePermutation,
  transformGates,
  type SymElement,
  type Symmetry,
} from './symmetry.js';
import { randomGates, searchGates, type RandomOptions, type SearchOptions } from './search.js';

/** A closed stroke: node points in doubled coordinates; the first point is not repeated. */
export type Stroke = readonly Point[];

export interface SearchResult {
  pattern: Pattern;
  /** The stroke count actually reached; equals the target unless unsatisfied. */
  achieved: number;
}

export class Pattern {
  private cachedCount: number;
  private cachedIndex: bigint | null = null;
  private cachedStrokes: Stroke[] | null = null;
  private cachedSym: Symmetry | null = null;

  private constructor(
    readonly grid: Grid,
    private readonly bits: Uint8Array,
    knownCount = -1,
  ) {
    this.cachedCount = knownCount;
  }

  /** @internal Takes ownership of `bits`. */
  static _fromGates(grid: Grid, bits: Uint8Array, knownCount = -1): Pattern {
    return new Pattern(grid, bits, knownCount);
  }

  /** naṣṭa: index → pattern. Indices run from 1 to count(), Piṅgala's convention. */
  static decode(grid: Grid, index: bigint): Pattern {
    if (index < 1n || index > grid.count())
      throw new RangeError(`index must be in [1, ${grid.count()}]`);
    const bits = new Uint8Array(grid.sites);
    let x = index - 1n;
    for (let k = 0; k < grid.sites; k++) {
      bits[k] = Number(x & 1n);
      x >>= 1n;
    }
    const p = new Pattern(grid, bits);
    p.cachedIndex = index;
    return p;
  }

  /** A seeded random pattern, optionally symmetry-constrained. Deterministic per seed. */
  static random(grid: Grid, opts: RandomOptions): Pattern {
    return new Pattern(grid, randomGates(grid, opts));
  }

  /** Search for a pattern with the target stroke count. */
  static search(grid: Grid, opts: SearchOptions): SearchResult {
    const { gates, achieved } = searchGates(grid, opts);
    return { pattern: new Pattern(grid, gates, achieved), achieved };
  }

  /** uddiṣṭa: pattern → index, one plus the sum of the gate place values. */
  encode(): bigint {
    if (this.cachedIndex === null) {
      let x = 0n;
      for (let k = this.grid.sites - 1; k >= 0; k--)
        x = (x << 1n) | BigInt(this.bits[k]!);
      this.cachedIndex = x + 1n;
    }
    return this.cachedIndex;
  }

  /** Whether the gate at a site is present. */
  gate(site: number): boolean {
    this.checkSite(site);
    return this.bits[site] === 1;
  }

  /** The pattern with one gate toggled: the editor's primitive. */
  toggle(site: number): Pattern {
    this.checkSite(site);
    const next = this.bits.slice();
    next[site]! ^= 1;
    return new Pattern(this.grid, next);
  }

  strokeCount(): number {
    if (this.cachedCount < 0)
      this.cachedCount = traceGates(this.grid, this.bits, 'count').count;
    return this.cachedCount;
  }

  /** The closed strokes, in canonical (deterministic) order. */
  trace(): readonly Stroke[] {
    if (!this.cachedStrokes) {
      const { count, strokes } = traceGates(this.grid, this.bits, 'strokes');
      this.cachedCount = count;
      this.cachedStrokes = strokes!.map((poly) =>
        poly.map((id) => [this.grid.nodeX[id]!, this.grid.nodeY[id]!] as const),
      );
    }
    return this.cachedStrokes;
  }

  /** The pattern's stabilizer subgroup and its name (e.g. "C4", "mirror (horizontal)"). */
  symmetry(): Symmetry {
    if (!this.cachedSym) this.cachedSym = detect(this.grid, this.bits);
    return this.cachedSym;
  }

  /** The image of this pattern under a symmetry element of its grid. */
  transform(elem: SymElement): Pattern {
    return new Pattern(
      this.grid,
      transformGates(this.bits, sitePermutation(this.grid, elem)),
    );
  }

  private checkSite(site: number): void {
    if (!Number.isInteger(site) || site < 0 || site >= this.grid.sites)
      throw new RangeError(`site must be an integer in [0, ${this.grid.sites})`);
  }
}
