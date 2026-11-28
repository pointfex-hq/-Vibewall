"use client";

import confetti from "canvas-confetti";

let lastFiredAt = 0;
const MIN_INTERVAL_MS = 1500;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lightweight, throttled confetti for meaningful success events.
 * - Respects prefers-reduced-motion (no-op).
 * - Throttled to avoid overlapping effects degrading performance.
 * - Cleans up automatically (canvas-confetti manages its own canvas).
 */
export function fireConfetti(options?: confetti.Options): void {
  if (prefersReducedMotion()) return;
  const now = Date.now();
  if (now - lastFiredAt < MIN_INTERVAL_MS) return;
  lastFiredAt = now;

  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#8B5CF6", "#EC4899", "#22C55E", "#F59E0B", "#3B82F6"],
      disableForReducedMotion: true,
      ...options,
    });
  } catch {
    // Never let confetti break the app.
  }
}

export function fireRoomConfetti(): void {
  fireConfetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
}

export function fireUploadConfetti(): void {
  fireConfetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
}

export function firePollConfetti(): void {
  fireConfetti({ particleCount: 50, spread: 50, origin: { y: 0.5 } });
}
