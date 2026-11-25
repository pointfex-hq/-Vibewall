"use client";

import React, { useEffect, useState } from "react";
import { PollDTO } from "@/types/vibewall";
import { Icon } from "@/components/icons";

interface PollCardProps {
  poll: PollDTO;
  onVote?: (optionId: string) => boolean | void | Promise<boolean | void>;
  className?: string;
}

export default function PollCard({ poll, onVote, className = "" }: PollCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    poll.user_voted_option_id
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize local selection when the poll identity or its voted state
  // changes (e.g. a new poll launched via realtime) so stale selections from a
  // previous poll are never carried over.
  useEffect(() => {
    setSelectedOptionId(poll.user_voted_option_id);
  }, [poll.id, poll.user_voted_option_id]);

  const hasVoted = Boolean(selectedOptionId);
  const totalVotes = poll.total_votes || 1; // avoid division by 0

  const handleVote = async (optionId: string) => {
    if (hasVoted || isSubmitting) return;
    const previousSelected = selectedOptionId;
    setIsSubmitting(true);
    setSelectedOptionId(optionId);
    try {
      const result = await onVote?.(optionId);
      if (result === false) {
        // Auth guard blocked or the vote failed — revert the optimistic selection.
        setSelectedOptionId(previousSelected);
      }
    } catch {
      // Vote request failed — revert the optimistic selection.
      setSelectedOptionId(previousSelected);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className={`w-full rounded-2xl bg-surface-container border border-outline/50 p-4 shadow-xl flex flex-col gap-3.5 transition-all ${className}`}
    >
      {/* Header telemetry badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
          </span>
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-tertiary">
            LIVE POLL • {poll.total_votes} votes
          </span>
        </div>
        <Icon name="how_to_vote" size={20} className="text-primary" />
      </div>

      {/* Question */}
      <h2 className="font-heading font-bold text-base md:text-lg text-on-surface leading-snug">
        {poll.question}
      </h2>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {poll.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const percentage = Math.round((option.vote_count / totalVotes) * 100);

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || !poll.is_open}
              className={`relative w-full rounded-xl p-3 text-left overflow-hidden transition-all duration-300 active:scale-[0.99] border ${
                isSelected
                  ? "border-primary bg-primary-container/20 ring-1 ring-primary/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                  : "border-outline/40 bg-surface-container-lowest hover:border-outline"
              }`}
            >
              {/* Animated Progress Bar fill */}
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-secondary/30 transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Text & Percentage content */}
              <div className="relative flex items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    name={isSelected ? "check_circle" : "radio_button_unchecked"}
                    size={18}
                    filled={isSelected}
                    className={`shrink-0 ${isSelected ? "text-primary" : "text-on-surface-variant"}`}
                  />
                  <span className="font-body text-sm font-medium text-on-surface truncate">
                    {option.option_text}
                  </span>
                </div>

                {hasVoted && (
                  <span className="font-heading font-bold text-sm text-primary shrink-0">
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {hasVoted && (
        <p className="text-center font-body text-xs text-on-surface-variant">
          ✓ Your vote is recorded in real time
        </p>
      )}
    </section>
  );
}
