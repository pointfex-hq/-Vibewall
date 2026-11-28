import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic theme-driven CSS variables
        vw: {
          bg: "var(--vw-bg)",
          card: "var(--vw-card)",
          text: "var(--vw-text)",
          muted: "var(--vw-muted)",
          accent: "var(--vw-accent)",
          border: "var(--vw-border)",
        },
        // Stitch design system token aliases
        surface: "var(--vw-bg)",
        "on-surface": "var(--vw-text)",
        "on-surface-variant": "var(--vw-muted)",
        "surface-container": "var(--vw-card)",
        "surface-container-low": "var(--vw-card-low)",
        "surface-container-high": "var(--vw-card-high)",
        "surface-container-lowest": "var(--vw-card-lowest)",
        primary: "var(--vw-accent)",
        "primary-container": "var(--vw-accent-container)",
        "on-primary": "var(--vw-on-accent)",
        outline: "var(--vw-border)",
        // Figma heritage palette accents
        tertiary: "#C0872B",
        secondary: "#D97C5C",
        success: "#4E8C6A",
        warning: "#D99A2B",
        danger: "#A61C3C",
      },
      boxShadow: {
        figma: "0 8px 24px rgba(86, 45, 40, 0.08)",
        polaroid: "0 10px 30px rgba(86, 45, 40, 0.12)",
      },
      fontFamily: {
        heading: ["var(--font-jakarta)", "sans-serif"],
        body: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
