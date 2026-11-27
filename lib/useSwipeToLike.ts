"use client";

import { useCallback, useRef, useState } from "react";

export interface SwipeToLikeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
}

export interface UseSwipeToLikeResult {
  handlers: SwipeToLikeHandlers;
  /** Horizontal offset (px) to apply as a transform while swiping. */
  offset: number;
  /** Whether a swipe is currently in progress. */
  isSwiping: boolean;
}

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [role='button']";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Small, dependency-free horizontal swipe-to-like gesture.
 *
 * - A deliberate horizontal movement past `threshold` triggers `onLike` once.
 * - Vertical movement cancels the gesture (page keeps scrolling).
 * - Touches starting on interactive elements are ignored.
 * - Reduced-motion users get no transform animation (like still fires).
 */
export function useSwipeToLike(
  onLike: () => void,
  options?: { threshold?: number; maxVertical?: number }
): UseSwipeToLikeResult {
  const threshold = options?.threshold ?? 50;
  const maxVertical = options?.maxVertical ?? 15;

  const startX = useRef(0);
  const startY = useRef(0);
  const triggered = useRef(false);
  const active = useRef(false);
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest && target.closest(INTERACTIVE_SELECTOR)) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    triggered.current = false;
    active.current = true;
    setOffset(0);
    setIsSwiping(false);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current || e.touches.length !== 1 || triggered.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // Cancel if vertical movement dominates (allow natural scrolling).
    if (Math.abs(dy) > maxVertical && Math.abs(dy) > Math.abs(dx)) {
      active.current = false;
      setOffset(0);
      setIsSwiping(false);
      return;
    }

    if (Math.abs(dy) <= maxVertical) {
      // Show a subtle horizontal follow while swiping (unless reduced motion).
      if (!prefersReducedMotion()) {
        const clamped = Math.max(-threshold, Math.min(threshold, dx));
        setOffset(clamped * 0.35);
        setIsSwiping(true);
      }
    }

    if (Math.abs(dx) >= threshold && Math.abs(dy) <= maxVertical) {
      triggered.current = true;
      active.current = false;
      setOffset(0);
      setIsSwiping(false);
      onLike();
    }
  }, [onLike, threshold, maxVertical]);

  const onTouchEnd = useCallback(() => {
    active.current = false;
    triggered.current = false;
    setOffset(0);
    setIsSwiping(false);
  }, []);

  const onTouchCancel = onTouchEnd;

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }, offset, isSwiping };
}
