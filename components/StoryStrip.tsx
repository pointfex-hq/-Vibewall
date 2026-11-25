"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { StoryDTO } from "@/types/vibewall";
import { Icon } from "@/components/icons";

interface StoryStripProps {
  story: StoryDTO | null;
  roomCode: string;
  onAddEntry?: () => void;
}

export default function StoryStrip({
  story,
  roomCode,
  onAddEntry,
}: StoryStripProps) {
  if (!story || !story.is_active) return null;

  return (
    <section className="w-full rounded-2xl bg-surface-container border border-outline/40 p-3.5 shadow-md flex flex-col gap-2.5">
      {/* Story Prompt Title */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon name="auto_stories" size={20} className="text-secondary shrink-0" />
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-secondary truncate">
            CHAIN STORY • {story.entries.length} MOMENTS
          </span>
        </div>
        <Link
          href={`/r/${roomCode}/story/${story.id}`}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
        >
          <span>Watch</span>
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>

      <p className="font-body text-xs md:text-sm text-on-surface font-medium truncate">
        {story.prompt}
      </p>

      {/* Story Ring Avatars List */}
      <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar">
        {/* Add photo to story CTA */}
        <button
          onClick={onAddEntry}
          className="flex flex-col items-center gap-1 shrink-0 group"
          title="Add photo to this chain story"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary/60 flex items-center justify-center bg-primary-container/20 group-hover:border-primary group-hover:bg-primary-container/40 transition-all">
            <Icon name="add_a_photo" size={24} className="text-primary" />
          </div>
          <span className="font-body text-[11px] text-primary font-semibold">
            Add Photo
          </span>
        </button>

        {/* Existing entries */}
        {story.entries.map((entry, idx) => (
          <Link
            key={entry.id}
            href={`/r/${roomCode}/story/${story.id}`}
            className="flex flex-col items-center gap-1 shrink-0 group"
          >
            <div className="relative w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-primary via-secondary to-tertiary group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(236,72,153,0.3)]">
              <div className="relative w-full h-full rounded-full overflow-hidden bg-surface-container-high">
                <Image
                  src={entry.image_url}
                  alt={entry.author_name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface border border-outline flex items-center justify-center text-[9px] font-bold text-on-surface">
                {idx + 1}
              </span>
            </div>
            <span className="font-body text-[11px] text-on-surface-variant group-hover:text-on-surface truncate max-w-[60px] text-center">
              {entry.author_name.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
