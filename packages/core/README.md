# @muggula-prastaram/core

The engine of [Muggula Prastāram](../../README.md): exact enumeration, tracing,
and search of muggu / kolam patterns via the mirror-curve gate model. Zero
dependencies, DOM-free, deterministic.

```ts
import { Grid, Pattern, enumerate } from '@muggula-prastaram/core';

const grid = Grid.of({ kind: 'diamond', p: 3 });
grid.count();                              // 65536n patterns (saṅkhyā)

const muggu = Pattern.decode(grid, 2847n); // naṣṭa: index → pattern
muggu.encode();                            // uddiṣṭa: pattern → index
muggu.strokeCount();                       // exact, computed
muggu.symmetry().name;                     // e.g. 'C4'
muggu.trace();                             // closed polylines in doubled coords

Pattern.search(grid, { strokes: 1, symmetry: 'C4', seed: 'pongal' });
for (const p of enumerate(grid, { strokes: 1 })) { /* every sikku */ }
```

The index convention, since it is permanent: gate sites sort by (y, x) in the
grid's doubled coordinates, and site *k* is bit *k* of the index, least
significant bit first, the same little-endian reading as the classical naṣṭa
halving procedure. Index 0 is always the pure weave, every strand crossing.
The test fixtures pin this order for every grid family, and it will not change:
pattern indices are meant to be shared and to stay valid.
