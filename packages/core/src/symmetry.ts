/**
 * Symmetry: the dihedral group acting on gate sites about the
 * region center. Square m=n grids and all diamonds admit full D4; other
 * rectangles admit D2 (180° rotation and the two axis mirrors).
 */
import { KEY_STRIDE, type Grid } from './grid.js';

export type SymElement = 'rot90' | 'rot180' | 'rot270' | 'refH' | 'refV' | 'refD' | 'refA';

/** Constraint classes exposed to generation, search, and enumeration. */
export type SymClass = 'none' | 'mirror' | 'C2' | 'C4' | 'D4';

/** A detected symmetry: the stabilizer elements and a human-readable name. */
export interface Symmetry {
  readonly elements: readonly SymElement[];
  readonly name: string;
}

const ALL_ELEMENTS: readonly SymElement[] = [
  'rot90', 'rot180', 'rot270', 'refH', 'refV', 'refD', 'refA',
];
const RECT_ELEMENTS: readonly SymElement[] = ['rot180', 'refH', 'refV'];

function geometric(
  elem: SymElement,
  w: number,
  h: number,
): (x: number, y: number) => readonly [number, number] {
  const cx = w / 2;
  const cy = h / 2;
  switch (elem) {
    case 'rot90':
      return (x, y) => [cx + cy - y, cy - cx + x];
    case 'rot180':
      return (x, y) => [w - x, h - y];
    case 'rot270':
      return (x, y) => [cx - cy + y, cy + cx - x];
    case 'refH': // reflection across the horizontal axis y = h/2
      return (x, y) => [x, h - y];
    case 'refV': // reflection across the vertical axis x = w/2
      return (x, y) => [w - x, y];
    case 'refD': // reflection across the main diagonal
      return (x, y) => [cx - cy + y, cy - cx + x];
    case 'refA': // reflection across the anti-diagonal
      return (x, y) => [cx + cy - y, cy + cx - x];
  }
}

/** Site permutation of a geometric map, or null if it doesn't preserve the region. */
function tryBuildPerm(grid: Grid, elem: SymElement): Int32Array | null {
  const [w, h] = grid.extent;
  const f = geometric(elem, w, h);
  const perm = new Int32Array(grid.sites);
  for (let k = 0; k < grid.sites; k++) {
    const node = grid.siteNode[k]!;
    const [x2, y2] = f(grid.nodeX[node]!, grid.nodeY[node]!);
    const id2 = grid.nodeIdAt.get(x2 * KEY_STRIDE + y2);
    const site2 = id2 === undefined ? -1 : grid.gateSite[id2]!;
    if (site2 < 0) return null;
    perm[k] = site2;
  }
  return perm;
}

const elementsCache = new WeakMap<Grid, readonly SymElement[]>();

/**
 * The symmetry elements this grid's shape admits. Square-shaped extents of the
 * built-in families admit full D4 and other rectangles D2; custom regions are
 * probed: each candidate map counts only if it actually preserves the region
 * (an L-shape may keep nothing but a diagonal mirror; a ring keeps all of D4).
 */
export function elementsFor(grid: Grid): readonly SymElement[] {
  const cached = elementsCache.get(grid);
  if (cached) return cached;
  const [w, h] = grid.extent;
  let elements: readonly SymElement[];
  if (grid.family.kind !== 'custom') {
    elements = w === h ? ALL_ELEMENTS : RECT_ELEMENTS;
  } else {
    const candidates = w === h ? ALL_ELEMENTS : RECT_ELEMENTS;
    elements = candidates.filter((e) => {
      const perm = tryBuildPerm(grid, e);
      if (perm) grid.permCache.set(e, perm);
      return perm !== null;
    });
  }
  elementsCache.set(grid, elements);
  return elements;
}

const MIRRORS: readonly SymElement[] = ['refH', 'refV', 'refD', 'refA'];

/**
 * The mirror the 'mirror' constraint class uses on this grid: the first
 * available in refH → refV → refD → refA priority order. On squares, diamonds,
 * and rectangles this is always refH; on custom regions it is whichever mirror
 * the region actually has (e.g. refD on an L-shape). The priority order is
 * part of the determinism contract for constrained generation.
 */
export function mirrorFor(grid: Grid): SymElement | null {
  const els = elementsFor(grid);
  return MIRRORS.find((m) => els.includes(m)) ?? null;
}

