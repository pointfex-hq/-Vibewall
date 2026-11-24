export type ThemeKey =
  "midnight-neon" | "minimal-paper" | "campus-sunset" | "emerald-fest";

export interface RoomDTO {
  id: string;
  code: string;
  title: string;
  theme: ThemeKey;
  status: "open" | "closed" | "expired";
  expires_at: string;
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

export interface PollDTO {
  id: string;
  question: string;
  is_open: boolean;
  user_voted_option_id: string | null;
  total_votes: number;
  options: { id: string; option_text: string; vote_count: number }[];
}

export interface StoryDTO {
  id: string;
  prompt: string;
  is_active: boolean;
  entries: {
    id: string;
    image_url: string;
    author_name: string;
    sequence_order: number;
    created_at: string;
  }[];
}

export type StoryEntryDTO = StoryDTO["entries"][number];
