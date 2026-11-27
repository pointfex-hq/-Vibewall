import {
  CreateRoomResponse,
  FeedResponse,
  JoinRoomResponse,
  ModerationActionPayload,
  ModerationResponse,
  NoteDTO,
  PollDTO,
  PostDTO,
  RoomDTO,
  RoomPreviewResponse,
  ScreenResponse,
  SignResponse,
  ThemeKey,
  UpdateRoomResponse,
} from "@/types/vibewall";
import { supabase } from "./supabase";
import { mockDB, getMockStore } from "./mock-data";
import { isMockMode, isSupabaseConfigured } from "./config";

// Mock API is used when mock mode is explicitly enabled or when real Supabase
// credentials are unavailable (safe offline fallback). Real mode requires a
// valid Supabase configuration and is selected only when mock mode is off.
const USE_MOCK = isMockMode() || !isSupabaseConfigured();

async function getAuthHeader(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Attach the real Supabase access token only in real Supabase mode.
  if (!isMockMode() && isSupabaseConfigured()) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
    } catch {}
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeader();
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });
  } catch (netErr: any) {
    const err = new Error(
      netErr?.message || "Network connection error. Please check your internet connection."
    ) as any;
    err.status = 0;
    err.code = "NETWORK_ERROR";
    err.isNetwork = true;
    throw err;
  }

  if (!res.ok) {
    let errorJson: any = null;
    try {
      errorJson = await res.json();
    } catch {}
    const message = errorJson?.error?.message || `HTTP error ${res.status}`;
    const err = new Error(message) as any;
    err.status = res.status;
    err.code =
      errorJson?.error?.code ||
      (res.status === 401
        ? "UNAUTHORIZED"
        : res.status === 403
        ? "FORBIDDEN"
        : res.status === 404
        ? "NOT_FOUND"
        : res.status >= 500
        ? "SERVER_ERROR"
        : "REQUEST_FAILED");
    err.isNetwork = false;
    throw err;
  }

  return (await res.json()) as T;
}

