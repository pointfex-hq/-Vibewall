"use client";

import React, { useState } from "react";
import { NoteDTO } from "@/types/vibewall";
import { Icon } from "@/components/icons";
import { useSwipeToLike } from "@/lib/useSwipeToLike";

interface NoteCardProps {
  note: NoteDTO;
  /** Optimistic like state owned by the parent wall; falls back to note props. */
  optimisticLike?: { liked: boolean; count: number } | null;
  onLikeToggle?: (id: string) => boolean | void | Promise<boolean | void>;
  onReport?: (id: string) => void;
}

export default function NoteCard({
  note,
  optimisticLike,
  onLikeToggle,
  onReport,
}: NoteCardProps) {
  const [reported, setReported] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  // Like state is derived from authoritative feed props; the parent wall
  // supplies optimistic overrides while a like request is in flight.
  const isLiked = optimisticLike ? optimisticLike.liked : note.liked_by_me;
  const likeCount = optimisticLike ? optimisticLike.count : note.like_count;

  const handleLike = () => {
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 400);
    // Parent (wall) owns optimistic toggle + rollback via onLikeToggle.
    onLikeToggle?.(note.id);
  };

  const { handlers: swipeHandlers, offset: swipeOffset } = useSwipeToLike(handleLike, {
    threshold: 50,
    maxVertical: 15,
  });

  const handleReport = () => {
    if (confirm("Report this note to moderators?")) {
      setReported(true);
      onReport?.(note.id);
    }
  };

  return (
    <article
      className={`relative w-full rounded-2xl border p-4 shadow-figma transition-all duration-300 touch-pan-y ${
        note.is_pinned
          ? "border-primary/40 bg-[#FBEAE8]"
          : "border-[#E8C87A] bg-[#F3CE73]"
      }`}
      style={swipeOffset ? { transform: `translateX(${swipeOffset}px)` } : undefined}
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={swipeHandlers.onTouchEnd}
      onTouchCancel={swipeHandlers.onTouchCancel}
    >
      {/* Pinned Badge if applicable */}
      {note.is_pinned && (
        <div className="flex items-center gap-1.5 mb-2 text-primary">
          <Icon name="push_pin" size={16} className="fill" filled />
          <span className="font-heading font-bold text-xs uppercase tracking-wider">
            Pinned Vibe Note
          </span>
        </div>
      )}

      {/* Note Body */}
      <p className="font-body text-sm md:text-base font-semibold leading-relaxed text-[#4A3320] whitespace-pre-wrap break-words">
        {note.body}
      </p>

      {/* Note Meta & Controls */}
      <div className="mt-3 flex items-center justify-between border-t border-[#C0872B]/30 pt-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-[#6E5230]">
          <span className="font-bold text-[#4A3320]">{note.author_name}</span>
          <span>•</span>
          <span>{formatTimeAgo(note.created_at)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 py-1 px-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <Icon
              name="favorite"
              size={18}
              filled={isLiked}
              className={isLiked ? "text-secondary" : "text-on-surface-variant"}
            />
            <span
              className={`font-body font-semibold text-xs ${
                isLiked ? "text-secondary" : "text-on-surface-variant"
              }`}
            >
              {likeCount}
            </span>
          </button>

          <button
            onClick={handleReport}
            disabled={reported}
            className={`p-1 rounded-full transition-colors ${
              reported
                ? "text-danger"
                : "text-on-surface-variant hover:text-danger hover:bg-danger/10"
            }`}
            title="Report note"
          >
            <Icon name={reported ? "flag" : "more_horiz"} size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
