/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6fe',
          200: '#b9ccfd',
          500: '#4169e1',
          600: '#2f54cc',
          700: '#1e3eb8',
          900: '#0d1f6b',
        }
      }
    }
  },
  plugins: []
}
