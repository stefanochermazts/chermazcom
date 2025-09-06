/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
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
  darkMode: ['class', '.darkmode'],
}
