/** @type {import('tailwindcss').Config} */
module.exports = {
content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",        // If using Expo Router
    "./screens/**/*.{js,jsx,ts,tsx}",    // If you have a screens folder
    "./components/**/*.{js,jsx,ts,tsx}", // If you have a components folder
    "./src/**/*.{js,jsx,ts,tsx}",        // If you put code in src/
],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Main Palette
        primary: "#1A237E",
        secondary: "#3F51B5",
        tertiary: "#5C1800",
        neutral: "#77767D",

        // UI Specific Shades (for buttons & cards)
        "surface-light": "#EEF0F8", // Soft light background for Secondary button
        "surface-dark": "#2B2C34",  // Dark background for Inverted button
      },
    },
  },
  plugins: [],
};