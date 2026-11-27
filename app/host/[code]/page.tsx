"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  FeedResponse,
  PostDTO,
  NoteDTO,
  PollDTO,
  RealtimeEventPayloads,
  RoomDTO,
  StoryDTO,
  ThemeKey,
} from "@/types/vibewall";
import { api } from "@/lib/api";
import { subscribeToRoom } from "@/lib/supabase";
import { THEMES, THEME_KEYS } from "@/lib/themes";
import ThemeWrapper from "@/components/ThemeWrapper";
import { Icon } from "@/components/icons";
import ErrorState from "@/components/ErrorState";

/**
 * Realtime sync helpers for the host dashboard (Section 6.3 — Realtime).
 * All handlers use functional state updates so newer local state is never
 * overwritten by stale event data, and new items are deduped by id.
 */
function applyNewPost(prev: FeedResponse, post: PostDTO): FeedResponse {
  if (prev.posts.some((p) => p.id === post.id)) return prev;
  return { ...prev, posts: [post, ...prev.posts] };
}

function applyNewNote(prev: FeedResponse, note: NoteDTO): FeedResponse {
  if (
    prev.pinned_notes.some((n) => n.id === note.id) ||
    prev.notes.some((n) => n.id === note.id)
  ) {
    return prev;
  }
  if (note.is_pinned) {
    return { ...prev, pinned_notes: [note, ...prev.pinned_notes.filter((n) => n.id !== note.id)] };
  }
  return { ...prev, notes: [note, ...prev.notes.filter((n) => n.id !== note.id)] };
}

function applyModeration(
  prev: FeedResponse,
  targetType: RealtimeEventPayloads["content_moderated"]["target_type"],
  targetId: string,
  action: RealtimeEventPayloads["content_moderated"]["action"]
): FeedResponse {
  if (targetType === "post") {
    const posts = prev.posts.map((p) =>
      p.id === targetId
        ? { ...p, visibility: action === "hide" ? ("hidden" as const) : ("approved" as const) }
        : p
    );
    if (action === "delete") {
      return { ...prev, posts: posts.filter((p) => p.id !== targetId) };
    }
    return { ...prev, posts };
  }
  if (targetType === "note") {
    if (action === "delete") {
      return {
        ...prev,
        pinned_notes: prev.pinned_notes.filter((n) => n.id !== targetId),
        notes: prev.notes.filter((n) => n.id !== targetId),
      };
    }
    const applyToNote = (n: NoteDTO): NoteDTO => {
      let updated = n;
      if (action === "pin") updated = { ...updated, is_pinned: true };
      if (action === "unpin") updated = { ...updated, is_pinned: false };
      if (action === "hide" || action === "restore") {
        updated = {
          ...updated,
          moderation_status: action === "hide" ? "hidden" : "approved",
        };
      }
      return updated;
    };
    const pinned_notes = prev.pinned_notes.map((n) => (n.id === targetId ? applyToNote(n) : n));
    const notes = prev.notes.map((n) => (n.id === targetId ? applyToNote(n) : n));
    return { ...prev, pinned_notes, notes };
  }
  return prev;
}

