/* Shared Tailwind CDN config — include on every page, right after
   the cdn.tailwindcss.com <script> tag, so fonts work everywhere.
   Edit once here instead of per page.

   NOTE: there is no "accent" color here on purpose. Accent colors
   (red for Robotik, blue for Sains, purple for both) change at
   runtime based on the logged-in user's cabang, which Tailwind's
   CDN build can't do — so all accent-* utilities (bg-accent,
   text-accent-300, shadow-glow, bg-accent-gradient, etc.) are
   defined as plain CSS in css/style.css using CSS variables
   instead. See js/theme.js for how the variables get set. */
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
};
