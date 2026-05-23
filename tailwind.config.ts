import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary design system ──────────────────
        brand: {
          black:    'var(--brand-black)',
          white:    'var(--brand-white)',
          gray50:   'var(--brand-gray50)',
          gray100:  'var(--brand-gray100)',
          gray200:  'var(--brand-gray200)',
          gray300:  'var(--brand-gray300)',
          gray400:  'var(--brand-gray400)',
          gray500:  'var(--brand-gray500)',
          gray600:  'var(--brand-gray600)',
          gray700:  'var(--brand-gray700)',
          gray800:  'var(--brand-gray800)',
          gray900:  'var(--brand-gray900)',
        },
        // ── Semantic colors ────────────────────────
        success:  '#16A34A',
        warning:  '#D97706',
        danger:   '#DC2626',
        info:     '#2563EB',
        // ── Escrow state colors ────────────────────
        escrow: {
          pending:    '#D97706',
          active:     '#2563EB',
          delivered:  '#7C3AED',
          returning:  '#0891B2',
          completed:  '#16A34A',
          disputed:   '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['4.5rem', { lineHeight: '5rem', letterSpacing: '-0.02em' }],
        'display-xl':  ['3.75rem', { lineHeight: '4.5rem', letterSpacing: '-0.02em' }],
        'display-lg':  ['3rem',    { lineHeight: '3.75rem', letterSpacing: '-0.02em' }],
        'display-md':  ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
        'display-sm':  ['1.875rem',{ lineHeight: '2.375rem' }],
        'display-xs':  ['1.5rem',  { lineHeight: '2rem' }],
      },
      borderRadius: {
        'card':   '16px',
        'button': '24px',
        'input':  '10px',
        'badge':  '6px',
        'pill':   '9999px',
      },
      boxShadow: {
        'card':     '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-md':  '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)',
        'card-lg':  '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.07)',
        'card-xl':  '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.08)',
        'glow-black': '0 0 0 3px rgba(10,10,10,0.12)',
      },
      animation: {
        'fade-in':        'fadeIn 0.4s ease forwards',
        'fade-up':        'fadeUp 0.5s ease forwards',
        'slide-in-right': 'slideInRight 0.35s ease forwards',
        'slide-in-left':  'slideInLeft 0.35s ease forwards',
        'scale-in':       'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'shimmer':        'shimmer 1.5s infinite',
        'pulse-soft':     'pulseSoft 2s ease-in-out infinite',
        'bounce-subtle':  'bounceSubtle 1s ease-in-out infinite',
        'spin-slow':      'spin 3s linear infinite',
        'float':          'float 3s ease-in-out infinite',
        'draw-line':      'drawLine 0.6s ease forwards',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp:       { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideInLeft:  { '0%': { opacity: '0', transform: 'translateX(-24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:      { '0%': { opacity: '0', transform: 'scale(0.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer:      { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        pulseSoft:    { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        bounceSubtle: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        float:        { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-8px)' } },
        drawLine:     { '0%': { strokeDashoffset: '1000' }, '100%': { strokeDashoffset: '0' } },
      },
      transitionTimingFunction: {
        'spring':     'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth':     'cubic-bezier(0.4, 0, 0.2, 1)',
        'snap':       'cubic-bezier(0.77, 0, 0.175, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
