"use client";

import React, { useState, useEffect, useRef } from "react";
import { PostDTO } from "@/types/vibewall";
import {
  CardFormat,
  generateVibeCardCanvas,
  exportVibeCardPNG,
} from "@/lib/vibecard";
import { Icon } from "@/components/icons";

interface VibeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostDTO | null;
  roomTitle: string;
  roomCode: string;
  themeAccent?: string;
}

export default function VibeCardModal({
  isOpen,
  onClose,
  post,
  roomTitle,
  roomCode,
  themeAccent = "#8B5CF6",
}: VibeCardModalProps) {
  const [format, setFormat] = useState<CardFormat>("story");
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !post) {
      setPreviewDataUrl(null);
      return;
    }

    let isMounted = true;
    setIsRendering(true);

    generateVibeCardCanvas({
      imageUrl: post.image_url,
      authorName: post.author_name,
      roomTitle,
      roomCode,
      frameId: post.frame_id,
      format,
      themeAccent,
    })
      .then((canvas) => {
        if (isMounted) {
          setPreviewDataUrl(canvas.toDataURL("image/png"));
        }
      })
      .catch((err) => {
        console.error("VibeCard canvas render error:", err);
      })
      .finally(() => {
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, post, format, roomTitle, roomCode, themeAccent]);

  if (!isOpen || !post) return null;

  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportVibeCardPNG(
        {
          imageUrl: post.image_url,
          authorName: post.author_name,
          roomTitle,
          roomCode,
          frameId: post.frame_id,
          format,
          themeAccent,
        },
        `vibewall-${roomCode}-${format}-${post.id.slice(-6)}.png`
      );
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-surface-container border border-outline/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline/30 bg-surface-container-low">
          <div className="flex items-center gap-2">
            <Icon name="badge" size={22} className="text-primary" />
            <h3 className="font-heading font-bold text-sm text-on-surface">
              Export VibeCard
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Format Selector */}
        <div className="p-3 border-b border-outline/20 flex gap-2 justify-center bg-surface-container-lowest/60">
          <button
            onClick={() => setFormat("story")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
              format === "story"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            9:16 Story (1080×1920)
          </button>
          <button
            onClick={() => setFormat("polaroid")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
              format === "polaroid"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Polaroid (1080×1350)
          </button>
        </div>

        {/* Canvas Preview Area */}
        <div className="flex-1 p-4 flex items-center justify-center bg-surface-container-lowest/40 overflow-y-auto">
          {isRendering || !previewDataUrl ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-on-surface-variant">
              <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
              <span className="font-body text-xs font-medium">
                Generating high-res card...
              </span>
            </div>
          ) : (
            <div className="relative max-h-[50vh] shadow-2xl rounded-2xl overflow-hidden border border-white/10">
              <img
                src={previewDataUrl}
                alt="VibeCard preview"
                className="max-h-[50vh] w-auto object-contain rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-outline/30 bg-surface-container-low flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl font-heading font-semibold text-xs border border-outline/60 text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting || isRendering}
            className="flex-[2] py-2.5 px-4 rounded-xl font-heading font-bold text-xs bg-primary text-on-primary shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Icon name={isExporting ? "sync" : "download"} size={16} />
            <span>{isExporting ? "Saving..." : "Download / Share PNG"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
