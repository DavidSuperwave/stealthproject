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
        background: '#F4F7F5',
        'bg-secondary': '#FFFFFF',
        'bg-elevated': '#EEF3F0',
        'bg-muted': '#E3ECE7',
        border: '#C9D8D0',
        accent: {
          DEFAULT: '#087A4B',
          secondary: '#075F3D',
          hover: '#075F3D',
        },
        'text-primary': '#0D1F17',
        'text-secondary': '#334B40',
        'text-muted': '#4A6156',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #087A4B 0%, #075F3D 100%)',
      },
    },
  },
  plugins: [],
}

export default config
