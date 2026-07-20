/**
 * Themes. "light" is the traditional look: rice-flour lines on warm floor
 * tones; "dark" sits on deep near-black earth for dark pages. Stroke
 * colors cycle in canonical stroke order, so a sikku always draws in the first
 * color. `background: 'none'` omits the backdrop for transparent embedding.
 */
export interface Theme {
  readonly background: string | 'none';
  readonly dot: string;
  readonly strokes: readonly string[];
}

export const themes: Record<'light' | 'dark', Theme> = {
  light: {
    background: '#8f4a33',
    dot: '#f6efe2aa',
    strokes: ['#f6efe2', '#ecc45f', '#b9d6cb', '#eab2a0', '#cdbbe0'],
  },
  dark: {
    background: '#221813',
    dot: '#efe6d499',
    strokes: ['#efe6d4', '#e0b95e', '#a4c6ba', '#dfa28e', '#bfaed4'],
  },
};

export function resolveTheme(theme: 'light' | 'dark' | Theme | undefined): Theme {
  if (theme === undefined) return themes.light;
  return typeof theme === 'string' ? themes[theme] : theme;
}
