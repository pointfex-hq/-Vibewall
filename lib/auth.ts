"use client";

import { useEffect, useState } from "react";
import { getAuthState, AuthStateResult } from "@/lib/supabase";

export interface AuthState {
  /** The authenticated user, or null while unauthenticated. */
  user: AuthStateResult["user"];
  /** True when a valid authenticated session is established. */
  isAuthenticated: boolean;
  /**
   * True once the initial session check has finished, so guest-only
   * controls are not shown while the session is still being restored.
   */
  isReady: boolean;
}

/**
 * Shared client-side authentication state hook.
 *
 * Loads the session once on mount using the existing `getAuthState()`
 * mechanism (Supabase `getUser()` in real mode, persisted mock user in
 * mock mode). Pages use `isReady` to separate "session loading" from
 * "unauthenticated" states and `isAuthenticated` to gate protected actions.
 */
export function useAuth(): AuthState {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isReady: false,
  });

  useEffect(() => {
    let cancelled = false;
    getAuthState()
      .then((state) => {
        if (cancelled) return;
        setAuth({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isReady: true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAuth({ user: null, isAuthenticated: false, isReady: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return auth;
}
