import { ThemeKey } from "@/types/vibewall";

export interface ThemeConfig {
  key: ThemeKey;
  name: string;
  description: string;
  bg: string;
  card: string;
  cardLow: string;
  cardHigh: string;
  cardLowest: string;
  text: string;
  muted: string;
  accent: string;
  accentContainer: string;
  onAccent: string;
  border: string;
  isDark: boolean;
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  "midnight-neon": {
    key: "midnight-neon",
    name: "Midnight Neon",
    description: "Deep obsidian void with electromagnetic violet and neon accents",
    bg: "#09090B",
    card: "#18181B",
    cardLow: "#131315",
    cardHigh: "#27272A",
    cardLowest: "#0E0E10",
    text: "#FAFAFA",
    muted: "#A1A1AA",
    accent: "#8B5CF6",
    accentContainer: "rgba(139, 92, 246, 0.2)",
    onAccent: "#FFFFFF",
    border: "#27272A",
    isDark: true,
  },
  "minimal-paper": {
    key: "minimal-paper",
    name: "Minimal Paper",
    description: "Crisp architectural editorial daylight with royal cobalt accents",
    bg: "#F8FAFC",
    card: "#FFFFFF",
    cardLow: "#F1F5F9",
    cardHigh: "#E2E8F0",
    cardLowest: "#FFFFFF",
    text: "#0F172A",
    muted: "#475569",
    accent: "#2563EB",
    accentContainer: "rgba(37, 99, 235, 0.15)",
    onAccent: "#FFFFFF",
    border: "#E2E8F0",
    isDark: false,
  },
  "campus-sunset": {
    key: "campus-sunset",
    name: "Campus Sunset",
    description: "Warm festival twilight dusk with radiant amber & sunset glow",
    bg: "#1C1017",
    card: "#2A1822",
    cardLow: "#22131C",
    cardHigh: "#3A2130",
    cardLowest: "#150B11",
    text: "#FFF1F2",
    muted: "#FDA4AF",
    accent: "#F97316",
    accentContainer: "rgba(249, 115, 22, 0.2)",
    onAccent: "#FFFFFF",
    border: "#4C1D36",
    isDark: true,
  },
  "emerald-fest": {
    key: "emerald-fest",
    name: "Emerald Fest",
    description: "Deep nocturnal canopy with vibrant stage emerald laser pulses",
    bg: "#041410",
    card: "#0A241E",
    cardLow: "#061A15",
    cardHigh: "#10382F",
    cardLowest: "#020B09",
    text: "#ECFDF5",
    muted: "#6EE7B7",
    accent: "#10B981",
    accentContainer: "rgba(16, 185, 129, 0.2)",
    onAccent: "#003824",
    border: "#134E4A",
    isDark: true,
  },
};

export const THEME_KEYS: ThemeKey[] = [
  "midnight-neon",
  "minimal-paper",
  "campus-sunset",
  "emerald-fest",
];

export function getThemeStyles(themeKey: ThemeKey = "midnight-neon"): React.CSSProperties {
  const theme = THEMES[themeKey] || THEMES["midnight-neon"];
  return {
    "--vw-bg": theme.bg,
    "--vw-card": theme.card,
    "--vw-card-low": theme.cardLow,
    "--vw-card-high": theme.cardHigh,
    "--vw-card-lowest": theme.cardLowest,
    "--vw-text": theme.text,
    "--vw-muted": theme.muted,
    "--vw-accent": theme.accent,
    "--vw-accent-container": theme.accentContainer,
    "--vw-on-accent": theme.onAccent,
    "--vw-border": theme.border,
    backgroundColor: theme.bg,
    color: theme.text,
  } as React.CSSProperties;
}
