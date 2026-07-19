import type { Config } from "tailwindcss";

// Apple HIG light palette. Mirrors the CSS tokens in globals.css (:root); the
// original token names are kept so existing page classes re-theme in place:
// ink = primary label, rust = system tint (blue), sage/amber/red = semantics.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",
        paper: { DEFAULT: "#f5f5f7", "2": "#e8e8ed" },
        paper2: "#e8e8ed",
        rust: "#0071e3",
        sage: { DEFAULT: "#1d7a3a", bg: "#e6f6ea" },
        amber: { DEFAULT: "#a15c00", bg: "#fff3e0" },
        red: { DEFAULT: "#d70015", bg: "#feeceb" },
        charcoal: "#1d1d1f",
        secondary: "#6e6e73",
        line: "#d2d2d7",
      },
      fontFamily: {
        serif: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Helvetica Neue",
          "sans-serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SF Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
