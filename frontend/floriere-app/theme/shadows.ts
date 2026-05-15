// Shadow ramp — luxury editorial dial.
//
// Editorial brands print on paper. Paper doesn't float. So default surfaces
// (cards, fields) carry NO shadow at all — they use a hairline 1px champagne
// border at ~8% alpha instead. Only the primary CTA gets a very subtle
// champagne-tinted halo.
//
// Web: prefer the `boxShadow` CSS string. RN 0.81+ accepts `boxShadow` on iOS
// and Android too (new arch), so we just emit the string everywhere and skip
// the deprecated `shadow*` props that Metro now warns about.
//
// `card`, `field`, etc. are kept as exports (with empty styles) so existing
// imports don't break — they're effectively no-ops now.

import { ViewStyle } from 'react-native';

type ShadowStyle = ViewStyle & { boxShadow?: string };

// Champagne tint as rgba components, so we can vary alpha cheaply.
const TINT = '184, 148, 93';  // = #B8945D
const INK  = '28, 26, 23';    // = charcoal

export const shadow = {
  // Resting card / field — NO SHADOW. Editorial paper. Hairline border on the
  // component itself carries the lift.
  card: {} as ShadowStyle,
  field: {} as ShadowStyle,

  // Card press / hover — barely there, a single soft champagne wash.
  cardHover: {
    boxShadow: `0 6px 24px rgba(${TINT}, 0.10)`,
  } as ShadowStyle,

  // Primary button — very subtle champagne halo. ~6-8% alpha, low blur.
  btn: {
    boxShadow: `0 1px 2px rgba(${INK}, 0.06), 0 2px 8px rgba(${TINT}, 0.08)`,
  } as ShadowStyle,

  // Button hover — slight increase.
  btnHover: {
    boxShadow: `0 2px 4px rgba(${INK}, 0.08), 0 4px 14px rgba(${TINT}, 0.14)`,
  } as ShadowStyle,

  // Modal — heavier neutral, no brand tint (focus on content).
  modal: {
    boxShadow: `0 20px 60px rgba(${INK}, 0.16), 0 4px 20px rgba(${INK}, 0.08)`,
  } as ShadowStyle,

  // Focus ring — used on Field. Spread-style ring.
  ringPrimary: {
    boxShadow: `0 0 0 3px rgba(${TINT}, 0.18)`,
  } as ShadowStyle,

  // Inset top highlight — unused under the luxury dial; kept for compatibility.
  insetTop: {} as ShadowStyle,
} as const;

export type ShadowToken = keyof typeof shadow;
