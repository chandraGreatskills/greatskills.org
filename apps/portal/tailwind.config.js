/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#012652', 50: '#f6faff', 600: '#012f66', 900: '#01162f' },
        green: { DEFAULT: '#6fab2f', light: '#88c24b', deep: '#359706' },
        ink: '#606162',
      },
      fontFamily: {
        serif: ['"Roboto Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 45px -20px rgba(1, 38, 82, 0.28)',
        soft: '0 12px 40px -18px rgba(1, 38, 82, 0.18)',
      },
      backgroundImage: {
        'navy-green': 'linear-gradient(135deg, #012652 0%, #013a6b 55%, #1f6b3a 100%)',
        'green-shine': 'linear-gradient(135deg, #88c24b 0%, #6fab2f 50%, #359706 100%)',
      },
    },
  },
  plugins: [],
}
