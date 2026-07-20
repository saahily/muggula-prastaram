/**
 * Pattern → self-contained SVG string.
 *
 * The stroke-trace animation normalizes every path with pathLength, so no arc
 * lengths are computed here; stroke durations are proportional to segment
 * counts, which is exact (all polyline segments have equal length). Strokes
 * draw sequentially in canonical order. Honors prefers-reduced-motion.
 */
import type { Pattern } from '@muggula-prastaram/core';
import { strokePathData } from './path.js';
import { resolveTheme, type Theme } from './theme.js';

export interface RenderOptions {
  /** Corner rounding, 0 (angular kambi) … 1 (flowing sikku). Default 1. */
  curvature?: number;
  /** Line width in grid units (dot spacing = 2). Default 0.35. */
  strokeWidth?: number;
  /** Default true. */
  showDots?: boolean;
  /** Dot radius in grid units. Default 0.22. */
  dotRadius?: number;
  /** Presentation rotation. Default 0. */
  angle?: 0 | 45;
  theme?: 'light' | 'dark' | Theme;
  /**
   * Trace the strokes being drawn. Default false (static). When animating,
   * the muggu draws once and rests complete, like a real muggu; `loop: true`
   * replays, holding the completed pattern for half of each cycle.
   */
  animate?: boolean | { duration?: number; loop?: boolean };
  /** Margin around the pattern in grid units. Default 1. */
  padding?: number;
  /** Root element id (scopes animation CSS). Default derived from the pattern. */
  id?: string;
}

// Chromium's dash walk measures a curvy path several percent longer than its
// pathLength scaling assumes, so a dash that merely equals the nominal length
// (including the common pathLength=1 / dasharray=1 idiom) clips the tail of
// the completed stroke, and an offset exactly at the dash boundary leaks a
// stray segment in the "hidden" state. Both endpoints must sit far from any
// dash boundary: the dash is 2× pathLength, the hidden state rests 50 units
// into the gap, and the drawn state rests 200 units short of the boundary.
const PATH_LENGTH = 1000;
const DASH = 2000;
const HIDDEN = 2050;
const DRAWN = 800;

function fmt(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

function familyLabel(pattern: Pattern): string {
  const f = pattern.grid.family;
  if (f.kind === 'square') return `a ${f.m}×${f.n} square grid`;
  if (f.kind === 'diamond') return `a diamond grid of ${f.p} layers`;
  return `a custom grid of ${f.dots.length} dots`;
}

function animationCss(
  id: string,
  segCounts: readonly number[],
  duration: number,
  loop: boolean,
): string {
  const total = segCounts.reduce((a, b) => a + b, 0);
  const hold = loop ? duration : 0;
  const cycle = duration + hold;
  const pct = (s: number) => fmt((s / cycle) * 100);
  let css = '';
  let acc = 0;
  for (let k = 0; k < segCounts.length; k++) {
    const dur = (duration * segCounts[k]!) / total;
    const start = pct(acc);
    const end = pct(acc + dur);
    acc += dur;
    css +=
      `#${id} .s${k}{stroke-dasharray:${DASH};stroke-dashoffset:${HIDDEN};` +
      `animation:${id}-s${k} ${fmt(cycle)}s linear ${loop ? 'infinite' : '1 forwards'}}` +
      `@keyframes ${id}-s${k}{0%{stroke-dashoffset:${HIDDEN}}` +
      (Number(start) > 0 ? `${start}%{stroke-dashoffset:${HIDDEN}}` : '') +
      `${end}%{stroke-dashoffset:${DRAWN}}100%{stroke-dashoffset:${DRAWN}}}`;
  }
  css += `@media (prefers-reduced-motion:reduce){#${id} path{animation:none;stroke-dasharray:none}}`;
  return css;
}

export function renderSVG(pattern: Pattern, options: RenderOptions = {}): string {
  const {
    curvature = 1,
    strokeWidth = 0.35,
    showDots = true,
    dotRadius = 0.22,
    angle = 0,
    padding = 1,
    animate = false,
  } = options;
  const grid = pattern.grid;
  const [w, h] = grid.extent;
  const theme = resolveTheme(options.theme);
  const strokes = pattern.trace();
  const id = options.id ?? `mp-${grid.family.kind}-${pattern.encode().toString(36)}`;

  let viewBox: string;
  let transform = '';
  if (angle === 45) {
    const side = (w + h) / Math.SQRT2;
    const minX = w / 2 - side / 2 - padding;
    const minY = h / 2 - side / 2 - padding;
    viewBox = `${fmt(minX)} ${fmt(minY)} ${fmt(side + 2 * padding)} ${fmt(side + 2 * padding)}`;
    transform = ` transform="rotate(45 ${fmt(w / 2)} ${fmt(h / 2)})"`;
  } else {
    viewBox = `${fmt(-padding)} ${fmt(-padding)} ${fmt(w + 2 * padding)} ${fmt(h + 2 * padding)}`;
  }

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" viewBox="${viewBox}" ` +
      `role="img" aria-label="A muggu: pattern ${pattern.encode()} of ${grid.count()} on ${familyLabel(pattern)}">`,
  );
  if (animate) {
    const anim = animate === true ? {} : animate;
    const segCounts = strokes.map((s) => s.length);
    const duration = anim.duration ?? Math.max(2.5, 0.06 * segCounts.reduce((a, b) => a + b, 0));
    parts.push(`<style>${animationCss(id, segCounts, duration, anim.loop ?? false)}</style>`);
  }
  if (theme.background !== 'none') {
    const [vx, vy, vw, vh] = viewBox.split(' ');
    parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${theme.background}"/>`);
  }
  parts.push(`<g${transform}>`);
  if (showDots && dotRadius > 0) {
    let dots = `<g fill="${theme.dot}">`;
    for (const [x, y] of grid.dots)
      dots += `<circle cx="${fmt(x)}" cy="${fmt(h - y)}" r="${fmt(dotRadius)}"/>`;
    parts.push(dots + '</g>');
  }
  strokes.forEach((stroke, k) => {
    const color = theme.strokes[k % theme.strokes.length]!;
    parts.push(
      `<path class="s${k}" d="${strokePathData(stroke, curvature, h)}" fill="none" ` +
        `stroke="${color}" stroke-width="${fmt(strokeWidth)}" ` +
        `stroke-linecap="round" stroke-linejoin="round" pathLength="${PATH_LENGTH}"/>`,
    );
  });
  parts.push('</g></svg>');
  return parts.join('');
}
