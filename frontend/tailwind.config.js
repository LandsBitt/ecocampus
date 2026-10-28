/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          sunken: 'hsl(var(--surface-sunken))'
        },

        /* UNITAU institutional blue — the brand anchor */
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          foreground: 'hsl(var(--brand-foreground))',
          soft: 'hsl(var(--brand-soft))',
          strong: 'hsl(var(--brand-strong))'
        },

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        subtle: 'hsl(var(--subtle-foreground))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          soft: 'hsl(var(--destructive-soft))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          soft: 'hsl(var(--success-soft))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          soft: 'hsl(var(--warning-soft))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },

        /* Data colors — meaning-carrying, never decorative.
           DEFAULT é a versão para texto (≥ 4,5:1); fill é o preenchimento vivo. */
        water: {
          DEFAULT: 'hsl(var(--water))',
          soft: 'hsl(var(--water-soft))',
          fill: 'hsl(var(--water-fill))'
        },
        energy: {
          DEFAULT: 'hsl(var(--energy))',
          soft: 'hsl(var(--energy-soft))',
          fill: 'hsl(var(--energy-fill))'
        },
        eco: {
          DEFAULT: 'hsl(var(--eco))',
          soft: 'hsl(var(--eco-soft))',
          fill: 'hsl(var(--eco-fill))'
        },
        glass: 'hsl(var(--glass))',
        overlay: 'hsl(var(--overlay))'
      },
      borderRadius: {
        '2xl': '2rem',
        xl: '1.5rem',
        lg: '1.125rem',
        md: '0.875rem',
        sm: '0.625rem'
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Inter Tight"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Tight"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }]
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        focus: '0 0 0 4px hsl(var(--ring) / 0.22)',
        /* Brilho em volta do dado em destaque — nunca de enfeite */
        'glow-water': '0 0 0 1px hsl(var(--water-fill)), 0 0 32px hsl(var(--water-fill) / 0.32)',
        'glow-energy': '0 0 0 1px hsl(var(--energy-fill)), 0 0 32px hsl(var(--energy-fill) / 0.32)',
        'glow-eco': '0 0 0 1px hsl(var(--eco-fill)), 0 0 32px hsl(var(--eco-fill) / 0.28)',
        'glow-brand': '0 10px 30px -12px hsl(var(--brand))'
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)'
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' }
        },
        'slide-out-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        'grow-bar': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        rise: 'rise 0.35s cubic-bezier(0.32, 0.72, 0, 1) both',
        'slide-in-left': 'slide-in-left 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-out-left': 'slide-out-left 0.2s ease-in',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.32, 0.72, 0, 1) both',
        'grow-bar': 'grow-bar 0.6s cubic-bezier(0.32, 0.72, 0, 1) both'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
