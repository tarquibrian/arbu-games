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
        // Surfaces — translucent so the background glow shows through
        surface: 'rgba(255,255,255,0.045)', // base card
        'surface-hi': 'rgba(255,255,255,0.08)', // pressed / elevated / modal rows
        well: 'rgba(48,224,106,0.12)', // icon wells, accent-tinted chips
        // Hairlines
        hairline: 'rgba(120,230,150,0.14)', // soft green-tinted border
        'hairline-2': 'rgba(255,255,255,0.07)', // neutral divider
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
