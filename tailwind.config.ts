import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        nav: "#1a1a2e",
        navlight: "#252543",
        accent: "#4772FA",
        "tk-bg": "#F8F8FC",
        "tk-card": "#FFFFFF",
        "tk-text": "#333333",
        "tk-muted": "#8B8FA8",
        "tk-border": "#E8E8F0",
        "tk-amber": "#FFB000",
        "tk-orange": "#FF6700",
        "tk-blue": "#4772FA",
        "tk-blue-light": "#EEF2FF",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
