import type { Config } from "tailwindcss";

// "Frozen water" glass palette. Mirrors the CSS tokens in globals.css; original
// token names are kept so existing page classes re-theme in place: ink =
// deep-water label, rust = glacial tint (blue), sage/amber/red = semantics,
// paper/paper2 = frost fill tints, line = frost hairline.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07253a",
        paper: { DEFAULT: "rgba(255,255,255,0.35)", "2": "rgba(255,255,255,0.50)" },
        paper2: "rgba(255,255,255,0.50)",
        rust: "#0071e3",
        sage: { DEFAULT: "#157f3d", bg: "rgba(52,199,89,0.18)" },
        amber: { DEFAULT: "#b25000", bg: "rgba(255,159,10,0.20)" },
        red: { DEFAULT: "#d70015", bg: "rgba(255,59,48,0.14)" },
        charcoal: "#0c2b40",
        secondary: "rgba(12,43,64,0.58)",
        line: "rgba(12,43,64,0.14)",
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