export default function HostDashboardPage() {
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

  const [activeTab, setActiveTab] = useState<
    "moderation" | "themes" | "engagement" | "settings"
  >("moderation");
  const [modFilter, setModFilter] = useState<"active" | "hidden">("active");
  const [screenUrl, setScreenUrl] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{
    status?: number;
    code?: string;
    message?: string;
    isNetwork?: boolean;
  } | null>(null);

  // Poll creation form
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOption1, setPollOption1] = useState("");
  const [pollOption2, setPollOption2] = useState("");
  const [pollOption3, setPollOption3] = useState("");
  const [pollOption4, setPollOption4] = useState("");
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);

  // Story creation form
  const [storyPrompt, setStoryPrompt] = useState("");
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const preview = await api.getRoomPreview(roomCode);
      if (!preview.is_owner) {
        const err = new Error("You are not the owner of this room.") as any;
        err.status = 403;
        err.code = "FORBIDDEN";
        throw err;
      }
      setRoom(preview.room);

      const feedData = await api.getFeed(roomCode, true);
      setFeed(feedData);

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      // Resolve venue screen URL from the room's actual screen token (issue #24).
      let resolvedScreenUrl = preview.screen_url;
      const screenToken = preview.screen_token || preview.room?.screen_token;
      if (!resolvedScreenUrl && screenToken) {
        resolvedScreenUrl = `${origin}/screen/${encodeURIComponent(screenToken)}`;
      }
      if (resolvedScreenUrl) setScreenUrl(resolvedScreenUrl);

      const qr = await QRCode.toDataURL(`${origin}/r/${roomCode}`, {
        width: 320,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrCodeUrl(qr);
    } catch (err: any) {
      console.error("Dashboard load failed:", err);
      setLoadError({
        status: err?.status,
        code: err?.code,
        message: err?.message,
        isNetwork: Boolean(err?.isNetwork),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (roomCode) loadData();
  }, [roomCode]);

  // Realtime synchronization with the room (Section 6.3 — Realtime).
  // Subscribes only after the room has loaded, cleans up on unmount/room change.
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = subscribeToRoom(room.id, {
      onNewPost: ({ post }) => {
        setFeed((prev) => applyNewPost(prev, post));
      },
      onNewNote: ({ note }) => {
        setFeed((prev) => applyNewNote(prev, note));
      },
      onContentModerated: (payload) => {
        setFeed((prev) =>
          applyModeration(prev, payload.target_type, payload.target_id, payload.action)
        );
      },
      onPollUpdated: ({ poll }) => {
        // Mirror the live wall: poll_updated carries the authoritative active poll.
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

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Moderation Actions
  const handleModerate = async (
    targetType: "post" | "note" | "story_entry",
    targetId: string,
    action: "pin" | "unpin" | "hide" | "restore" | "delete"
  ) => {
    if (!room) return;
    if (action === "delete" && !confirm("Permanently delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      await api.moderateContent({
        room_id: room.id,
        target_type: targetType,
        target_id: targetId,
        action,
      });
      showToast(`Action "${action}" completed successfully`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Moderation action failed");
    }
  };

  // Theme Switching
  const handleThemeChange = async (themeKey: ThemeKey) => {
    if (!room) return;
    try {
      const res = await api.updateRoom(room.code, { theme: themeKey });
      setRoom(res.room);
      showToast(`Room theme switched to ${THEMES[themeKey].name}`);
    } catch (err: any) {
      alert(err.message || "Failed to update theme");
    }
  };

  // Rotate screen token
  const handleRotateToken = async () => {
    if (!room) return;
    if (!confirm("Rotate screen token? Existing projector displays will need the new link.")) return;
    try {
      const res = await api.updateRoom(room.code, { rotate_screen_token: true });
      if (res.screen_url) setScreenUrl(res.screen_url);
      showToast("Screen display token rotated successfully");
    } catch (err: any) {
      alert(err.message || "Failed to rotate token");
    }
  };

  // Close room
  const handleCloseRoom = async () => {
    if (!room) return;
    if (!confirm("Close this room? Participants will no longer be able to submit posts.")) return;
    try {
      const res = await api.updateRoom(room.code, { status: "closed" });
      setRoom(res.room);
      showToast("Room closed successfully");
    } catch (err: any) {
      alert(err.message || "Failed to close room");
    }
  };

  // Poll Creation
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    const opts = [pollOption1, pollOption2, pollOption3, pollOption4].filter(
      (o) => o.trim().length > 0
    );
    if (opts.length < 2) {
      alert("Please provide at least 2 poll options");
      return;
    }

    setIsCreatingPoll(true);
    try {
      const res = await api.createPoll(roomCode, {
        question: pollQuestion.trim(),
        options: opts,
      });
      setFeed((prev) => ({ ...prev, active_poll: res.poll }));
      setPollQuestion("");
      setPollOption1("");
      setPollOption2("");
      setPollOption3("");
      setPollOption4("");
      showToast("New live poll launched!");
    } catch (err: any) {
      alert(err.message || "Failed to create poll");
    } finally {
      setIsCreatingPoll(false);
    }
  };

  // Chain Story Creation
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyPrompt.trim()) return;

    setIsCreatingStory(true);
    try {
      const res = await api.createStory(roomCode, storyPrompt.trim());
      setFeed((prev) => ({ ...prev, active_story: res.story }));
      setStoryPrompt("");
      showToast("New Chain Story prompt launched!");
    } catch (err: any) {
      alert(err.message || "Failed to launch story");
    } finally {
      setIsCreatingStory(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`);
    }
  };

  if (loadError) {
    return (
      <ThemeWrapper themeKey="midnight-neon">
        <div className="min-h-screen bg-surface text-on-surface">
          <header className="sticky top-0 z-40 w-full pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/30">
            <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2 group text-on-surface hover:text-primary transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                  <Icon name="admin_panel_settings" size={18} />
                </div>
                <span className="font-heading font-extrabold text-xs uppercase tracking-tight text-primary">
                  Host Admin Dashboard
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
            onRetry={loadData}
            backHref="/"
            backLabel="Back to Home"
          />
        </div>
      </ThemeWrapper>
    );
  }

  return (
    <ThemeWrapper themeKey={room?.theme || "midnight-neon"}>
      <div className="flex flex-col min-h-screen bg-surface text-on-surface">
        {/* Top Header */}
        <header className="sticky top-0 z-40 w-full pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/30">
          <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/r/${roomCode}/wall`}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors"
                title="View Live Wall"
              >
                <Icon name="arrow_back" size={20} />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                  <Icon name="admin_panel_settings" size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="font-heading font-extrabold text-xs uppercase tracking-tight text-primary">
                    Host Admin Dashboard
                  </span>
                  <span className="font-heading font-bold text-sm text-on-surface truncate max-w-[200px]">
                    {room?.title || "VibeWall Event"} (#{roomCode})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={screenUrl}
                target="_blank"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary font-heading font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                <Icon name="tv" size={16} />
                <span>Open Venue Display</span>
              </Link>

              <button
                onClick={() => copyToClipboard(window.location.origin + `/r/${roomCode}`, "Guest Invite URL")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high border border-outline text-xs font-semibold hover:bg-surface-container-highest"
              >
                <Icon name="share" size={15} />
                <span className="hidden sm:inline">Invite Guests</span>
              </button>
            </div>
          </div>
        </header>

        {/* Action Toast Alert */}
        {actionNotice && (
          <div className="fixed top-18 right-4 z-50 p-3 rounded-xl bg-primary text-on-primary font-heading font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Icon name="check_circle" size={18} />
            <span>{actionNotice}</span>
          </div>
        )}

        <main className="max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
          {/* Metrics Telemetry Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-surface-container border border-outline/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium">
                <span>Room Status</span>
                <Icon name="sensors" size={18} className="text-primary" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-heading font-extrabold text-xl sm:text-2xl text-on-surface capitalize">
                  {room?.status || "Open"}
                </span>
                <span className="text-xs font-bold text-tertiary">Live</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container border border-outline/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium">
                <span>Live Feed Items</span>
                <Icon name="photo_library" size={18} className="text-tertiary" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-heading font-extrabold text-xl sm:text-2xl text-on-surface">
                  {feed.posts.length + feed.notes.length}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {feed.posts.length} photos
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container border border-outline/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium">
                <span>Active Poll Votes</span>
                <Icon name="how_to_vote" size={18} className="text-primary" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-heading font-extrabold text-xl sm:text-2xl text-on-surface">
                  {feed.active_poll?.total_votes || 0}
                </span>
                <span className="text-xs text-primary font-bold">Realtime</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container border border-outline/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium">
                <span>Active Theme</span>
                <Icon name="palette" size={18} className="text-secondary" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-heading font-extrabold text-base sm:text-lg text-on-surface truncate">
                  {THEMES[room?.theme || "midnight-neon"].name}
                </span>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: THEMES[room?.theme || "midnight-neon"].accent }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-outline/30 pb-1 overflow-x-auto">
            {[
              { id: "moderation", label: "Content Moderation", icon: "shield" },
              { id: "themes", label: "Theme & Frames", icon: "palette" },
              { id: "engagement", label: "Polls & Stories", icon: "poll" },
              { id: "settings", label: "Room Management", icon: "settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-4 rounded-xl font-heading font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: Content Moderation */}
          {activeTab === "moderation" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModFilter("active")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      modFilter === "active"
                        ? "bg-primary-container text-on-primary-container"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Active Feed Items
                  </button>
                  <button
                    onClick={() => setModFilter("hidden")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      modFilter === "hidden"
                        ? "bg-danger text-white shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Flagged / Auto-Hidden
                  </button>
                </div>
              </div>

              {/* Feed Submissions Moderation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Posts */}
                {feed.posts
                  .filter((p) =>
                    modFilter === "active" ? p.visibility === "approved" : p.visibility === "hidden"
                  )
                  .map((post) => (
                    <div
                      key={post.id}
                      className="rounded-2xl bg-surface-container border border-outline/50 p-3 flex flex-col gap-2.5 shadow-md"
                    >
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-lowest">
                        <Image
                          src={post.image_url}
                          alt={post.author_name}
                          fill
                          className="object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white uppercase">
                          Photo • Frame: {post.frame_id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-heading font-bold text-on-surface truncate">
                          @{post.author_name}
                        </span>
                        <span className="text-on-surface-variant">
                          {post.like_count} likes
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline/20">
                        {post.visibility === "approved" ? (
                          <button
                            onClick={() => handleModerate("post", post.id, "hide")}
                            className="py-1.5 px-2 rounded-lg bg-warning/15 hover:bg-warning/25 text-warning font-semibold text-xs flex items-center justify-center gap-1"
                          >
                            <Icon name="visibility_off" size={15} />
                            <span>Hide</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleModerate("post", post.id, "restore")}
                            className="py-1.5 px-2 rounded-lg bg-tertiary/15 hover:bg-tertiary/25 text-tertiary font-semibold text-xs flex items-center justify-center gap-1"
                          >
                            <Icon name="restore" size={15} />
                            <span>Restore</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleModerate("post", post.id, "delete")}
                          className="py-1.5 px-2 rounded-lg bg-danger/15 hover:bg-danger/25 text-danger font-semibold text-xs flex items-center justify-center gap-1"
                        >
                          <Icon name="delete" size={15} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Notes */}
                {[...feed.pinned_notes, ...feed.notes]
                  .filter((n) =>
                    modFilter === "active"
                      ? n.moderation_status === "approved"
                      : n.moderation_status === "hidden"
                  )
                  .map((note) => (
                    <div
                      key={note.id}
                      className="rounded-2xl bg-surface-container border border-outline/50 p-4 flex flex-col justify-between gap-3 shadow-md"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-bold text-xs text-primary">
                            @{note.author_name}
                          </span>
                          {note.is_pinned && (
                            <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-bold">
                              PINNED
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs text-on-surface line-clamp-3">
                          {note.body}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-outline/20 text-xs">
                        {note.is_pinned ? (
                          <button
                            onClick={() => handleModerate("note", note.id, "unpin")}
                            className="py-1.5 px-1 rounded-lg bg-surface-container-high text-on-surface font-semibold text-[11px]"
                          >
                            Unpin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleModerate("note", note.id, "pin")}
                            className="py-1.5 px-1 rounded-lg bg-primary/20 text-primary font-semibold text-[11px]"
                          >
                            Pin Top
                          </button>
                        )}

                        {note.moderation_status === "approved" ? (
                          <button
                            onClick={() => handleModerate("note", note.id, "hide")}
                            className="py-1.5 px-1 rounded-lg bg-warning/15 text-warning font-semibold text-[11px]"
                          >
                            Hide
                          </button>
                        ) : (
                          <button
                            onClick={() => handleModerate("note", note.id, "restore")}
                            className="py-1.5 px-1 rounded-lg bg-tertiary/15 text-tertiary font-semibold text-[11px]"
                          >
                            Restore
                          </button>
                        )}

                        <button
                          onClick={() => handleModerate("note", note.id, "delete")}
                          className="py-1.5 px-1 rounded-lg bg-danger/15 text-danger font-semibold text-[11px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 2: Themes & Frames */}
          {activeTab === "themes" && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="font-heading font-bold text-base text-on-surface">
                  Live Room Theme Switching
                </h3>
                <p className="font-body text-xs text-on-surface-variant">
                  Changes sync immediately to all connected participant devices and venue screens via Supabase Realtime.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {THEME_KEYS.map((key) => {
                  const t = THEMES[key];
                  const isActive = room?.theme === key;
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 shadow-lg transition-all ${
                        isActive
                          ? "border-primary ring-2 ring-primary/50"
                          : "border-outline/40 hover:border-outline"
                      }`}
                      style={{ backgroundColor: t.bg }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-extrabold text-sm" style={{ color: t.text }}>
                          {t.name}
                        </span>
                        <span
                          className="w-4 h-4 rounded-full border border-white/20"
                          style={{ backgroundColor: t.accent }}
                        />
                      </div>

                      <p className="font-body text-xs" style={{ color: t.muted }}>
                        {t.description}
                      </p>

                      <button
                        onClick={() => handleThemeChange(key)}
                        disabled={isActive}
                        className={`w-full py-2 px-3 rounded-xl font-heading font-bold text-xs transition-all ${
                          isActive
                            ? "bg-white/20 text-white cursor-default"
                            : "bg-primary text-on-primary hover:brightness-110"
                        }`}
                      >
                        {isActive ? "Active Theme" : "Activate Theme"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Polls & Stories */}
          {activeTab === "engagement" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Poll */}
              <div className="p-5 rounded-2xl bg-surface-container border border-outline/50 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Icon name="how_to_vote" size={20} className="text-primary" />
                  <h3 className="font-heading font-bold text-base text-on-surface">
                    Launch Interactive Poll
                  </h3>
                </div>

                <form onSubmit={handleCreatePoll} className="flex flex-col gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Poll Question (e.g. Which band next?)"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    maxLength={280}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline/50 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />

                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Option 1"
                      value={pollOption1}
                      onChange={(e) => setPollOption1(e.target.value)}
                      maxLength={160}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline/40 text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Option 2"
                      value={pollOption2}
                      onChange={(e) => setPollOption2(e.target.value)}
                      maxLength={160}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline/40 text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Option 3 (Optional)"
                      value={pollOption3}
                      onChange={(e) => setPollOption3(e.target.value)}
                      maxLength={160}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline/40 text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Option 4 (Optional)"
                      value={pollOption4}
                      onChange={(e) => setPollOption4(e.target.value)}
                      maxLength={160}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline/40 text-xs text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingPoll}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-heading font-bold text-xs shadow-md hover:brightness-110 active:scale-95"
                  >
                    {isCreatingPoll ? "Broadcasting Poll..." : "Broadcast Poll to Wall"}
                  </button>
                </form>
              </div>

              {/* Create Chain Story */}
              <div className="p-5 rounded-2xl bg-surface-container border border-outline/50 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Icon name="auto_stories" size={20} className="text-secondary" />
                  <h3 className="font-heading font-bold text-base text-on-surface">
                    Create Chain Story Prompt
                  </h3>
                </div>

                <form onSubmit={handleCreateStory} className="flex flex-col gap-3">
                  <textarea
                    rows={3}
                    required
                    placeholder="Story Prompt (e.g. Capture your crew at the food stall 🍕)"
                    value={storyPrompt}
                    onChange={(e) => setStoryPrompt(e.target.value)}
                    maxLength={280}
                    className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline/50 text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                  />

                  <button
                    type="submit"
                    disabled={isCreatingStory}
                    className="w-full py-2.5 rounded-xl bg-secondary text-white font-heading font-bold text-xs shadow-md hover:brightness-110 active:scale-95"
                  >
                    {isCreatingStory ? "Starting Story..." : "Launch Chain Story"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: Room Management */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code & Share */}
              <div className="p-5 rounded-2xl bg-surface-container border border-outline/50 flex flex-col items-center gap-4 text-center">
                <h3 className="font-heading font-bold text-sm text-on-surface">
                  Room QR Invitation Gate
                </h3>
                {qrCodeUrl && (
                  <div className="p-3 rounded-2xl bg-white shadow-xl">
                    <img src={qrCodeUrl} alt="Room QR" className="w-48 h-48" />
                  </div>
                )}
                <div className="flex gap-2 w-full max-w-xs">
                  <a
                    href={qrCodeUrl}
                    download={`vibewall-${roomCode}-qr.png`}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-on-primary font-heading font-bold text-xs text-center"
                  >
                    Download QR
                  </a>
                  <button
                    onClick={() => copyToClipboard(window.location.origin + `/r/${roomCode}`, "Room link")}
                    className="flex-1 py-2 px-3 rounded-xl bg-surface-container-high border border-outline text-xs font-semibold"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Administrative Security Actions */}
              <div className="p-5 rounded-2xl bg-surface-container border border-outline/50 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <h3 className="font-heading font-bold text-sm text-on-surface">
                    Venue Screen & Safety Controls
                  </h3>

                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-lowest border border-outline/30">
                    <span className="font-heading font-bold text-xs text-on-surface">
                      Rotate Screen Token
                    </span>
                    <p className="font-body text-[11px] text-on-surface-variant">
                      Invalidates projector screen token and generates a new secret URL.
                    </p>
                    <button
                      onClick={handleRotateToken}
                      className="mt-1 py-2 px-3 rounded-lg bg-surface-container-high text-xs font-semibold text-on-surface hover:text-primary w-fit"
                    >
                      Rotate Token
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-danger/10 border border-danger/30">
                    <span className="font-heading font-bold text-xs text-danger">
                      Close Room
                    </span>
                    <p className="font-body text-[11px] text-on-surface-variant">
                      Disables all new photo uploads and notes. The live wall remains read-only.
                    </p>
                    <button
                      onClick={handleCloseRoom}
                      disabled={room?.status === "closed"}
                      className="mt-1 py-2 px-3 rounded-lg bg-danger text-white text-xs font-bold w-fit disabled:opacity-50"
                    >
                      {room?.status === "closed" ? "Room is Closed" : "Close Room Now"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ThemeWrapper>
  );
}
