/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        // Larger text sizes for elderly users
        '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.75rem' }],
        '4xl': ['3rem', { lineHeight: '3.5rem' }],
        '5xl': ['4rem', { lineHeight: '4.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      minHeight: {
        'touch': '64px',
      },
      minWidth: {
        'touch': '64px',
      }
    },
  },
  plugins: [],
}
