"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { RoomDTO } from "@/types/vibewall";
import { api } from "@/lib/api";
import { getCurrentUser, signInWithGoogle } from "@/lib/supabase";
import ThemeWrapper from "@/components/ThemeWrapper";

export default function QrEntryAuthGate() {
  const params = useParams();
  const router = useRouter();
  const roomCode = String(params.code || "").toUpperCase();

  const [mode, setMode] = useState<"scan" | "preview">("preview");
  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualCode, setManualCode] = useState(roomCode);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

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

  const handleJoin = async () => {
    if (!room) return;
    if (room.status !== "open") return;

    setIsJoining(true);
    setErrorMessage("");
    try {
      await api.joinRoom(room.code);
      router.push(`/r/${room.code}/wall`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to join room");
      setIsJoining(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      router.push(`/r/${manualCode.trim().toUpperCase()}`);
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    const u = await getCurrentUser();
    setCurrentUser(u);
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
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
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
              <span className="material-symbols-outlined text-[16px]">verified</span>
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
              <span className="material-symbols-outlined text-[16px]">keyboard</span>
              <span>Switch Code</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] animate-spin text-primary">
                progress_activity
              </span>
              <span className="font-heading text-sm font-semibold">
                Verifying Room #{roomCode}...
              </span>
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl bg-danger/10 border border-danger/30 p-6 flex flex-col items-center text-center gap-3">
              <span className="material-symbols-outlined text-danger text-[40px]">
                warning
              </span>
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
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      schedule
                    </span>
                    <span>
                      Expires: {new Date(room.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Notice if Closed or Expired */}
              {room.status !== "open" && (
                <div className="p-4 rounded-2xl bg-danger/15 border border-danger/40 text-danger text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">block</span>
                  <span>
                    This event room has been {room.status}. Guest submissions are disabled.
                  </span>
                </div>
              )}

              {/* User Identity / Google Sign In Bar */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/40 relative bg-surface-container-high">
                    <Image
                      src={
                        currentUser?.user_metadata?.avatar_url ||
                        "/assets/stylized_modern_vector_avatar_portrait_of_a_cool_cheerful_college_girl_with.png"
                      }
                      alt="User avatar"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-heading font-bold text-xs text-on-surface">
                      {currentUser?.user_metadata?.full_name || "Guest Participant"}
                    </span>
                    <span className="font-body text-[11px] text-on-surface-variant">
                      {currentUser ? "Google Identity Verified" : "1-Tap Instant Entry"}
                    </span>
                  </div>
                </div>

                {!currentUser && (
                  <button
                    onClick={handleGoogleSignIn}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Google Login
                  </button>
                )}
              </div>

              {/* Join Wall Action Button */}
              <button
                onClick={handleJoin}
                disabled={isJoining || room.status !== "open"}
                className="w-full py-3.5 px-4 rounded-2xl font-heading font-bold text-sm bg-primary text-on-primary shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isJoining ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Entering Social Wall...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">
                      sensors
                    </span>
                    <span>Enter Live Social Wall</span>
                  </>
                )}
              </button>
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
