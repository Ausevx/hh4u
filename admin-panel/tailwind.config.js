/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {},
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['"Sora"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 32, 39, 0.05), 0 1px 2px -1px rgba(15, 32, 39, 0.05)',
        modal: '0 20px 25px -5px rgba(15, 32, 39, 0.1), 0 8px 10px -6px rgba(15, 32, 39, 0.1)',
      },
    },
  },
  plugins: [],
};
