/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mexc: {
          green: '#00c087',
          red: '#ff3b30',
          blue: '#2e8cff',
          bg: '#000000',
          card: '#1a1a1a',
        }
      }
    },
  },
  plugins: [],
}
