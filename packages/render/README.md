# @muggula-prastaram/render

SVG rendering and stroke-trace animation for
[`@muggula-prastaram/core`](../core) patterns. Framework-agnostic: emits
self-contained SVG strings (works server-side) plus a one-call DOM `mount`.

```ts
import { Grid, Pattern } from '@muggula-prastaram/core';
import { renderSVG, mount } from '@muggula-prastaram/render';

const grid = Grid.of({ kind: 'diamond', p: 4 });
const { pattern } = Pattern.search(grid, { strokes: 1, symmetry: 'C4', seed: 'pongal' });

const svg = renderSVG(pattern, {
  curvature: 1,        // 0 = angular kambi … 1 = flowing sikku
  theme: 'light',      // rice flour on floor tones; 'dark'; or a custom Theme
  animate: true,       // trace the strokes being drawn, sequentially
  angle: 0,            // or 45
});

mount(document.querySelector('#muggu')!, pattern, { animate: true });
```

Animation uses `pathLength` normalization and plain CSS keyframes: no
JavaScript at view time, and `prefers-reduced-motion` is honored. If the dash
constants in the source look oddly generous, that is deliberate: Chromium's
dash walk measures a curvy path a few percent longer than its `pathLength`
scaling assumes, and a dash equal to the nominal length clips the tail of the
finished stroke, leaving the curve visibly open. Both rest states therefore sit
far away from any dash boundary.
