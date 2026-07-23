import { describe, expect, it } from 'vitest';
import { Grid, Pattern, type Family } from '../src/index.js';

const GRIDS: Family[] = [
  { kind: 'square', m: 3, n: 3 },
  { kind: 'square', m: 2, n: 3 },
  { kind: 'square', m: 5, n: 1 },
  { kind: 'diamond', p: 2 },
  { kind: 'diamond', p: 3 },
  { kind: 'diamond', p: 5 },
];

describe('uddiṣṭa / naṣṭa round-trip', () => {
  it('decode(encode(p)) = p and encode(decode(i)) = i, fuzzed', () => {
    for (const family of GRIDS) {
      const g = Grid.of(family);
      for (let t = 0; t < 50; t++) {
        const p = Pattern.random(g, { seed: `fuzz-${t}` });
        const i = p.encode();
        const q = Pattern.decode(g, i);
        expect(q.encode()).toBe(i);
        for (let k = 0; k < g.sites; k++) expect(q.gate(k)).toBe(p.gate(k));
      }
      expect(Pattern.decode(g, g.count()).encode()).toBe(g.count());
      expect(() => Pattern.decode(g, g.count() + 1n)).toThrow(RangeError);
      expect(() => Pattern.decode(g, 0n)).toThrow(RangeError);
    }
  });

  it('reads site k as bit k of index − 1 (the Piṅgala halving convention)', () => {
    const g = Grid.of({ kind: 'square', m: 2, n: 2 });
    const p2 = Pattern.decode(g, 2n);
    expect([0, 1, 2, 3].map((k) => p2.gate(k))).toEqual([true, false, false, false]);
    const p9 = Pattern.decode(g, 9n);
    expect([0, 1, 2, 3].map((k) => p9.gate(k))).toEqual([false, false, false, true]);
  });

  it('toggle flips exactly one bit and is an involution', () => {
    const g = Grid.of({ kind: 'square', m: 3, n: 3 });
    const p = Pattern.decode(g, 1n);
    expect(p.toggle(2).encode()).toBe(5n);
    expect(p.toggle(5).toggle(5).encode()).toBe(1n);
    expect(() => p.toggle(g.sites)).toThrow(RangeError);
  });
});
