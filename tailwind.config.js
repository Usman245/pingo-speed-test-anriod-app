/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#f2f0ea',
        card: '#ffffff',
        ink: '#0d0d0d',
        lime: '#d6fb41',
        muted1: '#77756d',
        muted2: '#57564f',
        muted3: '#6c6a61',
        track: '#ecebe4',
        dotinactive: '#dcdad2',
        segtrack: '#e6e4dc',
        dashed: '#c9c7bd',
        proxydot: '#d5d3ca',
        danger: '#b3261e',
        dangerbg: '#fdecea',
      },
      fontFamily: {
        o4: ['Outfit_400Regular'],
        o5: ['Outfit_500Medium'],
        o6: ['Outfit_600SemiBold'],
        o7: ['Outfit_700Bold'],
        o8: ['Outfit_800ExtraBold'],
        o9: ['Outfit_900Black'],
      },
      borderRadius: {
        sm: '1px',
        md: '2px',
        lg: '4px',
      },
    },
  },
  plugins: [],
};
