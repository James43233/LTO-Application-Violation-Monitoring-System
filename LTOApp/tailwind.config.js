/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./App/**/*.{js,jsx,ts,tsx}", // Includes /App/tab/layout.tsx and index.tsx
    "./components/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
    
  },
  plugins: [],
};
