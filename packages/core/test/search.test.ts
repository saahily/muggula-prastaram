import { describe, expect, it } from 'vitest';
import { Grid, Pattern, type Family } from '../src/index.js';

describe('sikku search', () => {
  it('always reaches a single stroke unconstrained', () => {
    const families: Family[] = [
      { kind: 'square', m: 3, n: 3 },
      { kind: 'square', m: 4, n: 4 },
      { kind: 'square', m: 5, n: 5 },
      { kind: 'diamond', p: 3 },
      { kind: 'diamond', p: 4 },
      { kind: 'diamond', p: 5 },
    ];
    for (const family of families) {
      const g = Grid.of(family);
      for (const seed of ['a', 'b', 'c']) {
        const { pattern, achieved } = Pattern.search(g, { strokes: 1, seed });
        expect(achieved).toBe(1);
        expect(pattern.strokeCount()).toBe(1);
      }
    }
  });

  it('is deterministic per seed', () => {
    const g = Grid.of({ kind: 'diamond', p: 4 });
    const a = Pattern.search(g, { strokes: 1, seed: 'same' });
    const b = Pattern.search(g, { strokes: 1, seed: 'same' });
    expect(a.pattern.encode()).toBe(b.pattern.encode());
  });

  it('finds C4-symmetric sikkus where they exist', () => {
    for (const family of [{ kind: 'diamond', p: 3 }, { kind: 'diamond', p: 4 }] as Family[]) {
      const g = Grid.of(family);
      const { pattern, achieved } = Pattern.search(g, {
        strokes: 1, symmetry: 'C4', seed: 'pongal', maxIterations: 2000,
      });
      expect(achieved).toBe(1);
      expect(pattern.symmetry().name).toBe('C4');
    }
  });

  it('reports the nearest achievable when the target is unsatisfiable', () => {
    // No D4-symmetric sikku exists on 3×3; the best possible is 3 strokes.
    const g = Grid.of({ kind: 'square', m: 3, n: 3 });
    const { pattern, achieved } = Pattern.search(g, {
      strokes: 1, symmetry: 'D4', seed: 'honest', maxIterations: 2000,
    });
    expect(achieved).toBe(3);
    expect(pattern.strokeCount()).toBe(3);
    expect(pattern.symmetry().name).toBe('D4');
  });

  it('reaches multi-stroke targets', () => {
    const g = Grid.of({ kind: 'square', m: 3, n: 3 });
    const { pattern, achieved } = Pattern.search(g, { strokes: 4, seed: 'multi' });
    expect(achieved).toBe(4);
    expect(pattern.strokeCount()).toBe(4);
  });

  it('handles the trivial grid', () => {
    const g = Grid.of({ kind: 'square', m: 1, n: 1 });
    expect(Pattern.search(g, { strokes: 1, seed: 'x' }).achieved).toBe(1);
    expect(Pattern.search(g, { strokes: 2, seed: 'x' }).achieved).toBe(1);
  });
});
