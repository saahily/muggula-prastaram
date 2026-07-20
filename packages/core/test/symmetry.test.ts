import { describe, expect, it } from 'vitest';
import {
  Grid,
  Pattern,
  enumerate,
  elementsFor,
  symmetryClassesFor,
  type Family,
  type SymClass,
} from '../src/index.js';

function familyStats(g: Grid, symmetry: SymClass) {
  let patterns = 0;
  let sikku = 0;
  let minSikku: bigint | null = null;
  for (const p of enumerate(g, { symmetry })) {
    patterns++;
    if (p.strokeCount() === 1) {
      sikku++;
      const i = p.encode();
      if (minSikku === null || i < minSikku) minSikku = i;
    }
  }
  return { patterns, sikku, minSikku };
}

describe('group action', () => {
  const families: Family[] = [
    { kind: 'square', m: 3, n: 3 },
    { kind: 'square', m: 4, n: 4 },
    { kind: 'square', m: 3, n: 4 },
    { kind: 'diamond', p: 3 },
    { kind: 'diamond', p: 4 },
  ];

  it('every element acts as a bijection preserving stroke count', () => {
    for (const family of families) {
      const g = Grid.of(family);
      for (const elem of elementsFor(g)) {
        for (let t = 0; t < 10; t++) {
          const p = Pattern.random(g, { seed: `act-${t}` });
          expect(p.transform(elem).strokeCount()).toBe(p.strokeCount());
        }
      }
    }
  });

  it('offers D4 classes only on square-shaped grids', () => {
    expect(symmetryClassesFor(Grid.of({ kind: 'square', m: 4, n: 4 }))).toContain('C4');
    expect(symmetryClassesFor(Grid.of({ kind: 'diamond', p: 3 }))).toContain('D4');
    expect(symmetryClassesFor(Grid.of({ kind: 'square', m: 3, n: 4 }))).toEqual([
      'none', 'mirror', 'C2',
    ]);
    expect(() =>
      [...enumerate(Grid.of({ kind: 'square', m: 3, n: 4 }), { symmetry: 'C4' })],
    ).toThrow(RangeError);
  });
});

describe('detection', () => {
  it('names the pure weave D4 on square shapes, D2 on rectangles', () => {
    expect(Pattern.decode(Grid.of({ kind: 'square', m: 3, n: 3 }), 0n).symmetry().name).toBe('D4');
    expect(Pattern.decode(Grid.of({ kind: 'diamond', p: 4 }), 0n).symmetry().name).toBe('D4');
    expect(Pattern.decode(Grid.of({ kind: 'square', m: 3, n: 4 }), 0n).symmetry().name).toBe('D2');
  });

  it('recognizes the known C4 sikkus', () => {
    expect(Pattern.decode(Grid.of({ kind: 'square', m: 3, n: 3 }), 1542n).symmetry().name).toBe('C4');
    expect(Pattern.decode(Grid.of({ kind: 'diamond', p: 3 }), 12300n).symmetry().name).toBe('C4');
  });
});

describe('symmetric families', () => {
  it('3×3: C4 = 8 patterns / 2 sikkus (min 1542); mirror = 128 / 12 (min 132)', () => {
    const g = Grid.of({ kind: 'square', m: 3, n: 3 });
    expect(familyStats(g, 'C4')).toEqual({ patterns: 8, sikku: 2, minSikku: 1542n });
    expect(familyStats(g, 'mirror')).toEqual({ patterns: 128, sikku: 12, minSikku: 132n });
  });

  it('4×4: C4 = 64 / 0; mirror = 16,384 / 512 (min 17536)', () => {
    const g = Grid.of({ kind: 'square', m: 4, n: 4 });
    expect(familyStats(g, 'C4')).toEqual({ patterns: 64, sikku: 0, minSikku: null });
    expect(familyStats(g, 'mirror')).toEqual({ patterns: 16384, sikku: 512, minSikku: 17536n });
  });

  it('diamond p=3: C4 = 16 / 2 (min 12300); D4 = 8 / 0', () => {
    const g = Grid.of({ kind: 'diamond', p: 3 });
    expect(familyStats(g, 'C4')).toEqual({ patterns: 16, sikku: 2, minSikku: 12300n });
    expect(familyStats(g, 'D4')).toEqual({ patterns: 8, sikku: 0, minSikku: null });
  });

  it('diamond p=4: C4 = 512 / 24 (min 1610612832); D4 = 64 / 0', () => {
    const g = Grid.of({ kind: 'diamond', p: 4 });
    expect(familyStats(g, 'C4')).toEqual({ patterns: 512, sikku: 24, minSikku: 1610612832n });
    expect(familyStats(g, 'D4')).toEqual({ patterns: 64, sikku: 0, minSikku: null });
  });

  it('diamond p=5: C4 = 65,536 / 1,088 (min 27057881656591872)', () => {
    const g = Grid.of({ kind: 'diamond', p: 5 });
    expect(familyStats(g, 'C4')).toEqual({
      patterns: 65536,
      sikku: 1088,
      minSikku: 27057881656591872n,
    });
  });
});
