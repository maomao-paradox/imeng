/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dream: {
          paper: '#faf8f5',
          night: '#191821',
          card: '#23222d',
          ink: '#292a38',
          mist: '#eeeaf5',
          muted: '#858391',
          'muted-dark': '#aaa5b5',
          line: '#ece9e5',
          'line-dark': '#353340',
          violet: {
            DEFAULT: '#7166a8',
            dark: '#5e548f',
            soft: '#f0eef7',
            deep: '#302b40',
          },
        },
      },
      fontFamily: {
        'dream-serif': ['Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