/** The constraint classes this grid's shape admits. */
export function symmetryClassesFor(grid: Grid): readonly SymClass[] {
  const els = elementsFor(grid);
  const classes: SymClass[] = ['none'];
  if (mirrorFor(grid) !== null) classes.push('mirror');
  if (els.includes('rot180')) classes.push('C2');
  if (els.includes('rot90')) classes.push('C4');
  // rot90 plus any mirror implies the axis mirrors (composition closure), so
  // requiring refH here is not a restriction.
  if (els.includes('rot90') && els.includes('refH')) classes.push('D4');
  return classes;
}

/**
 * The site permutation of a symmetry element: site k maps to the site at its
 * transformed position. Throws RangeError if the element is not a symmetry of
 * this grid's region.
 */
export function sitePermutation(grid: Grid, elem: SymElement): Int32Array {
  const cached = grid.permCache.get(elem);
  if (cached) return cached;
  if (!elementsFor(grid).includes(elem))
    throw new RangeError(`${elem} is not a symmetry of this grid`);
  const perm = tryBuildPerm(grid, elem);
  if (!perm)
    throw new Error('muggula-prastaram internal invariant: symmetry must preserve sites');
  grid.permCache.set(elem, perm);
  return perm;
}

/** @internal */
export function isInvariant(gates: Uint8Array, perm: Int32Array): boolean {
  for (let k = 0; k < gates.length; k++) if (gates[k] !== gates[perm[k]!]) return false;
  return true;
}

/** @internal Gate vector transformed by a site permutation. */
export function transformGates(gates: Uint8Array, perm: Int32Array): Uint8Array {
  const out = new Uint8Array(gates.length);
  for (let k = 0; k < gates.length; k++) out[perm[k]!] = gates[k]!;
  return out;
}

/** @internal Detect the stabilizer of a gate vector. */
export function detect(grid: Grid, gates: Uint8Array): Symmetry {
  const elements = elementsFor(grid).filter((e) =>
    isInvariant(gates, sitePermutation(grid, e)),
  );
  return { elements, name: classify(elements) };
}

function classify(els: readonly SymElement[]): string {
  const has = (e: SymElement) => els.includes(e);
  if (has('rot90')) return has('refH') || has('refD') ? 'D4' : 'C4';
  if (has('rot180')) {
    if (has('refH') && has('refV')) return 'D2';
    if (has('refD') && has('refA')) return 'D2 (diagonal)';
    return 'C2';
  }
  if (has('refH')) return 'mirror (horizontal)';
  if (has('refV')) return 'mirror (vertical)';
  if (has('refD') || has('refA')) return 'mirror (diagonal)';
  return 'none';
}

/** @internal Generator elements of a constraint class on this grid, or null if unavailable. */
function generatorsFor(grid: Grid, cls: Exclude<SymClass, 'none'>): readonly SymElement[] | null {
  const els = elementsFor(grid);
  switch (cls) {
    case 'mirror': {
      const m = mirrorFor(grid);
      return m === null ? null : [m];
    }
    case 'C2':
      return els.includes('rot180') ? ['rot180'] : null;
    case 'C4':
      return els.includes('rot90') ? ['rot90'] : null;
    case 'D4':
      return els.includes('rot90') && els.includes('refH') ? ['rot90', 'refH'] : null;
  }
}

/**
 * @internal Site orbits under a constraint class, sorted by minimum site.
 * For 'none' every site is its own orbit.
 */
export function orbitsFor(grid: Grid, cls: SymClass): number[][] {
  if (cls === 'none') return Array.from({ length: grid.sites }, (_, k) => [k]);
  const generators = generatorsFor(grid, cls);
  if (generators === null)
    throw new RangeError(`${cls} symmetry is not available on this grid`);
  const gens = generators.map((e) => sitePermutation(grid, e));
  const parent = Array.from({ length: grid.sites }, (_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]!]!;
    return a;
  };
  for (const perm of gens)
    for (let k = 0; k < grid.sites; k++) {
      const a = find(k);
      const b = find(perm[k]!);
      if (a !== b) parent[a] = b;
    }
  const groups = new Map<number, number[]>();
  for (let k = 0; k < grid.sites; k++) {
    const r = find(k);
    const g = groups.get(r);
    if (g) g.push(k);
    else groups.set(r, [k]);
  }
  return [...groups.values()]
    .map((g) => g.sort((a, b) => a - b))
    .sort((a, b) => a[0]! - b[0]!);
}
