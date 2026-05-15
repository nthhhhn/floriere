export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 72,
} as const;

// Radius scale — ported from 360survey. Wider range than the old sm/md/lg/pill
// so components can express subtle differences (pills tighter than inputs,
// hero cards softer than action cards, etc.).
//
// Backward-compatible aliases:
//   - `sm` was 4, now 8.  Old usages of `radii.sm` will get a slightly softer
//     corner, which is what we want (matches 360survey's input-field 10px /
//     ghost button 8px).  If you specifically need 4px, use `radii.xs2`.
//   - `md` was 8, now 12. Cards bump from 8 → 12, which is the intent.
//   - `lg` stays 16.
//   - `pill` stays 9999.
export const radii = {
  xs2:     4,   // hairline corners (badges-within-badges)
  xs:      6,   // tight (small button)
  sm:      8,   // default (small inputs, badges)
  DEFAULT: 10,  // 360's default — used on buttons/inputs
  md:      12,  // primary card radius (replaces old 8)
  lg:      16,  // hero card / glass surface
  xl:      20,  // large card / sheet
  xxl:     24,  // hero panel
  xxxl:    32,  // hero illustration frame
  pill:    9999,
  full:    9999,
} as const;

// Content max-widths — desktop web should center the phone-ish frame, not sprawl.
export const widths = {
  phoneMax:   480,
  tabletMax:  720,
  desktopMax: 1080,
} as const;
