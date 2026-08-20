import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0c0a0a",
        panel: "#1a1213",
        panelLight: "#241819",
        accent: "#b3242c",
        accentHover: "#8a1820",
        gold: "#d4af37",
        online: "#23a55a",
        muted: "#a39189",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
