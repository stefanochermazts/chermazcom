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
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b3cdff',
          300: '#8db4ff',
          400: '#679bff',
          500: '#1f63ff',
          600: '#164cd6',
          700: '#113aa6',
          800: '#0d2b7a',
          900: '#091d52',
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
  // Abilita le varianti `dark:` quando l'HTML ha classe `darkmode` (usata da accessible-astro-components)
  darkMode: ['selector', '.darkmode'],
}
