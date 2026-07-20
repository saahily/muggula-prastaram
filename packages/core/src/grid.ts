/**
 * The grid model.
 *
 * Everything lives in doubled coordinates: dot (i, j) sits at (2i+1, 2j+1) and
 * owns the 2×2 cell [2i, 2i+2] × [2j, 2j+2]. Nodes, the points the curve
 * passes through, are the midpoints of cell edges, i.e. the lattice points
 * with odd coordinate sum. An x-type node (even x, odd y) reflects the ray's
 * horizontal direction when active; a y-type node (odd x, even y) reflects the
 * vertical. Interior nodes (both adjacent dots present) are the gate sites;
 * border nodes are always active.
 */

export type Family =
  | { readonly kind: 'square'; readonly m: number; readonly n: number }
  | { readonly kind: 'diamond'; readonly p: number }
  | {
      /**
       * Any dot region: stepped (1-3-3-1), concave, even with interior holes.
       * Must be orthogonally connected and pinch-free. Coordinates are
       * normalized (translated to the origin, sorted) on construction, so a
       * shape has one canonical form regardless of how its dots are listed.
       */
      readonly kind: 'custom';
      readonly dots: ReadonlyArray<readonly [number, number]>;
    };

/**
 * Dot coordinates for a centered row arrangement, e.g. dotsFromRows([1, 3, 3, 1])
 * for the śrīvatsa grid. The first entry is the top row. All row widths must
 * share parity so every row centers on the integer lattice.
 */
export function dotsFromRows(rows: readonly number[]): Array<[number, number]> {
  if (rows.length === 0 || rows.some((w) => !Number.isInteger(w) || w < 1))
    throw new RangeError('rows must be positive integers');
  const maxW = Math.max(...rows);
  if (rows.some((w) => (maxW - w) % 2 !== 0))
    throw new RangeError('all row widths must share parity so rows center on the lattice');
  const dots: Array<[number, number]> = [];
  rows.forEach((w, k) => {
    const y = rows.length - 1 - k;
    const x0 = (maxW - w) / 2;
    for (let i = 0; i < w; i++) dots.push([x0 + i, y]);
  });
  return dots;
}

/** A point in doubled coordinates (y up; rendering may transform freely). */
export type Point = readonly [number, number];

const MAX_DOTS = 16384;

/** @internal Coordinate-pair map key. Coordinates are < 2^20 under MAX_DOTS. */
export const KEY_STRIDE = 1 << 20;

/** @internal Direction index → step: 0=(+1,+1) 1=(+1,−1) 2=(−1,+1) 3=(−1,−1). */
export const FLIP_X = [2, 3, 0, 1] as const;
/** @internal */
export const FLIP_Y = [1, 0, 3, 2] as const;

export class Grid {
  readonly family: Family;
  /** Number of gate sites S; the pattern space is 2^S. */
  readonly sites: number;
  /** Dot centers in doubled coordinates. */
  readonly dots: readonly Point[];
  /** The region is [0, W] × [0, H] in doubled coordinates. */
  readonly extent: Point;
  /** Gate-site positions in canonical site order (the index-bit order). */
  readonly sitePositions: readonly Point[];

  /** @internal */ readonly nodeCount: number;
  /** @internal */ readonly nodeX: Int32Array;
  /** @internal */ readonly nodeY: Int32Array;
  /** @internal */ readonly nodeTypeX: Uint8Array;
  /** @internal */ readonly gateSite: Int32Array;
  /** @internal */ readonly siteNode: Int32Array;
  /** @internal */ readonly nbr: Int32Array;
  /** @internal */ readonly segCount: number;
  /** @internal */ readonly nodeIdAt: Map<number, number>;
  /** @internal */ readonly permCache = new Map<string, Int32Array>();
  /** @internal */ segStamp: Int32Array;
  /** @internal */ stampGen = 0;

  static of(family: Family): Grid {
    return new Grid(family);
  }

  /** saṅkhyā: the number of patterns on this grid, 2^S. */
  count(): bigint {
    return 1n << BigInt(this.sites);
  }

