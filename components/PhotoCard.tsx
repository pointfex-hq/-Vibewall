"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PostDTO } from "@/types/vibewall";

interface PhotoCardProps {
  post: PostDTO;
  onLikeToggle?: (id: string) => boolean | void | Promise<boolean | void>;
  onReport?: (id: string) => void;
  onExportCard?: (post: PostDTO) => void;
  themeAccent?: string;
}

export default function PhotoCard({
  post,
  onLikeToggle,
  onReport,
  onExportCard,
  themeAccent = "#8B5CF6",
}: PhotoCardProps) {
  const [isLiked, setIsLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [reported, setReported] = useState(false);

  const handleLike = () => {
    const previousLiked = isLiked;
    const previousCount = likeCount;
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 400);
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    const result = onLikeToggle?.(post.id);
    if (result instanceof Promise) {
      result.then((res) => {
        if (res === false) {
          // Blocked by the auth guard — revert the optimistic like.
          setIsLiked(previousLiked);
          setLikeCount(previousCount);
        }
      });
    } else if (result === false) {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) handleLike();
  };

  const handleReport = () => {
    if (confirm("Report this photo to room moderators for inappropriate content?")) {
      setReported(true);
      onReport?.(post.id);
    }
  };

  // Frame styles
  const getFrameClasses = (frameId: string) => {
    switch (frameId) {
      case "neon":
        return "p-2 rounded-2xl bg-gradient-to-tr from-purple-600/40 via-violet-500/20 to-fuchsia-500/40 border border-purple-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]";
      case "fest26":
        return "p-2 rounded-2xl bg-gradient-to-r from-pink-500/40 via-purple-600/30 to-indigo-500/40 border border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.35)]";
      case "sunset":
        return "p-2 rounded-2xl bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-rose-500/30 border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.25)]";
      default:
        return "p-1 rounded-2xl border border-white/10";
    }
  };

  return (
    <article className="relative w-full rounded-2xl bg-surface-container border border-outline overflow-hidden shadow-xl transition-all duration-300 hover:border-primary/40 group">
      {/* Author Header */}
      <div className="flex items-center justify-between p-3.5 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/40 shrink-0 bg-surface-container-high">
            <Image
              src={post.author_avatar || "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png"}
              alt={post.author_name}
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-heading font-bold text-sm text-on-surface truncate">
              {post.author_name}
            </span>
            <span className="font-body text-xs text-on-surface-variant">
              {formatTimeAgo(post.created_at)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onExportCard?.(post)}
            title="Export VibeCard"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
          </button>
          <button
            onClick={handleReport}
            disabled={reported}
            title={reported ? "Reported" : "Report post"}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              reported
                ? "text-danger"
                : "text-on-surface-variant hover:text-danger hover:bg-danger/10"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {reported ? "flag" : "more_vert"}
            </span>
          </button>
        </div>
      </div>

      {/* Photo Frame Container */}
      <div className="px-3 pb-2" onDoubleClick={handleDoubleTap}>
        <div className={`relative overflow-hidden ${getFrameClasses(post.frame_id)}`}>
          <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-surface-container-lowest">
            <Image
              src={post.image_url}
              alt={`Photo by ${post.author_name}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 400px"
            />

            {/* Like animation overlay on double tap */}
            {isLikeAnimating && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined fill text-secondary text-[80px] animate-ping opacity-90 drop-shadow-lg">
                  favorite
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Reaction Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-outline/30 bg-surface-container-low/40">
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 py-1 px-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span
            className={`material-symbols-outlined text-[20px] transition-transform ${
              isLiked
                ? "fill text-secondary scale-110"
                : "text-on-surface-variant hover:text-secondary"
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
          onClick={() => onExportCard?.(post)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-on-surface py-1 px-2.5 rounded-full bg-primary-container/20 hover:bg-primary-container/40 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          <span>VibeCard</span>
        </button>
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
