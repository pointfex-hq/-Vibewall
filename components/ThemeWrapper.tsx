"use client";

import React, { useEffect, useState } from "react";
import { ThemeKey } from "@/types/vibewall";
import { getThemeStyles, THEMES } from "@/lib/themes";

interface ThemeWrapperProps {
  themeKey?: ThemeKey;
  children: React.ReactNode;
  className?: string;
}

export default function ThemeWrapper({
  themeKey = "midnight-neon",
  children,
  className = "",
}: ThemeWrapperProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(themeKey);

  useEffect(() => {
    setCurrentTheme(themeKey);
  }, [themeKey]);

  const themeConfig = THEMES[currentTheme] || THEMES["midnight-neon"];
  const styles = getThemeStyles(currentTheme);

  return (
    <div
      style={styles}
      data-theme={currentTheme}
      className={`min-h-screen transition-colors duration-300 ${
        themeConfig.isDark ? "dark" : "light"
      } ${className}`}
    >
      {children}
    </div>
  );
}
