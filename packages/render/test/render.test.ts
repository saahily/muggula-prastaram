import { describe, expect, it } from 'vitest';
import { Grid, Pattern } from '@muggula-prastaram/core';
import { renderSVG, strokePathData, themes } from '../src/index.js';

const g33 = Grid.of({ kind: 'square', m: 3, n: 3 });
const sikku33 = Pattern.decode(g33, 3n); // first sikku on 3×3

describe('strokePathData', () => {
  it('emits a pure polyline at curvature 0', () => {
    for (const stroke of sikku33.trace()) {
      const d = strokePathData(stroke, 0, g33.extent[1]);
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(d).not.toContain('Q');
      expect(d).toContain('L');
    }
  });

  it('emits pure quadratics meeting at midpoints at curvature 1', () => {
    for (const stroke of sikku33.trace()) {
      const d = strokePathData(stroke, 1, g33.extent[1]);
      expect(d).toContain('Q');
      expect(d).not.toContain('L');
      expect((d.match(/Q/g) ?? []).length).toBe(stroke.length);
    }
  });

  it('stays within the flipped coordinate range', () => {
    const [w, h] = g33.extent;
    const d = strokePathData(sikku33.trace()[0]!, 0.6, h);
    for (const value of d.match(/-?\d+(\.\d+)?/g) ?? []) {
      const v = Number(value);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(Math.max(w, h));
    }
  });
});

describe('renderSVG', () => {
  it('emits one path per stroke, in theme colors', () => {
    const p = Pattern.decode(g33, 0n); // 3 strokes
    const svg = renderSVG(p, { theme: 'dark' });
    expect((svg.match(/<path /g) ?? []).length).toBe(3);
    expect(svg).toContain(themes.dark.strokes[0]!);
    expect(svg).toContain(`pathLength="1000"`);
    expect(svg).toContain(themes.dark.background as string);
  });

  it('renders dots and can hide them', () => {
    const withDots = renderSVG(sikku33);
    expect((withDots.match(/<circle /g) ?? []).length).toBe(9);
    expect(renderSVG(sikku33, { showDots: false })).not.toContain('<circle');
  });

  it('animates with per-stroke sequential keyframes', () => {
    const p = Pattern.decode(g33, 0n);
    const svg = renderSVG(p, { animate: true, id: 'anim-test' });
    expect(svg).toContain('<style>');
    expect((svg.match(/@keyframes anim-test-s/g) ?? []).length).toBe(3);
    expect(svg).toContain('prefers-reduced-motion');
    expect(renderSVG(p, { animate: false })).not.toContain('<style>');
  });

  it('draws once and rests complete by default; looping holds the finished state', () => {
    const p = Pattern.decode(g33, 0n);
    const once = renderSVG(p, { animate: true });
    expect(once).toContain('1 forwards');
    expect(once).not.toContain('infinite');
    const looped = renderSVG(p, { animate: { loop: true }, id: 'loop-test' });
    expect(looped).toContain('infinite');
    // Completed pattern holds for half the cycle: the last stroke finishes at 50%.
    expect(looped).toContain('50%{stroke-dashoffset:800}');
    // Both rest states must sit far from a dash boundary (Chromium dash-walk
    // imprecision clips the tail when dash length merely equals pathLength).
    expect(looped).toContain('stroke-dasharray:2000');
    expect(looped).toContain('stroke-dashoffset:2050');
  });

  it('applies the 45° presentation transform', () => {
    const svg = renderSVG(sikku33, { angle: 45 });
    expect(svg).toContain('rotate(45 3 3)');
  });

  it('supports custom themes and transparent backgrounds', () => {
    const svg = renderSVG(sikku33, {
      theme: { background: 'none', dot: '#123456', strokes: ['#abcdef'] },
    });
    expect(svg).not.toContain('<rect');
    expect(svg).toContain('#abcdef');
  });

  it('is deterministic', () => {
    expect(renderSVG(sikku33, { animate: true })).toBe(renderSVG(sikku33, { animate: true }));
  });

  it('renders the single-dot grid as one ring', () => {
    const g = Grid.of({ kind: 'square', m: 1, n: 1 });
    const svg = renderSVG(Pattern.decode(g, 0n));
    expect((svg.match(/<path /g) ?? []).length).toBe(1);
  });

  it('labels custom grids by dot count', () => {
    const g = Grid.of({ kind: 'custom', dots: [[0, 0], [0, 1], [1, 0]] });
    expect(renderSVG(Pattern.decode(g, 0n))).toContain('a custom grid of 3 dots');
  });
});
