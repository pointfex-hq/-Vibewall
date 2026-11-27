"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeKey, RoomDTO } from "@/types/vibewall";
import { THEMES, THEME_KEYS } from "@/lib/themes";
import { api } from "@/lib/api";
import { fireRoomConfetti } from "@/lib/confetti";
import { getCurrentUser, signInWithGoogle, signOut } from "@/lib/supabase";
import ThemeWrapper from "@/components/ThemeWrapper";
import { Icon } from "@/components/icons";

export default function LandingHostPortal() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  // Create room modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("midnight-neon");
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Active rooms state
  const [activeRooms, setActiveRooms] = useState<RoomDTO[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState<{ message: string; isNetwork?: boolean } | null>(null);

  const fetchActiveRooms = async () => {
    setIsLoadingRooms(true);
    setRoomsError(null);
    try {
      const rooms = await api.getActiveRooms();
      setActiveRooms(rooms);
    } catch (err: any) {
      console.error("Failed to load active rooms:", err);
      setRoomsError({
        message: err?.message || "Failed to load active rooms. Please check your connection and try again.",
        isNetwork: Boolean(err?.isNetwork || err?.code === "NETWORK_ERROR"),
      });
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
    fetchActiveRooms();
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (!clean) return;
    if (clean.length < 3) {
      setJoinError("Please enter a valid room code");
      return;
    }
    router.push(`/r/${clean}`);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim()) {
      setCreateError("Please enter an event or room title");
      return;
    }

    setCreateError("");
    setIsCreating(true);
    try {
      const res = await api.createRoom({
        title: roomTitle.trim(),
        theme: selectedTheme,
        expires_in_hours: expiresInHours,
      });
      fireRoomConfetti();
      router.push(`/host/${res.room.code}`);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create room");
      setIsCreating(false);
    }
  };

  const handleAuth = async () => {
    if (currentUser) {
      await signOut();
      setCurrentUser(null);
    } else {
      await signInWithGoogle();
      const u = await getCurrentUser();
      setCurrentUser(u);
    }
  };

  return (
    <ThemeWrapper themeKey="midnight-neon">
      <div className="flex flex-col min-h-screen bg-surface text-on-surface">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 w-full pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/30">
          <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary via-purple-600 to-secondary flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.4)]">
                <Icon name="sensors" size={22} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-lg text-primary tracking-tight uppercase">
                  VibeWall
                </span>
                <span className="font-body text-[10px] text-tertiary font-bold tracking-widest uppercase">
                  Live Event Platform
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/40 relative">
                    <Image
                      src={
                        currentUser.user_metadata?.avatar_url ||
                        "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png"
                      }
                      alt="User avatar"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={handleAuth}
                    aria-label="Sign Out"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface px-2.5 py-1.5 rounded-lg border border-outline/50 hover:bg-surface-container-high transition-colors"
                  >
                    <Icon name="log_out" size={14} className="text-primary" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline/50 text-xs font-bold text-on-surface transition-all active:scale-95"
                >
                  <Icon name="login" size={16} className="text-primary" />
                  <span>Host Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col gap-8">
          <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 border border-primary/40 text-primary text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span>Team Hydrogen • 10-Day Live MVP</span>
            </div>

            <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-on-surface tracking-tight leading-tight">
              Ignite Your Event with a{" "}
              <span className="bg-gradient-to-r from-primary via-purple-400 to-secondary bg-clip-text text-transparent">
                Live Social Wall
              </span>
            </h1>

            <p className="font-body text-sm sm:text-base text-on-surface-variant max-w-xl">
              Guests scan a QR code to post live photos with festival frames, send Vibe Notes, vote in real-time polls, and broadcast directly to venue screens.
            </p>

            {/* Quick Action Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mt-2">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:flex-1 py-3 px-5 rounded-2xl font-heading font-bold text-sm bg-primary text-on-primary shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 transition-all"
              >
                <Icon name="add_circle" size={20} />
                <span>Create New Room</span>
              </button>

              <form onSubmit={handleJoin} className="w-full sm:flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter Room Code (e.g. FEST26)"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    setJoinError("");
                  }}
                  maxLength={10}
                  className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-surface-container border border-outline/60 text-sm text-on-surface font-semibold placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary uppercase tracking-wider"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary-container/30 hover:bg-primary text-primary hover:text-on-primary flex items-center justify-center transition-colors"
                >
                  <Icon name="arrow_forward" size={18} />
                </button>
              </form>
            </div>
            {joinError && (
              <span className="text-xs text-danger font-medium">{joinError}</span>
            )}
          </div>

          {/* Active Featured Rooms Section */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center justify-between border-b border-outline/30 pb-2">
              <h2 className="font-heading font-bold text-base sm:text-lg text-on-surface flex items-center gap-2">
                <Icon name="bolt" size={20} className="text-primary" />
                <span>Active Public Rooms</span>
              </h2>
              <span className="font-body text-xs text-on-surface-variant">
                Instant join via QR / Link
              </span>
            </div>

            {/* Active Rooms Grid / States */}
            {isLoadingRooms ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-surface-container/60 border border-outline/30 p-5 animate-pulse h-44 flex flex-col justify-between">
                  <div className="h-4 bg-outline/20 rounded w-1/3 mb-2" />
                  <div className="h-6 bg-outline/20 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-outline/20 rounded w-1/2" />
                  <div className="h-8 bg-outline/20 rounded w-full mt-4" />
                </div>
                <div className="rounded-2xl bg-surface-container/60 border border-outline/30 p-5 animate-pulse h-44 hidden md:flex flex-col justify-between">
                  <div className="h-4 bg-outline/20 rounded w-1/3 mb-2" />
                  <div className="h-6 bg-outline/20 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-outline/20 rounded w-1/2" />
                  <div className="h-8 bg-outline/20 rounded w-full mt-4" />
                </div>
              </div>
            ) : roomsError ? (
              <div className="rounded-2xl bg-danger/10 border border-danger/30 p-6 flex flex-col items-center text-center gap-3">
                <Icon name="error" size={32} className="text-danger" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading font-bold text-sm text-on-surface">
                    {roomsError.isNetwork ? "Network Connection Error" : "Failed to Load Active Rooms"}
                  </h3>
                  <p className="font-body text-xs text-on-surface-variant max-w-sm">
                    {roomsError.message}
                  </p>
                </div>
                <button
                  onClick={fetchActiveRooms}
                  className="py-2 px-4 rounded-xl font-heading font-bold text-xs bg-surface-container-high border border-outline text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-1.5"
                >
                  <Icon name="refresh" size={16} />
                  <span>Retry</span>
                </button>
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="rounded-2xl bg-surface-container border border-outline/40 p-8 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Icon name="bolt" size={24} />
                </div>
                <h3 className="font-heading font-extrabold text-base text-on-surface">
                  No Active Rooms Right Now
                </h3>
                <p className="font-body text-xs text-on-surface-variant max-w-sm">
                  There are currently no active public events. Be the first to launch a live room and get the crowd engaged!
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 py-2 px-4 rounded-xl font-heading font-bold text-xs bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Icon name="add_circle" size={16} />
                  <span>Create the First Room</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRooms.map((room) => (
                  <div
                    key={room.code}
                    className="relative rounded-2xl bg-surface-container border border-outline/50 p-5 shadow-xl flex flex-col justify-between gap-4 hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary text-[11px] font-bold w-fit">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tertiary"></span>
                          </span>
                          <span className="uppercase">{room.status} EVENT</span>
                        </div>
                        <h3 className="font-heading font-extrabold text-lg text-on-surface group-hover:text-primary transition-colors">
                          {room.title}
                        </h3>
                        <p className="font-body text-xs text-on-surface-variant capitalize">
                          Theme: {room.theme ? room.theme.replace("-", " ") : "Midnight Neon"}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl bg-surface-container-highest border border-outline/40 font-heading font-bold text-xs text-primary">
                        {room.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-outline/20">
                      <Link
                        href={`/r/${room.code}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-primary text-on-primary font-heading font-bold text-xs text-center hover:brightness-110 transition-all"
                      >
                        Join Social Wall
                      </Link>
                      <Link
                        href={`/host/${room.code}`}
                        className="py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline/50 text-xs font-semibold text-on-surface transition-all"
                      >
                        Host Admin
                      </Link>
                      {room.screen_token && (
                        <Link
                          href={`/screen/${encodeURIComponent(room.screen_token)}`}
                          target="_blank"
                          className="py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline/50 text-xs font-semibold text-on-surface transition-all"
                          title="Open 16:9 Venue Display Screen"
                        >
                          <Icon name="tv" size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}

                {/* Sample Theme Preview Showcase */}
                <div className="relative rounded-2xl bg-surface-container border border-outline/50 p-5 shadow-xl flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                      Design System Highlights
                    </span>
                    <h3 className="font-heading font-extrabold text-lg text-on-surface">
                      4 Official Event Themes
                    </h3>
                    <p className="font-body text-xs text-on-surface-variant">
                      Midnight Neon, Minimal Paper, Campus Sunset, and Emerald Fest with instant Realtime synchronisation.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-outline/20">
                    {THEME_KEYS.map((k) => (
                      <div
                        key={k}
                        className="p-2 rounded-xl text-center flex flex-col items-center gap-1 border border-outline/40"
                        style={{ backgroundColor: THEMES[k].bg }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-sm"
                          style={{ backgroundColor: THEMES[k].accent }}
                        />
                        <span
                          className="text-[9px] font-bold truncate max-w-full"
                          style={{ color: THEMES[k].text }}
                        >
                          {THEMES[k].name.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Create Room Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-surface-container border border-outline/60 shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-outline/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-container/30 flex items-center justify-center text-primary">
                    <Icon name="add" size={20} />
                  </div>
                  <h3 className="font-heading font-extrabold text-lg text-on-surface">
                    Create New Room
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
                  <Icon name="error" size={18} />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                {/* Room Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading font-semibold text-xs text-on-surface-variant">
                    Event or Room Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE Fest Concert 2026 or Robocon Gala"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline/50 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Expiration Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading font-semibold text-xs text-on-surface-variant">
                    Room Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[6, 12, 24].map((hours) => (
                      <button
                        type="button"
                        key={hours}
                        onClick={() => setExpiresInHours(hours)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          expiresInHours === hours
                            ? "bg-primary text-on-primary border-primary shadow-sm"
                            : "border-outline/40 text-on-surface-variant hover:text-on-surface bg-surface-container-lowest"
                        }`}
                      >
                        {hours} Hours
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading font-semibold text-xs text-on-surface-variant">
                    Select Visual Theme
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {THEME_KEYS.map((key) => {
                      const t = THEMES[key];
                      const isSelected = selectedTheme === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setSelectedTheme(key)}
                          className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/40 shadow-md"
                              : "border-outline/40 hover:border-outline"
                          }`}
                          style={{ backgroundColor: t.bg }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="font-heading font-bold text-xs"
                              style={{ color: t.text }}
                            >
                              {t.name}
                            </span>
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: t.accent }}
                            />
                          </div>
                          <p
                            className="font-body text-[10px] line-clamp-1"
                            style={{ color: t.muted }}
                          >
                            {t.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Submit */}
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 px-4 rounded-xl font-heading font-bold text-sm bg-primary text-on-primary shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {isCreating ? (
                    <>
                      <Icon name="progress_activity" size={18} className="animate-spin" />
                      <span>Creating Room...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="rocket_launch" size={18} />
                      <span>Launch Room & Host Dashboard</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </ThemeWrapper>
  );
}
