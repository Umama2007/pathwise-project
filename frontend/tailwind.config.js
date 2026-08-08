/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          background: '#0F1E1A',
          surface: '#172A24',
          accent: '#4FD1C5',
          text: '#F3EFE2',
        }
      }
    },
  },
  plugins: [],
}
