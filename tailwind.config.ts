import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#1e1f22",
        panel: "#2b2d31",
        panelLight: "#313338",
        accent: "#5865f2",
        accentHover: "#4752c4",
        online: "#23a55a",
        muted: "#949ba4",
      },
    },
  },
  plugins: [],
};
export default config;
