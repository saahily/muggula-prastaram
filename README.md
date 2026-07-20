# Muggula Prastāram

**ముగ్గుల ప్రస్తారం**: the systematic enumeration of muggu (kolam) forms.

[![CI](https://github.com/saahily/muggula-prastaram/actions/workflows/ci.yml/badge.svg)](https://github.com/saahily/muggula-prastaram/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-8f4a33)](LICENSE)

<p align="center">
  <img src="docs/hero.svg" width="420"
    alt="An animated muggu drawing itself: pattern 10,922,560,788 on the 1-3-5-7-5-3-1 diamond, a single continuous stroke with 4-fold symmetry in rice-flour white on terracotta." />
  <br/>
  <sub>Pattern 10,922,560,788 of 2³⁶ on the classic diamond: one continuous stroke, 4-fold symmetric, drawn live by <code>@muggula-prastaram/render</code>.</sub>
</p>

A *muggu* is a decorative pattern traditionally drawn at the threshold of South Indian homes: intricate lines looped around a grid of dots, laid down by hand with rice flour on wet ground before sunrise.

A *prastāra* is a device from Sanskrit prosody: the systematic enumeration of every meter of a given length, formalized by Piṅgala in the 3rd century BCE. The enumeration is a bijection, with named procedures: *uddiṣṭa* finds a
meter's index, *naṣṭa* rebuilds the meter from its index, and *saṅkhyā* counts the meters.

**Muggula Prastāram** (lit. *prastāra of muggus*) applies the same idea to a formal model of muggu construction to enumerate and generate muggus. On a fixed dot grid, a muggu is determined by which *gates* between adjacent dots are open. As such, each construction can be represented as a binary vector: every pattern has an index, every index reconstructs a valid muggu, and `encode()`, `decode()`, and `count()` are uddiṣṭa, naṣṭa, and saṅkhyā.

## Packages

| Package | |
|---|---|
| [`@muggula-prastaram/core`](packages/core) | grid model, tracing, uddiṣṭa/naṣṭa indexing, symmetry, search, enumeration |
| [`@muggula-prastaram/render`](packages/render) | SVG rendering, curvature styling, stroke-trace animation, themes |

## Quick start

```ts
import { Grid, Pattern, enumerate, dotsFromRows } from '@muggula-prastaram/core';

const grid = Grid.of({ kind: 'diamond', p: 3 });   // dots in rows 1-3-5-3-1
grid.count();                                      // 65536n, the saṅkhyā

// stepped, concave, even holed regions all work:
const srivatsa = Grid.of({ kind: 'custom', dots: dotsFromRows([1, 3, 3, 1]) });
Pattern.decode(srivatsa, 0n).strokeCount();        // 1: the pure weave IS the śrīvatsa

const muggu = Pattern.decode(grid, 2847n);         // naṣṭa: index → pattern
muggu.strokeCount();                               // 5
muggu.trace();                                     // closed polylines, ready to render
muggu.encode();                                    // 2847n (uddiṣṭa: pattern → index)

// find a single-stroke (sikku), 4-fold-symmetric muggu, reproducibly
const { pattern, achieved } = Pattern.search(grid, {
  strokes: 1, symmetry: 'C4', seed: 'pongal',
});

// exhaustively walk every single-stroke pattern on a small grid
for (const p of enumerate(grid, { strokes: 1 })) { /* ... */ }
```

## Lineage

Muggula Prastāram applies the prastāra's indexing procedures to the
mirror-curve model of muggu patterns. It is part of a longer lineage:

- Piṅgala, [*Chandaḥśāstra*](https://archive.org/details/chandahsutram00pinguoft) (c. 300 BCE): defines the prastāra and its procedures (uddiṣṭa, naṣṭa, saṅkhyā) for the meters of Sanskrit prosody.
- G. Siromoney, R. Siromoney & K. Krithivasan, [*Abstract families of matrices and picture languages*](<https://doi.org/10.1016/S0146-664X(72)80019-4>) (1972) and [*Array grammars and kolam*](<https://doi.org/10.1016/0146-664X(74)90011-2>) (1974): the first formal treatment of kolam patterns, using array grammars.
- P. Gerdes, [*Sona Geometry from Angola*](https://www.lulu.com/shop/paulus-gerdes/sona-geometry-from-angola-mathematics-of-an-african-tradition-color-edition/paperback/product-18kdjv7w.html) (2006): develops the mirror-curve model shared by sona sand drawings and sikku kolams.
- K. Yanagisawa & S. Nagata, [*Fundamental Study on Design System of Kolam Pattern*](https://forma.katachi-jp.com/abstract/2201/22010031.html) (Forma, 2007): encodes kolam patterns as numbers and knot diagrams.

## License

MIT
