"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { StoryDTO, StoryEntryDTO } from "@/types/vibewall";
import { api } from "@/lib/api";
import { validateAndCompressImage } from "@/lib/upload/compress";
import ErrorState from "@/components/ErrorState";
import { useAuth } from "@/lib/auth";
import ThemeWrapper from "@/components/ThemeWrapper";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";
import { Icon } from "@/components/icons";

export default function ChainStoryViewer() {
  const params = useParams();
  const router = useRouter();
  const roomCode = String(params.code || "").toUpperCase();
  const storyId = String(params.storyId || "");

  const [story, setStory] = useState<StoryDTO | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadError, setLoadError] = useState<{
    status?: number;
    code?: string;
    message?: string;
    isNetwork?: boolean;
  } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const auth = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const SEGMENT_DURATION_MS = 6000; // 6 seconds per segment

  /**
   * Guards story contributions: unauthenticated visitors get the shared
   * sign-in prompt instead of reaching the API.
   */
  const guardAction = useCallback(
    async (action: () => void | Promise<void>) => {
      if (auth.isAuthenticated) {
        await action();
        return true;
      }
      setIsAuthModalOpen(true);
      return false;
    },
    [auth.isAuthenticated]
  );

  // Load feed and find current active story
  useEffect(() => {
    async function loadStory() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const feed = await api.getFeed(roomCode);
        if (feed.active_story && feed.active_story.id === storyId) {
          setStory(feed.active_story);
        } else if (feed.active_story) {
          setStory(feed.active_story);
        } else {
          setErrorMessage("Story not found or expired.");
        }
      } catch (err: any) {
        setLoadError({
          status: err?.status,
          code: err?.code,
          message: err?.message,
          isNetwork: Boolean(err?.isNetwork),
        });
      } finally {
        setIsLoading(false);
      }
    }
    if (roomCode) loadStory();
  }, [roomCode, storyId]);

  // Auto-advancing story timer
  useEffect(() => {
    if (!story || story.entries.length === 0 || isPaused) return;

    const interval = 50; // update progress every 50ms
    const step = (interval / SEGMENT_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Advance to next or loop
          setCurrentIndex((curr) => {
            if (curr < story.entries.length - 1) {
              return curr + 1;
            } else {
              return 0; // loop back to first
            }
          });
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [story, isPaused, currentIndex]);

  const handleNext = () => {
    if (!story) return;
    if (currentIndex < story.entries.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      router.push(`/r/${roomCode}/wall`);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const startStoryEntry = async (file: File) => {
    await guardAction(async () => {
      setIsUploading(true);
      setErrorMessage("");
      try {
        const compressed = await validateAndCompressImage(file);
        const uploadRes = await api.uploadPhoto(compressed.file);
        const authorName =
          typeof auth.user?.user_metadata?.full_name === "string"
            ? auth.user.user_metadata.full_name.trim()
            : "";
        const res = await api.addStoryEntry(story!.id, {
          image_url: uploadRes.image_url,
          cloudinary_public_id: uploadRes.cloudinary_public_id,
          author_name: authorName,
        });

        setStory((prev) =>
          prev
            ? {
                ...prev,
                entries: [...prev.entries, res.entry],
              }
            : prev
        );
        setCurrentIndex(story!.entries.length);
        setProgress(0);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to add story entry");
      } finally {
        setIsUploading(false);
      }
    });
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !story) return;

    const ok = await guardAction(() => startStoryEntry(file));
    if (ok === false) {
      // Blocked by the auth guard — allow the user to pick another file.
      e.target.value = "";
    }
  };

  const currentEntry: StoryEntryDTO | undefined = story?.entries[currentIndex];

  return (
    <ThemeWrapper themeKey="midnight-neon">
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none overflow-hidden">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAddPhoto}
        />

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
            <span className="font-heading text-sm">Loading Chain Story...</span>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <ErrorState
                status={loadError.status}
                code={loadError.code}
                message={loadError.message}
                isNetwork={loadError.isNetwork}
                roomCode={roomCode}
                onRetry={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
                backHref={`/r/${roomCode}/wall`}
                backLabel="Back to Wall"
                showHomeButton
              />
            </div>
          </div>
        ) : !story || story.entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
            <Icon name="auto_stories" size={48} className="text-secondary" />
            <h2 className="font-heading font-bold text-lg">No Story Moments Yet</h2>
            <p className="font-body text-xs text-white/70 max-w-xs">
              Be the first to ignite this chain story with a photo!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-5 rounded-full bg-primary text-on-primary font-heading font-bold text-xs shadow-lg"
              >
                Add First Photo
              </button>
              <Link
                href={`/r/${roomCode}/wall`}
                className="py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Return to Wall
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative flex-1 flex flex-col justify-between">
            {/* Background Story Image */}
            <div className="absolute inset-0 z-0">
              {currentEntry && (
                <Image
                  src={currentEntry.image_url}
                  alt={`Story by ${currentEntry.author_name}`}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              {/* Atmospheric Dark Scrims */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/80 pointer-events-none" />
              <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/70 pointer-events-none" />
            </div>

            {/* Top Overlay: Multi-segment Progress Bars & Header */}
            <div className="relative z-20 flex flex-col gap-2 p-4 pt-safe bg-gradient-to-b from-black/90 via-black/50 to-transparent">
              {/* Segmented Progress Bars */}
              <div className="flex items-center gap-1.5 w-full h-1">
                {story.entries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex-1 h-full bg-white/25 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-75"
                      style={{
                        width:
                          idx < currentIndex
                            ? "100%"
                            : idx === currentIndex
                            ? `${progress}%`
                            : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Author & Meta Header */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-primary via-secondary to-tertiary shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden bg-surface-container">
                      <Image
                        src="/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png"
                        alt="Author"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-heading font-bold text-sm text-white truncate">
                      {currentEntry?.author_name || "FestCrew"}
                    </span>
                    <span className="font-body text-[11px] text-secondary font-medium truncate">
                      🔥 {story.prompt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md">
                    <Icon name="visibility" size={15} className="text-tertiary" />
                    <span className="font-body text-xs font-semibold">348</span>
                  </div>
                  <Link
                    href={`/r/${roomCode}/wall`}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white flex items-center justify-center"
                  >
                    <Icon name="close" size={20} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Tap Navigation Zones (Left / Center / Right) */}
            <div className="relative z-10 flex-1 flex">
              {/* Tap Left */}
              <div
                onClick={handlePrev}
                className="w-1/3 h-full cursor-pointer flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="w-8 h-12 rounded-r-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                  <Icon name="chevron_left" size={22} />
                </div>
              </div>

              {/* Center Hold to Pause */}
              <div
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
                className="w-1/3 h-full cursor-pointer"
              />

              {/* Tap Right */}
              <div
                onClick={handleNext}
                className="w-1/3 h-full cursor-pointer flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="w-8 h-12 rounded-l-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                  <Icon name="chevron_right" size={22} />
                </div>
              </div>
            </div>

            {/* Bottom Floating Bar: Add Photo CTA & Thumbnail Reel */}
            <div className="relative z-20 p-4 pb-safe bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-3">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-heading font-semibold text-primary">
                  Moment #{currentIndex + 1} of {story.entries.length}
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/70">
                  {new Date(currentEntry?.created_at || "").toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Add Photo Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-secondary text-on-primary font-heading font-bold text-sm shadow-[0_0_24px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              >
                <Icon name={isUploading ? "progress_activity" : "add_a_photo"} size={20} />
                <span>
                  {isUploading ? "Uploading entry..." : "Add Your Photo to this Chain Story"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shared auth prompt for unauthenticated story contributions */}
      <AuthRequiredModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </ThemeWrapper>
  );
}
