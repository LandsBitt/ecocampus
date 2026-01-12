/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: 'var(--navy)',
        navyLight: 'var(--navy-light)',
        aqua: 'var(--aqua)',
        cyan: 'var(--cyan)',
        slate: 'var(--slate)',
        pearl: 'var(--pearl)',
        sand: 'var(--sand)',
        ember: 'var(--ember)'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif']
      },
      boxShadow: {
        card: '0 20px 60px -40px rgba(8, 19, 36, 0.6)',
        soft: '0 10px 30px -20px rgba(8, 19, 36, 0.5)'
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        rise: 'rise 0.6s ease-out both'
      }
    }
  },
  plugins: []
}
