"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeKey } from "@/types/vibewall";
import { THEMES, THEME_KEYS } from "@/lib/themes";
import { api } from "@/lib/api";
import { getCurrentUser, signInWithGoogle, signOut } from "@/lib/supabase";
import ThemeWrapper from "@/components/ThemeWrapper";

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

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
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
                <span className="material-symbols-outlined text-white text-[22px]">
                  sensors
                </span>
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
                    className="hidden sm:inline-flex text-xs font-semibold text-on-surface-variant hover:text-on-surface px-2.5 py-1.5 rounded-lg border border-outline/50 hover:bg-surface-container-high transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline/50 text-xs font-bold text-on-surface transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    login
                  </span>
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
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>Create New Room</span>
              </button>

              <form onSubmit={handleJoin} className="w-full sm:flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter Room Code (e.g. VIBE26)"
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
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
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
                <span className="material-symbols-outlined text-primary text-[20px]">
                  bolt
                </span>
                <span>Active Public Rooms</span>
              </h2>
              <span className="font-body text-xs text-on-surface-variant">
                Instant join via QR / Link
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Featured Room 1 */}
              <div className="relative rounded-2xl bg-surface-container border border-outline/50 p-5 shadow-xl flex flex-col justify-between gap-4 hover:border-primary/50 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary text-[11px] font-bold w-fit">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tertiary"></span>
                      </span>
                      <span>LIVE • 124 Guests</span>
                    </div>
                    <h3 className="font-heading font-extrabold text-lg text-on-surface group-hover:text-primary transition-colors">
                      Dynamic University Fest 2026
                    </h3>
                    <p className="font-body text-xs text-on-surface-variant">
                      Central Auditorium, SEU • Theme: Midnight Neon
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-surface-container-highest border border-outline/40 font-heading font-bold text-xs text-primary">
                    VIBE26
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-outline/20">
                  <Link
                    href="/r/VIBE26"
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-on-primary font-heading font-bold text-xs text-center hover:brightness-110 transition-all"
                  >
                    Join Social Wall
                  </Link>
                  <Link
                    href="/host/VIBE26"
                    className="py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline/50 text-xs font-semibold text-on-surface transition-all"
                  >
                    Host Admin
                  </Link>
                  <Link
                    href="/screen/screen_token_vibe26_live"
                    target="_blank"
                    className="py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline/50 text-xs font-semibold text-on-surface transition-all"
                    title="Open 16:9 Venue Display Screen"
                  >
                    <span className="material-symbols-outlined text-[16px]">tv</span>
                  </Link>
                </div>
              </div>

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
          </div>
        </main>

        {/* Create Room Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-surface-container border border-outline/60 shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-outline/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-container/30 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </div>
                  <h3 className="font-heading font-extrabold text-lg text-on-surface">
                    Create New Room
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
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
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        progress_activity
                      </span>
                      <span>Creating Room...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        rocket_launch
                      </span>
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
