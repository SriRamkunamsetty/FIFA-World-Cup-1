import type { Config } from 'tailwindcss';

// Design tokens for the "night match control room" identity:
// a deep pitch-side navy base, floodlight amber for primary actions,
// pitch green for healthy/resolved states, and coral for incidents.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          bg: '#0B1C26',
          surface: '#122733',
          raised: '#17303D',
          line: '#23414F',
        },
        floodlight: {
          DEFAULT: '#F2A93B',
          soft: '#FBD9A0',
        },
        turf: {
          DEFAULT: '#4CAF7D',
          soft: '#9FE0BE',
        },
        alert: {
          DEFAULT: '#E8604C',
          soft: '#F5B3A8',
        },
        ink: {
          DEFAULT: '#EAF1F3',
          muted: '#93A7B0',
          faint: '#5C7681',
        },
      },
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '14px',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
