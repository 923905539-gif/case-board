/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        'primary-dark': '#1557b0',
        danger: '#e53935',
        warning: '#fb8c00',
        success: '#43a047',
        info: '#1e88e5',
      }
    },
  },
  plugins: [],
}
