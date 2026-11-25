"use client";

import React, { useState } from "react";
import { NoteDTO } from "@/types/vibewall";
import { Icon } from "@/components/icons";

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

  // Like state is derived from authoritative feed props; the parent wall
  // supplies optimistic overrides while a like request is in flight.
  const isLiked = optimisticLike ? optimisticLike.liked : note.liked_by_me;
  const likeCount = optimisticLike ? optimisticLike.count : note.like_count;

  const handleLike = () => {
    // Parent (wall) owns optimistic toggle + rollback via onLikeToggle.
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
          <Icon name="push_pin" size={16} className="fill" filled />
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
