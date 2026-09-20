/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Trusted Teal Medical Theme Design Tokens
        trusted: {
          accent: {
            DEFAULT: '#0E7C86',
            hover: '#0B646D',
            light: '#EAF5F6',
            dark: '#2DD4C8',
            darkInk: '#04211E',
          },
          bg: {
            DEFAULT: '#FFFFFF',
            dark: '#0A1418',
          },
          surface: {
            DEFAULT: '#F7F9FB',
            tint: '#EAF5F6',
            dark: '#101E22',
            darkTint: 'rgba(45, 212, 200, 0.10)',
          },
          ink: {
            DEFAULT: '#0F2027',
            dim: '#5C7480',
            dark: '#E7F1F3',
            darkDim: '#7E97A0',
          },
          line: {
            DEFAULT: 'rgba(15, 32, 39, 0.08)',
            dark: 'rgba(231, 241, 243, 0.10)',
          },
          warn: {
            bg: '#FFF0EC',
            ink: '#A14A2A',
            darkBg: 'rgba(230, 126, 34, 0.14)',
            darkInk: '#F0B074',
          },
          whatsapp: '#25D366',
          phone: '#1976D2',
        },
      },
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
