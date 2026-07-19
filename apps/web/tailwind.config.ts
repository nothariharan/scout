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
        ink: "#13251f",
        paper: { DEFAULT: "rgba(255,255,255,0.35)", "2": "rgba(255,255,255,0.50)" },
        paper2: "rgba(255,255,255,0.50)",
        rust: "#df5b31",
        sage: { DEFAULT: "#176b4d", bg: "rgba(52,199,89,0.18)" },
        amber: { DEFAULT: "#b25000", bg: "rgba(255,159,10,0.20)" },
        red: { DEFAULT: "#d70015", bg: "rgba(255,59,48,0.14)" },
        charcoal: "#26352f",
        secondary: "#67736d",
        line: "#d7d0c3",
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
