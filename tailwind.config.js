/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      maxWidth: {
        '2xl': '1366px',
        '3xl': '1366px',
        '4xl': '1366px',
        '5xl': '1366px',
        '6xl': '1366px',
      },
      colors: {
        brand: {
          500: '#1f63ff',
          600: '#164cd6',
        },
        neutral: {
          500: '#64748b',
          700: '#334155',
          900: '#0f172a',
        },
      },
      ringColor: {
        DEFAULT: '#1f63ff',
      },
    },
  },
  plugins: [],
  darkMode: ['selector', '[class~="darkmode"], [class~="dark"]'],
}
