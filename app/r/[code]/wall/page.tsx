"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  FeedResponse,
  PostDTO,
  NoteDTO,
  PollDTO,
  RoomDTO,
  StoryDTO,
} from "@/types/vibewall";
import { api } from "@/lib/api";
import { subscribeToRoom } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import ThemeWrapper from "@/components/ThemeWrapper";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";
import PhotoCard from "@/components/PhotoCard";
import NoteCard from "@/components/NoteCard";
import PollCard from "@/components/PollCard";
import StoryStrip from "@/components/StoryStrip";
import ComposerModal from "@/components/ComposerModal";
import VibeCardModal from "@/components/VibeCardModal";
import { Icon } from "@/components/icons";

export default function LiveSocialWallPage() {
  const params = useParams();
  const roomCode = String(params.code || "").toUpperCase();

  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [feed, setFeed] = useState<FeedResponse>({
    posts: [],
    pinned_notes: [],
    notes: [],
    active_poll: null,
    active_story: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "photos" | "notes">("all");
  const [copiedToast, setCopiedToast] = useState(false);

  // Authentication state + shared auth prompt guard
  const auth = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  /**
   * Runs `action` only when the visitor is authenticated; otherwise opens
   * the shared sign-in prompt so protected requests never hit the API
   * while unauthenticated.
   */
  const guardAction = useCallback(async (action: () => void | Promise<void>) => {
    if (!auth.isReady) return false;
    if (auth.isAuthenticated) {
      await action();
      return true;
    }
    pendingActionRef.current = action;
    setIsAuthModalOpen(true);
    return false;
  }, [auth.isReady, auth.isAuthenticated]);

  // Resumes the pending action after successful Google sign-in.
  const handleAuthModalAuthenticated = useCallback(async () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      await action();
    }
    return true;
  }, []);

  // Floating Composer & Modal states
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDefaultTab, setComposerDefaultTab] = useState<"photo" | "note">("photo");
  const [photoCooldownRemaining, setPhotoCooldownRemaining] = useState(0);
  const [noteCooldownRemaining, setNoteCooldownRemaining] = useState(0);

  // VibeCard Modal state
  const [selectedPostForVibeCard, setSelectedPostForVibeCard] = useState<PostDTO | null>(null);

  // Fetch initial room & feed data
  useEffect(() => {
    async function loadWall() {
      setIsLoading(true);
      try {
        const preview = await api.getRoomPreview(roomCode);
        setRoom(preview.room);

        const feedData = await api.getFeed(roomCode);
        setFeed(feedData);
      } catch (err) {
        console.error("Failed to load wall:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (roomCode) loadWall();
  }, [roomCode]);

  // Realtime subscription
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = subscribeToRoom(room.id, {
      onNewPost: ({ post }) => {
        setFeed((prev) => ({
          ...prev,
          posts: [post, ...prev.posts.filter((p) => p.id !== post.id)],
        }));
      },
      onNewNote: ({ note }) => {
        setFeed((prev) => {
          if (note.is_pinned) {
            return {
              ...prev,
              pinned_notes: [note, ...prev.pinned_notes.filter((n) => n.id !== note.id)],
            };
          } else {
            return {
              ...prev,
              notes: [note, ...prev.notes.filter((n) => n.id !== note.id)],
            };
          }
        });
      },
      onContentModerated: (payload) => {
        setFeed((prev) => {
          if (payload.target_type === "post") {
            if (payload.action === "hide" || payload.action === "delete") {
              return {
                ...prev,
                posts: prev.posts.filter((p) => p.id !== payload.target_id),
              };
            }
          } else if (payload.target_type === "note") {
            if (payload.action === "hide" || payload.action === "delete") {
              return {
                ...prev,
                pinned_notes: prev.pinned_notes.filter((n) => n.id !== payload.target_id),
                notes: prev.notes.filter((n) => n.id !== payload.target_id),
              };
            }
            if (payload.action === "pin") {
              const note =
                prev.notes.find((n) => n.id === payload.target_id) ||
                prev.pinned_notes.find((n) => n.id === payload.target_id);
              if (note) {
                const updated = { ...note, is_pinned: true };
                return {
                  ...prev,
                  pinned_notes: [updated, ...prev.pinned_notes.filter((n) => n.id !== note.id)],
                  notes: prev.notes.filter((n) => n.id !== note.id),
                };
              }
            }
            if (payload.action === "unpin") {
              const note = prev.pinned_notes.find((n) => n.id === payload.target_id);
              if (note) {
                const updated = { ...note, is_pinned: false };
                return {
                  ...prev,
                  pinned_notes: prev.pinned_notes.filter((n) => n.id !== note.id),
                  notes: [updated, ...prev.notes],
                };
              }
            }
          }
          return prev;
        });
      },
      onPollUpdated: ({ poll }) => {
        setFeed((prev) => ({ ...prev, active_poll: poll }));
      },
      onThemeUpdated: ({ theme }) => {
        setRoom((prev) => (prev ? { ...prev, theme } : prev));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [room?.id]);

  // Cooldown timers
  useEffect(() => {
    if (photoCooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setPhotoCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [photoCooldownRemaining]);

  useEffect(() => {
    if (noteCooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setNoteCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [noteCooldownRemaining]);

  // Actions
  const handleCopyCode = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(roomCode);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const handlePostLike = async (postId: string): Promise<boolean> => {
    return guardAction(async () => {
      await api.toggleLike("post", postId);
    });
  };

  const handleNoteLike = async (noteId: string): Promise<boolean> => {
    return guardAction(async () => {
      await api.toggleLike("note", noteId);
    });
  };

  const handleReportPost = async (postId: string) => {
    try {
      const res = await api.reportContent("post", postId);
      if (res.auto_hidden) {
        setFeed((prev) => ({
          ...prev,
          posts: prev.posts.filter((p) => p.id !== postId),
        }));
      }
    } catch (err) {
      console.error("Report error:", err);
    }
  };

  const handleReportNote = async (noteId: string) => {
    try {
      const res = await api.reportContent("note", noteId);
      if (res.auto_hidden) {
        setFeed((prev) => ({
          ...prev,
          pinned_notes: prev.pinned_notes.filter((n) => n.id !== noteId),
          notes: prev.notes.filter((n) => n.id !== noteId),
        }));
      }
    } catch (err) {
      console.error("Report error:", err);
    }
  };

  const handlePollVote = async (optionId: string): Promise<boolean> => {
    if (!feed.active_poll) return false;
    return guardAction(async () => {
      const res = await api.votePoll(feed.active_poll!.id, optionId);
      setFeed((prev) => ({ ...prev, active_poll: res.poll }));
    });
  };

  const handleSubmitPhoto = async (data: {
    file: File;
    frameId: string;
    authorName: string;
  }): Promise<boolean> => {
    return guardAction(async () => {
      const uploadRes = await api.uploadPhoto(data.file);
      const postRes = await api.createPost(roomCode, {
        image_url: uploadRes.image_url,
        cloudinary_public_id: uploadRes.cloudinary_public_id,
        frame_id: data.frameId,
        author_name: data.authorName,
      });
      setFeed((prev) => ({
        ...prev,
        posts: [postRes.post, ...prev.posts.filter((p) => p.id !== postRes.post.id)],
      }));
      setPhotoCooldownRemaining(20);
    });
  };

  const handleSubmitNote = async (data: {
    body: string;
    authorName: string;
  }): Promise<boolean> => {
    return guardAction(async () => {
      const res = await api.createNote(roomCode, data.body, data.authorName);
      setFeed((prev) => ({
        ...prev,
        notes: [res.note, ...prev.notes.filter((n) => n.id !== res.note.id)],
      }));
      setNoteCooldownRemaining(15);
    });
  };

  return (
    <ThemeWrapper themeKey={room?.theme || "midnight-neon"}>
      <div className="flex flex-col min-h-screen bg-surface text-on-surface pb-28">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 w-full pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/30">
          <div className="max-w-2xl mx-auto h-16 px-4 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 group text-on-surface hover:text-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                <Icon name="sensors" size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-xs uppercase tracking-tight text-primary">
                  VibeWall
                </span>
                <span className="font-heading font-bold text-xs text-on-surface truncate max-w-[140px] sm:max-w-[200px]">
                  {room?.title || "Live Wall"}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high border border-outline/50 hover:bg-primary-container/20 hover:text-primary text-xs font-bold text-on-surface transition-all active:scale-95"
                title="Copy Room Invitation Code"
              >
                <span>#{roomCode}</span>
                <Icon name={copiedToast ? "check" : "content_copy"} size={15} />
              </button>

              <Link
                href={`/host/${roomCode}`}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                title="Host Admin Dashboard"
              >
                <Icon name="tune" size={20} />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Feed Container */}
        <main className="max-w-2xl mx-auto w-full px-4 pt-4 flex flex-col gap-5">
          {/* 1. Event Hero Banner */}
          <section className="relative w-full rounded-2xl overflow-hidden bg-surface-container border border-outline shadow-xl">
            <div className="relative h-40 sm:h-48 w-full">
              <Image
                src="/assets/vibrant_university_night_music_festival_stage_with_glowing_violet_and_neon.png"
                alt="Event Stage"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/60 to-transparent" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                </span>
                <span className="font-heading font-bold text-[11px] text-tertiary uppercase tracking-wider">
                  Live Social Wall
                </span>
              </div>
            </div>

            <div className="p-4 pt-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-primary font-bold uppercase tracking-wider">
                  Auditorium Feed
                </span>
                {copiedToast && (
                  <span className="text-xs text-tertiary font-bold animate-pulse">
                    Code #{roomCode} Copied!
                  </span>
                )}
              </div>
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-on-surface leading-tight">
                {room?.title || "Live Festival Wall"}
              </h1>
              <div className="flex items-center gap-1.5 text-on-surface-variant text-xs mt-0.5">
                <Icon name="location_on" size={16} className="text-primary" />
                <span>Central Auditorium • Synchronized Realtime</span>
              </div>
            </div>
          </section>

          {/* 2. Interactive Poll (if active) */}
          {feed.active_poll && (
            <PollCard poll={feed.active_poll} onVote={handlePollVote} />
          )}

          {/* 3. Chain Story Strip (if active) */}
          {feed.active_story && (
            <StoryStrip
              story={feed.active_story}
              roomCode={roomCode}
              onAddEntry={() => {
                void guardAction(() => {
                  setComposerDefaultTab("photo");
                  setIsComposerOpen(true);
                });
              }}
            />
          )}

          {/* Feed Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-outline/30 pb-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All Content ({feed.posts.length + feed.pinned_notes.length + feed.notes.length})
            </button>
            <button
              onClick={() => setActiveTab("photos")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTab === "photos"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Photos ({feed.posts.length})
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeTab === "notes"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Vibe Notes ({feed.pinned_notes.length + feed.notes.length})
            </button>
          </div>

          {/* 4. Pinned Notes (always highlighted at top of feed) */}
          {feed.pinned_notes.length > 0 && activeTab !== "photos" && (
            <div className="flex flex-col gap-3">
              {feed.pinned_notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onLikeToggle={handleNoteLike}
                  onReport={handleReportNote}
                />
              ))}
            </div>
          )}

          {/* 5. Mixed Content Stream (Photos & Unpinned Notes) */}
          <div className="flex flex-col gap-4">
            {activeTab !== "notes" &&
              feed.posts.map((post) => (
                <PhotoCard
                  key={post.id}
                  post={post}
                  onLikeToggle={handlePostLike}
                  onReport={handleReportPost}
                  onExportCard={(p) => setSelectedPostForVibeCard(p)}
                />
              ))}

            {activeTab !== "photos" &&
              feed.notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onLikeToggle={handleNoteLike}
                  onReport={handleReportNote}
                />
              ))}
          </div>

          {feed.posts.length === 0 && feed.notes.length === 0 && (
            <div className="py-16 text-center text-on-surface-variant flex flex-col items-center gap-3">
              <Icon name="photo_camera_back" size={48} className="text-primary/60" />
              <p className="font-heading font-semibold text-sm">
                The wall is ready! Be the first to share a moment.
              </p>
            </div>
          )}
        </main>

        {/* Floating Action Bar / Composer Trigger */}
        <div className="fixed bottom-0 inset-x-0 z-40 pb-safe pt-2 bg-gradient-to-t from-surface via-surface/95 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center gap-3 pointer-events-auto">
            <button
              onClick={() => {
                void guardAction(() => {
                  setComposerDefaultTab("photo");
                  setIsComposerOpen(true);
                });
              }}
              disabled={!auth.isReady}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-on-primary font-heading font-bold text-xs sm:text-sm shadow-[0_0_24px_rgba(139,92,246,0.5)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            >
              <Icon name="photo_camera" size={20} />
              <span>Post Photo</span>
            </button>

            <button
              onClick={() => {
                void guardAction(() => {
                  setComposerDefaultTab("note");
                  setIsComposerOpen(true);
                });
              }}
              disabled={!auth.isReady}
              className="flex-1 py-3 px-4 rounded-2xl bg-surface-container border border-outline text-on-surface hover:text-primary hover:border-primary font-heading font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Icon name="edit_note" size={20} />
              <span>Write Note</span>
            </button>
          </div>
        </div>

        {/* Floating Composer Modal */}
        <ComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          defaultTab={composerDefaultTab}
          onSubmitPhoto={handleSubmitPhoto}
          onSubmitNote={handleSubmitNote}
          photoCooldownRemaining={photoCooldownRemaining}
          noteCooldownRemaining={noteCooldownRemaining}
        />

        {/* VibeCard PNG Exporter Modal */}
        <VibeCardModal
          isOpen={Boolean(selectedPostForVibeCard)}
          onClose={() => setSelectedPostForVibeCard(null)}
          post={selectedPostForVibeCard}
          roomTitle={room?.title || "VibeWall Event"}
          roomCode={roomCode}
        />

        {/* Shared auth prompt for unauthenticated interactive actions */}
        <AuthRequiredModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthenticated={handleAuthModalAuthenticated}
        />
      </div>
    </ThemeWrapper>
  );
}
