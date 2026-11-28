"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { roomQrDataUrl } from "@/lib/room-qr";
import { ScreenResponse, RoomDTO } from "@/types/vibewall";
import { api } from "@/lib/api";
import { subscribeToRoom } from "@/lib/supabase";
import ThemeWrapper from "@/components/ThemeWrapper";
import ErrorState from "@/components/ErrorState";
import { Icon } from "@/components/icons";

export default function VenueDisplayPage() {
  const params = useParams();
  const screenToken = String(params.token || "");

  const [screenData, setScreenData] = useState<ScreenResponse | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{
    status?: number;
    code?: string;
    message?: string;
    isNetwork?: boolean;
  } | null>(null);

  // Load initial screen data
  useEffect(() => {
    async function loadScreen() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await api.getScreenData(screenToken);
        setScreenData(data);

        // Generate high-res QR code for participants in the venue
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const qr = await roomQrDataUrl(origin, data.room.code, 380);
        setQrCodeDataUrl(qr);
      } catch (err: any) {
        console.error("Venue screen load failed:", err);
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
    if (screenToken) loadScreen();
  }, [screenToken]);

  // Realtime synchronization for Venue Display
  useEffect(() => {
    if (!screenData?.room?.id) return;

    const unsubscribe = subscribeToRoom(screenData.room.id, {
      onRoomClosed: () => setLoadError({ message: "Room is closed" }),
      onNewPost: ({ post }) => {
        setScreenData((prev) =>
          prev
            ? {
                ...prev,
                posts: [post, ...prev.posts.filter((p) => p.id !== post.id)],
              }
            : prev
        );
      },
      onNewNote: ({ note }) => {
        setScreenData((prev) => {
          if (!prev) return prev;
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
        setScreenData((prev) => {
          if (!prev) return prev;
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
                return {
                  ...prev,
                  pinned_notes: [{ ...note, is_pinned: true }, ...prev.pinned_notes.filter((n) => n.id !== note.id)],
                  notes: prev.notes.filter((n) => n.id !== note.id),
                };
              }
            }
            if (payload.action === "unpin") {
              const note = prev.pinned_notes.find((n) => n.id === payload.target_id);
              if (note) {
                return {
                  ...prev,
                  pinned_notes: prev.pinned_notes.filter((n) => n.id !== note.id),
                  notes: [{ ...note, is_pinned: false }, ...prev.notes],
                };
              }
            }
          }
          return prev;
        });
      },
      onPollUpdated: ({ poll }) => {
        setScreenData((prev) => (prev ? { ...prev, active_poll: poll } : prev));
      },
      onThemeUpdated: ({ theme }) => {
        setScreenData((prev) =>
          prev ? { ...prev, room: { ...prev.room, theme } } : prev
        );
      },
    });

    return () => {
      unsubscribe();
    };
  }, [screenData?.room?.id]);

  // Auto-cycling featured photo carousel for 1080p venue wall
  useEffect(() => {
    if (!screenData?.posts?.length) return;
    const timer = setInterval(() => {
      setActivePhotoIndex((prev) => (prev + 1) % screenData.posts.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [screenData?.posts?.length]);

  // Live wall clock
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-[#2A1118] text-[#FFF8F5] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ErrorState
            status={loadError.status}
            code={loadError.code}
            message={loadError.message || "Invalid screen token. Please check the projector link."}
            isNetwork={loadError.isNetwork}
            onRetry={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            backHref="/"
            backLabel="Back to Home"
            showHomeButton
          />
        </div>
      </div>
    );
  }

  if (isLoading || !screenData) {
    return (
      <div className="fixed inset-0 bg-[#2A1118] text-[#FFF8F5] flex flex-col items-center justify-center gap-3">
        <Icon name="progress_activity" size={48} className="animate-spin text-primary" />
        <span className="font-heading font-extrabold text-xl tracking-wider">
          Connecting Venue Display...
        </span>
      </div>
    );
  }

  const currentPhoto = screenData.posts[activePhotoIndex] || screenData.posts[0];
  const poll = screenData.active_poll;
  const totalPollVotes = poll?.total_votes || 1;

  return (
    <ThemeWrapper themeKey={screenData.room.theme}>
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-surface text-on-surface flex flex-col p-6 lg:p-8 select-none">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between pb-4 border-b border-outline/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-purple-600 to-secondary flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.5)]">
              <Icon name="sensors" size={28} className="text-[#FFF8F5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-2xl text-on-surface tracking-tight">
                {screenData.room.title}
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                </span>
                <span className="uppercase tracking-widest text-tertiary">
                  LIVE AUDITORIUM WALL • #{screenData.room.code}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-2xl bg-surface-container border border-outline font-heading font-extrabold text-xl text-on-surface">
              {currentTime}
            </div>
            <button
              onClick={toggleFullscreen}
              className="w-11 h-11 rounded-2xl bg-surface-container border border-outline text-on-surface hover:text-primary flex items-center justify-center transition-colors"
              title="Toggle Fullscreen"
            >
              <Icon name="fullscreen" size={24} />
            </button>
          </div>
        </header>

        {/* 16:9 Landscape Main Venue Stage */}
        <div className="flex-1 grid grid-cols-12 gap-6 pt-6 overflow-hidden min-h-0">
          {/* Left Column (7 cols): Hero Featured Photo Spotlight with frame */}
          <div className="col-span-7 flex flex-col justify-between rounded-3xl bg-surface-container border border-outline/50 p-4 shadow-2xl relative overflow-hidden">
            {currentPhoto ? (
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface-container-lowest flex items-center justify-center">
                <Image
                  src={currentPhoto.image_url}
                  alt={currentPhoto.author_name}
                  fill
                  className="object-contain transition-all duration-700"
                  priority
                />

                {/* Author Spotlight overlay */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-primary relative">
                      <Image
                        src={
                          currentPhoto.author_avatar ||
                          "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png"
                        }
                        alt="Author"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-heading font-extrabold text-lg text-white">
                        @{currentPhoto.author_name}
                      </span>
                      <span className="font-body text-xs text-white/70">
                        Frame: {currentPhoto.frame_id.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-secondary font-bold text-sm">
                    <Icon name="favorite" size={20} className="fill" filled />
                    <span>{currentPhoto.like_count}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-2">
                <Icon name="photo_camera" size={64} className="text-primary/40" />
                <span className="font-heading font-bold text-lg">
                  Scan QR to drop the first fest photo!
                </span>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): QR Invitation + Pinned Notes + Active Live Poll */}
          <div className="col-span-5 flex flex-col gap-5 overflow-hidden">
            {/* QR Scanner Card */}
            <div className="rounded-3xl bg-gradient-to-br from-surface-container via-surface-container to-primary-container/20 border border-outline/60 p-5 shadow-2xl flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 max-w-[200px]">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-extrabold uppercase tracking-wider w-fit">
                  Join The Live Wall
                </span>
                <h3 className="font-heading font-extrabold text-xl text-on-surface leading-tight">
                  Scan to Share Photos
                </h3>
                <p className="font-body text-xs text-on-surface-variant">
                  No app download needed. Scan with phone camera.
                </p>
                <span className="font-heading font-extrabold text-lg text-primary tracking-widest mt-1">
                  #{screenData.room.code}
                </span>
              </div>

              {qrCodeDataUrl && (
                <div className="p-2.5 rounded-2xl bg-white shadow-xl shrink-0">
                  <img src={qrCodeDataUrl} alt="Room QR" className="w-28 h-28 lg:w-32 lg:h-32" />
                </div>
              )}
            </div>

            {/* Pinned Note Spotlight */}
            {screenData.pinned_notes.length > 0 && (
              <div className="rounded-3xl bg-surface-container border border-primary/50 p-4 shadow-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Icon name="push_pin" size={18} className="fill" filled />
                  <span className="font-heading font-bold text-xs uppercase tracking-wider">
                    Pinned Announcement
                  </span>
                </div>
                <p className="font-body text-sm font-medium text-on-surface line-clamp-3">
                  {screenData.pinned_notes[0].body}
                </p>
                <span className="text-[11px] text-on-surface-variant font-semibold">
                  — {screenData.pinned_notes[0].author_name}
                </span>
              </div>
            )}

            {/* Active Poll Spotlight */}
            {poll && poll.is_open && (
              <div className="flex-1 rounded-3xl bg-surface-container border border-outline/50 p-4 shadow-xl flex flex-col justify-between gap-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-tertiary">
                    <Icon name="how_to_vote" size={18} />
                    <span className="font-heading font-bold text-xs uppercase tracking-wider">
                      Live Poll • {poll.total_votes} Votes
                    </span>
                  </div>
                </div>

                <h4 className="font-heading font-extrabold text-sm text-on-surface line-clamp-2">
                  {poll.question}
                </h4>

                <div className="flex flex-col gap-2 overflow-y-auto">
                  {poll.options.map((opt) => {
                    const pct = Math.round((opt.vote_count / totalPollVotes) * 100);
                    return (
                      <div
                        key={opt.id}
                        className="relative rounded-xl bg-surface-container-lowest p-2.5 overflow-hidden border border-outline/30"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/35 to-secondary/35 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between text-xs font-bold text-on-surface">
                          <span className="truncate">{opt.option_text}</span>
                          <span className="text-primary ml-2">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ThemeWrapper>
  );
}
