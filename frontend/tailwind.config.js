/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'arb-blue': '#2D374B',
        'arb-accent': '#12AAFF',
      }
    },
  },
  plugins: [],
}
