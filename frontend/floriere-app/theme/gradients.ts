// Gradient presets — ported from 360survey, retoned to Florière palette.
//
// Native:  consumed by <Gradient> via expo-linear-gradient (LinearGradient).
// Web:     consumed by <Gradient> via inline `backgroundImage` CSS string.
//
// Three presets cover everything:
//  - `page`  — soft cream wash for default screens. Almost invisible, just lifts the surface off pure flat.
//  - `hero`  — champagne wash for celebratory / branded surfaces (landing, brand mark backdrop).
//  - `dark`  — charcoal to plum for closing screens (delivery confirmation, gift reveal).

import { colors } from './colors';

export type GradientPreset = 'page' | 'hero' | 'dark';

type GradientSpec = {
  colors: [string, string, ...string[]];
  // Direction in degrees — 0 = top to bottom, 90 = left to right, 135 = top-left to bottom-right.
  angle: number;
  // start/end points for LinearGradient on native. We derive these from angle.
  locations?: number[];
};

export const gradients: Record<GradientPreset, GradientSpec> = {
  page: {
    colors: [colors.creamSoft, colors.cream, colors.creamSoft],
    angle: 145,
  },
  hero: {
    colors: [colors.champagneSoft, colors.champagne],
    angle: 135,
  },
  dark: {
    colors: [colors.charcoal, colors.plum],
    angle: 145,
  },
};

/** CSS gradient string for web (used as backgroundImage). */
export function toCssGradient(spec: GradientSpec): string {
  const stops = spec.colors
    .map((c, i, arr) => {
      const pct =
        spec.locations?.[i] !== undefined
          ? `${spec.locations[i] * 100}%`
          : `${Math.round((i / (arr.length - 1)) * 100)}%`;
      return `${c} ${pct}`;
    })
    .join(', ');
  return `linear-gradient(${spec.angle}deg, ${stops})`;
}

/** Angle → {start,end} unit vector pair for expo-linear-gradient. */
export function angleToStartEnd(angle: number) {
  // 0deg = top→bottom (start {0,0} end {0,1}); CSS-style angle convention.
  const rad = (angle - 90) * (Math.PI / 180);
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  // Normalize from [-1, 1] to [0, 1] across the box.
  return {
    start: { x: 0.5 - x / 2, y: 0.5 - y / 2 },
    end:   { x: 0.5 + x / 2, y: 0.5 + y / 2 },
  };
}
