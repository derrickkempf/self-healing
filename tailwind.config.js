/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', "serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: "#000000",
        paper: "#ffffff",
        line: "rgba(255,255,255,0.18)",
        muted: "rgba(255,255,255,0.55)",
        sub: "rgba(255,255,255,0.72)",
      },
      borderRadius: {
        none: "0",
      },
    },
  },
  plugins: [],
};