  private constructor(family: Family) {
    const dotCoords: Array<readonly [number, number]> = [];
    if (family.kind === 'square') {
      const { m, n } = family;
      if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < 1)
        throw new RangeError('square grid requires integers m >= 1 and n >= 1');
      if (m * n > MAX_DOTS)
        throw new RangeError(`grid too large: ${m * n} dots (max ${MAX_DOTS})`);
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) dotCoords.push([i, j]);
      this.extent = [2 * m, 2 * n];
      this.family = family;
    } else if (family.kind === 'diamond') {
      const { p } = family;
      if (!Number.isInteger(p) || p < 1)
        throw new RangeError('diamond grid requires an integer p >= 1');
      if (2 * p * p - 2 * p + 1 > MAX_DOTS)
        throw new RangeError(`grid too large: ${2 * p * p - 2 * p + 1} dots (max ${MAX_DOTS})`);
      const c = p - 1;
      for (let x = 0; x <= 2 * c; x++)
        for (let y = 0; y <= 2 * c; y++)
          if (Math.abs(x - c) + Math.abs(y - c) <= c) dotCoords.push([x, y]);
      this.extent = [4 * p - 2, 4 * p - 2];
      this.family = family;
    } else {
      const raw = family.dots;
      if (raw.length === 0) throw new RangeError('custom grid requires at least one dot');
      if (raw.length > MAX_DOTS)
        throw new RangeError(`grid too large: ${raw.length} dots (max ${MAX_DOTS})`);
      for (const [i, j] of raw)
        if (!Number.isInteger(i) || !Number.isInteger(j))
          throw new RangeError('custom grid dots must have integer coordinates');
      const minI = Math.min(...raw.map((d) => d[0]));
      const minJ = Math.min(...raw.map((d) => d[1]));
      const seen = new Set<number>();
      for (const [i, j] of raw) {
        const k = (i - minI) * KEY_STRIDE + (j - minJ);
        if (seen.has(k)) throw new RangeError(`duplicate dot (${i}, ${j})`);
        seen.add(k);
        dotCoords.push([i - minI, j - minJ]);
      }
      dotCoords.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const maxI = Math.max(...dotCoords.map((d) => d[0]));
      const maxJ = Math.max(...dotCoords.map((d) => d[1]));
      this.extent = [2 * maxI + 2, 2 * maxJ + 2];
      this.family = { kind: 'custom', dots: dotCoords };
    }

    // Dot membership. Keys are shifted by +1 so neighbor probes at −1 stay non-negative.
    const dotKey = (i: number, j: number) => (i + 1) * KEY_STRIDE + (j + 1);
    const dotSet = new Set<number>();
    for (const [i, j] of dotCoords) dotSet.add(dotKey(i, j));

    // Custom regions must be orthogonally connected: a "muggu" that is several
    // separate muggus is out of contract, and the sikku search presupposes it.
    if (family.kind === 'custom') {
      const queue = [dotCoords[0]!];
      const reached = new Set<number>([dotKey(dotCoords[0]![0], dotCoords[0]![1])]);
      while (queue.length) {
        const [i, j] = queue.pop()!;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const k = dotKey(i + di, j + dj);
          if (dotSet.has(k) && !reached.has(k)) {
            reached.add(k);
            queue.push([i + di, j + dj]);
          }
        }
      }
      if (reached.size !== dotCoords.length)
        throw new RangeError('custom grid must be orthogonally connected');
    }

    // Pinch-free validation: no two cells may meet only at a corner.
    const pinched = (a: number, b: number): boolean => {
      const d00 = dotSet.has(dotKey(a - 1, b - 1));
      const d10 = dotSet.has(dotKey(a, b - 1));
      const d01 = dotSet.has(dotKey(a - 1, b));
      const d11 = dotSet.has(dotKey(a, b));
      return (d00 && d11 && !d10 && !d01) || (d10 && d01 && !d00 && !d11);
    };
    for (const [i, j] of dotCoords)
      for (const a of [i, i + 1])
        for (const b of [j, j + 1])
          if (pinched(a, b))
            throw new RangeError('dot region has a pinch: two cells meet only at a corner');

    // Nodes: the four cell-edge midpoints of every dot, deduplicated.
    const nodeIdAt = new Map<number, number>();
    const nx: number[] = [];
    const ny: number[] = [];
    const ntx: number[] = [];
    const ngate: number[] = [];
    const addNode = (
      x: number, y: number, typeX: boolean,
      aI: number, aJ: number, bI: number, bJ: number,
    ) => {
      const k = x * KEY_STRIDE + y;
      if (nodeIdAt.has(k)) return;
      const a = dotSet.has(dotKey(aI, aJ));
      const b = dotSet.has(dotKey(bI, bJ));
      if (!a && !b) return;
      nodeIdAt.set(k, nx.length);
      nx.push(x);
      ny.push(y);
      ntx.push(typeX ? 1 : 0);
      ngate.push(a && b ? 1 : 0);
    };
    for (const [i, j] of dotCoords) {
      addNode(2 * i, 2 * j + 1, true, i - 1, j, i, j);
      addNode(2 * i + 2, 2 * j + 1, true, i, j, i + 1, j);
      addNode(2 * i + 1, 2 * j, false, i, j - 1, i, j);
      addNode(2 * i + 1, 2 * j + 2, false, i, j, i, j + 1);
    }
    const nodeCount = nx.length;

    // Canonical site order: gate nodes sorted by (y, x) ascending. This order
    // defines the index bits (LSB = site 0) and never changes: every shared
    // pattern index depends on it.
    const siteOrder: number[] = [];
    for (let id = 0; id < nodeCount; id++) if (ngate[id]) siteOrder.push(id);
    siteOrder.sort((u, v) => ny[u]! - ny[v]! || nx[u]! - nx[v]!);
    const gateSite = new Int32Array(nodeCount).fill(-1);
    const siteNode = new Int32Array(siteOrder.length);
    siteOrder.forEach((id, k) => {
      gateSite[id] = k;
      siteNode[k] = id;
    });

    // Segments per cell: each dot's cell contributes the 4 diagonal segments
    // joining its edge midpoints. Coordinate adjacency alone would create
    // phantom segments through the notches at reflex corners of the border.
    const nbr = new Int32Array(nodeCount * 4).fill(-1);
    const dirIndex = (dx: number, dy: number) =>
      dx === 1 ? (dy === 1 ? 0 : 1) : dy === 1 ? 2 : 3;
    const link = (u: number, v: number) => {
      nbr[u * 4 + dirIndex(nx[v]! - nx[u]!, ny[v]! - ny[u]!)] = v;
      nbr[v * 4 + dirIndex(nx[u]! - nx[v]!, ny[u]! - ny[v]!)] = u;
    };
    for (const [i, j] of dotCoords) {
      const L = nodeIdAt.get(2 * i * KEY_STRIDE + (2 * j + 1))!;
      const R = nodeIdAt.get((2 * i + 2) * KEY_STRIDE + (2 * j + 1))!;
      const B = nodeIdAt.get((2 * i + 1) * KEY_STRIDE + 2 * j)!;
      const T = nodeIdAt.get((2 * i + 1) * KEY_STRIDE + (2 * j + 2))!;
      link(L, T);
      link(T, R);
      link(R, B);
      link(B, L);
    }

    // Degree and coverage invariants.
    let segCount = 0;
    for (let id = 0; id < nodeCount; id++) {
      let deg = 0;
      for (let d = 0; d < 4; d++) if (nbr[id * 4 + d]! >= 0) deg++;
      if (deg !== (ngate[id] ? 4 : 2))
        throw new Error('muggula-prastaram internal invariant: node degree');
      for (let d = 0; d < 2; d++) if (nbr[id * 4 + d]! >= 0) segCount++;
    }
    if (segCount !== 4 * dotCoords.length)
      throw new Error('muggula-prastaram internal invariant: segment count');

    this.sites = siteOrder.length;
    this.dots = dotCoords.map(([i, j]) => [2 * i + 1, 2 * j + 1] as const);
    this.sitePositions = siteOrder.map((id) => [nx[id]!, ny[id]!] as const);
    this.nodeCount = nodeCount;
    this.nodeX = Int32Array.from(nx);
    this.nodeY = Int32Array.from(ny);
    this.nodeTypeX = Uint8Array.from(ntx);
    this.gateSite = gateSite;
    this.siteNode = siteNode;
    this.nbr = nbr;
    this.segCount = segCount;
    this.nodeIdAt = nodeIdAt;
    this.segStamp = new Int32Array(nodeCount * 2);
  }
}
