import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      spacing: {
        "1.5": "0.375rem",
        "2.5": "0.625rem",
        "3.5": "0.875rem",
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "15": "3.75rem",
      },
      colors: {
        ink: {
          DEFAULT: "#0c1115",
          soft: "#1c242c",
        },
        sand: "#f7f1e6",
        paper: "#ffffff",
        "accent-tech": "#0f7ea9",
        "accent-spirit": "#0e615d",
        "accent-mindfold": "#d2a35d",
        muted: "#4b535c",
        line: "#e6e0d8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["clamp(36px, 4vw, 54px)", { lineHeight: "1.05", letterSpacing: "0.02em" }],
        h2: ["clamp(28px, 3vw, 38px)", { lineHeight: "1.1", letterSpacing: "0.02em" }],
        h3: ["22px", { lineHeight: "1.3", letterSpacing: "0.02em" }],
      },
      boxShadow: {
        card: "0 12px 32px rgba(12, 17, 21, 0.08)",
        tile: "0 8px 20px rgba(13, 15, 20, 0.08)",
        tileHover: "0 12px 24px rgba(13, 15, 20, 0.12)",
        primary: "0 15px 40px rgba(14, 97, 93, 0.26)",
        primaryHover: "0 18px 44px rgba(14, 97, 93, 0.32)",
        hero: "0 25px 80px rgba(12, 17, 21, 0.14)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        tile: "16px",
      },
      backgroundImage: {
        "gradient-sand": "radial-gradient(circle at 20% 20%, rgba(210, 163, 93, 0.16), transparent 32%), radial-gradient(circle at 80% 0%, rgba(14, 97, 93, 0.18), transparent 28%), var(--sand)",
        "gradient-primary": "linear-gradient(120deg, var(--accent-spirit) 0%, #0b4e50 100%)",
        "gradient-tech": "linear-gradient(120deg, var(--accent-tech), #0a5f8b)",
        "gradient-mindfold": "linear-gradient(120deg, var(--accent-mindfold), #b07b2c)",
      },
    },
  },
  plugins: [],
};

export default config;
