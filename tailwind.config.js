/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#cfcfcf', // custom light slate gray
        },
        surface: {
          DEFAULT: '#b8b8b8', // Quick Tasks window background (lighter)
        },
        sidebar: {
          DEFAULT: '#232a36', // dark blue-gray sidebar
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
