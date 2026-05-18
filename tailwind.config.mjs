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
      },
      fontFamily: {
        sans:    ['"Barlow Semi Condensed"', 'system-ui', 'sans-serif'],
        heading: ['"Barlow Semi Condensed"', 'system-ui', 'sans-serif'],
        body:    ['"Barlow Semi Condensed"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
