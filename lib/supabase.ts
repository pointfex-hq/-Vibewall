import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { RealtimeEventPayloads } from "@/types/vibewall";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured =
  supabaseUrl !== "https://placeholder-project.supabase.co" &&
  supabaseAnonKey !== "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function signInWithGoogle(redirectTo?: string) {
  if (!isSupabaseConfigured) {
    // Mock login in development/demo mode
    if (typeof window !== "undefined") {
      const mockUser = {
        id: "mock-user-jitu-" + Math.random().toString(36).substring(2, 8),
        email: "jitu.frontend@vibewall.app",
        user_metadata: {
          full_name: "Jihadul Islam Jitu",
          avatar_url: "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png",
        },
      };
      localStorage.setItem("vibewall_mock_user", JSON.stringify(mockUser));
      if (redirectTo) {
        window.location.href = redirectTo;
      }
      return { data: { user: mockUser }, error: null };
    }
  }

  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo || (typeof window !== "undefined" ? window.location.href : undefined),
    },
  });
}

export async function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("vibewall_mock_user");
  }
  if (!isSupabaseConfigured) {
    return { error: null };
  }
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (typeof window !== "undefined") {
    const mockUserJson = localStorage.getItem("vibewall_mock_user");
    if (mockUserJson) {
      try {
        return JSON.parse(mockUserJson);
      } catch {}
    }
  }

  if (!isSupabaseConfigured) {
    return {
      id: "guest-host-user",
      email: "host@vibewall.app",
      user_metadata: {
        full_name: "Jihadul Islam Jitu (Host)",
        avatar_url: "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png",
      },
    };
  }

  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export interface RealtimeHandlers {
  onNewPost?: (payload: RealtimeEventPayloads["new_post"]) => void;
  onNewNote?: (payload: RealtimeEventPayloads["new_note"]) => void;
  onContentModerated?: (payload: RealtimeEventPayloads["content_moderated"]) => void;
  onPollUpdated?: (payload: RealtimeEventPayloads["poll_updated"]) => void;
  onThemeUpdated?: (payload: RealtimeEventPayloads["theme_updated"]) => void;
}

export function subscribeToRoom(roomId: string, handlers: RealtimeHandlers): () => void {
  if (!isSupabaseConfigured || !roomId) {
    // In mock/offline mode, listen to window custom events so local actions synchronize instantly
    if (typeof window !== "undefined") {
      const listener = (event: CustomEvent<{ room_id: string; type: string; payload: any }>) => {
        if (event.detail?.room_id === roomId) {
          const { type, payload } = event.detail;
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
