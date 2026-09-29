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
        background: 'var(--bg-background)',
        surface: 'var(--bg-surface)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        textPrimary: 'var(--text-primary)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        premium: ['"Playfair Display"', 'serif'],
      }
    },
  },
  plugins: [],
}
