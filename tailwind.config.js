/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Primary UI font
        sans: [
          'Inter',
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
        inter: ['Inter','Manrope','sans-serif'],
        manrope: ['Manrope','sans-serif'],
        outfit: ['Outfit','Manrope','Inter','sans-serif'],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      colors: {
        brand: {
          cyan: '#00D0FF',
          violet: '#A38BFF',
          success: '#19E68C',
          warning: '#FFA84A',
          text: '#EAEAEA',
          bg: '#0B0B0D',
        },
        background: {
          DEFAULT: '#cfcfcf', // custom light slate gray
        },
        surface: {
          DEFAULT: '#b8b8b8', // Quick Tasks window background (lighter)
        },
        border: {
          DEFAULT: '#e5e7eb', // subtle border
        },
        accent: {
          DEFAULT: '#6366f1', // indigo
        },
      },
      keyframes: {
        tooltip: {
          '0%': { opacity: '0', transform: 'translateY(-95%)' },
          '100%': { opacity: '1', transform: 'translateY(-100%)' }
        }
      },
      animation: {
        tooltip: 'tooltip 0.2s ease-out forwards'
      },
    },
  },
  plugins: []
}
