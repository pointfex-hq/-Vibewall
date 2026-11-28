"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authReturnPath, getCurrentUser, signInWithGoogle } from "@/lib/supabase";
import ThemeWrapper from "@/components/ThemeWrapper";
import { Icon } from "@/components/icons";
import { BrandMark } from "@/components/figma";

/**
 * Google-only authentication screen for VibeWall.
 */
export default function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = authReturnPath(
    params.get("returnTo"),
    typeof window === "undefined" ? "http://localhost" : window.location.origin
  );

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) router.replace(returnTo);
    });
  }, [returnTo, router]);

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <ThemeWrapper themeKey="midnight-neon">
      <div className="figma-paper flex min-h-screen flex-col items-center justify-center px-4 py-8 text-on-surface">
        <Link href="/" aria-label="VibeWall home" className="mb-5">
          <BrandMark size={48} />
        </Link>

        <div className="figma-card w-full max-w-sm p-6 sm:p-7">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary">
              <Icon name="login" size={19} />
            </div>
            <h1 className="font-heading text-2xl font-black text-on-surface">
              Welcome to VibeWall
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
              Continue with your Google account to create rooms, post photos, and join live walls.
            </p>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="figma-primary-btn w-full py-3 text-sm disabled:opacity-50"
          >
            <Icon name="login" size={17} />
            <span>{busy ? "Redirecting to Google..." : "Continue with Google"}</span>
          </button>

          <p className="mt-5 text-center text-[11px] text-on-surface-variant/80">
            Just looking? <Link href="/" className="font-bold text-primary hover:underline">Continue as Guest</Link>
          </p>
        </div>
      </div>
    </ThemeWrapper>
  );
}
