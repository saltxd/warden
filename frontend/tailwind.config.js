/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00ffff',
          purple: '#a855f7',
          orange: '#fb923c',
        },
      },
      fontFamily: {
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
