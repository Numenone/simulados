import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "system-ui", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        ink: { DEFAULT: "#0f1115", soft: "#1a1d24", line: "#262b35" },
        accent: { DEFAULT: "#4f8cff", soft: "#1e2a44" },
      },
    },
  },
  plugins: [],
} satisfies Config;
