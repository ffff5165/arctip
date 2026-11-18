/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        navy: {
          950: '#06122b',
          900: '#0a1f44',
          800: '#12306b',
          700: '#1c438f',
        },
        brand: {
          DEFAULT: '#2d6cdf',
          soft: '#e8effc',
          mist: '#f4f7fc',
        },
      },
    },
  },
  plugins: [],
}
