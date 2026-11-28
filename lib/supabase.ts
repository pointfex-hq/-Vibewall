import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { RealtimeEventPayloads } from "@/types/vibewall";
import {
  PLACEHOLDER_SUPABASE_URL,
  PLACEHOLDER_SUPABASE_ANON_KEY,
  isMockMode,
  isSupabaseConfigured,
  isDemoHostEnabled,
  getAuthMode,
  getDemoHostUser,
} from "@/lib/config";

// Re-exported for existing consumers of the shared auth-mode helpers.
export { isMockMode, isSupabaseConfigured, getAuthMode };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export function authReturnPath(destination: string | null, origin: string): string {
  try {
    const url = new URL(destination || "/", origin);
    if (url.origin === origin && !url.pathname.startsWith("//")) {
      return url.pathname + url.search + url.hash;
    }
  } catch {}
  return "/";
}

export async function signInWithGoogle(redirectTo?: string): Promise<"redirecting" | "signed-in"> {
  if (typeof window === "undefined") throw new Error("Google sign-in requires a browser.");
  const returnPath = authReturnPath(redirectTo || window.location.href, window.location.origin);
  if (isMockMode()) {
    // Mock login flow (explicitly enabled via NEXT_PUBLIC_USE_MOCK=true).
    const mockUser = {
      id: "mock-user-jitu-" + Math.random().toString(36).substring(2, 8),
      email: "jitu.frontend@vibewall.app",
      user_metadata: {
        full_name: "Jihadul Islam Jitu",
        avatar_url: "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png",
      },
    };
    localStorage.removeItem("vibewall_mock_signed_out");
    localStorage.setItem("vibewall_mock_user", JSON.stringify(mockUser));
    if (redirectTo) {
      window.location.assign(returnPath);
      return "redirecting";
    }
    return "signed-in";
  }

  if (!isSupabaseConfigured()) {
    throw new Error("Google sign-in is unavailable. This deployment needs Supabase authentication configured.");
  }

  sessionStorage.setItem("vibewall_auth_return", returnPath);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/callback", window.location.origin).href,
    },
  });
  if (error) throw error;
  return "redirecting";
}

export async function signOut() {
  if (typeof window !== "undefined") {
    if (isMockMode()) localStorage.setItem("vibewall_mock_signed_out", "true");
    localStorage.removeItem("vibewall_mock_user");
  }
  if (getAuthMode() === "supabase") {
    // Real Supabase mode: clear the actual Supabase session.
    return await supabase.auth.signOut();
  }
  // Mock (or unconfigured) mode: mock user cleared above; stay signed out.
  return { error: null };
}

export async function getCurrentUser() {
  const mode = getAuthMode();
  if (mode === "mock") {
    if (typeof window !== "undefined") {
      const mockUserJson = localStorage.getItem("vibewall_mock_user");
      if (mockUserJson) {
        try {
          const user = JSON.parse(mockUserJson);
          if (user && typeof user.id === "string" && user.id) {
            return user;
          }
        } catch {}
      }
      if (isDemoHostEnabled() && !localStorage.getItem("vibewall_mock_signed_out")) {
        // Explicit opt-in demo host identity; never granted implicitly.
        return getDemoHostUser();
      }
    }
    // Mock mode without a stored mock user → signed out (no fake host login).
    return null;
  }
  if (mode === "supabase") {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  }
  // Real mode unavailable → never fabricate a fake authenticated user.
  return null;
}

export interface AuthStateResult {
  user: any | null;
  isAuthenticated: boolean;
}

/**
 * Returns the current authentication state used by the interactive flows:
 * a valid signed-in user in real Supabase mode, or the persisted mock user
 * when mock mode has been explicitly enabled and a sign-in completed. Visitors
 * who have not signed in are reported as unauthenticated so they can only
 * browse. When no identity is available, the visitor is simply signed out.
 */