export const api = {
  // 1. POST /api/rooms
  async createRoom(data: {
    title: string;
    theme?: ThemeKey;
    expires_in_hours?: number;
  }): Promise<CreateRoomResponse> {
    if (USE_MOCK) {
      return mockDB.createRoom({
        title: data.title,
        theme: data.theme || "midnight-neon",
        expires_in_hours: data.expires_in_hours || 24,
      });
    }
    return request<CreateRoomResponse>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 1b. GET /api/rooms - List active public rooms
  async getActiveRooms(): Promise<RoomDTO[]> {
    if (USE_MOCK) {
      return mockDB.getActiveRooms();
    }
    try {
      const res = await request<{ rooms: RoomDTO[] }>("/api/rooms");
      return res.rooms || [];
    } catch (err: any) {
      if (err?.status === 404) return [];
      throw err;
    }
  },

  // 2. GET /api/rooms/[code]
  async getRoomPreview(code: string): Promise<RoomPreviewResponse> {
    if (USE_MOCK) {
      let room = mockDB.getRoom(code);
      if (!room && typeof window !== "undefined") {
        try {
          const res = await request<RoomPreviewResponse>(`/api/rooms/${code}`);
          if (res?.room) {
            const store = getMockStore();
            store.rooms.set(code.toUpperCase(), res.room as any);
            return res;
          }
        } catch (err: any) {
          // Preserve the server's failure semantics (issue #24): a 401/403/5xx or
          // a network outage must NOT be silently collapsed into "Room not found".
          // Only a genuine 404 (or successful-but-empty) response falls through to
          // the local 404 below.
          if (err?.isNetwork || (err?.status && err.status !== 404)) throw err;
        }
      }
      if (!room) {
        const err = new Error("Room not found") as any;
        err.status = 404;
        err.code = "NOT_FOUND";
        throw err;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const screen_token = room.screen_token;
      const screen_url = screen_token ? `${origin}/screen/${encodeURIComponent(screen_token)}` : undefined;
      return {
        room,
        is_owner: true,
        is_member: true,
        screen_token,
        screen_url,
      };
    }
    return request<RoomPreviewResponse>(`/api/rooms/${code}`);
  },

  // 3. POST /api/rooms/[code]/join
  async joinRoom(code: string): Promise<JoinRoomResponse> {
    if (USE_MOCK) {
      const room = mockDB.getRoom(code);
      if (!room) {
        const err = new Error("Room not found") as any;
        err.status = 404;
        throw err;
      }
      return { joined: true, room };
    }
    return request<JoinRoomResponse>(`/api/rooms/${code}/join`, {
      method: "POST",
    });
  },

  // 4. PATCH /api/rooms/[code]
  async updateRoom(
    code: string,
    updates: {
      theme?: ThemeKey;
      status?: "open" | "closed";
      rotate_screen_token?: boolean;
    }
  ): Promise<UpdateRoomResponse> {
    if (USE_MOCK) {
      const res = mockDB.updateRoom(code, updates);
      if (res) {
        if (typeof window !== "undefined") {
          try {
            await request<UpdateRoomResponse>(`/api/rooms/${code}`, {
              method: "PATCH",
              body: JSON.stringify(updates),
            });
          } catch {}
        }
        return res;
      }
      if (typeof window !== "undefined") {
        const serverRes = await request<UpdateRoomResponse>(`/api/rooms/${code}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
        if (serverRes?.room) {
          const store = getMockStore();
          store.rooms.set(code.toUpperCase(), serverRes.room as any);
        }
        return serverRes;
      }
      const err = new Error("Room not found") as any;
      err.status = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    return request<UpdateRoomResponse>(`/api/rooms/${code}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  // 5. GET /api/rooms/[code]/feed
  async getFeed(code: string, includeHidden = false): Promise<FeedResponse> {
    if (USE_MOCK) {
      const room = mockDB.getRoom(code);
      if (!room && typeof window !== "undefined") {
        const query = includeHidden ? "?include_hidden=true" : "";
        try {
          return await request<FeedResponse>(`/api/rooms/${code}/feed${query}`);
        } catch (err: any) {
          throw err;
        }
      }
      return mockDB.getFeed(code, includeHidden);
    }
    const query = includeHidden ? "?include_hidden=true" : "";
    return request<FeedResponse>(`/api/rooms/${code}/feed${query}`);
  },

  // 6. GET /api/screen/[token]
  async getScreenData(token: string): Promise<ScreenResponse> {
    if (USE_MOCK) {
      let room = mockDB.getRoomByToken(token);
      if (!room && typeof window !== "undefined") {
        try {
          const res = await request<ScreenResponse>(`/api/screen/${token}`);
          if (res?.room) {
            const store = getMockStore();
            store.rooms.set(res.room.code.toUpperCase(), res.room as any);
            return res;
          }
        } catch (err: any) {
          throw err;
        }
      }
      if (!room) {
        const err = new Error("Screen token invalid or room not found") as any;
        err.status = 404;
        err.code = "NOT_FOUND";
        throw err;
      }
      const feed = mockDB.getFeed(room.code, false);
      return {
        room,
        posts: feed.posts,
        pinned_notes: feed.pinned_notes,
        notes: feed.notes,
        active_poll: feed.active_poll,
      };
    }
    return request<ScreenResponse>(`/api/screen/${token}`);
  },

  // 7. POST /api/rooms/[code]/posts
  async createPost(
    code: string,
    data: {
      image_url: string;
      cloudinary_public_id: string;
      frame_id?: string;
      author_name?: string;
      author_avatar?: string;
    }
  ): Promise<{ post: PostDTO }> {
    if (USE_MOCK) {
      const post = mockDB.createPost(code, data);
      return { post };
    }
    return request<{ post: PostDTO }>(`/api/rooms/${code}/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 8. POST /api/rooms/[code]/notes
  async createNote(code: string, body: string, authorName?: string): Promise<{ note: NoteDTO }> {
    if (USE_MOCK) {
      const note = mockDB.createNote(code, body, authorName);
      return { note };
    }
    return request<{ note: NoteDTO }>(`/api/rooms/${code}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },


  // 11. POST /api/rooms/[code]/polls
  async createPoll(
    code: string,
    data: { question: string; options: string[] }
  ): Promise<{ poll: PollDTO }> {
    if (USE_MOCK) {
      const poll = mockDB.createPoll(code, data.question, data.options);
      return { poll };
    }
    return request<{ poll: PollDTO }>(`/api/rooms/${code}/polls`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 12. POST /api/polls/[pollId]/vote
  async votePoll(pollId: string, optionId: string): Promise<{ poll: PollDTO }> {
    if (USE_MOCK) {
      const poll = mockDB.votePoll(pollId, optionId);
      if (!poll) throw new Error("Could not vote on poll");
      return { poll };
    }
    return request<{ poll: PollDTO }>(`/api/polls/${pollId}/vote`, {
      method: "POST",
      body: JSON.stringify({ option_id: optionId }),
    });
  },

  // 13. POST /api/likes/toggle
  async toggleLike(
    targetType: "post" | "note",
    targetId: string
  ): Promise<{ liked: boolean; like_count: number }> {
    if (USE_MOCK) {
      const res = mockDB.toggleLike(targetType, targetId);
      if (!res) throw new Error("Item not found");
      return res;
    }
    return request<{ liked: boolean; like_count: number }>("/api/likes/toggle", {
      method: "POST",
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    });
  },

  // 14. POST /api/reports
  async reportContent(
    targetType: "post" | "note" | "story_entry",
    targetId: string
  ): Promise<{ reported: boolean; auto_hidden: boolean }> {
    if (USE_MOCK) {
      return mockDB.reportItem(targetType, targetId);
    }
    return request<{ reported: boolean; auto_hidden: boolean }>("/api/reports", {
      method: "POST",
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    });
  },

  // 15. POST /api/moderation
  async moderateContent(payload: ModerationActionPayload): Promise<ModerationResponse> {
    if (USE_MOCK) {
      return mockDB.moderateItem(
        payload.room_id,
        payload.target_type,
        payload.target_id,
        payload.action
      );
    }
    return request<ModerationResponse>("/api/moderation", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 16. POST /api/cloudinary/sign
  async getSignSignature(folder = "vibewall"): Promise<SignResponse> {
    if (USE_MOCK) {
      return {
        signature: "mock_signature_" + Date.now(),
        timestamp: Math.floor(Date.now() / 1000),
        cloud_name: "demo",
        api_key: "mock_api_key",
      };
    }
    return request<SignResponse>("/api/cloudinary/sign", {
      method: "POST",
      body: JSON.stringify({ folder }),
    });
  },

  // Direct Cloudinary Upload workflow
  async uploadPhoto(file: File): Promise<{ image_url: string; cloudinary_public_id: string }> {
    if (USE_MOCK) {
      // In mock mode, convert image to data URL so uploaded image appears in live feed
      const previewUrl = await fileToDataUrl(file);
      return {
        image_url: previewUrl,
        cloudinary_public_id: "vibewall/mock-" + Math.random().toString(36).substring(2, 9),
      };
    }

    // Real Cloudinary flow
    const signData = await api.getSignSignature("vibewall");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signData.api_key);
    formData.append("timestamp", String(signData.timestamp));
    formData.append("signature", signData.signature);
    formData.append("folder", "vibewall");

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!cloudRes.ok) {
      throw new Error("Failed to upload image to Cloudinary");
    }

    const cloudData = await cloudRes.json();
    return {
      image_url: cloudData.secure_url,
      cloudinary_public_id: cloudData.public_id,
    };
  },
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
