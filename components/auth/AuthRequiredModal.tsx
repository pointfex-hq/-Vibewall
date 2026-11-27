"use client";

import React, { useEffect, useRef, useState } from "react";
import { getAuthState, signInWithGoogle } from "@/lib/supabase";
import { Icon } from "@/components/icons";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Runs after a successful Google sign-in. Return false (or a Promise
   * resolving to false) to keep the modal open so the user can retry
   * the requested action manually.
   */
  onAuthenticated?: () => void | boolean | Promise<void | boolean>;
}

/**
 * Shared "Sign in to Join the Vibe" prompt used by every interactive
 * action on the live wall and related surfaces. Guests browsing as
 * read-only can close it at any time; only a Google sign-in unlocks the
 * protected actions.
 */
export default function AuthRequiredModal({
  isOpen,
  onClose,
  onAuthenticated,
}: AuthRequiredModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");

  const primaryRef = useRef<HTMLButtonElement>(null);

  // Focus management: focus the primary action when the modal opens and
  // show the loading state while the OAuth flow is in progress.
  useEffect(() => {
    if (!isOpen) return;
    setAuthError("");
    setIsSigningIn(false);
    const timer = setTimeout(() => primaryRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handlePrimary = async () => {
    if (isSigningIn) return;
    setAuthError("");
    setIsSigningIn(true);
    try {
      // Preserve the current room code & intended destination through OAuth.
      await signInWithGoogle(
        typeof window !== "undefined" ? window.location.href : undefined
      );
      const state = await getAuthState();
      if (!state.isAuthenticated) {
        // OAuth was cancelled or no session was established.
        setAuthError("Google sign-in didn't complete. Please try again.");
        setIsSigningIn(false);
        return;
      }
      const resumed = await onAuthenticated?.();
      setIsSigningIn(false);
      if (resumed !== false) onClose();
    } catch (err: any) {
      setIsSigningIn(false);
      setAuthError(
        err?.message || "Google sign-in failed. Please try again."
      );
    }
  };

  // Clicking the backdrop dismisses the modal.
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Escape key dismisses the modal.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  // Simple focus trap so keyboard users stay inside the dialog.
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const dialog = e.currentTarget;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-required-title"
        aria-describedby="auth-required-desc"
        className="relative w-full max-w-sm rounded-3xl bg-surface-container border border-outline/60 shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-container/30 flex items-center justify-center text-primary">
              <Icon name="shield_lock" size={20} className="text-primary" />
            </div>
            <h3
              id="auth-required-title"
              className="font-heading font-extrabold text-lg text-on-surface"
            >
              Sign in to Join the Vibe
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Description */}
        <p
          id="auth-required-desc"
          className="font-body text-sm text-on-surface-variant leading-relaxed"
        >
          You&#39;re currently viewing this room as a guest. Sign in with Google
          to share photos, post notes, like memories, and vote in polls.
        </p>

        {/* Primary: Google sign-in */}
        <button
          ref={primaryRef}
          onClick={handlePrimary}
          disabled={isSigningIn}
          className="w-full py-3.5 px-4 rounded-2xl font-heading font-bold text-sm bg-primary text-on-primary shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSigningIn ? (
            <>
              <Icon name="progress_activity" size={18} className="animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <Icon name="login" size={20} />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Secondary: continue browsing as guest */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl font-heading font-bold text-sm bg-surface-container border border-outline/50 text-on-surface hover:text-primary hover:border-primary/40 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Icon name="visibility" size={18} />
          <span>Continue Browsing as Guest</span>
        </button>

        {/* Error state */}
        {authError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2"
          >
            <Icon name="error" size={18} />
            <span>{authError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
