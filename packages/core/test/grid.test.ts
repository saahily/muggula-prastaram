import { describe, expect, it } from 'vitest';
import { Grid, Pattern } from '../src/index.js';

describe('grid construction', () => {
  it('computes S = 2mn − m − n for squares', () => {
    for (let m = 1; m <= 6; m++)
      for (let n = 1; n <= 6; n++) {
        const g = Grid.of({ kind: 'square', m, n });
        expect(g.sites).toBe(2 * m * n - m - n);
        expect(g.dots.length).toBe(m * n);
        expect(g.extent).toEqual([2 * m, 2 * n]);
      }
  });

  it('computes S = 4(p−1)² and centered-square dot counts for diamonds', () => {
    for (let p = 1; p <= 7; p++) {
      const g = Grid.of({ kind: 'diamond', p });
      expect(g.sites).toBe(4 * (p - 1) * (p - 1));
      expect(g.dots.length).toBe(2 * p * p - 2 * p + 1);
      expect(g.extent).toEqual([4 * p - 2, 4 * p - 2]);
    }
  });

  it('pins the canonical site order (the index contract) for 2×2', () => {
    const g = Grid.of({ kind: 'square', m: 2, n: 2 });
    expect(g.sitePositions).toEqual([
      [2, 1],
      [1, 2],
      [3, 2],
      [2, 3],
    ]);
  });

  it('pins the canonical site order for diamond p=2', () => {
    const g = Grid.of({ kind: 'diamond', p: 2 });
    expect(g.sitePositions).toEqual([
      [3, 2],
      [2, 3],
      [4, 3],
      [3, 4],
    ]);
  });

  it('has exactly one muggu on a single dot', () => {
    const g = Grid.of({ kind: 'square', m: 1, n: 1 });
    expect(g.sites).toBe(0);
    expect(g.count()).toBe(1n);
    expect(Pattern.decode(g, 0n).strokeCount()).toBe(1);
  });

  it('rejects invalid families', () => {
    expect(() => Grid.of({ kind: 'square', m: 0, n: 3 })).toThrow(RangeError);
    expect(() => Grid.of({ kind: 'square', m: 2.5, n: 3 })).toThrow(RangeError);
    expect(() => Grid.of({ kind: 'diamond', p: 0 })).toThrow(RangeError);
    expect(() => Grid.of({ kind: 'square', m: 1000, n: 1000 })).toThrow(RangeError);
  });
});
