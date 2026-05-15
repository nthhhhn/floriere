import { Platform, TextStyle } from 'react-native';

// Headlines / display — editorial serif. Web gets Georgia; iOS has Georgia native;
// Android falls back to its system serif.
const serif = Platform.select({
  web:     'Georgia, "Times New Roman", serif',
  ios:     'Georgia',
  android: 'serif',
  default: 'serif',
}) as string;

// Body / UI — calm sans.
const sans = Platform.select({
  web:     'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  ios:     'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

export const fonts = { serif, sans };

// ── Fluid type scale ─────────────────────────────────────────────────────────
// RN doesn't have CSS clamp(), so we ship a small linear-interpolation helper.
// Given a viewport width, return a font size that scales between [min, max]
// from breakpoint widths [minVw, maxVw]. Outside the range it clamps.
//
// Usage:
//   import { useFluidType } from '../theme';
//   const heroSize = useFluidType(36, 56);  // 36px on phones, 56px on desktop
//
// We intentionally keep the breakpoints tight (380 → 1200) so phones see the
// minimum and tablets/desktop hit the maximum quickly — matches 360survey's
// `clamp(2.5rem, 5vw, 3.5rem)` feel.
import { useWindowDimensions } from 'react-native';

const MIN_VW = 380;
const MAX_VW = 1200;

export function fluid(min: number, max: number, vw: number): number {
  if (vw <= MIN_VW) return min;
  if (vw >= MAX_VW) return max;
  const t = (vw - MIN_VW) / (MAX_VW - MIN_VW);
  return Math.round(min + (max - min) * t);
}

export function useFluidType(min: number, max: number): number {
  const { width } = useWindowDimensions();
  return fluid(min, max, width);
}

// ── Type tokens ──────────────────────────────────────────────────────────────
// Headlines: editorial luxury → tight negative tracking on hero/h1, slightly
// less on h2. Body stays calm with positive letter-spacing avoided.

export const type = {
  // Eyebrows / pills / small caps
  eyebrow: {
    fontFamily: sans,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

  // Headlines — sizes here are the *base* (phone) values. For fluid scaling
  // wrap with `useFluidType()` when you need the headline to grow with viewport.
  // Tighter tracking + tighter line-height on display — gives headlines more
  // presence per emil-design-eng "headlines lack presence" + redesign-skill
  // "tighten letter-spacing, reduce line-height" guidance.
  hero: {
    fontFamily: serif,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '500',
    letterSpacing: -0.8,
  } as TextStyle,
  h1: {
    fontFamily: serif,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '500',
    letterSpacing: -0.7,
  } as TextStyle,
  h2: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    letterSpacing: -0.4,
  } as TextStyle,
  h3: {
    fontFamily: serif,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: -0.1,
  } as TextStyle,

  // Body — tabular figures by default. Doesn't affect non-digit glyphs and
  // keeps prices/quantities/dates from jittering as values change.
  body: {
    fontFamily: sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  bodySm: {
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  caption: {
    fontFamily: sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  // Italic pull-quote
  quote: {
    fontFamily: serif,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '400',
    fontStyle: 'italic',
    letterSpacing: -0.1,
  } as TextStyle,

  // Buttons / labels
  button: {
    fontFamily: sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.6,
  } as TextStyle,

  // Numeric / monetary — tabular figures so columns align and rapid count-up
  // doesn't jitter. Per redesign-skill: "Numbers in proportional font" → fix
  // with `tabular-nums` for data-heavy interfaces.
  numeric: {
    fontFamily: sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
};
