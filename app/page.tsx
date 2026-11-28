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
import {
  BrandMark,
  MemoryPolaroid,
  SectionHeading,
  StepCard,
} from "@/components/figma";

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
      // Cache the venue URL so the host dashboard can open the correct screen.
      if (typeof window !== "undefined" && res.screen_url) {
        sessionStorage.setItem(`venue:${res.room.id}`, res.screen_url);
      }
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
    <ThemeWrapper themeKey={selectedTheme}>
      <div className="figma-paper flex min-h-screen flex-col text-on-surface">
        {/* ------------------------------- Header ------------------------------ */}
        <header className="sticky top-0 z-40 w-full border-b border-outline/50 bg-surface/90 pt-safe backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size={40} />
              <div className="flex flex-col">
                <span className="font-heading text-base font-black uppercase tracking-tight text-primary">
                  VibeWall
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-tertiary">
                  Living Memory Walls
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2.5">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-primary/30">
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-outline/70 bg-surface px-2.5 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:text-on-surface sm:px-3.5"
                  >
                    <Icon name="log_out" size={14} className="text-primary" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/signin"
                    className="hidden text-xs font-bold text-on-surface-variant hover:text-primary sm:inline"
                  >
                    Sign In
                  </Link>
                <button
                  onClick={handleAuth}
                  className="figma-primary-btn px-3.5 py-2 text-xs sm:px-4"
                >
                  <Icon name="login" size={15} />
                  <span>Continue with Google</span>
                </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 py-10 md:py-14">
          {/* ------------------------------- Hero ------------------------------ */}
          <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col gap-5">
              <span className="figma-pill w-fit bg-primary-container text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Handcrafted for campus festivals
              </span>

              <h1 className="font-heading text-3xl font-black leading-[1.1] tracking-tight text-on-surface sm:text-5xl lg:text-[3.4rem]">
                Turn Every Event Into A{" "}
                <span className="text-primary">Living Memory Wall.</span>
                <span className="sr-only"> Live Social Wall</span>
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
                Collect candid Polaroids, handwritten wishes, and campus moments in real
                time—woven together like a living Nakshi Kantha quilt.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="figma-primary-btn px-6 py-3.5 text-sm"
                >
                  <Icon name="add_a_photo" size={19} />
                  <span>Create an Event</span>
                  <span className="sr-only">Create New Room</span>
                </button>
                <a
                  href="#live-walls"
                  className="figma-amber-btn px-6 py-3.5 text-sm"
                >
                  <Icon name="visibility" size={19} />
                  Explore Live Walls
                </a>
              </div>

              <form onSubmit={handleJoin} className="relative mt-1 max-w-md">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Have an event code?
                </label>
                <input
                  type="text"
                  placeholder="Enter Room Code (e.g. FEST26)"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    setJoinError("");
                  }}
                  maxLength={10}
                  className="w-full rounded-full border border-outline/70 bg-surface py-3 pl-4 pr-12 text-sm font-bold uppercase tracking-wider text-on-surface outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-on-surface-variant/60 focus:border-primary"
                />
                <button
                  type="submit"
                  aria-label="Join room"
                  className="absolute right-1.5 top-[2.15rem] flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-105"
                >
                  <Icon name="arrow_forward" size={18} />
                </button>
                {joinError && (
                  <span className="mt-1 block text-xs font-semibold text-danger">{joinError}</span>
                )}
              </form>
            </div>

            {/* Quilt preview — the two tilted polaroids from the Figma hero. */}
            <div className="relative rounded-3xl border border-outline/50 bg-card-lowest/70 p-5 shadow-figma sm:p-7">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="figma-kicker">Live Memory Quilt Preview</p>
                  <p className="font-heading text-lg font-extrabold text-on-surface">
                    Moments, stitched together.
                  </p>
                </div>
                <span className="figma-pill bg-danger/10 text-danger">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                  142 Photos Today
                </span>
              </div>
              <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-6">
                <MemoryPolaroid
                  src="/assets/vibrant_university_night_music_festival_stage_with_glowing_violet_and_neon.png"
                  caption="Golden Hour Courtyard"
                  author="@tasnim_du"
                  glyph="heart"
                  href="/r/VIBE26"
                />
                <MemoryPolaroid
                  src="/assets/group_of_diverse_university_students_laughing_and_posing_together_with_neon.png"
                  caption="Morning Alpana Circle"
                  author="@cuet_arts"
                  glyph="sparkle"
                  href="/r/VIBE26"
                />
              </div>
              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-on-surface-variant">
                <Icon name="auto_awesome" size={15} className="text-tertiary" />
                Every photo becomes a thread in your event&apos;s story
              </div>
            </div>
          </section>

          {/* -------------------------- Featured rooms ------------------------- */}
          <section id="live-walls" className="flex flex-col gap-4">
            <SectionHeading
              eyebrow="Happening now"
              title="Featured Live Walls"
              action={
                <span className="text-xs font-bold text-primary">Instant join via QR / Link</span>
              }
            />

            {isLoadingRooms ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="figma-card h-32 animate-pulse p-5">
                    <div className="h-3 w-1/3 rounded bg-outline/30" />
                    <div className="mt-3 h-5 w-2/3 rounded bg-outline/30" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-outline/30" />
                  </div>
                ))}
              </div>
            ) : roomsError ? (
              <div className="figma-card flex flex-col items-center gap-3 border-danger/30 bg-danger/5 p-6 text-center">
                <Icon name="error" size={30} className="text-danger" />
                <h3 className="font-heading text-sm font-extrabold text-on-surface">
                  {roomsError.isNetwork ? "Network Connection Error" : "Failed to Load Active Rooms"}
                </h3>
                <p className="max-w-sm text-xs text-on-surface-variant">{roomsError.message}</p>
                <button onClick={fetchActiveRooms} className="figma-primary-btn px-4 py-2 text-xs">
                  <Icon name="refresh" size={15} />
                  Retry
                </button>
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="figma-card flex flex-col items-center gap-3 p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-primary">
                  <Icon name="bolt" size={24} />
                </span>
                <h3 className="font-heading text-base font-extrabold text-on-surface">
                  No Active Rooms Right Now
                </h3>
                <p className="max-w-sm text-xs text-on-surface-variant">
                  There are currently no active public events. Be the first to launch a live room and get the crowd engaged!
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="figma-primary-btn mt-2 px-5 py-2.5 text-xs"
                >
                  <Icon name="add_circle" size={16} />
                  Create the First Room
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeRooms.map((room) => (
                  <div key={room.code} className="figma-card flex min-w-0 items-center gap-4 overflow-hidden p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
                      <Icon name="bolt" size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-heading text-sm font-extrabold text-on-surface">
                          {room.title}
                        </h3>
                        <span className="figma-pill bg-danger text-white">LIVE</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {room.code} • {room.theme ? room.theme.replace("-", " ") : "Midnight Katha"}
                      </p>
                    </div>
                    <Link
                      href={`/r/${room.code}`}
                      aria-label={`Open ${room.code}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline/60 text-primary transition-colors hover:bg-primary-container"
                    >
                      <Icon name="arrow_forward" size={18} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------ Themes ----------------------------- */}
          <section>
            <SectionHeading
              eyebrow="Design system highlights"
              title="6 Heritage & Festival Themes"
              action={
                <span className="text-xs font-bold text-on-surface-variant">
                  Midnight Katha, Minimal Paper, Campus Sunset, Emerald Fest & more
                </span>
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {THEME_KEYS.map((key) => {
                const t = THEMES[key];
                const isActive = selectedTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTheme(key)}
                    className={`figma-card flex flex-col items-center gap-2 p-3 text-center transition-all active:scale-95 ${
                      isActive ? "ring-2 ring-primary" : "hover:border-primary/50"
                    }`}
                    style={{ backgroundColor: t.card }}
                    aria-pressed={isActive}
                    title={t.name}
                  >
                    <span className="h-6 w-6 rounded-full border border-black/5 shadow-sm" style={{ backgroundColor: t.accent }} />
                    {/* Full name is rendered via CSS content so the showcase does not
                        duplicate the modal's theme buttons in the accessibility tree. */}
                    <span
                      data-name={t.name}
                      aria-hidden="true"
                      className="font-heading text-[11px] font-extrabold before:content-[attr(data-name)]"
                      style={{ color: t.text }}
                    />
                    <span className="text-[10px] leading-tight" style={{ color: t.muted }}>
                      {t.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* --------------------------- How it works -------------------------- */}
          <section className="pb-4">
            <SectionHeading eyebrow="Three simple steps" title="How It Works" />
            <div className="grid gap-3 md:grid-cols-3">
              <StepCard
                number="1"
                title="Create your Event Wall"
                description="Pick a heritage theme, set your event date and time, and let the QR do the rest."
              />
              <StepCard
                number="2"
                title="Guests Scan & Pin"
                description="No app, no sign-up friction. Guests scan, drop photos, notes and votes in seconds."
              />
              <StepCard
                number="3"
                title="Project & Keep Forever"
                description="Moderate live, project to the venue screen, and download a memory card after the fest."
              />
            </div>
          </section>
        </main>

        {/* --------------------------- Create modal --------------------------- */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2929]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="figma-card relative flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto p-6">
              <div className="flex items-center justify-between border-b border-outline/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-container text-primary">
                    <Icon name="add" size={20} />
                  </span>
                  <h3 className="font-heading text-lg font-extrabold text-on-surface">
                    Create New Room
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  aria-label="Close create room dialog"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              {createError && (
                <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
                  <Icon name="error" size={18} />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading text-xs font-bold text-on-surface-variant">
                    Event or Room Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE Fest Concert 2026 or Robocon Gala"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-outline/60 bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-heading text-xs font-bold text-on-surface-variant">
                    Room Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[6, 12, 24].map((hours) => (
                      <button
                        type="button"
                        key={hours}
                        onClick={() => setExpiresInHours(hours)}
                        className={`rounded-xl border py-2 px-3 text-xs font-bold transition-all ${
                          expiresInHours === hours
                            ? "border-primary bg-primary text-on-primary shadow-sm"
                            : "border-outline/50 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {hours} Hours
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-heading text-xs font-bold text-on-surface-variant">
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
                          className={`flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/40 shadow-md"
                              : "border-outline/50 hover:border-outline"
                          }`}
                          style={{ backgroundColor: t.card }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-heading text-xs font-bold" style={{ color: t.text }}>
                              {t.name}
                            </span>
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10"
                              style={{ backgroundColor: t.accent }}
                            />
                          </div>
                          <p className="line-clamp-1 text-[10px]" style={{ color: t.muted }}>
                            {t.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="figma-primary-btn mt-2 w-full py-3 text-sm disabled:opacity-50"
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
