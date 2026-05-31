import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#16a34a',
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Semantic tokens — all reference CSS variables so dark mode is automatic
        'green-primary':  '#4BAF47',
        'green-light':    'var(--gl)',
        'bg-page':        'var(--bg)',
        'black-heading':  'var(--bk)',
        'body-text':      'var(--bt)',
        'border-default': 'var(--bd)',
        'border-dark':    'var(--bdd)',
        'card':           'var(--card)',
        'accent-blue':    '#066AAB',
        'error-red':      '#FF0000',
        'warning-amber':  '#F57F17',
        'warning-light':  'var(--wal)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(180deg, rgba(36,35,29,0.8) 0%, #4BAF47 100%)',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px 0px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'card':  '5px',
        'input': '8px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
