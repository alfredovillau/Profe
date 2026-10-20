/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#F7F4EE', 2: '#EFEAE1', 3: '#FCFBF8' },
        ink: { DEFAULT: '#111111', 2: '#2A2A2A', soft: '#6B665D', mute: '#9A9488' },
        terra: { DEFAULT: '#C65F3A', light: '#D88363', pale: '#F3DED3' },
        ok: '#4E7A5A',
      },
      fontFamily: {
        sans: ['"Geist"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Geist"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
    },
  },
  plugins: [],
};
