/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0a0b0f',
          900: '#0f1117',
          800: '#161922',
          700: '#1e2330',
          600: '#252c3d',
          500: '#2e3650',
        },
        slate: {
          400: '#94a3b8',
          300: '#cbd5e1',
        },
        amber: {
          400: '#fbbf24',
          300: '#fcd34d',
          500: '#f59e0b',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
        sky: {
          400: '#38bdf8',
          500: '#0ea5e9',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease both',
        'slide-up': 'slideUp 0.4s ease both',
        'slide-in-right': 'slideInRight 0.3s ease both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: 0, transform: 'translateX(16px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
