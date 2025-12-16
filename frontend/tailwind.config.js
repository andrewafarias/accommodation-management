/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Soft Lavender/Purple
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        // Secondary: Blush/Soft Pink
        secondary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        // Accent: Mint/Sage Green
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Background: Very light cream/off-white
        cream: {
          50: '#fefdfb',
          100: '#fdfbf7',
          200: '#faf7f0',
          300: '#f5f0e6',
          400: '#ede4d3',
          500: '#e2d5c0',
        },
        // Feminine Background: Soft pinks and lilacs
        feminine: {
          50: '#fdf5ff',
          100: '#fcf0ff',
          200: '#fae8ff',
          300: '#f5dbff',
          400: '#f0d0ff',
          500: '#e9c0ff',
        },
      },
      fontFamily: {
        cursive: ['"Dancing Script"', 'cursive'],
        sans: ['Nunito', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(168, 85, 247, 0.12)',
        'soft-lg': '0 10px 40px -3px rgba(168, 85, 247, 0.15)',
        'soft-xl': '0 20px 50px -5px rgba(168, 85, 247, 0.18)',
      },
    },
  },
  plugins: [],
}

