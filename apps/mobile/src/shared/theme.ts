// Arbu design tokens — single source for style-prop usage (shadows, gradients,
// SVG colors). Class-based styling should use the same tokens registered in
// tailwind.config.js (surface, hairline, muted, …).
export const T = {
  bg: '#08160e',
  ink: '#04230f',

  bright: '#2fe06a',
  brightDeep: '#19c455',
  leaf: '#7fd6a0',

  surface: 'rgba(255,255,255,0.045)',
  surfaceHi: 'rgba(255,255,255,0.08)',
  well: 'rgba(48,224,106,0.12)',
  hairline: 'rgba(120,230,150,0.14)',
  hairline2: 'rgba(255,255,255,0.07)',

  text: '#eaf6ee',
  muted: 'rgba(205,225,212,0.62)',
  faint: 'rgba(205,225,212,0.40)',

  gold: '#ffb020',
  silver: '#c7ced6',
  bronze: '#d08a4e',
} as const

// CTA gradient — identical to the login/onboarding button
export const CTA_GRADIENT = [T.bright, T.brightDeep] as const

// Soft green glow — for primary CTAs (login uses 0.75/18; in-app is quieter)
export const glow = (opacity = 0.35, radius = 12) => ({
  shadowColor: T.bright,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: 8,
})

// Neutral drop shadow — card lift without glow
export const lift = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3,
  shadowRadius: 14,
  elevation: 4,
} as const
