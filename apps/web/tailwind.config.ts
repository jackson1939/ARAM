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
        // ── Brand ──────────────────────────────────────────────────────────
        'green-primary':  '#4BAF47',
        'green-bright':   '#4BAF47',
        'forest':         'var(--forest)',
        'green-mid':      'var(--green)',

        // ── Semantic surface tokens (CSS var → auto dark mode) ──────────────
        'bg-page':        'var(--bg)',
        'card':           'var(--card)',
        'bg-alt':         'var(--alt)',
        'green-light':    'var(--gl)',
        'green-light-2':  'var(--gl2)',
        'black-heading':  'var(--bk)',
        'body-text':      'var(--bt)',
        'muted-text':     'var(--ink3)',
        'border-default': 'var(--bd)',
        'border-dark':    'var(--bdd)',

        // ── Secondary accents ───────────────────────────────────────────────
        'accent-blue':    'var(--slate)',
        'clay':           'var(--clay)',
        'clay-light':     'var(--clay-wash)',
        'slate':          'var(--slate)',
        'slate-light':    'var(--slate-wash)',
        'warning-amber':  'var(--amber)',
        'warning-light':  'var(--wal)',
        'rust':           'var(--rust)',
        'rust-light':     'var(--rust-wash)',

        // ── Material colors ─────────────────────────────────────────────────
        'mat-plastico':    'var(--mat-plastico)',
        'mat-papel':       'var(--mat-papel)',
        'mat-vidrio':      'var(--mat-vidrio)',
        'mat-metal':       'var(--mat-metal)',
        'mat-carton':      'var(--mat-carton)',
        'mat-electronico': 'var(--mat-electronico)',
        'mat-organico':    'var(--mat-organico)',
      },
      fontFamily: {
        sans:    ['Manrope', 'Inter', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Manrope', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'card':   '0 2px 8px rgba(40,38,28,0.06)',
        'card-md':'0 12px 30px -12px rgba(40,38,28,0.16)',
        'green':  '0 14px 34px -10px rgba(47,125,79,0.42)',
      },
      borderRadius: {
        'card':  '14px',
        'input': '9px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
