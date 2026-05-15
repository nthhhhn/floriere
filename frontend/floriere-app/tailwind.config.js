// Tailwind config — mirrors the source-of-truth tokens in theme/*.ts.
// Both StyleSheet and NativeWind read from the same brand values; this config
// is the bridge for className-style consumption.
//
// Editorial luxury rules:
//   - serif headlines (Georgia)
//   - flat surfaces with hairline borders, almost no shadows
//   - generous spacing scale (xs..huge)

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream:         '#F4EEE6',
        creamSoft:     '#FAF7F2',
        creamRule:     '#EDE6DC',

        charcoal:      '#1C1A17',
        charcoalSoft:  '#2A2622',

        champagne:     '#B8945D',
        champagneSoft: '#D8B988',
        champagneTint: '#FAF1E2',
        champagneBg:   '#F1E6D2',

        plum:          '#3D2C4E',
        plumSoft:      '#5A4470',
        plumBg:        '#E5DEEC',

        ink:           '#3A332D',
        muted:         '#8B7F73',

        danger:        '#A14A3C',
        dangerBg:      '#E9D2CD',
        success:       '#4A6B4E',
        successBg:     '#D8E2D6',

        borderHair:    'rgba(184, 148, 93, 0.08)',
        ringChampagne: 'rgba(184, 148, 93, 0.18)',
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans:  ['system-ui', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Mirrors theme/typography.ts type tokens. The `[fontSize, { lineHeight }]`
        // form lets `text-h1` set both at once.
        eyebrow: ['11px', { lineHeight: '16px', letterSpacing: '2px' }],
        h1:      ['32px', { lineHeight: '38px', letterSpacing: '-0.5px' }],
        h2:      ['24px', { lineHeight: '30px', letterSpacing: '-0.3px' }],
        h3:      ['18px', { lineHeight: '24px', letterSpacing: '-0.1px' }],
        hero:    ['40px', { lineHeight: '46px', letterSpacing: '-0.5px' }],
        body:    ['15px', { lineHeight: '22px' }],
        bodySm:  ['13px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px' }],
        quote:   ['20px', { lineHeight: '28px', letterSpacing: '-0.1px' }],
      },
      borderRadius: {
        // Mirrors theme/spacing.ts radii scale.
        xs2:     '4px',
        xs:      '6px',
        sm:      '8px',
        DEFAULT: '10px',
        md:      '12px',
        lg:      '16px',
        xl:      '20px',
        '2xl':   '24px',
        '3xl':   '32px',
        pill:    '9999px',
      },
      boxShadow: {
        // Toned-down luxury ramp — see theme/shadows.ts. Defaults are flat;
        // only CTAs get a subtle champagne halo.
        none:      'none',
        card:      'none',
        cardHover: '0 6px 24px rgba(184, 148, 93, 0.10)',
        btn:       '0 1px 2px rgba(28, 26, 23, 0.06), 0 2px 8px rgba(184, 148, 93, 0.08)',
        btnHover:  '0 2px 4px rgba(28, 26, 23, 0.08), 0 4px 14px rgba(184, 148, 93, 0.14)',
        modal:     '0 20px 60px rgba(28, 26, 23, 0.16), 0 4px 20px rgba(28, 26, 23, 0.08)',
        ring:      '0 0 0 3px rgba(184, 148, 93, 0.18)',
      },
      spacing: {
        // Mirrors theme/spacing.ts. Tailwind's own scale (p-2 = 8px, etc.)
        // still works alongside these.
        xs:    '4px',
        sm:    '8px',
        md:    '12px',
        lg:    '16px',
        xl:    '24px',
        xxl:   '32px',
        xxxl:  '48px',
        huge:  '72px',
      },
      maxWidth: {
        phone:   '480px',
        tablet:  '720px',
        desktop: '1080px',
      },
    },
  },
  plugins: [],
};
