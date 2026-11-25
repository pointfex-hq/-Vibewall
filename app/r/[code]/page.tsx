"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { RoomDTO } from "@/types/vibewall";
import { api } from "@/lib/api";
import { getAuthState, signInWithGoogle } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import ThemeWrapper from "@/components/ThemeWrapper";
import { Icon } from "@/components/icons";

export default function QrEntryAuthGate() {
  const params = useParams();
  const router = useRouter();
  const roomCode = String(params.code || "").toUpperCase();

  const auth = useAuth();
  const [mode, setMode] = useState<"scan" | "preview">("preview");
  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualCode, setManualCode] = useState(roomCode);

  // Duplicate-join guards
  const joinInProgressRef = useRef(false);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const res = await api.getRoomPreview(roomCode);
        setRoom(res.room);
      } catch (err: any) {
        setErrorMessage(err.message || "Unable to find or verify this room.");
      } finally {
        setIsLoading(false);
      }
    }
    if (roomCode) loadData();
  }, [roomCode]);

  // Auto-join once the authenticated session is confirmed after an OAuth
  // redirect (or an existing authenticated session). Duplicate joins are
  // prevented by the guards inside joinAndEnter.
  useEffect(() => {
    if (auth.isReady && auth.isAuthenticated && room?.status === "open") {
      void handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isReady, auth.isAuthenticated, room]);

  const joinAndEnter = async () => {
    if (!room || room.status !== "open") return;
    if (joinInProgressRef.current || hasJoinedRef.current) return;

    joinInProgressRef.current = true;
    setIsJoining(true);
    setErrorMessage("");
    try {
      await api.joinRoom(room.code);
      hasJoinedRef.current = true;
      router.push(`/r/${room.code}/wall`);
    } catch (err: any) {
      const state = await getAuthState().catch(() => null);
      if (!state?.isAuthenticated) {
        setErrorMessage(
          "Your Google session expired. Sign in again to enter the room."
        );
      } else {
        setErrorMessage(err.message || "Failed to join room. Please try again.");
      }
    } finally {
      joinInProgressRef.current = false;
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    if (!room || room.status !== "open") return;
    // Interactive entry requires an authenticated Google session.
    if (!auth.isAuthenticated) return;
    await joinAndEnter();
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    setErrorMessage("");
    try {
      // Preserve the current room code and intended destination through OAuth.
      await signInWithGoogle(
        typeof window !== "undefined" ? window.location.href : undefined
      );
      const state = await getAuthState();
      if (state.isAuthenticated) {
        await joinAndEnter();
      } else {
        setErrorMessage("Google sign-in didn't complete. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage("Google sign-in failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      router.push(`/r/${manualCode.trim().toUpperCase()}`);
    }
  };

  return (
    <ThemeWrapper themeKey={room?.theme || "midnight-neon"}>
      <div className="flex flex-col min-h-screen bg-surface text-on-surface">
        {/* Top Header */}
        <header className="sticky top-0 z-40 w-full pt-safe bg-surface/85 backdrop-blur-xl border-b border-outline/30">
          <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
            <Link
              href="/"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors"
            >
              <Icon name="arrow_back" size={24} />
            </Link>
            <div className="flex flex-col items-center">
              <span className="font-heading font-extrabold text-sm tracking-wider uppercase text-primary">
                VibeWall Gate
              </span>
              <span className="font-body text-[10px] text-tertiary font-bold tracking-widest uppercase">
                Room #{roomCode}
              </span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col gap-5">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 bg-surface-container-lowest p-1 rounded-full shadow-inner border border-outline/30">
            <button
              onClick={() => setMode("preview")}
              className={`py-2 rounded-full font-heading font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                mode === "preview"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="verified" size={16} />
              <span>Room Verification</span>
            </button>
            <button
              onClick={() => setMode("scan")}
              className={`py-2 rounded-full font-heading font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                mode === "scan"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="keyboard" size={16} />
              <span>Switch Code</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-on-surface-variant">
              <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
              <span className="font-heading text-sm font-semibold">
                Verifying Room #{roomCode}...
              </span>
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl bg-danger/10 border border-danger/30 p-6 flex flex-col items-center text-center gap-3">
              <Icon name="warning" size={40} className="text-danger" />
              <h2 className="font-heading font-bold text-lg text-danger">
                Room Not Found
              </h2>
              <p className="font-body text-xs text-on-surface-variant">
                {errorMessage}
              </p>
              <form onSubmit={handleManualSubmit} className="w-full mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-char code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  maxLength={8}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline text-center uppercase tracking-widest font-heading font-bold text-sm focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-heading font-bold text-xs"
                >
                  Verify
                </button>
              </form>
            </div>
          ) : room && mode === "preview" ? (
            <div className="flex flex-col gap-4">
              {/* Event Card Banner */}
              <div className="relative rounded-2xl overflow-hidden bg-surface-container border border-outline shadow-2xl">
                <div className="relative h-44 w-full">
                  <Image
                    src="/assets/dynamic_university_music_festival_crowd_at_night_with_purple_and_violet_neon.png"
                    alt="Event Stage"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                    </span>
                    <span className="font-heading font-bold text-[11px] text-tertiary uppercase tracking-wider">
                      Status: {room.status}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-primary font-heading font-extrabold text-xs tracking-wider">
                    #{room.code}
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <span className="font-body text-xs text-primary font-bold tracking-wider uppercase">
                    Live Event Social Wall
                  </span>
                  <h1 className="font-heading font-extrabold text-xl text-on-surface leading-tight">
                    {room.title}
                  </h1>
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-xs mt-1">
                    <Icon name="schedule" size={16} className="text-primary" />
                    <span>
                      Expires: {new Date(room.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Notice if Closed or Expired */}
              {room.status !== "open" && (
                <div className="p-4 rounded-2xl bg-danger/15 border border-danger/40 text-danger text-xs font-semibold flex items-center gap-2">
                  <Icon name="block" size={20} />
                  <span>
                    This event room has been {room.status}. Guest submissions are disabled.
                  </span>
                </div>
              )}

              {/* Guest read-only notice */}
              {!auth.isAuthenticated && room.status === "open" && (
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-primary/25 text-center text-xs font-semibold text-on-surface-variant space-y-1">
                  <p className="font-heading font-bold text-on-surface">
                    Viewing as a guest
                  </p>
                  <p>
                    Sign in with Google to like, vote, and share moments on the
                    live wall.
                  </p>
                </div>
              )}

              {/* Guest / Authenticated Identity Bar */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/40 flex flex-col gap-3">
                {!auth.isReady ? (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <Icon name="progress_activity" size={18} className="animate-spin text-primary" />
                    <span className="font-body text-xs text-on-surface-variant">
                      Checking session...
                    </span>
                  </div>
                ) : auth.isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/40 relative bg-surface-container-high">
                      <Image
                        src={
                          auth.user?.user_metadata?.avatar_url ||
                          "/assets/stylized_modern_vector_avatar_portrait_of_a_cool_cheerful_college_girl_with.png"
                        }
                        alt="User avatar"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading font-bold text-xs text-on-surface">
                        {auth.user?.user_metadata?.full_name || "Guest Participant"}
                      </span>
                      <span className="font-body text-[11px] text-on-surface-variant">
                        Google Identity Verified
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Icon name="shield_lock" size={20} className="text-primary" />
                      <span className="font-body text-xs font-medium">
                        Sign in with Google to unlock the live wall
                      </span>
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                        className="flex-1 py-2.5 px-4 rounded-xl font-heading font-bold text-xs bg-primary text-on-primary shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGoogleLoading ? (
                          <Icon name="progress_activity" size={18} className="animate-spin" />
                        ) : (
                          <Icon name="login" size={18} />
                        )}
                        <span>Continue with Google to Enter</span>
                      </button>
                      <button
                        onClick={() => setMode("preview")}
                        className="flex-1 py-2.5 px-4 rounded-xl font-heading font-bold text-xs bg-surface-container-high border border-outline/50 text-on-surface flex items-center justify-center gap-2 hover:border-primary/40 transition-colors"
                      >
                        <Icon name="visibility" size={18} />
                        <span>Preview as Read-Only Guest</span>
                      </button>
                    </div>
                    {errorMessage && (
                      <p className="text-xs text-danger font-semibold">{errorMessage}</p>
                    )}
                  </>
                )}
              </div>

              {/* Join Wall Action Button — authenticated visitors only */}
              {auth.isAuthenticated && (
                <button
                  onClick={handleJoin}
                  disabled={isJoining || room.status !== "open"}
                  className="w-full py-3.5 px-4 rounded-2xl font-heading font-bold text-sm bg-primary text-on-primary shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {isJoining ? (
                    <>
                      <Icon name="progress_activity" size={18} className="animate-spin" />
                      <span>Entering Social Wall...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="sensors" size={20} />
                      <span>Enter Live Social Wall</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Manual / Switch Code Form */
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-surface-container border border-outline p-5 shadow-xl flex flex-col gap-3">
                <label className="font-heading font-bold text-sm text-on-surface">
                  Enter Event Access Code
                </label>
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    maxLength={8}
                    placeholder="VIBE26"
                    className="w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-center font-heading font-extrabold text-2xl tracking-widest text-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase placeholder:text-outline-variant"
                  />
                  <p className="font-body text-xs text-on-surface-variant text-center">
                    Refer to venue screen or event badge credentials.
                  </p>
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl font-heading font-bold text-xs bg-primary text-on-primary shadow-md"
                  >
                    Switch to Room
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </ThemeWrapper>
  );
}
