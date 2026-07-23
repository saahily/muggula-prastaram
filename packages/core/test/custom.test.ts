/**
 * Custom dot regions: stepped, concave, and holed grids. Fixtures pinned from
 * complete enumerations. The 1-3-3-1 grid is the śrīvatsa grid: its index 1
 * (the pure weave) is the classic endless-knot form: a single stroke with
 * full D2 symmetry.
 */
import { describe, expect, it } from 'vitest';
import {
  Grid,
  Pattern,
  dotsFromRows,
  elementsFor,
  enumerate,
  mirrorFor,
  symmetryClassesFor,
} from '../src/index.js';

const srivatsa = () => Grid.of({ kind: 'custom', dots: dotsFromRows([1, 3, 3, 1]) });
const ring = () => {
  const dots: Array<[number, number]> = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) if (!(i === 1 && j === 1)) dots.push([i, j]);
  return Grid.of({ kind: 'custom', dots });
};
const lShape = () =>
  Grid.of({ kind: 'custom', dots: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] });

function stats(g: Grid) {
  let total = 0;
  let sikku = 0;
  let first: bigint | null = null;
  for (const p of enumerate(g)) {
    total++;
    if (p.strokeCount() === 1) {
      sikku++;
      first ??= p.encode();
    }
  }
  return { total, sikku, first };
}

describe('dotsFromRows', () => {
  it('builds centered rows, top row first', () => {
    expect(dotsFromRows([1, 3])).toEqual([[1, 1], [0, 0], [1, 0], [2, 0]]);
  });

  it('rejects mixed-parity and invalid rows', () => {
    expect(() => dotsFromRows([1, 2])).toThrow(RangeError);
    expect(() => dotsFromRows([])).toThrow(RangeError);
    expect(() => dotsFromRows([0])).toThrow(RangeError);
  });
});

describe('custom region validation', () => {
  it('rejects pinched, disconnected, duplicate, and non-integer regions', () => {
    expect(() => Grid.of({ kind: 'custom', dots: [[0, 0], [1, 1]] })).toThrow(RangeError);
    expect(() => Grid.of({ kind: 'custom', dots: [[0, 0], [2, 0]] })).toThrow(RangeError);
    expect(() => Grid.of({ kind: 'custom', dots: [[0, 0], [0, 0]] })).toThrow(RangeError);
    expect(() => Grid.of({ kind: 'custom', dots: [[0, 0.5]] })).toThrow(RangeError);
    expect(() => Grid.of({ kind: 'custom', dots: [] })).toThrow(RangeError);
  });

  it('normalizes translation and listing order to one canonical form', () => {
    const a = Grid.of({ kind: 'custom', dots: [[7, 9], [7, 10], [8, 9]] });
    const b = Grid.of({ kind: 'custom', dots: [[1, 0], [0, 1], [0, 0]] });
    expect(a.family).toEqual(b.family);
    expect(a.sitePositions).toEqual(b.sitePositions);
    expect(Pattern.decode(a, 2n).trace()).toEqual(Pattern.decode(b, 2n).trace());
  });
});

describe('śrīvatsa grid (1-3-3-1)', () => {
  it('has 8 dots, 9 sites, D2 shape symmetry', () => {
    const g = srivatsa();
    expect(g.dots.length).toBe(8);
    expect(g.sites).toBe(9);
    expect(elementsFor(g)).toEqual(['rot180', 'refH', 'refV']);
    expect(symmetryClassesFor(g)).toEqual(['none', 'mirror', 'C2']);
  });

  it('index 1, the pure weave, is a single stroke with full D2 symmetry', () => {
    const p = Pattern.decode(srivatsa(), 1n);
    expect(p.strokeCount()).toBe(1);
    expect(p.symmetry().name).toBe('D2');
  });

  it('512 patterns, 16 sikkus, exactly two D2-symmetric sikkus (1 and 41)', () => {
    const g = srivatsa();
    expect(stats(g)).toEqual({ total: 512, sikku: 16, first: 1n });
    const d2 = [];
    for (const p of enumerate(g, { symmetry: 'C2' }))
      if (p.strokeCount() === 1 && p.symmetry().name === 'D2') d2.push(p.encode());
    expect(d2).toEqual([1n, 41n]);
  });
});

describe('concave regions', () => {
  it('supports interior holes: 3×3 ring keeps full D4 and traces correctly', () => {
    const g = ring();
    expect(g.sites).toBe(8);
    expect(elementsFor(g).length).toBe(7);
    expect(symmetryClassesFor(g)).toEqual(['none', 'mirror', 'C2', 'C4', 'D4']);
    expect(stats(g)).toEqual({ total: 256, sikku: 8, first: 2n });
    const weave = Pattern.decode(g, 1n);
    expect(weave.strokeCount()).toBe(2); // outer weave + courtyard loop
    expect(weave.symmetry().name).toBe('D4');
  });

  it('probes asymmetric shapes honestly: the L pentomino keeps only its diagonal mirror', () => {
    const g = lShape();
    expect(elementsFor(g)).toEqual(['refD']);
    expect(symmetryClassesFor(g)).toEqual(['none', 'mirror']);
    expect(stats(g)).toEqual({ total: 16, sikku: 1, first: 1n });
    expect(Pattern.decode(g, 1n).symmetry().name).toBe('mirror (diagonal)');
  });

  it("the 'mirror' class means the region's first available mirror", () => {
    expect(mirrorFor(Grid.of({ kind: 'square', m: 3, n: 3 }))).toBe('refH');
    expect(mirrorFor(Grid.of({ kind: 'square', m: 3, n: 4 }))).toBe('refH');
    const g = lShape();
    expect(mirrorFor(g)).toBe('refD');
    const members: Array<[bigint, number, string]> = [];
    for (const p of enumerate(g, { symmetry: 'mirror' }))
      members.push([p.encode(), p.strokeCount(), p.symmetry().name]);
    expect(members).toEqual([
      [1n, 1, 'mirror (diagonal)'],
      [6n, 3, 'mirror (diagonal)'],
      [11n, 3, 'mirror (diagonal)'],
      [16n, 5, 'mirror (diagonal)'],
    ]);
    const { pattern, achieved } = Pattern.search(g, { strokes: 1, symmetry: 'mirror', seed: 'x' });
    expect(achieved).toBe(1);
    expect(pattern.encode()).toBe(1n);
  });

  it('search reaches a sikku on every custom shape', () => {
    for (const g of [srivatsa(), ring(), lShape()])
      expect(Pattern.search(g, { strokes: 1, seed: 'x' }).achieved).toBe(1);
  });
});
