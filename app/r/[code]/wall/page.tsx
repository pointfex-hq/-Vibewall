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
import { subscribeToRoom, getAuthState } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import ThemeWrapper from "@/components/ThemeWrapper";
import AuthRequiredModal from "@/components/auth/AuthRequiredModal";
import ErrorState from "@/components/ErrorState";
import PhotoCard from "@/components/PhotoCard";
import NoteCard from "@/components/NoteCard";
import PhotoQuotaMeter from "@/components/PhotoQuotaMeter";
import PollCard from "@/components/PollCard";
import StoryStrip from "@/components/StoryStrip";
import ComposerModal, { ComposerMode } from "@/components/ComposerModal";
import VibeCardModal from "@/components/VibeCardModal";
import { Icon } from "@/components/icons";
import { BrandMark, FigmaBottomNav } from "@/components/figma";
import { fireUploadConfetti } from "@/lib/confetti";

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
  const [loadError, setLoadError] = useState<{
    status?: number;
    code?: string;
    message?: string;
    isNetwork?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "photos" | "notes">("all");
  const [copiedToast, setCopiedToast] = useState(false);

  // Optimistic like state owned by the wall; cards derive display from props
  // (authoritative values) + this map while a like is in flight.
  const [optimisticLikes, setOptimisticLikes] = useState<
    Record<string, { liked: boolean; count: number }>
  >({});
  const likeInFlightRef = useRef<Set<string>>(new Set());
  const likeActionIdRef = useRef<Record<string, number>>({});
  const pollInFlightRef = useRef<Set<string>>(new Set());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showActionNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Authentication state + shared auth prompt guard
  const auth = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  /**
   * Runs `action` only when the visitor is authenticated; otherwise opens
   * the shared sign-in prompt so protected requests never hit the API
   * while unauthenticated.
   */
  const guardAction = useCallback(
    async (
      action: () => void | Promise<void> | boolean | Promise<boolean>
    ): Promise<boolean> => {
      if (!auth.isReady) return false;
      if (auth.isAuthenticated) {
        const result = await action();
        // Propagate the action outcome (e.g. optimistic rollback signals) upward.
        return typeof result === "boolean" ? result : true;
      }
      pendingActionRef.current = action as () => void | Promise<void>;
      setIsAuthModalOpen(true);
      return false;
    },
    [auth.isReady, auth.isAuthenticated]
  );

  // Resumes the pending action after successful Google sign-in.
  const handleAuthModalAuthenticated = useCallback(async () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      const result = await action();
      return typeof result === "boolean" ? result : true;
    }
    return true;
  }, []);

  // Floating Composer & Modal states
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDefaultTab, setComposerDefaultTab] = useState<"photo" | "note">("photo");
  const [composerMode, setComposerMode] = useState<ComposerMode>("standard");
  const [storyEntryId, setStoryEntryId] = useState<string | null>(null);
  const [photoCooldownRemaining, setPhotoCooldownRemaining] = useState(0);
  const [noteCooldownRemaining, setNoteCooldownRemaining] = useState(0);

  // Reset composer session state (mode + story target) when closing.
  const resetComposer = () => {
    setIsComposerOpen(false);
    setComposerMode("standard");
    setStoryEntryId(null);
  };

  // VibeCard Modal state
  const [selectedPostForVibeCard, setSelectedPostForVibeCard] = useState<PostDTO | null>(null);

  // Fetch initial room & feed data
  const loadWall = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const preview = await api.getRoomPreview(roomCode);
      setRoom(preview.room);

      const feedData = await api.getFeed(roomCode);
      setFeed(feedData);
    } catch (err: any) {
      console.error("Failed to load wall:", err);
      setLoadError({
        status: err?.status,
        code: err?.code,
        message: err?.message,
        isNetwork: Boolean(err?.isNetwork),
      });
    } finally {
      setIsLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    if (roomCode) loadWall();
  }, [roomCode, loadWall]);

  // Realtime subscription
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = subscribeToRoom(room.id, {
      onRoomClosed: () => setRoom(prev => prev && { ...prev, status: "closed" }),
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
        setFeed((prev) => {
          // Do not let a stale poll_updated overwrite a newly launched poll
          // (issue #26). Only apply when there is no active poll or the ids
          // match.
          if (prev.active_poll && prev.active_poll.id !== poll.id) return prev;
          return { ...prev, active_poll: poll };
        });
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

  // Get the authoritative base like state for a post or note.
  const getLikeBase = (
    targetType: "post" | "note",
    targetId: string
  ): { liked: boolean; count: number } => {
    const findIn = (items: Array<PostDTO | NoteDTO>) =>
      items.find((item) => item.id === targetId);
    const base =
      targetType === "post"
        ? findIn(feed.posts)
        : findIn([...feed.notes, ...feed.pinned_notes]);
    return { liked: Boolean(base?.liked_by_me), count: base?.like_count || 0 };
  };

  // Shared optimistic like action used by photos and notes.
  const runLikeAction = async (
    targetType: "post" | "note",
    targetId: string
  ): Promise<boolean> => {
    // Prevent duplicate requests while a like is in flight.
    if (likeInFlightRef.current.has(targetId)) return false;
    likeInFlightRef.current.add(targetId);

    // Track this action so a delayed/out-of-order response cannot overwrite a
    // newer user action (issue #26).
    const actionId = (likeActionIdRef.current[targetId] || 0) + 1;
    likeActionIdRef.current[targetId] = actionId;

    const base = getLikeBase(targetType, targetId);
    const optimistic = {
      liked: !base.liked,
      count: base.liked ? Math.max(0, base.count - 1) : base.count + 1,
    };
    setOptimisticLikes((prev) => ({ ...prev, [targetId]: optimistic }));

    try {
      const res = await api.toggleLike(targetType, targetId);
      // Ignore stale responses from an earlier toggle.
      if (likeActionIdRef.current[targetId] !== actionId) return true;
      // Reconcile with the authoritative response and update the feed.
      setOptimisticLikes((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      setFeed((prev) => ({
        ...prev,
        posts:
          targetType === "post"
            ? prev.posts.map((p) =>
                p.id === targetId ? { ...p, liked_by_me: res.liked, like_count: res.like_count } : p
              )
            : prev.posts,
        pinned_notes: prev.pinned_notes.map((n) =>
          n.id === targetId ? { ...n, liked_by_me: res.liked, like_count: res.like_count } : n
        ),
        notes: prev.notes.map((n) =>
          n.id === targetId ? { ...n, liked_by_me: res.liked, like_count: res.like_count } : n
        ),
      }));
      return true;
    } catch (err: any) {
      // Only roll back if this is still the latest action.
      if (likeActionIdRef.current[targetId] === actionId) {
        setOptimisticLikes((prev) => {
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
        showActionNotice(err?.message || "Failed to update like. Please try again.");
      }
      return false;
    } finally {
      likeInFlightRef.current.delete(targetId);
    }
  };

  const handlePostLike = async (postId: string): Promise<boolean> => {
    return guardAction(() => runLikeAction("post", postId));
  };

  const handleNoteLike = async (noteId: string): Promise<boolean> => {
    return guardAction(() => runLikeAction("note", noteId));
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
    const poll = feed.active_poll;
    if (!poll) return false;
    // Prevent duplicate votes while a vote request is in flight.
    if (pollInFlightRef.current.has(poll.id)) return false;
    return guardAction(async () => {
      pollInFlightRef.current.add(poll.id);
      try {
        const res = await api.votePoll(poll.id, optionId);
        // Only apply if the same poll is still active (issue #26): a newly
        // launched poll must not be overwritten by a stale vote response.
        setFeed((prev) =>
          prev.active_poll && prev.active_poll.id === poll.id
            ? { ...prev, active_poll: res.poll }
            : prev
        );
        return true;
      } catch (err: any) {
        if (err?.status === 401) {
          const state = await getAuthState().catch(() => null);
          if (!state?.isAuthenticated) {
            showActionNotice("Please sign in to vote in this poll.");
            return false;
          }
        }
        showActionNotice(err?.message || "Failed to vote. Please try again.");
        return false;
      } finally {
        pollInFlightRef.current.delete(poll.id);
      }
    });
  };

  const authorName =
    typeof auth.user?.user_metadata?.full_name === "string"
      ? auth.user.user_metadata.full_name.trim()
      : "";
  const authorAvatar =
    typeof auth.user?.user_metadata?.avatar_url === "string"
      ? auth.user.user_metadata.avatar_url.trim()
      : "";

  const handleSubmitPhoto = async (data: {
    file: File;
    mode: ComposerMode;
    frameId?: string;
    storyId?: string;
  }): Promise<boolean> => {
    return guardAction(async () => {
      if (data.mode === "story-entry") {
        // Chain Story entry — never calls api.createPost().
        const storyId = data.storyId ?? storyEntryId;
        if (!storyId) {
          // The Chain Story is unavailable — do not send an invalid request.
          throw new Error("The Chain Story is no longer available. Try again from the wall.");
        }
        const uploadRes = await api.uploadPhoto(data.file);
        const res = await api.addStoryEntry(storyId, {
          image_url: uploadRes.image_url,
          cloudinary_public_id: uploadRes.cloudinary_public_id,
          author_name: authorName,
        });
        // Update the active story with the new entry (existing state conventions).
        setFeed((prev) => {
          const story = prev.active_story;
          if (!story || story.id !== storyId) return prev;
          const entries = [...story.entries, res.entry];
          return { ...prev, active_story: { ...story, entries } };
        });
        return true;
      }

      // Standard feed photo upload (unchanged behavior).
      const uploadRes = await api.uploadPhoto(data.file);
      const postRes = await api.createPost(roomCode, {
        image_url: uploadRes.image_url,
        cloudinary_public_id: uploadRes.cloudinary_public_id,
        frame_id: data.frameId || "classic",
        author_name: authorName,
        author_avatar: authorAvatar,
      });
      setFeed((prev) => ({
        ...prev,
        posts: [postRes.post, ...prev.posts.filter((p) => p.id !== postRes.post.id)],
      }));
      setPhotoCooldownRemaining(20);
      fireUploadConfetti();
      return true;
    });
  };

  const handleSubmitNote = async (data: { body: string }): Promise<boolean> => {
    return guardAction(async () => {
      const res = await api.createNote(roomCode, data.body, authorName);
      setFeed((prev) => ({
        ...prev,
        notes: [res.note, ...prev.notes.filter((n) => n.id !== res.note.id)],
      }));
      setNoteCooldownRemaining(15);
    });
  };

  if (room?.status === "closed") return <main role="status" className="p-8">This room is closed.</main>;

  if (loadError) {
    return (
      <ThemeWrapper themeKey="midnight-neon">
        <div className="min-h-screen bg-surface text-on-surface">
          <header className="sticky top-0 z-40 w-full border-b border-outline/50 bg-surface/90 pt-safe backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-2 px-4">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-2 text-on-surface transition-colors hover:text-primary"
              >
                <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                  <Icon name="sensors" size={18} />
                </div>
                <span className="font-heading font-extrabold text-xs uppercase tracking-tight text-primary">
                  VibeWall
                </span>
              </Link>
            </div>
          </header>
          <ErrorState
            status={loadError.status}
            code={loadError.code}
            message={loadError.message}
            isNetwork={loadError.isNetwork}
            roomCode={roomCode}
            onRetry={loadWall}
            backHref="/"
            backLabel="Back to Home"
          />
        </div>
      </ThemeWrapper>
    );
  }

  return (
    <ThemeWrapper themeKey={room?.theme || "midnight-neon"}>
      <div className="figma-paper flex min-h-screen flex-col pb-40 text-on-surface md:pb-28">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 w-full border-b border-outline/50 bg-surface/90 pt-safe backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-2 px-4">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 text-on-surface transition-colors hover:text-primary"
            >
              <BrandMark size={34} />
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-xs uppercase tracking-tight text-primary">
                  VibeWall
                </span>
                <span className="max-w-[100px] truncate font-heading text-xs font-bold text-on-surface sm:max-w-[200px]">
                  {room?.title || "Live Wall"}
                </span>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={handleCopyCode}
                className="figma-pill border border-outline/60 px-3 py-1.5 text-xs transition-all hover:text-primary active:scale-95"
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
          {isLoading && (
            <div className="py-16 text-center text-on-surface-variant flex flex-col items-center gap-3">
              <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
              <p className="font-heading font-semibold text-sm">Loading live wall…</p>
            </div>
          )}
          {/* Action notice toast (errors from likes, votes, etc.) */}
          {actionNotice && (
            <div
              role="status"
              className="mx-auto max-w-md p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            >
              <Icon name="error" size={18} />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* 1. Event Hero Banner */}
          <section className="figma-card relative w-full overflow-hidden rounded-3xl">
            <div className="relative h-40 sm:h-48 w-full">
              <Image
                src="/assets/vibrant_university_night_music_festival_stage_with_glowing_violet_and_neon.png"
                alt="Event Stage"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3B2929] via-[#3B2929]/60 to-transparent" />

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

          {/* Photo quota progress meter */}
          <PhotoQuotaMeter current={feed.posts.length} loading={isLoading} />

          {/* 2. Interactive Poll (if active) — keyed by poll id so a new poll resets selection state */}
          {feed.active_poll && (
            <div id="poll" className="scroll-mt-24">
              <PollCard key={feed.active_poll.id} poll={feed.active_poll} onVote={handlePollVote} />
            </div>
          )}

          {/* 3. Chain Story Strip (if active) */}
          {feed.active_story && (
            <div id="chain-story" className="scroll-mt-24">
            <StoryStrip
              story={feed.active_story}
              roomCode={roomCode}
              onAddEntry={() => {
                void guardAction(() => {
                  if (!feed.active_story) return;
                  setComposerMode("story-entry");
                  setStoryEntryId(feed.active_story.id);
                  setComposerDefaultTab("photo");
                  setIsComposerOpen(true);
                });
              }}
            />
            </div>
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
                  optimisticLike={optimisticLikes[note.id] || null}
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
                  optimisticLike={optimisticLikes[post.id] || null}
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
                  optimisticLike={optimisticLikes[note.id] || null}
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
        <div className="pointer-events-none fixed bottom-14 inset-x-0 z-40 bg-gradient-to-t from-surface via-surface/95 to-transparent pt-2 pb-safe md:bottom-0">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center gap-3 pointer-events-auto">
            <button
              onClick={() => {
                void guardAction(() => {
                  setComposerMode("standard");
                  setStoryEntryId(null);
                  setComposerDefaultTab("photo");
                  setIsComposerOpen(true);
                });
              }}
              disabled={!auth.isReady}
              className="figma-primary-btn flex-1 px-4 py-3 text-xs sm:text-sm"
            >
              <Icon name="photo_camera" size={20} />
              <span>Post Photo</span>
            </button>

            <button
              onClick={() => {
                void guardAction(() => {
                  setComposerMode("standard");
                  setStoryEntryId(null);
                  setComposerDefaultTab("note");
                  setIsComposerOpen(true);
                });
              }}
              disabled={!auth.isReady}
              className="figma-amber-btn flex-1 px-4 py-3 text-xs sm:text-sm"
            >
              <Icon name="edit_note" size={20} />
              <span>Write Note</span>
            </button>
          </div>
        </div>

        {/* Figma mobile bottom navigation */}
        <FigmaBottomNav code={roomCode} active="feed" />

        {/* Floating Composer Modal */}
        <ComposerModal
          isOpen={isComposerOpen}
          onClose={resetComposer}
          mode={composerMode}
          storyId={storyEntryId || undefined}
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
