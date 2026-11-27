"use client";

import React from "react";
import { Icon } from "@/components/icons";

export interface PhotoQuotaMeterProps {
  /** Current number of photos in the room feed. */
  current: number;
  /** Maximum permitted photos. Defaults to 15 (project spec). */
  max?: number;
  /** Loading state. */
  loading?: boolean;
  /** Compact inline badge variant. */
  compact?: boolean;
  className?: string;
}

export default function PhotoQuotaMeter({
  current,
  max = 15,
  loading = false,
  compact = false,
  className = "",
}: PhotoQuotaMeterProps) {
  const safeMax = max > 0 ? max : 15;
  const clamped = Math.min(Math.max(current, 0), safeMax);
  const remaining = Math.max(safeMax - clamped, 0);
  const isFull = clamped >= safeMax;
  const percent = Math.round((clamped / safeMax) * 100);

  if (loading) {
    return (
      <div className={`rounded-2xl bg-surface-container border border-outline/40 p-3 animate-pulse ${className}`}>
        <div className="h-3 bg-outline/20 rounded w-1/2" />
      </div>
    );
  }

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
          isFull
            ? "bg-danger/15 text-danger border-danger/30"
            : "bg-primary-container/20 text-primary border-primary/30"
        } ${className}`}
        aria-label={`${clamped} of ${safeMax} photos uploaded`}
      >
        <Icon name="photo_library" size={12} />
        {clamped} / {safeMax} Photos
      </span>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-surface-container border border-outline/40 p-4 flex flex-col gap-2.5 shadow-md ${className}`}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label="Room photo quota"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon name="photo_library" size={16} className="text-primary" />
          <span className="font-heading font-bold text-xs text-on-surface">
            Photo Quota
          </span>
        </div>
        <span
          className={`font-heading font-extrabold text-sm ${
            isFull ? "text-danger" : "text-on-surface"
          }`}
        >
          {clamped} / {safeMax}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-surface-container-lowest border border-outline/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFull ? "bg-danger" : "bg-gradient-to-r from-primary to-secondary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="font-body text-[11px] text-on-surface-variant">
        {isFull
          ? "Photo limit reached for this room."
          : `${remaining} upload${remaining === 1 ? "" : "s"} remaining`}
      </p>
    </div>
  );
}
