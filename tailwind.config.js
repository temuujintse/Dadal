/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
        },
        family: {
          cream: '#fffaf5',
          mint: '#ecfdf5',
          lavender: '#faf5ff',
          ink: '#111827',
        },
      },
    },
  },
  plugins: [],
};
