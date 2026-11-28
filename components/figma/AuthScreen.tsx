"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser, signInWithGoogle } from "@/lib/supabase";
import { isMockMode } from "@/lib/config";
import ThemeWrapper from "@/components/ThemeWrapper";
import { Icon } from "@/components/icons";
import { BrandMark } from "@/components/figma";

/**
 * Figma "Create your VibeWall account" / "Welcome back" screens.
 * Uses the real Google auth flow; email/password is only enabled in the
 * explicit mock deployment (no fabricated identity in real Supabase mode).
 */
export default function AuthScreen({ variant }: { variant: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) router.replace(returnTo);
    });
  }, [returnTo, router]);

  const strength = password.length >= 12 ? "Strong" : password.length >= 8 ? "Medium" : password.length > 0 ? "Weak" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setError("Please enter a valid email address (e.g. alana@vibewall.art).");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (variant === "signup") {
      if (!fullName.trim()) {
        setError("Please tell us your name.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match yet.");
        return;
      }
    }
    if (!isMockMode()) {
      setError("Email/password sign-in is not enabled in this deployment. Please continue with Google.");
      return;
    }
    // Mock deployment: create a local demo session for the given identity.
    localStorage.setItem(
      "vibewall_mock_user",
      JSON.stringify({
        id: `local-${email}`,
        email,
        user_metadata: {
          full_name: variant === "signup" ? fullName.trim() : email.split("@")[0],
          avatar_url: "",
        },
      })
    );
    localStorage.removeItem("vibewall_mock_signed_out");
    router.push(returnTo);
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle(typeof window !== "undefined" ? window.location.origin + returnTo : undefined);
      const user = await getCurrentUser();
      if (user) router.push(returnTo);
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isSignUp = variant === "signup";

  return (
    <ThemeWrapper themeKey="midnight-neon">
      <div className="figma-paper flex min-h-screen flex-col items-center px-4 py-8 text-on-surface">
        <Link href="/" aria-label="VibeWall home" className="mb-5">
          <BrandMark size={48} />
        </Link>

        <div className="figma-card w-full max-w-sm p-6 sm:p-7">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-primary">
              <Icon name={isSignUp ? "auto_awesome" : "login"} size={18} />
            </div>
            <h1 className="font-heading text-2xl font-black text-on-surface">
              {isSignUp ? "Create your VibeWall account" : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
              {isSignUp
                ? "Share your wall, decorate it with keepsakes, and curate boards with warmth."
                : "Pick up right where you left your boards and saved threads."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {isSignUp && (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-on-surface">Full Name</span>
                <input
                  type="text"
                  placeholder="Ananya Sen"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-full border border-outline/60 bg-card-low px-4 py-2.5 text-sm outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-on-surface">Email address</span>
              <input
                type="email"
                placeholder="ananya@vibewall.art"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border border-outline/60 bg-card-low px-4 py-2.5 text-sm outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-on-surface">Password</span>
              <span className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-full border border-outline/60 bg-card-low px-4 py-2.5 pr-11 text-sm outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} size={17} />
                </button>
              </span>
              {strength && (
                <span className="mt-1 text-[10px] font-bold text-tertiary">{strength}</span>
              )}
            </label>

            {isSignUp && (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-on-surface">Confirm Password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-full border border-outline/60 bg-card-low px-4 py-2.5 text-sm outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
                />
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                {error}
              </p>
            )}

            <button type="submit" className="figma-primary-btn mt-1 w-full py-3 text-sm">
              {isSignUp ? "Create Account" : "Sign In"}
              <Icon name="arrow_forward" size={17} />
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span className="h-px flex-1 bg-outline/50" /> or <span className="h-px flex-1 bg-outline/50" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="figma-card w-full py-3 text-sm font-bold hover:border-primary/60 disabled:opacity-50"
          >
            Continue with Google
          </button>

          <p className="mt-5 text-center text-xs text-on-surface-variant">
            {isSignUp ? "Already have an account? " : "New to VibeWall? "}
            <Link
              href={isSignUp ? "/signin" : "/signup"}
              className="font-bold text-primary hover:underline"
            >
              {isSignUp ? "Sign In" : "Create an Account"}
            </Link>
          </p>
          <p className="mt-2 text-center text-[11px] text-on-surface-variant/80">
            Just looking? <Link href="/" className="font-bold text-primary">Continue as Guest</Link>
          </p>
        </div>
      </div>
    </ThemeWrapper>
  );
}
