"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { validateAndCompressImage, CompressionResult } from "@/lib/upload/compress";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/icons";

export type ComposerMode = "standard" | "story-entry";

interface ComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Returns false when the action is blocked by the auth guard. */
  onSubmitPhoto: (data: {
    file: File;
    mode: ComposerMode;
    frameId?: string;
    storyId?: string;
  }) => Promise<boolean | void>;
  onSubmitNote: (data: { body: string }) => Promise<boolean | void>;
  /** `story-entry` mode hides frame selection and submits via `api.addStoryEntry`. */
  mode?: ComposerMode;
  storyId?: string;
  defaultTab?: "photo" | "note";
  photoCooldownRemaining?: number;
  noteCooldownRemaining?: number;
}

export default function ComposerModal({
  isOpen,
  onClose,
  onSubmitPhoto,
  onSubmitNote,
  mode = "standard",
  storyId,
  defaultTab = "photo",
  photoCooldownRemaining = 0,
  noteCooldownRemaining = 0,
}: ComposerModalProps) {
  const { user, isAuthenticated, isReady } = useAuth();
  const [activeTab, setActiveTab] = useState<"photo" | "note">(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  // Photo tab states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<CompressionResult | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string>("classic");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compressionIdRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);

  const revokePreviewUrl = (url: string | null | undefined) => {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  };

  // Note tab states
  const [noteBody, setNoteBody] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authenticated Google identity — derived from the session, never user-entered.
  const authorName: string =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const authorAvatar: string =
    typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url.trim() : "";
  const authorInitials = authorName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Reset transient photo state when the composer closes so a previous
  // selection (frame, file) can never leak into a new session. Revoke any
  // temporary object URL to avoid memory leaks (issue #34).
  useEffect(() => {
    if (!isOpen) {
      revokePreviewUrl(previewUrlRef.current);
      previewUrlRef.current = null;
      setSelectedFile(null);
      setPreviewResult(null);
      setSelectedFrame("classic");
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Keep previewUrlRef in sync with previewResult.
  useEffect(() => {
    previewUrlRef.current = previewResult?.previewUrl ?? null;
  }, [previewResult]);

  // Revoke the temporary object URL on unmount.
  useEffect(() => {
    return () => {
      revokePreviewUrl(previewUrlRef.current);
      previewUrlRef.current = null;
    };
  }, []);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const requestId = ++compressionIdRef.current;
    const previousUrl = previewUrlRef.current;

    setErrorMessage(null);
    setIsCompressing(true);
    try {
      const res = await validateAndCompressImage(file);
      // Ignore stale results if a newer selection was made (issue #34).
      if (requestId !== compressionIdRef.current) {
        revokePreviewUrl(res.previewUrl);
        return;
      }
      // Release the previous preview URL now that the new one is ready.
      revokePreviewUrl(previousUrl);
      setSelectedFile(res.file);
      setPreviewResult(res);
    } catch (err: any) {
      if (requestId !== compressionIdRef.current) return;
      setErrorMessage(err.message || "Failed to process image");
    } finally {
      if (requestId === compressionIdRef.current) {
        setIsCompressing(false);
      }
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploadingPhoto) return;

    setErrorMessage(null);
    setIsUploadingPhoto(true);
    try {
      if (mode === "story-entry" && !storyId) {
        // The Chain Story is unavailable — do not send an invalid request.
        setErrorMessage("The Chain Story is no longer available. Try again from the wall.");
        return;
      }
      const ok = await onSubmitPhoto({
        file: selectedFile,
        mode,
        frameId: selectedFrame,
        storyId,
      });
      if (ok === false) {
        // Blocked by the auth guard — keep the composer open for retry.
        return;
      }
      // Reset & close (release the temporary preview URL)
      revokePreviewUrl(previewUrlRef.current);
      previewUrlRef.current = null;
      setSelectedFile(null);
      setPreviewResult(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Photo upload failed");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim() || isSubmittingNote) return;

    if (noteBody.length > 280) {
      setErrorMessage("Notes must be 280 characters or fewer.");
      return;
    }

    setErrorMessage(null);
    setIsSubmittingNote(true);
    try {
      const ok = await onSubmitNote({
        body: noteBody.trim(),
      });
      if (ok === false) {
        // Blocked by the auth guard — keep the composer open for retry.
        return;
      }
      setNoteBody("");
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to post note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const frames = [
    { id: "classic", name: "Classic", color: "border-white/30" },
    { id: "neon", name: "Neon Glow", color: "border-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" },
    { id: "fest26", name: "Fest '26", color: "border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]" },
    { id: "sunset", name: "Sunset", color: "border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-surface-container border border-outline/50 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between p-4 border-b border-outline/30 bg-surface-container-low">
          <div className="flex items-center gap-2 min-w-0">
            {isAuthenticated && authorName && (
              <div className="flex items-center gap-2 mr-2 min-w-0">
                <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-primary/40 bg-surface-container-high shrink-0">
                  {authorAvatar ? (
                    <Image src={authorAvatar} alt={authorName} fill className="object-cover" sizes="32px" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-heading font-bold text-xs text-on-surface">
                      {authorInitials || "?"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Posting as
                  </span>
                  <span className="font-heading font-bold text-xs text-on-surface truncate">{authorName}</span>
                </div>
                <Icon name="verified" size={14} className="text-primary shrink-0" />
              </div>
            )}
            <button
              onClick={() => {
                setActiveTab("photo");
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "photo"
                  ? "bg-primary text-on-primary shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="photo_camera" size={16} />
              <span>Post Photo</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("note");
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "note"
                  ? "bg-primary text-on-primary shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name="chat" size={16} />
              <span>Vibe Note</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2">
            <Icon name="error" size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === "photo" ? (
            <form onSubmit={handlePhotoSubmit} className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Photo Dropzone or Preview */}
              {!previewResult ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-52 rounded-2xl border-2 border-dashed border-outline/60 hover:border-primary/80 bg-surface-container-lowest/50 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all hover:bg-primary-container/10 group p-4 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-primary-container/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Icon name={isCompressing ? "hourglass_empty" : "add_photo_alternate"} size={28} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-heading font-bold text-sm text-on-surface">
                      {isCompressing ? "Compressing photo..." : "Tap to choose photo or capture"}
                    </span>
                    <span className="font-body text-xs text-on-surface-variant mt-0.5">
                      JPEG, PNG, WebP • Auto-compressed under 2 MB
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline">
                    <Image
                      src={previewResult.previewUrl}
                      alt="Upload preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        revokePreviewUrl(previewUrlRef.current);
                        previewUrlRef.current = null;
                        setPreviewResult(null);
                        setSelectedFile(null);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1 hover:bg-black/90"
                    >
                      <Icon name="refresh" size={14} />
                      Change
                    </button>
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px]">
                      {(previewResult.compressedSize / 1024 / 1024).toFixed(2)} MB • {previewResult.width}×{previewResult.height}
                    </div>
                  </div>

                  {/* Frame Selector — hidden in story-entry mode */}
                  {mode !== "story-entry" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-heading font-semibold text-xs text-on-surface-variant">
                        Choose Frame Style
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {frames.map((frame) => (
                          <button
                            type="button"
                            key={frame.id}
                            onClick={() => setSelectedFrame(frame.id)}
                            className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                              selectedFrame === frame.id
                                ? `bg-primary/20 text-primary border-primary ${frame.color}`
                                : "border-outline/40 text-on-surface-variant hover:text-on-surface"
                            }`}
                          >
                            {frame.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Photo Button */}
              <button
                type="submit"
                disabled={!selectedFile || isUploadingPhoto || photoCooldownRemaining > 0}
                className="w-full py-3 px-4 rounded-xl font-heading font-bold text-sm bg-primary text-on-primary shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isUploadingPhoto ? (
                  <>
                    <Icon name="progress_activity" size={18} className="animate-spin" />
                    <span>{mode === "story-entry" ? "Adding entry..." : "Posting to live wall..."}</span>
                  </>
                ) : mode === "story-entry" ? (
                  <>
                    <Icon name="add_a_photo" size={18} />
                    <span>Add to Chain Story</span>
                  </>
                ) : photoCooldownRemaining > 0 ? (
                  <span>Cooldown: wait {photoCooldownRemaining}s</span>
                ) : (
                  <>
                    <Icon name="publish" size={18} />
                    <span>Post Photo to Live Wall</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNoteSubmit} className="flex flex-col gap-4">
              {/* Note Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-heading font-semibold text-xs text-on-surface-variant">
                    Your Vibe Note / Confession
                  </label>
                  <span
                    className={`font-body text-xs font-semibold ${
                      noteBody.length > 260 ? "text-danger" : "text-on-surface-variant"
                    }`}
                  >
                    {280 - noteBody.length} chars left
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Share a shoutout, funny moment, or live festival reaction..."
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  maxLength={280}
                  required
                  className="w-full p-3.5 rounded-xl bg-surface-container-lowest border border-outline/50 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Submit Note Button */}
              <button
                type="submit"
                disabled={!noteBody.trim() || isSubmittingNote || noteCooldownRemaining > 0}
                className="w-full py-3 px-4 rounded-xl font-heading font-bold text-sm bg-primary text-on-primary shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isSubmittingNote ? (
                  <>
                    <Icon name="progress_activity" size={18} className="animate-spin" />
                    <span>Broadcasting note...</span>
                  </>
                ) : noteCooldownRemaining > 0 ? (
                  <span>Cooldown: wait {noteCooldownRemaining}s</span>
                ) : (
                  <>
                    <Icon name="send" size={18} />
                    <span>Post Vibe Note</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
