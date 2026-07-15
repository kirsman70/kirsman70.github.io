/* Shared Tailwind CDN config — include on every page, right after
   the cdn.tailwindcss.com <script> tag, so custom colors/fonts work
   everywhere. Edit once here instead of per page. */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#e0465f',
          50: '#fdf0f2', 100: '#fbdde2', 200: '#f5b7c1', 300: '#ee8fa0',
          400: '#e66880', 500: '#e0465f', 600: '#c62e48', 700: '#a3223a',
          800: '#801b30', 900: '#5c1425',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -5px rgba(224,70,95,0.45)',
        'glow-sm': '0 0 20px -4px rgba(224,70,95,0.35)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #e0465f 0%, #b32f47 100%)',
      },
    },
  },
};
