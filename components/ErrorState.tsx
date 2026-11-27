"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { signInWithGoogle } from "@/lib/supabase";

export interface ErrorStateProps {
  status?: number;
  code?: string;
  message?: string;
  isNetwork?: boolean;
  roomCode?: string;
  onRetry?: () => void;
  onSignIn?: () => void;
  backHref?: string;
  backLabel?: string;
  showHomeButton?: boolean;
  compact?: boolean;
  className?: string;
}

export default function ErrorState({
  status,
  code,
  message,
  isNetwork,
  roomCode,
  onRetry,
  onSignIn,
  backHref = "/",
  backLabel = "Back to Home",
  showHomeButton = true,
  compact = false,
  className = "",
}: ErrorStateProps) {
  const is401 = status === 401 || code === "UNAUTHORIZED";
  const is403 = status === 403 || code === "FORBIDDEN";
  const is404 = status === 404 || code === "NOT_FOUND" || code === "VALIDATION_ERROR";
  const isOffline = isNetwork || status === 0 || code === "NETWORK_ERROR";
  const is500 = (status && status >= 500) || code === "SERVER_ERROR";

  const handleSignIn = async () => {
    if (onSignIn) {
      onSignIn();
      return;
    }
    const currentUrl = typeof window !== "undefined" ? window.location.href : undefined;
    await signInWithGoogle(currentUrl);
  };

  let iconName = "error";
  let title = "An Error Occurred";
  let description = message || "Something unexpected happened. Please try again.";
  let badgeText = status ? `HTTP ${status}` : "ERROR";

  if (isOffline) {
    iconName = "wifi_off";
    title = "Connection Error";
    description = message || "Unable to reach VibeWall servers. Please check your internet connection.";
    badgeText = "OFFLINE";
  } else if (is401) {
    iconName = "lock";
    title = "Authentication Required";
    description =
      message ||
      (roomCode
        ? `Please sign in with Google to access room #${roomCode}.`
        : "You must be signed in with Google to access this resource.");
    badgeText = "HTTP 401";
  } else if (is403) {
    iconName = "shield";
    title = "Access Denied";
    description =
      message ||
      (roomCode
        ? `You do not have permission to access or administer room #${roomCode}.`
        : "You are not authorized to view this resource.");
    badgeText = "HTTP 403";
  } else if (is404) {
    iconName = "search_off";
    title = roomCode ? `Room #${roomCode} Not Found` : "Not Found";
    description =
      message ||
      (roomCode
        ? `Room #${roomCode} does not exist, has expired, or was closed by the host.`
        : "The requested room or page could not be found.");
    badgeText = "HTTP 404";
  } else if (is500) {
    iconName = "dns";
    title = "Server Error";
    description = message || "Our servers encountered an unexpected problem. Please try again shortly.";
    badgeText = `HTTP ${status || 500}`;
  }

  if (compact) {
    return (
      <div
        className={`p-4 rounded-2xl bg-danger/10 border border-danger/30 text-center flex flex-col items-center gap-2 ${className}`}
      >
        <div className="flex items-center gap-2 text-danger">
          <Icon name={iconName} size={20} />
          <span className="font-heading font-bold text-xs uppercase tracking-wider">{title}</span>
        </div>
        <p className="font-body text-xs text-on-surface-variant max-w-sm">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          {onRetry && (
            <button
              onClick={onRetry}
              className="py-1.5 px-3 rounded-lg bg-surface-container-high border border-outline text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-1"
            >
              <Icon name="refresh" size={14} />
              <span>Retry</span>
            </button>
          )}
          {is401 && (
            <button
              onClick={handleSignIn}
              className="py-1.5 px-3 rounded-lg bg-primary text-on-primary text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1"
            >
              <Icon name="login" size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-[55vh] flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
    >
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-3xl bg-surface-container border border-outline/50 flex items-center justify-center shadow-xl">
          <Icon
            name={iconName}
            size={40}
            className={isOffline || is401 ? "text-primary" : "text-danger"}
          />
        </div>
        <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-surface-container-highest border border-outline/50 text-[10px] font-mono font-bold text-on-surface-variant uppercase">
          {badgeText}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="font-heading font-black text-2xl text-on-surface tracking-tight">
          {title}
        </h2>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        {onRetry && (
          <button
            onClick={onRetry}
            className="py-2.5 px-5 rounded-2xl font-heading font-bold text-xs bg-primary text-on-primary shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Icon name="refresh" size={16} />
            <span>Try Again</span>
          </button>
        )}

        {is401 && (
          <button
            onClick={handleSignIn}
            className="py-2.5 px-5 rounded-2xl font-heading font-bold text-xs bg-primary text-on-primary shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Icon name="login" size={16} />
            <span>Sign In with Google</span>
          </button>
        )}

        {showHomeButton && (
          <Link
            href={backHref}
            className="py-2.5 px-5 rounded-2xl font-heading font-bold text-xs bg-surface-container-high border border-outline/50 text-on-surface hover:bg-surface-container-highest active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Icon name="home" size={16} />
            <span>{backLabel}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
