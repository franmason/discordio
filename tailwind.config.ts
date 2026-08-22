import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cinza neutro puro (R=G=B) — os valores antigos tinham vermelho
        // levemente mais alto que verde/azul, dava um tom vinho sutil só
        // visível em telas grandes/escuras (era o "cinema", agora não).
        base: "#0a0a0a",
        panel: "#171717",
        panelLight: "#262626",
        // Preto e branco puro: accent (branco quase puro) é o botão/ação
        // primária, gold (cinza claro) é o realce secundário/estado ativo.
        // Nomes antigos mantidos de propósito — trocar em vez de renomear
        // evita reescrever toda referência espalhada pelo app.
        accent: "#f5f5f5",
        accentHover: "#d4d4d4",
        gold: "#e5e5e5",
        online: "#23a55a",
        muted: "#8a8a8a",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
