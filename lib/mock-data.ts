import {
  RoomDTO,
  PostDTO,
  NoteDTO,
  PollDTO,
  StoryDTO,
  FeedResponse,
  ThemeKey,
} from "@/types/vibewall";
import { broadcastLocalEvent } from "./supabase";

export interface MockStore {
  rooms: Map<string, RoomDTO & { screen_token: string; owner_id: string }>;
  posts: Map<string, PostDTO & { room_code: string; report_count: number }>;
  notes: Map<string, NoteDTO & { room_code: string; report_count: number }>;
  polls: Map<string, PollDTO & { room_code: string }>;
  stories: Map<string, StoryDTO & { room_code: string }>;
}

// In-memory persistent singleton in Node / browser globalThis
const globalKey = Symbol.for("vibewall.mock.store");
const globalScope = globalThis as unknown as { [globalKey]?: MockStore };

function initSeedStore(): MockStore {
  const rooms = new Map<string, RoomDTO & { screen_token: string; owner_id: string }>();
  const posts = new Map<string, PostDTO & { room_code: string; report_count: number }>();
  const notes = new Map<string, NoteDTO & { room_code: string; report_count: number }>();
  const polls = new Map<string, PollDTO & { room_code: string }>();
  const stories = new Map<string, StoryDTO & { room_code: string }>();

  // Default seed room: VIBE26
  const roomVibe26: RoomDTO & { screen_token: string; owner_id: string } = {
    id: "room-vibe26-uuid",
    code: "VIBE26",
    title: "Dynamic University Fest 2026",
    theme: "midnight-neon",
    status: "open",
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    screen_token: "screen_token_vibe26_live",
    owner_id: "host-jitu-lead",
  };
  rooms.set("VIBE26", roomVibe26);

  // Seed Posts
  const seedPosts: (PostDTO & { room_code: string; report_count: number })[] = [
    {
      id: "post-1",
      image_url: "/assets/dynamic_university_music_festival_crowd_at_night_with_purple_and_violet_neon.png",
      frame_id: "fest26",
      author_name: "Tanvir Hasan",
      author_avatar: "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_cheerful_young_south.png",
      like_count: 84,
      liked_by_me: true,
      visibility: "approved",
      created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      room_code: "VIBE26",
      report_count: 0,
    },
    {
      id: "post-2",
      image_url: "/assets/group_of_diverse_university_students_laughing_and_posing_together_with_neon.png",
      frame_id: "neon",
      author_name: "Nabila & Crew",
      author_avatar: "/assets/stylized_modern_vector_avatar_portrait_of_a_cool_cheerful_college_girl_with.png",
      like_count: 59,
      liked_by_me: false,
      visibility: "approved",
      created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      room_code: "VIBE26",
      report_count: 0,
    },
    {
      id: "post-3",
      image_url: "/assets/vibrant_university_night_music_festival_stage_with_glowing_violet_and_neon.png",
      frame_id: "classic",
      author_name: "Farhan Labib",
      author_avatar: "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png",
      like_count: 112,
      liked_by_me: true,
      visibility: "approved",
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      room_code: "VIBE26",
      report_count: 0,
    },
    {
      id: "post-4",
      image_url: "/assets/cozy_lively_university_night_food_stall_illuminated_with_warm_fairy_lights_and.png",
      frame_id: "sunset",
      author_name: "Samiha Ahmed",
      author_avatar: "/assets/stylized_modern_vector_avatar_portrait_of_a_cool_cheerful_college_girl_with.png",
      like_count: 38,
      liked_by_me: false,
      visibility: "approved",
      created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      room_code: "VIBE26",
      report_count: 0,
    },
  ];
  seedPosts.forEach((p) => posts.set(p.id, p));

  // Seed Notes
  const seedNotes: (NoteDTO & { room_code: string; report_count: number })[] = [
    {
      id: "note-1",
      body: "⚡ HEADLINER ALERT: The secret band soundcheck starts at 9:30 PM sharp at Main Stage!",
      author_name: "Fest Committee",
      is_pinned: true,
      like_count: 142,
      liked_by_me: true,
      moderation_status: "approved",
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      room_code: "VIBE26",
      report_count: 0,
    },
    {
      id: "note-2",
      body: "Lost a neon cyan powerbank near the robotics display booth. Finder gets a free cold coffee! ☕",
      author_name: "Rahim K.",
      is_pinned: false,
      like_count: 19,
      liked_by_me: false,
      moderation_status: "approved",
      created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      room_code: "VIBE26",
      report_count: 0,
    },
    {
      id: "note-3",
      body: "The laser light coordination with the drum solo just blew everyone's minds away 🔥🔥",
      author_name: "Adnan Chowdhury",
      is_pinned: false,
      like_count: 31,
      liked_by_me: false,
      moderation_status: "approved",
      created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      room_code: "VIBE26",
      report_count: 0,
    },
  ];
  seedNotes.forEach((n) => notes.set(n.id, n));

  // Seed Poll
  const seedPoll: PollDTO & { room_code: string } = {
    id: "poll-fest-1",
    question: "Which artist do you want at the next university fest?",
    is_open: true,
    user_voted_option_id: "opt-1",
    total_votes: 340,
    options: [
      { id: "opt-1", option_text: "Arijit Singh", vote_count: 156 },
      { id: "opt-2", option_text: "Artcell", vote_count: 108 },
      { id: "opt-3", option_text: "Nemesis", vote_count: 76 },
    ],
    room_code: "VIBE26",
  };
  polls.set(seedPoll.id, seedPoll);

  // Seed Story
  const seedStory: StoryDTO & { room_code: string } = {
    id: "story-fest-1",
    prompt: "Show your wildest fest squad moment tonight! 🎸",
    is_active: true,
    entries: [
      {
        id: "entry-1",
        image_url: "/assets/group_of_diverse_university_students_laughing_and_posing_together_with_neon.png",
        author_name: "Murad FestCrew",
        sequence_order: 1,
        created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
      {
        id: "entry-2",
        image_url: "/assets/dynamic_university_music_festival_crowd_at_night_with_purple_and_violet_neon.png",
        author_name: "Ayesha Noor",
        sequence_order: 2,
        created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
      {
        id: "entry-3",
        image_url: "/assets/vibrant_university_night_music_festival_stage_with_glowing_violet_and_neon.png",
        author_name: "Jitu Lead",
        sequence_order: 3,
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
    room_code: "VIBE26",
  };
  stories.set(seedStory.id, seedStory);

  return { rooms, posts, notes, polls, stories };
}

export function getMockStore(): MockStore {
  if (!globalScope[globalKey]) {
    globalScope[globalKey] = initSeedStore();
  }
  return globalScope[globalKey]!;
}

// Helper query & mutation operations
export const mockDB = {
  getRoom(code: string) {
    const store = getMockStore();
    return store.rooms.get(code.toUpperCase()) || null;
  },

  getRoomByToken(token: string) {
    const store = getMockStore();
    for (const r of store.rooms.values()) {
      if (r.screen_token === token) return r;
    }
    // Fallback: return default room for demo screen
    return store.rooms.get("VIBE26") || null;
  },

  createRoom(params: { title: string; theme: ThemeKey; expires_in_hours: number; owner_id?: string }) {
    const store = getMockStore();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const secret = "st_" + Math.random().toString(36).substring(2, 12);
    const room: RoomDTO & { screen_token: string; owner_id: string } = {
      id: "room-" + code.toLowerCase() + "-" + Date.now(),
      code,
      title: params.title,
      theme: params.theme,
      status: "open",
      expires_at: new Date(Date.now() + params.expires_in_hours * 60 * 60 * 1000).toISOString(),
      screen_token: secret,
      owner_id: params.owner_id || "mock-user-owner",
    };
    store.rooms.set(code, room);
    return {
      room,
      qr_url: typeof window !== "undefined" ? `${window.location.origin}/r/${code}` : `http://localhost:3000/r/${code}`,
      screen_url: typeof window !== "undefined" ? `${window.location.origin}/screen/${secret}` : `http://localhost:3000/screen/${secret}`,
    };
  },

  updateRoom(code: string, updates: { theme?: ThemeKey; status?: "open" | "closed"; rotate_screen_token?: boolean }) {
    const store = getMockStore();
    const room = store.rooms.get(code.toUpperCase());
    if (!room) return null;

    if (updates.theme) {
      room.theme = updates.theme;
      broadcastLocalEvent(room.id, "theme_updated", { theme: updates.theme });
    }
    if (updates.status) room.status = updates.status;
    let newScreenUrl: string | undefined;
    if (updates.rotate_screen_token) {
      room.screen_token = "st_" + Math.random().toString(36).substring(2, 12);
      newScreenUrl = typeof window !== "undefined" ? `${window.location.origin}/screen/${room.screen_token}` : `http://localhost:3000/screen/${room.screen_token}`;
    }
    return { room, screen_url: newScreenUrl };
  },

  getFeed(code: string, includeHidden = false): FeedResponse {
    const store = getMockStore();
    const cleanCode = code.toUpperCase();
    const posts: PostDTO[] = [];
    for (const p of store.posts.values()) {
      if (p.room_code === cleanCode) {
        if (p.visibility === "approved" || (includeHidden && p.visibility === "hidden")) {
          posts.push(p);
        }
      }
    }
    posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const pinned_notes: NoteDTO[] = [];
    const notes: NoteDTO[] = [];
    for (const n of store.notes.values()) {
      if (n.room_code === cleanCode) {
        if (n.moderation_status === "approved" || (includeHidden && n.moderation_status === "hidden")) {
          if (n.is_pinned) pinned_notes.push(n);
          else notes.push(n);
        }
      }
    }
    pinned_notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    let active_poll: PollDTO | null = null;
    for (const pl of store.polls.values()) {
      if (pl.room_code === cleanCode && pl.is_open) {
        active_poll = pl;
        break;
      }
    }

    let active_story: StoryDTO | null = null;
    for (const s of store.stories.values()) {
      if (s.room_code === cleanCode && s.is_active) {
        active_story = s;
        break;
      }
    }

    return { posts, pinned_notes, notes, active_poll, active_story };
  },

  createPost(code: string, data: { image_url: string; frame_id?: string; author_name?: string; author_avatar?: string }) {
    const store = getMockStore();
    const cleanCode = code.toUpperCase();
    const room = store.rooms.get(cleanCode);
    const id = "post-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const post: PostDTO & { room_code: string; report_count: number } = {
      id,
      image_url: data.image_url,
      frame_id: data.frame_id || "classic",
      author_name: data.author_name || "VibeGuest",
      author_avatar: data.author_avatar || "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_cheerful_young_south.png",
      like_count: 0,
      liked_by_me: false,
      visibility: "approved",
      created_at: new Date().toISOString(),
      room_code: cleanCode,
      report_count: 0,
    };
    store.posts.set(id, post);
    if (room) broadcastLocalEvent(room.id, "new_post", { post });
    return post;
  },

  createNote(code: string, body: string, authorName = "VibeGuest") {
    const store = getMockStore();
    const cleanCode = code.toUpperCase();
    const room = store.rooms.get(cleanCode);
    const id = "note-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const note: NoteDTO & { room_code: string; report_count: number } = {
      id,
      body: body.trim(),
      author_name: authorName,
      is_pinned: false,
      like_count: 0,
      liked_by_me: false,
      moderation_status: "approved",
      created_at: new Date().toISOString(),
      room_code: cleanCode,
      report_count: 0,
    };
    store.notes.set(id, note);
    if (room) broadcastLocalEvent(room.id, "new_note", { note });
    return note;
  },

  toggleLike(targetType: "post" | "note", targetId: string) {
    const store = getMockStore();
    if (targetType === "post") {
      const post = store.posts.get(targetId);
      if (!post) return null;
      post.liked_by_me = !post.liked_by_me;
      post.like_count += post.liked_by_me ? 1 : -1;
      return { liked: post.liked_by_me, like_count: post.like_count };
    } else {
      const note = store.notes.get(targetId);
      if (!note) return null;
      note.liked_by_me = !note.liked_by_me;
      note.like_count += note.liked_by_me ? 1 : -1;
      return { liked: note.liked_by_me, like_count: note.like_count };
    }
  },

  votePoll(pollId: string, optionId: string) {
    const store = getMockStore();
    const poll = store.polls.get(pollId);
    if (!poll || !poll.is_open) return null;

    const opt = poll.options.find((o) => o.id === optionId);
    if (!opt) return null;

    opt.vote_count += 1;
    poll.total_votes += 1;
    poll.user_voted_option_id = optionId;

    const room = store.rooms.get(poll.room_code);
    if (room) broadcastLocalEvent(room.id, "poll_updated", { poll });
    return poll;
  },

  createPoll(code: string, question: string, options: string[]) {
    const store = getMockStore();
    const cleanCode = code.toUpperCase();
    const room = store.rooms.get(cleanCode);
    const pollId = "poll-" + Date.now();
    const poll: PollDTO & { room_code: string } = {
      id: pollId,
      question: question.trim(),
      is_open: true,
      user_voted_option_id: null,
      total_votes: 0,
      options: options.map((txt, i) => ({
        id: `opt-${pollId}-${i}`,
        option_text: txt.trim(),
        vote_count: 0,
      })),
      room_code: cleanCode,
    };
    store.polls.set(pollId, poll);
    if (room) broadcastLocalEvent(room.id, "poll_updated", { poll });
    return poll;
  },

  createStory(code: string, prompt: string) {
    const store = getMockStore();
    const cleanCode = code.toUpperCase();
    const storyId = "story-" + Date.now();
    const story: StoryDTO & { room_code: string } = {
      id: storyId,
      prompt: prompt.trim(),
      is_active: true,
      entries: [],
      room_code: cleanCode,
    };
    store.stories.set(storyId, story);
    return story;
  },

  addStoryEntry(storyId: string, imageUrl: string, authorName = "VibeParticipant") {
    const store = getMockStore();
    const story = store.stories.get(storyId);
    if (!story || !story.is_active) return null;

    const entry = {
      id: "entry-" + Date.now(),
      image_url: imageUrl,
      author_name: authorName,
      sequence_order: story.entries.length + 1,
      created_at: new Date().toISOString(),
    };
    story.entries.push(entry);
    return entry;
  },

  reportItem(targetType: "post" | "note" | "story_entry", targetId: string) {
    const store = getMockStore();
    let autoHidden = false;
    let roomId = "";

    if (targetType === "post") {
      const p = store.posts.get(targetId);
      if (p) {
        p.report_count = (p.report_count || 0) + 1;
        if (p.report_count >= 3) {
          p.visibility = "hidden";
          autoHidden = true;
          const room = store.rooms.get(p.room_code);
          if (room) roomId = room.id;
        }
      }
    } else if (targetType === "note") {
      const n = store.notes.get(targetId);
      if (n) {
        n.report_count = (n.report_count || 0) + 1;
        if (n.report_count >= 3) {
          n.moderation_status = "hidden";
          autoHidden = true;
          const room = store.rooms.get(n.room_code);
          if (room) roomId = room.id;
        }
      }
    }

    if (autoHidden && roomId) {
      broadcastLocalEvent(roomId, "content_moderated", {
        target_type: targetType,
        target_id: targetId,
        action: "hide",
      });
    }

    return { reported: true, auto_hidden: autoHidden };
  },

  moderateItem(roomId: string, targetType: "post" | "note" | "story_entry", targetId: string, action: "pin" | "unpin" | "hide" | "restore" | "delete") {
    const store = getMockStore();

    if (targetType === "note") {
      const note = store.notes.get(targetId);
      if (note) {
        if (action === "pin") note.is_pinned = true;
        if (action === "unpin") note.is_pinned = false;
        if (action === "hide") note.moderation_status = "hidden";
        if (action === "restore") {
          note.moderation_status = "approved";
          note.report_count = 0;
        }
        if (action === "delete") store.notes.delete(targetId);
      }
    } else if (targetType === "post") {
      const post = store.posts.get(targetId);
      if (post) {
        if (action === "hide") post.visibility = "hidden";
        if (action === "restore") {
          post.visibility = "approved";
          post.report_count = 0;
        }
        if (action === "delete") store.posts.delete(targetId);
      }
    }

    broadcastLocalEvent(roomId, "content_moderated", {
      target_type: targetType,
      target_id: targetId,
      action,
    });

    return { success: true, action };
  },
};
