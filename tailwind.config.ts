import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D0D0F',
        'bg-secondary': '#1A1A1F',
        'bg-elevated': '#25252B',
        border: '#2D2D35',
        accent: {
          DEFAULT: '#E040FB',
          secondary: '#B027F7',
          hover: '#F062FE',
        },
        'text-primary': '#FFFFFF',
        'text-secondary': '#9CA3AF',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #E040FB 0%, #B027F7 100%)',
      },
    },
  },
  plugins: [],
}

export default config
