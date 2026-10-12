/** @type {import('tailwindcss').Config} */
// Colours are RGB-channel CSS variables (see globals.css) so alpha modifiers work
// (`bg-primary/10`) and both themes share one set of class names.
const c = (name) => `rgb(var(--rgb-${name}) / <alpha-value>)`

module.exports = {
  darkMode: 'class',
  // hover: styles only apply on devices that can really hover, so taps on phones never leave a
  // "stuck" hover state behind (use `active:` for pressed feedback).
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: c('bg'),
        secondary: c('inset'), // inputs / wells
        tertiary: c('tertiary'), // chips, tracks
        surface: {
          DEFAULT: c('surface'),
          hover: c('surface-hover'),
          raised: c('surface-raised'),
        },
        border: {
          DEFAULT: c('border'),
          strong: c('border-strong'),
          control: c('control'), // >= 3:1 boundary for inputs/checkboxes
        },

        // Brand + status fills. For TEXT use text-primary/-success/... (mapped to "ink" below).
        primary: {
          DEFAULT: c('primary'),
          hover: c('primary-hover'),
          active: c('primary-active'),
          soft: 'var(--primary-soft)',
        },
        success: { DEFAULT: c('success'), soft: 'var(--success-soft)' },
        warning: { DEFAULT: c('warning'), soft: 'var(--warning-soft)' },
        danger: { DEFAULT: c('danger'), hover: c('danger-hover'), soft: 'var(--danger-soft)' },

        // Text
        text: {
          primary: c('text'),
          secondary: c('text-2'),
          muted: c('text-3'),
        },
      },
      // text-primary etc. use the AA-safe "ink" variants (fills are too light/dark for text)
      textColor: {
        primary: c('primary-ink'),
        success: c('success-ink'),
        warning: c('warning-ink'),
        danger: c('danger-ink'),
      },
      ringColor: {
        DEFAULT: c('primary'),
      },
      ringOffsetColor: {
        DEFAULT: c('surface'),
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow-sm)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        pop: 'var(--shadow-pop)',
        btn: 'var(--shadow-btn)',
        'btn-primary': 'var(--shadow-btn-primary)',
      },
      borderRadius: {
        // controls = lg (0.5rem), cards/dialogs = 2xl (1rem)
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      zIndex: {
        header: '40',
        menu: '70',
        dialog: '80',
        toast: '95',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      animation: {
        'fade-in': 'tw-fade-in 150ms ease-out both',
        'fade-out': 'tw-fade-out 150ms ease-in both',
        'dialog-in': 'tw-dialog-in 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'dialog-out': 'tw-dialog-out 150ms ease-in both',
        'sheet-in': 'tw-sheet-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'sheet-out': 'tw-sheet-out 150ms ease-in both',
        'pop-in': 'tw-pop-in 120ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'toast-in': 'tw-toast-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        shimmer: 'tw-shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
