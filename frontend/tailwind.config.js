/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mockup-derived palette
        navy: {
          50: '#f4f6fa',
          100: '#e3e9f1',
          200: '#c4cee0',
          300: '#9aacc8',
          400: '#6b86ad',
          500: '#4a6993',
          600: '#3a547a',
          700: '#2f4263',
          800: '#1a3050',
          900: '#0f2942',
          950: '#091d31',
        },
        teal: {
          50: '#effaf8',
          100: '#d8f1ee',
          200: '#b3e3dd',
          300: '#85cfc7',
          400: '#5cbdb3',
          500: '#3DBDB6',
          600: '#2f9892',
          700: '#287a76',
          800: '#246160',
          900: '#205152',
          950: '#0e2f30',
        },
        cream: {
          DEFAULT: '#f7fafc',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'Rubik', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px rgba(15, 41, 66, 0.08)',
        card: '0 2px 12px rgba(15, 41, 66, 0.06)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        ring: {
          '0%, 100%': { transform: 'rotate(0)' },
          '20%, 60%': { transform: 'rotate(-15deg)' },
          '40%, 80%': { transform: 'rotate(15deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        ring: 'ring 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
