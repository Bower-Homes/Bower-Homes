/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Bower brand palette — oficial
        bower: {
          primary:        '#165C7D',
          'primary-dark': '#041E42',
          'accent-light': '#A4DBE8',
          'accent-warm':  '#D9B48F',
          'gray-blue':    '#768692',
          'gray-light':   '#D9D9D6',
        },
        // Alias semánticos
        brand:           '#165C7D',
        'brand-dark':    '#041E42',
        'surface-muted': '#D9D9D6',
        'text-muted':    '#768692',
        // Escala azul provisional — se elimina en Fase 2.3 cuando no queden referencias
        blue: {
          50:  '#f0f7ff',
          100: '#dbeefe',
          200: '#b6dcfd',
          300: '#75bffa',
          400: '#3899f5',
          500: '#0f7de2',
          600: '#0a5eb8',
          700: '#0b4a90',
          800: '#0e3d70',
          900: '#0a1f3d',
        },
        sky: {
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
