/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark slate base (gym app vibe)
        ink: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
        // Energetic lime-green accent (energy / fitness)
        energy: {
          50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264',
          400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f',
          800: '#3f6212', 900: '#365314',
        },
        // Orange for highlights / CTAs
        flame: {
          50: '#fff7ed', 100: '#ffedd5', 400: '#fb923c', 500: '#f97316',
          600: '#ea580c', 700: '#c2410c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { 'xl': '0.875rem', '2xl': '1.25rem' },
      boxShadow: {
        'card': '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
        'card-hover': '0 10px 25px -5px rgba(15,23,42,0.12)',
        'glow': '0 0 20px rgba(132,204,22,0.25)',
      },
    },
  },
  plugins: [],
}
