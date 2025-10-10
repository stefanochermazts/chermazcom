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
          50: '#f2f4f8',
          100: '#e1e6f2',
          200: '#cbd4e7',
          300: '#a8b5d4',
          400: '#3a5297',
          500: '#263f78',
          600: '#1f2f63',
          700: '#182348',
          800: '#121a36',
          900: '#0c1226',
        },
        neutral: {
          500: '#64748b',
          700: '#334155',
          900: '#0f172a',
        },
      },
      ringColor: {
        DEFAULT: '#263f78',
      },
    },
  },
  plugins: [],
  // Abilita le varianti `dark:` quando l'HTML ha classe `darkmode` (usata da accessible-astro-components)
  darkMode: ['selector', '.darkmode'],
}
