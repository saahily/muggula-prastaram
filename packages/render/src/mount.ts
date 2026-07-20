import type { Pattern } from '@muggula-prastaram/core';
import { renderSVG, type RenderOptions } from './svg.js';

/** Render a pattern into a container element. */
export function mount(el: Element, pattern: Pattern, options?: RenderOptions): void {
  el.innerHTML = renderSVG(pattern, options);
  const svg = el.firstElementChild;
  if (svg instanceof SVGElement) {
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';
  }
}
