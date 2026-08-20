/** @type {import('tailwindcss').Config} */
// Pucho.ai brand tokens (violet identity) tuned for a dense financial dashboard.
// Brand: Pucho Violet #5922c6 primary, Violet Blossom #af3db8 secondary.
// Type:  Anek Latin (display/headings), Lato (body), Chivo Mono (figures/accent).
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5922c6', // Pucho Violet
          50: '#F3EEFC',
          100: '#E7DBF9',
          200: '#CDB6F2',
          300: '#B08CE8',
          400: '#8A5CDA',
          500: '#5922c6',
          600: '#4B1CAA', // primary buttons
          700: '#3B1585', // pressed / gradient end
        },
        blossom: { DEFAULT: '#af3db8', 50: '#FBEEFC', 600: '#9A2FA3' }, // Violet Blossom
        ink: { DEFAULT: '#111834', muted: '#5B6178', faint: '#9AA0B4' },
        canvas: { DEFAULT: '#FAF9FE', soft: '#F5F3FB' },
        line: '#ECE9F5',
      },
      borderRadius: { lg: '12px', xl: '14px', '2xl': '16px', '3xl': '24px' },
      boxShadow: {
        card: '0 2px 10px rgba(41,17,92,0.05)',
        'card-hover': '0 14px 30px rgba(41,17,92,0.10)',
        soft: '0 1px 3px rgba(41,17,92,0.06)',
        focus: '0 0 0 3px rgba(89,34,198,0.18)',
        glow: '0 0 22px rgba(89,34,198,0.16)',
      },
      fontFamily: {
        sans: ['Lato', 'Inter', 'SF Pro Text', 'system-ui', 'sans-serif'],
        display: ['"Anek Latin"', 'Lato', 'system-ui', 'sans-serif'],
        mono: ['"Chivo Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
