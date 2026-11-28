export type ThemeKey =
  | "midnight-neon"
  | "minimal-paper"
  | "campus-sunset"
  | "emerald-fest";

export interface RoomDTO {
  id: string;
  code: string;
  title: string;
  theme: ThemeKey;
  status: "open" | "closed" | "expired";
  expires_at: string;
  screen_token?: string;
  screen_url?: string;
}

export interface PostDTO {
  id: string;
  image_url: string;
  frame_id: string;
  author_name: string;
  author_avatar?: string;
  like_count: number;
  liked_by_me: boolean;
  visibility: "approved" | "hidden";
  created_at: string;
}

export interface NoteDTO {
  id: string;
  body: string;
  author_name: string;
  is_pinned: boolean;
  like_count: number;
  liked_by_me: boolean;
  moderation_status: "approved" | "hidden";
  created_at: string;
}

export interface PollOptionDTO {
  id: string;
  option_text: string;
  vote_count: number;
}

export interface PollDTO {
  id: string;
  question: string;
  is_open: boolean;
  user_voted_option_id: string | null;
  total_votes: number;
  options: PollOptionDTO[];
}

export interface FeedResponse {
  posts: PostDTO[];
  pinned_notes: NoteDTO[];
  notes: NoteDTO[];
  active_poll: PollDTO | null;
}

export interface ScreenResponse extends FeedResponse {
  room: RoomDTO;
}

export interface RoomPreviewResponse {
  room: RoomDTO;
  is_owner: boolean;
  is_member: boolean;
  screen_token?: string;
  screen_url?: string;
}

export interface CreateRoomResponse {
  room: RoomDTO;
  qr_url: string;
  screen_url: string;
}

export interface JoinRoomResponse {
  joined: boolean;
  room: RoomDTO;
}

export interface UpdateRoomResponse {
  room: RoomDTO;
  screen_url?: string;
}

export interface SignResponse {
  signature: string;
  timestamp: number;
  cloud_name: string;
  api_key: string;
}

export interface ModerationActionPayload {
  room_id: string;
  target_type: "post" | "note";
  target_id: string;
  action: "pin" | "unpin" | "hide" | "restore" | "delete";
}

export interface ModerationResponse {
  success: boolean;
  action: string;
}

export interface RealtimeEventPayloads {
  new_post: { post: PostDTO };
  new_note: { note: NoteDTO };
  content_moderated: {
    target_type: "post" | "note";
    target_id: string;
    action: "pin" | "unpin" | "hide" | "restore" | "delete";
  };
  poll_updated: { poll: PollDTO };
  theme_updated: { theme: ThemeKey };
}
