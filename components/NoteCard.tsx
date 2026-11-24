"use client";

import React, { useState } from "react";
import { NoteDTO } from "@/types/vibewall";

interface NoteCardProps {
  note: NoteDTO;
  onLikeToggle?: (id: string) => void;
  onReport?: (id: string) => void;
}

export default function NoteCard({
  note,
  onLikeToggle,
  onReport,
}: NoteCardProps) {
  const [isLiked, setIsLiked] = useState(note.liked_by_me);
  const [likeCount, setLikeCount] = useState(note.like_count);
  const [reported, setReported] = useState(false);

  const handleLike = () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    onLikeToggle?.(note.id);
  };

  const handleReport = () => {
    if (confirm("Report this note to moderators?")) {
      setReported(true);
      onReport?.(note.id);
    }
  };

  return (
    <article
      className={`relative w-full rounded-xl p-4 shadow-md transition-all duration-300 border ${
        note.is_pinned
          ? "bg-gradient-to-br from-surface-container via-surface-container to-primary-container/15 border-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
          : "bg-surface-container border-outline/40 hover:border-outline"
      }`}
    >
      {/* Pinned Badge if applicable */}
      {note.is_pinned && (
        <div className="flex items-center gap-1.5 mb-2 text-primary">
          <span className="material-symbols-outlined fill text-[16px]">push_pin</span>
          <span className="font-heading font-bold text-xs uppercase tracking-wider">
            Pinned Vibe Note
          </span>
        </div>
      )}

      {/* Note Body */}
      <p className="font-body text-sm md:text-base text-on-surface leading-relaxed whitespace-pre-wrap break-words">
        {note.body}
      </p>

      {/* Note Meta & Controls */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-outline/20">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
          <span className="font-semibold text-on-surface">{note.author_name}</span>
          <span>•</span>
          <span>{formatTimeAgo(note.created_at)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 py-1 px-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isLiked ? "fill text-secondary" : "text-on-surface-variant"
              }`}
            >
              favorite
            </span>
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
            <span className="material-symbols-outlined text-[16px]">
              {reported ? "flag" : "more_horiz"}
            </span>
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
