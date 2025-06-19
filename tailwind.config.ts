import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-merriweather)', 'serif'],
        headline: ['var(--font-montserrat)', 'sans-serif'],
        accent: ['var(--font-lora)', 'serif'], // For blockquotes or special text
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      lineHeight: {
        'body': '1.7', // For Merriweather
        'heading': '1.3', // For Montserrat
      },
      typography: (theme: (path: string) => string) => ({
        DEFAULT: {
          css: {
            color: theme('colors.foreground'),
            a: {
              color: theme('colors.primary.DEFAULT'),
              '&:hover': {
                color: theme('colors.primary.DEFAULT'),
                opacity: '0.8',
              },
            },
            h1: {
              fontFamily: theme('fontFamily.headline'),
              fontWeight: theme('fontWeight.bold'),
              color: theme('colors.foreground'),
              lineHeight: theme('lineHeight.heading'),
            },
            h2: {
              fontFamily: theme('fontFamily.headline'),
              fontWeight: theme('fontWeight.semibold'),
              color: theme('colors.foreground'),
              lineHeight: theme('lineHeight.heading'),
            },
            h3: {
              fontFamily: theme('fontFamily.headline'),
              fontWeight: theme('fontWeight.medium'),
              color: theme('colors.foreground'),
              lineHeight: theme('lineHeight.heading'),
            },
            p: {
              fontFamily: theme('fontFamily.body'),
              lineHeight: theme('lineHeight.body'),
              marginTop: '1em',
              marginBottom: '1em',
            },
            blockquote: {
              fontFamily: theme('fontFamily.accent'),
              fontStyle: 'italic',
              color: theme('colors.muted.foreground'),
              borderLeftColor: theme('colors.primary.DEFAULT'),
              paddingLeft: '1em',
              quotes: '"\\201C""\\201D""\\2018""\\2019"',
            },
            'blockquote p:first-of-type::before': {
              content: 'open-quote',
            },
            'blockquote p:last-of-type::after': {
              content: 'close-quote',
            },
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.5em',
              fontFamily: theme('fontFamily.body'),
              lineHeight: theme('lineHeight.body'),
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: '1.5em',
              fontFamily: theme('fontFamily.body'),
              lineHeight: theme('lineHeight.body'),
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            code: {
              fontFamily: theme('fontFamily.code'),
              backgroundColor: theme('colors.muted.DEFAULT'),
              padding: '0.2em 0.4em',
              borderRadius: theme('borderRadius.sm'),
              color: theme('colors.muted.foreground'),
            },
            'code::before': {
              content: 'none',
            },
            'code::after': {
              content: 'none',
            },
            pre: {
               fontFamily: theme('fontFamily.code'),
               backgroundColor: theme('colors.muted.DEFAULT'),
               color: theme('colors.muted.foreground'),
               padding: theme('spacing.4'),
               borderRadius: theme('borderRadius.md'),
               overflowX: 'auto',
            },
            // Ensure prose plugin styles for images, etc., are sensible
            img: {
              marginTop: '2em',
              marginBottom: '2em',
              borderRadius: theme('borderRadius.md'),
            },
          },
        },
      }),
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
