/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cityu: {
          orange: '#FF6B35',
          red: '#E53E3E',
          'orange-light': '#FF8A65',
          'red-light': '#FC8181',
          'orange-dark': '#E55100',
          'red-dark': '#C53030',
        }
      },
      backgroundImage: {
        'cityu-gradient': 'linear-gradient(135deg, #FF6B35 0%, #E53E3E 100%)',
        'cityu-gradient-light': 'linear-gradient(135deg, #FF8A65 0%, #FC8181 100%)',
      }
    },
  },
  plugins: [],
}