export async function getAuthState(): Promise<AuthStateResult> {
  const mode = getAuthMode();
  if (mode === "mock") {
    if (typeof window !== "undefined") {
      const mockUserJson = localStorage.getItem("vibewall_mock_user");
      if (mockUserJson) {
        try {
          const user = JSON.parse(mockUserJson);
          if (user && typeof user.id === "string" && user.id) {
            return { user, isAuthenticated: true };
          }
        } catch {}
      }
      if (isDemoHostEnabled() && !localStorage.getItem("vibewall_mock_signed_out")) {
        // Explicit opt-in demo host identity; never granted implicitly.
        return { user: getDemoHostUser(), isAuthenticated: true };
      }
    }
    // Mock mode with no stored mock user = guest.
    return { user: null, isAuthenticated: false };
  }
  if (mode === "supabase") {
    const { data } = await supabase.auth.getUser();
    return { user: data?.user ?? null, isAuthenticated: Boolean(data?.user) };
  }
  // Unconfigured → signed out; no fake authentication.
  return { user: null, isAuthenticated: false };
}

export interface RealtimeHandlers {
  onRoomClosed?: () => void;
  onNewPost?: (payload: RealtimeEventPayloads["new_post"]) => void;
  onNewNote?: (payload: RealtimeEventPayloads["new_note"]) => void;
  onContentModerated?: (payload: RealtimeEventPayloads["content_moderated"]) => void;
  onPollUpdated?: (payload: RealtimeEventPayloads["poll_updated"]) => void;
  onThemeUpdated?: (payload: RealtimeEventPayloads["theme_updated"]) => void;
}

export function subscribeToRoom(roomId: string, handlers: RealtimeHandlers): () => void {
  if (isMockMode() || !isSupabaseConfigured() || !roomId) {
    // In mock/offline mode, listen to window custom events so local actions synchronize instantly
    if (typeof window !== "undefined") {
      const listener = (event: CustomEvent<{ room_id: string; type: string; payload: any }>) => {
        if (event.detail?.room_id === roomId) {
          const { type, payload } = event.detail;
          if (type === "room_closed") handlers.onRoomClosed?.();
          if (type === "new_post" && handlers.onNewPost) handlers.onNewPost(payload);
          if (type === "new_note" && handlers.onNewNote) handlers.onNewNote(payload);
          if (type === "content_moderated" && handlers.onContentModerated) handlers.onContentModerated(payload);
          if (type === "poll_updated" && handlers.onPollUpdated) handlers.onPollUpdated(payload);
          if (type === "theme_updated" && handlers.onThemeUpdated) handlers.onThemeUpdated(payload);
        }
      };
      window.addEventListener("vibewall_realtime_event" as any, listener);
      return () => {
        window.removeEventListener("vibewall_realtime_event" as any, listener);
      };
    }
    return () => {};
  }

  const channelName = `room:${roomId}`;
  const channel: RealtimeChannel = supabase.channel(channelName);

  channel
    .on("broadcast", { event: "room_closed" }, () => handlers.onRoomClosed?.())
    .on("broadcast", { event: "new_post" }, ({ payload }) => {
      handlers.onNewPost?.(payload);
    })
    .on("broadcast", { event: "new_note" }, ({ payload }) => {
      handlers.onNewNote?.(payload);
    })
    .on("broadcast", { event: "content_moderated" }, ({ payload }) => {
      handlers.onContentModerated?.(payload);
    })
    .on("broadcast", { event: "poll_updated" }, ({ payload }) => {
      handlers.onPollUpdated?.(payload);
    })
    .on("broadcast", { event: "theme_updated" }, ({ payload }) => {
      handlers.onThemeUpdated?.(payload);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Supabase Realtime] Subscribed to ${channelName}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function broadcastLocalEvent(roomId: string, type: string, payload: any) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("vibewall_realtime_event", {
        detail: { room_id: roomId, type, payload },
      })
    );
  }
}
