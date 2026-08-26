/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#080D22',
          900: '#0B1330',
          800: '#121C42',
          700: '#1A2754',
        },
        saffron: {
          50: '#FFF4E6',
          100: '#FFE4C2',
          300: '#FFC069',
          400: '#FFAA45',
          500: '#FF9933',
          600: '#F97B1C',
          700: '#E85D04',
        },
        bharat: {
          green: '#0F9D58',
          greendark: '#0B7A44',
          red: '#E11D2A',
        },
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6B7280',
          300: '#D1D5DB',
          100: '#F3F4F6',
          50: '#F8F9FB',
        },
      },
      fontFamily: {
        display: ['"Poppins"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      backgroundImage: {
        'saffron-gradient': 'linear-gradient(135deg, #FFC069 0%, #FF9933 45%, #F2530C 100%)',
        'tricolor-thread': 'linear-gradient(90deg, #FF9933 0%, #FF9933 33%, #FFFFFF 33%, #FFFFFF 66%, #0F9D58 66%, #0F9D58 100%)',
        'sunset-arch': 'radial-gradient(120% 100% at 50% 0%, #4A2A6B 0%, #A83E5A 35%, #E2673E 60%, #F5A24A 78%, #0B1330 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)',
        pop: '0 8px 24px rgba(249,123,28,0.28)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        heartBeat: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.35)' },
          '60%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        toastIn: {
          '0%': { opacity: 0, transform: 'translate(-50%, 10px)' },
          '100%': { opacity: 1, transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.45s ease both',
        popIn: 'popIn 0.25s cubic-bezier(.34,1.56,.64,1) both',
        heartBeat: 'heartBeat 0.5s ease',
        slideUp: 'slideUp 0.3s cubic-bezier(.32,.72,0,1) both',
        toastIn: 'toastIn 0.25s ease both',
      },
    },
  },
  plugins: [],
}
