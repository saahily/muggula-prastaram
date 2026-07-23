/**
 * Fixtures pinned from complete enumerations. They lock the model AND the
 * canonical site order at once; the first-sikku indices change if either
 * drifts.
 */
import { describe, expect, it } from 'vitest';
import { Grid, Pattern, enumerate, type Family } from '../src/index.js';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function enumStats(g: Grid) {
  let total = 0;
  let sikku = 0;
  let first: bigint | null = null;
  const hist: Record<number, number> = {};
  for (const p of enumerate(g)) {
    total++;
    const c = p.strokeCount();
    hist[c] = (hist[c] ?? 0) + 1;
    if (c === 1) {
      sikku++;
      first ??= p.encode();
    }
  }
  return { total, sikku, first, hist };
}

describe('stroke-count fixtures', () => {
  it('index 1 (pure weave) has gcd(m, n) strokes on squares', () => {
    for (let m = 1; m <= 5; m++)
      for (let n = 1; n <= 5; n++) {
        const g = Grid.of({ kind: 'square', m, n });
        expect(Pattern.decode(g, 1n).strokeCount()).toBe(gcd(m, n));
      }
  });

  it('all-gates has one ring per dot', () => {
    const families: Family[] = [
      { kind: 'square', m: 4, n: 4 },
      { kind: 'square', m: 5, n: 2 },
      { kind: 'diamond', p: 3 },
      { kind: 'diamond', p: 4 },
    ];
    for (const family of families) {
      const g = Grid.of(family);
      expect(Pattern.decode(g, g.count()).strokeCount()).toBe(g.dots.length);
    }
  });

  it('index 1 on diamond p has 2p − 3 strokes (p ≥ 2)', () => {
    for (let p = 2; p <= 7; p++) {
      const g = Grid.of({ kind: 'diamond', p });
      expect(Pattern.decode(g, 1n).strokeCount()).toBe(2 * p - 3);
    }
  });
});

describe('complete enumerations', () => {
  it('square 2×2: 16 patterns, 4 sikkus, first at 2', () => {
    const s = enumStats(Grid.of({ kind: 'square', m: 2, n: 2 }));
    expect([s.total, s.sikku, s.first]).toEqual([16, 4, 2n]);
  });

  it('square 2×3: 128 patterns, 16 sikkus, first at 1', () => {
    const s = enumStats(Grid.of({ kind: 'square', m: 2, n: 3 }));
    expect([s.total, s.sikku, s.first]).toEqual([128, 16, 1n]);
  });

  it('square 3×3: 4,096 patterns, 240 sikkus, first at 4, exact histogram', () => {
    const s = enumStats(Grid.of({ kind: 'square', m: 3, n: 3 }));
    expect([s.total, s.sikku, s.first]).toEqual([4096, 240, 4n]);
    expect(s.hist).toEqual({
      1: 240, 2: 776, 3: 1128, 4: 1008, 5: 609, 6: 252, 7: 70, 8: 12, 9: 1,
    });
  });

  it('square 3×4: 131,072 patterns, 3,584 sikkus, first at 1', () => {
    const s = enumStats(Grid.of({ kind: 'square', m: 3, n: 4 }));
    expect([s.total, s.sikku, s.first]).toEqual([131072, 3584, 1n]);
  });

  it('diamond p=2: 16 patterns, 1 sikku, first at 1', () => {
    const s = enumStats(Grid.of({ kind: 'diamond', p: 2 }));
    expect([s.total, s.sikku, s.first]).toEqual([16, 1, 1n]);
  });

  it('diamond p=3: 65,536 patterns, 240 sikkus, first at 7, exact histogram', () => {
    const s = enumStats(Grid.of({ kind: 'diamond', p: 3 }));
    expect([s.total, s.sikku, s.first]).toEqual([65536, 240, 7n]);
    expect(s.hist).toEqual({
      1: 240, 2: 1736, 3: 5672, 4: 11136, 5: 14753, 6: 14024, 7: 9892,
      8: 5248, 9: 2086, 10: 608, 11: 124, 12: 16, 13: 1,
    });
  });
});

describe('trace structure', () => {
  it('total stroke length is exactly 4 segments per dot', () => {
    const families: Family[] = [
      { kind: 'square', m: 4, n: 3 },
      { kind: 'diamond', p: 4 },
    ];
    for (const family of families) {
      const g = Grid.of(family);
      for (let t = 0; t < 25; t++) {
        const strokes = Pattern.random(g, { seed: `len-${t}` }).trace();
        const total = strokes.reduce((acc, s) => acc + s.length, 0);
        expect(total).toBe(4 * g.dots.length);
      }
    }
  });

  it('strokes step diagonally and close up', () => {
    const g = Grid.of({ kind: 'diamond', p: 3 });
    for (const stroke of Pattern.random(g, { seed: 'steps' }).trace()) {
      for (let i = 0; i < stroke.length; i++) {
        const [x1, y1] = stroke[i]!;
        const [x2, y2] = stroke[(i + 1) % stroke.length]!;
        expect(Math.abs(x2 - x1)).toBe(1);
        expect(Math.abs(y2 - y1)).toBe(1);
      }
    }
  });

  it('random tracing upholds invariants on odd-shaped grids', () => {
    const families: Family[] = [
      { kind: 'square', m: 7, n: 1 },
      { kind: 'square', m: 6, n: 4 },
      { kind: 'square', m: 5, n: 5 },
      { kind: 'diamond', p: 5 },
      { kind: 'diamond', p: 6 },
    ];
    for (const family of families) {
      const g = Grid.of(family);
      for (let t = 0; t < 40; t++)
        expect(Pattern.random(g, { seed: `inv-${t}` }).strokeCount()).toBeGreaterThan(0);
    }
  });
});
