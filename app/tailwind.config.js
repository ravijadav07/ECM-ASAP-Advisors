/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8b5cf6',
          600: '#5833EF',
          700: '#3A10CE',
          50: '#F5F3FF',
        },
        ink: { DEFAULT: '#111834', muted: '#6B7280', faint: '#9CA3AF' },
        canvas: { DEFAULT: '#FAFAFF', soft: '#F8F9FC' },
        line: '#F0F0F0',
      },
      borderRadius: { lg: '12px', xl: '14px', '2xl': '16px', '3xl': '24px' },
      boxShadow: {
        card: '0 2px 10px rgba(0,0,0,0.04)',
        'card-hover': '0 12px 24px rgba(0,0,0,0.06)',
        soft: '0 1px 3px rgba(0,0,0,0.05)',
        focus: '0 0 0 3px rgba(139,92,246,0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: { float: 'float 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};