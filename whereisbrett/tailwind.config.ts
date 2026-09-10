import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'media',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        ink: {
          DEFAULT: '#12161f',
          soft: '#1b2230',
        },
        parchment: '#f6f1e6',
        stamp: '#b03a3a',
        board: '#0b0e14',
        amber: {
          board: '#ffb200',
        },
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateX(-90deg)', opacity: '0' },
          '100%': { transform: 'rotateX(0deg)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.82)' },
        },
      },
      animation: {
        flip: 'flip 420ms ease-out both',
        'pulse-dot': 'pulseDot 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
