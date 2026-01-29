import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'charger-red': '#DC143C',
        'charger-dark': '#A01020',
        'gnp-dark': '#2c3e50',
        'gnp-slate': '#34495e',
      },
      fontFamily: {
        'display': ['Archivo Black', 'sans-serif'],
        'body': ['Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
