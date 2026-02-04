/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#f7f7f8',
        'chat-sidebar': '#202123',
        'chat-hover': '#2a2b32',
        'user-msg': '#ffffff',
        'assistant-msg': '#f7f7f8',
      },
    },
  },
  plugins: [],
};
