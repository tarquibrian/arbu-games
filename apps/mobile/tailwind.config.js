/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class', // required by NativeWind on web (Expo web verification)
  theme: {
    extend: {
      colors: {
        // — Arbu design tokens (same DNA as login/onboarding) —
        // Base
        canvas: '#08160e', // app background (under ScreenBackground)
        ink: '#04230f', // text on bright green
        // Greens
        bright: '#2fe06a', // primary accent — CTAs & key icons only
        'bright-deep': '#19c455', // gradient partner of bright
        leaf: '#7fd6a0', // quiet green — secondary labels, prices
        // Surfaces — calibrated as flat elevation steps on the pure-black tab
        // screens (their only consumers). Same ladder Apple uses for dark-mode
        // grouped cards on a black canvas (~#1C1C1E, ~#2C2C2E): each tier must
        // read as a distinct step against #000, not rely on an ambient glow.
        // Three tiers: dim (disabled/completed) < surface (live card) < hi (elevated).
        'surface-dim': 'rgba(255,255,255,0.055)', // inactive / disabled / completed
        surface: 'rgba(255,255,255,0.12)', // base card
        'surface-hi': 'rgba(255,255,255,0.17)', // pressed / elevated / modal rows
        well: 'rgba(48,224,106,0.16)', // icon wells, accent-tinted chips
        // Hairlines — toggled OFF (alpha 0) for a borderless flat-card look, à la
        // reference. Same class names stay wired everywhere; to re-enable, restore
        // the alpha (was: hairline 0.24, hairline-2 0.16).
        hairline: 'rgba(120,230,150,0)', // soft green-tinted border
        'hairline-2': 'rgba(255,255,255,0)', // neutral divider
        // Text
        body: '#eaf6ee',
        muted: 'rgba(205,225,212,0.62)',
        faint: 'rgba(205,225,212,0.40)',
        // Legacy ramp (still used by older screens)
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
    },
  },
  plugins: [],
}
