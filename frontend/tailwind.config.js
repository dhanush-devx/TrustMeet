/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Bebas Neue', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        ink: '#0a0a0a',
        carbon: '#111111',
        ash: '#1a1a1a',
        smoke: '#242424',
        zinc: {
          DEFAULT: '#333333',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
        },
        wire: '#555555',
        fade: '#888888',
        chalk: '#cccccc',
        snow: '#f5f5f5',
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        signal: '#ff6b2b',
        safe: '#22c55e',
        danger: '#ef4444',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #f59e0b33' },
          '100%': { boxShadow: '0 0 20px #f59e0b66, 0 0 40px #f59e0b22' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
