// Brand palette — sourced from docs/GENESIS.md.
// Single accent (champagne) per screen rule applies — do NOT mix plum + champagne on the same surface.

export const colors = {
  cream:        '#F4EEE6',
  creamSoft:    '#FAF7F2',
  creamRule:    '#EDE6DC',

  charcoal:     '#1C1A17',
  charcoalSoft: '#2A2622',

  champagne:    '#B8945D',
  champagneSoft:'#D8B988',
  // Soft champagne wash — used as a subtle highlight on selected/active surfaces
  // (composer cells, register seller toggle, voucher chips). Lighter than
  // champagneSoft so cream backgrounds stay legible underneath.
  champagneTint:'#FAF1E2',

  plum:         '#3D2C4E',
  plumSoft:     '#5A4470',

  ink:          '#3A332D',
  muted:        '#8B7F73',

  white:        '#FFFFFF',
  danger:       '#A14A3C',
  success:      '#4A6B4E',

  // Tinted backgrounds for tone-chips (Pill, StatusBadge). Each pairs with its
  // matching foreground (champagne/plum/success/danger) at WCAG-passing contrast.
  champagneBg:  '#F1E6D2',
  plumBg:       '#E5DEEC',
  successBg:    '#D8E2D6',
  dangerBg:     '#E9D2CD',

  // ── Shadow / overlay tokens ────────────────────────────────────────────────
  // Used by theme/shadows.ts as rgba components and by web focus rings.
  // Keep these in hex (or rgba strings) — components should never hard-code
  // shadow colors.
  shadowInk:        'rgba(28, 26, 23, 0.06)',
  shadowInkHover:   'rgba(28, 26, 23, 0.10)',
  shadowChampagne:  'rgba(184, 148, 93, 0.18)',  // 18% — resting card halo
  shadowChampagneStrong: 'rgba(184, 148, 93, 0.32)', // press / button halo
  ringChampagne:    'rgba(184, 148, 93, 0.18)',  // focus ring

  // Hairline border at 8% alpha — for refined card outlines.
  borderHair:       'rgba(184, 148, 93, 0.08)',

  // Token aliases used by status badges
  statusPending:        '#8B7F73',
  statusAccepted:       '#3D2C4E',
  statusPreparing:      '#B8945D',
  statusOutForDelivery: '#5A4470',
  statusDelivered:      '#4A6B4E',
  statusCancelled:      '#A14A3C',
} as const;

export type ColorToken = keyof typeof colors;
