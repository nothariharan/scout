import type { Config } from "tailwindcss";

// Palette mirrors the CSS tokens in globals.css (:root). Keep them in sync.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16233d",
        paper: "#f3eee4",
        paper2: "#eae2d2",
        rust: "#b0451f",
        sage: { DEFAULT: "#4f6b4c", bg: "#e4ebe0" },
        amber: { DEFAULT: "#b4791f", bg: "#f3e6c9" },
        charcoal: "#2b2b28",
        line: "#d8cfbb",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
