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

/**
 * Figma design tokens — "Heritage Wall" palette.
 * Warm ivory canvas, handmade-paper cards, deep burgundy primary and
 * terracotta / marigold heritage accents. Kept on the existing theme keys so
 * every existing room, screen and dashboard inherits the design automatically.
 */
export const THEMES: Record<ThemeKey, ThemeConfig> = {
  "midnight-neon": {
    key: "midnight-neon",
    name: "Midnight Katha",
    description: "Ivory paper canvas with deep burgundy and marigold storytelling accents",
    bg: "#FFF8F5",
    card: "#FFFFFF",
    cardLow: "#FFF0EA",
    cardHigh: "#FCE3D9",
    cardLowest: "#FFFCFA",
    text: "#3B2929",
    muted: "#7C6160",
    accent: "#A61C3C",
    accentContainer: "rgba(166, 28, 60, 0.10)",
    onAccent: "#FFFFFF",
    border: "#F2D9D1",
    isDark: false,
  },
  "minimal-paper": {
    key: "minimal-paper",
    name: "Minimal Paper",
    description: "Clean ivory editorial paper with a quiet rosewood accent",
    bg: "#FFFBF8",
    card: "#FFFFFF",
    cardLow: "#FDF2EE",
    cardHigh: "#F6E3DB",
    cardLowest: "#FFFFFF",
    text: "#3A2A28",
    muted: "#7A6260",
    accent: "#8E3240",
    accentContainer: "rgba(142, 50, 64, 0.10)",
    onAccent: "#FFFFFF",
    border: "#EFDDD6",
    isDark: false,
  },
  "campus-sunset": {
    key: "campus-sunset",
    name: "Campus Sunset",
    description: "Golden-hour campus warmth with terracotta and amber highlights",
    bg: "#FFF6EE",
    card: "#FFFFFF",
    cardLow: "#FFF0E1",
    cardHigh: "#F9DFC4",
    cardLowest: "#FFFCF8",
    text: "#4A3023",
    muted: "#8A6A55",
    accent: "#D07A32",
    accentContainer: "rgba(208, 122, 50, 0.12)",
    onAccent: "#FFFFFF",
    border: "#F3DCC6",
    isDark: false,
  },
  "emerald-fest": {
    key: "emerald-fest",
    name: "Emerald Fest",
    description: "Festival greens on warm paper with heritage gold detailing",
    bg: "#F7FBF6",
    card: "#FFFFFF",
    cardLow: "#EDF6EE",
    cardHigh: "#DDEFE0",
    cardLowest: "#FCFFFC",
    text: "#263A31",
    muted: "#5F786B",
    accent: "#2F7D5B",
    accentContainer: "rgba(47, 125, 91, 0.12)",
    onAccent: "#FFFFFF",
    border: "#D8EADF",
    isDark: false,
  },
  "shanta-after-dark": {
    key: "shanta-after-dark",
    name: "Shanta After Dark",
    description: "Quiet evening burgundy with rose-gold lamplight accents",
    bg: "#2A1118",
    card: "#3A1A24",
    cardLow: "#31151E",
    cardHigh: "#4A2230",
    cardLowest: "#260E14",
    text: "#FDECEF",
    muted: "#D6AAB6",
    accent: "#E39AAB",
    accentContainer: "rgba(227, 154, 171, 0.16)",
    onAccent: "#2A1118",
    border: "#5A2A38",
    isDark: true,
  },
  "rustic-carnival": {
    key: "rustic-carnival",
    name: "Rustic Carnival",
    description: "Marigold fairground paper with earthy terracotta ink",
    bg: "#FFF4E3",
    card: "#FFFFFF",
    cardLow: "#FFEBD0",
    cardHigh: "#F7D9A8",
    cardLowest: "#FFFAF0",
    text: "#4A3320",
    muted: "#8A6A45",
    accent: "#B96A24",
    accentContainer: "rgba(185, 106, 36, 0.12)",
    onAccent: "#FFFFFF",
    border: "#F0DCB8",
    isDark: false,
  },
};

export const THEME_KEYS: ThemeKey[] = [
  "midnight-neon",
  "minimal-paper",
  "campus-sunset",
  "emerald-fest",
  "shanta-after-dark",
  "rustic-carnival",
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
