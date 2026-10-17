/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#012652',
          50: '#f6faff',
          600: '#012f66',
          700: '#012652',
          800: '#011c3e',
          900: '#01162f',
        },
        green: {
          DEFAULT: '#6fab2f',
          light: '#88c24b',
          deep: '#359706',
          bright: '#6fab31',
        },
        ink: '#606162',
      },
      fontFamily: {
        serif: ['"Roboto Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        rubik: ['Rubik', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 45px -20px rgba(1, 38, 82, 0.28)',
        glow: '0 20px 45px -12px rgba(111, 171, 47, 0.55)',
        soft: '0 12px 40px -18px rgba(1, 38, 82, 0.20)',
      },
      backgroundImage: {
        'navy-green': 'linear-gradient(135deg, #012652 0%, #013a6b 55%, #1f6b3a 100%)',
        'green-shine': 'linear-gradient(135deg, #88c24b 0%, #6fab2f 50%, #359706 100%)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'blob': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-20px) scale(1.08)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.96)' },
        },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        blob: 'blob 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
