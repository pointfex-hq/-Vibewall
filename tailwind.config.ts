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
        tertiary: "#10B981",
        secondary: "#EC4899",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["Inter", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
