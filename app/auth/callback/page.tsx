"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authReturnPath, supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [error, setError] = useState("");
  const [retryPath, setRetryPath] = useState("/signin");
  const exchange = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const next = authReturnPath(sessionStorage.getItem("vibewall_auth_return"), url.origin);
    setRetryPath("/signin?returnTo=" + encodeURIComponent(next));

    async function finish() {
      const hash = new URLSearchParams(url.hash.slice(1));
      const reason = url.searchParams.get("error_description") || hash.get("error_description") ||
        url.searchParams.get("error") || hash.get("error");
      if (reason) throw new Error(reason);
      const code = url.searchParams.get("code");
      if (!code) throw new Error("Google sign-in did not return an authorization code.");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) throw error || new Error("Google sign-in did not complete.");
    }

    // A PKCE code is single-use, including when React replays the effect.
    exchange.current ??= finish();
    exchange.current.then(() => {
      if (!active) return;
      sessionStorage.removeItem("vibewall_auth_return");
      window.location.replace(next);
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  return <main className="p-8">{error ? <><p role="alert">{error}</p><Link href={retryPath}>Return to sign-in</Link></> : <p>Finishing Google sign-in…</p>}</main>;
}
