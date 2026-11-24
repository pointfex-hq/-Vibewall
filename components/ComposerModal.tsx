"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { validateAndCompressImage, CompressionResult } from "@/lib/upload/compress";

interface ComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Returns false when the action is blocked by the auth guard. */
  onSubmitPhoto: (data: { file: File; frameId: string; authorName: string }) => Promise<boolean | void>;
  onSubmitNote: (data: { body: string; authorName: string }) => Promise<boolean | void>;
  defaultTab?: "photo" | "note";
  photoCooldownRemaining?: number;
  noteCooldownRemaining?: number;
}

export default function ComposerModal({
  isOpen,
  onClose,
  onSubmitPhoto,
  onSubmitNote,
  defaultTab = "photo",
  photoCooldownRemaining = 0,
  noteCooldownRemaining = 0,
}: ComposerModalProps) {
  const [activeTab, setActiveTab] = useState<"photo" | "note">(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  // Photo tab states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<CompressionResult | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string>("classic");
  const [photoAuthor, setPhotoAuthor] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note tab states
  const [noteBody, setNoteBody] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsCompressing(true);
    try {
      const res = await validateAndCompressImage(file);
      setSelectedFile(res.file);
      setPreviewResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process image");
    } finally {
      setIsCompressing(false);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploadingPhoto) return;

    setErrorMessage(null);
    setIsUploadingPhoto(true);
    try {
      const ok = await onSubmitPhoto({
        file: selectedFile,
        frameId: selectedFrame,
        authorName: photoAuthor.trim() || "VibeGuest",
      });
      if (ok === false) {
        // Blocked by the auth guard — keep the composer open for retry.
        return;
      }
      // Reset & close
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
        authorName: noteAuthor.trim() || "VibeGuest",
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
          <div className="flex items-center gap-2">
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
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
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
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Vibe Note</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
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
                    <span className="material-symbols-outlined text-[28px]">
                      {isCompressing ? "hourglass_empty" : "add_photo_alternate"}
                    </span>
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
                        setPreviewResult(null);
                        setSelectedFile(null);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1 hover:bg-black/90"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Change
                    </button>
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px]">
                      {(previewResult.compressedSize / 1024 / 1024).toFixed(2)} MB • {previewResult.width}×{previewResult.height}
                    </div>
                  </div>

                  {/* Frame Selector */}
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
                </div>
              )}

              {/* Author Name */}
              <div className="flex flex-col gap-1">
                <label className="font-heading font-semibold text-xs text-on-surface-variant">
                  Your Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ayesha or @squad26"
                  value={photoAuthor}
                  onChange={(e) => setPhotoAuthor(e.target.value)}
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline/50 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Submit Photo Button */}
              <button
                type="submit"
                disabled={!selectedFile || isUploadingPhoto || photoCooldownRemaining > 0}
                className="w-full py-3 px-4 rounded-xl font-heading font-bold text-sm bg-primary text-on-primary shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isUploadingPhoto ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Posting to live wall...</span>
                  </>
                ) : photoCooldownRemaining > 0 ? (
                  <span>Cooldown: wait {photoCooldownRemaining}s</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">publish</span>
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

              {/* Author Name */}
              <div className="flex flex-col gap-1">
                <label className="font-heading font-semibold text-xs text-on-surface-variant">
                  Author Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anonymous or Rahat"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline/50 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Broadcasting note...</span>
                  </>
                ) : noteCooldownRemaining > 0 ? (
                  <span>Cooldown: wait {noteCooldownRemaining}s</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
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
