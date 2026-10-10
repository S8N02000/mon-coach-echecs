/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        board: {
          dark: '#b58863',
          light: '#f0d9b5'
        }
      }
    },
  },
  plugins: [],
}
