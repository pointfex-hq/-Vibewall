"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function finish() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const reason = url.searchParams.get("error_description") || hash.get("error_description");
      if (reason) throw new Error(reason);
      // The client exchanges the PKCE code during initialization before getSession resolves.
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw error || new Error("Google sign-in did not complete.");
      if (!active) return;
      const next = new URL(sessionStorage.getItem("vibewall_auth_return") || "/", url.origin);
      sessionStorage.removeItem("vibewall_auth_return");
      window.location.replace(next.origin === url.origin ? next.href : url.origin);
    }
    finish().catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  return <main className="p-8">{error ? <><p role="alert">{error}</p><Link href="/">Return to sign-in</Link></> : <p>Finishing Google sign-in…</p>}</main>;
}
