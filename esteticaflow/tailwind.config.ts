import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rose: {
          50: "#fff8f7",
          100: "#ffefed",
          200: "#f8d8d4",
          300: "#edb6ae",
          400: "#dc9188",
          500: "#c87870",
          600: "#ac615c",
          700: "#8d4e4b",
        },
        ink: "#322b2a",
        muted: "#8b817e",
        canvas: "#fbf8f6",
      },
      boxShadow: {
        soft: "0 10px 35px rgba(68, 43, 38, 0.06)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-display)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
