import { handle } from "../../../server/api.mjs";
import { NextRequest, NextResponse } from "next/server";
import { mockDB } from "@/lib/mock-data";

export const runtime = "nodejs";

/**
 * Shared mock-mode error response helper — matches Playbook v2.1 §8:
 * `{ error: { code, message } }` with the same shape as the real backend.
 */
function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, await params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(req, await params);
}

async function handleRequest(req: NextRequest, { path }: { path: string[] }) {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    return handle(req, { params: Promise.resolve({ path }) });
  }

  const method = req.method;
  const pathStr = path.join("/");
  const url = new URL(req.url);

  let body: any = {};
  if (method !== "GET") {
    try {
      body = await req.json();
    } catch {}
  }

  try {
    // 1. POST /api/rooms
    if (method === "POST" && pathStr === "rooms") {
      const res = mockDB.createRoom({
        title: body.title || "Untitled Room",
        theme: body.theme || "midnight-neon",
        expires_in_hours: body.expires_in_hours || 24,
      });
      return NextResponse.json({
        ...res,
        qr_url: new URL(`/r/${res.room.code}`, url.origin).href,
        screen_url: new URL(`/screen/${res.room.screen_token}`, url.origin).href,
      });
    }

    // 1b. GET /api/rooms - List active public rooms
    if (method === "GET" && path.length === 1 && path[0] === "rooms") {
      const rooms = mockDB.getActiveRooms(url.searchParams.get("q") || "");
      return NextResponse.json({ rooms });
    }

    // 2. GET /api/rooms/[code]
    if (method === "GET" && path.length === 2 && path[0] === "rooms") {
      const room = mockDB.getRoom(path[1]);
      if (!room) return errorResponse(404, "VALIDATION_ERROR", "Room not found");
      const origin = url.origin;
      const screen_token = room.screen_token;
      const screen_url = screen_token ? `${origin}/screen/${encodeURIComponent(screen_token)}` : undefined;
      return NextResponse.json({
        room,
        is_owner: true,
        is_member: true,
        screen_token,
        screen_url,
      });
    }

    // 3. POST /api/rooms/[code]/join
    if (method === "POST" && path.length === 3 && path[0] === "rooms" && path[2] === "join") {
      const room = mockDB.getRoom(path[1]);
      if (!room) return errorResponse(404, "VALIDATION_ERROR", "Room not found");
      if (room.status !== "open") return errorResponse(409, "ROOM_CLOSED", "Room is " + room.status);
      return NextResponse.json({ joined: true, room });
    }

    // 4. PATCH /api/rooms/[code]
    if (method === "PATCH" && path.length === 2 && path[0] === "rooms") {
      const res = mockDB.updateRoom(path[1], body);
      if (!res) return errorResponse(404, "VALIDATION_ERROR", "Room not found");
      return NextResponse.json(res);
    }

    // 5. GET /api/rooms/[code]/feed
    if (method === "GET" && path.length === 3 && path[0] === "rooms" && path[2] === "feed") {
      const room = mockDB.getRoom(path[1]);
      if (!room) return errorResponse(404, "VALIDATION_ERROR", "Room not found");
      const includeHidden = url.searchParams.get("include_hidden") === "true";
      const feed = mockDB.getFeed(path[1], includeHidden);
      return NextResponse.json(feed);
    }

    // 6. GET /api/screen/[token]
    if (method === "GET" && path.length === 2 && path[0] === "screen") {
      const room = mockDB.getRoomByToken(path[1]);
      if (!room) return errorResponse(404, "VALIDATION_ERROR", "Invalid screen token");
      const feed = mockDB.getFeed(room.code, false);
      return NextResponse.json({
        room,
        posts: feed.posts,
        pinned_notes: feed.pinned_notes,
        notes: feed.notes,
        active_poll: feed.active_poll,
      });
    }

    // 7. POST /api/rooms/[code]/posts
    if (method === "POST" && path.length === 3 && path[0] === "rooms" && path[2] === "posts") {
      const post = mockDB.createPost(path[1], body);
      return NextResponse.json({ post });
    }

    // 8. POST /api/rooms/[code]/notes
    if (method === "POST" && path.length === 3 && path[0] === "rooms" && path[2] === "notes") {
      const note = mockDB.createNote(path[1], body.body, body.author_name);
      return NextResponse.json({ note });
    }

    // 9. POST /api/rooms/[code]/polls
    if (method === "POST" && path.length === 3 && path[0] === "rooms" && path[2] === "polls") {
      const poll = mockDB.createPoll(path[1], body.question, body.options);
      return NextResponse.json({ poll });
    }

    // 12. POST /api/polls/[id]/vote
    if (method === "POST" && path.length === 3 && path[0] === "polls" && path[2] === "vote") {
      const poll = mockDB.votePoll(path[1], body.option_id);
      return NextResponse.json({ poll });
    }

    // 13. POST /api/likes/toggle
    if (method === "POST" && pathStr === "likes/toggle") {
      const res = mockDB.toggleLike(body.target_type, body.target_id);
      return NextResponse.json(res);
    }

    // 14. POST /api/reports
    if (method === "POST" && pathStr === "reports") {
      const res = mockDB.reportItem(body.target_type, body.target_id);
      return NextResponse.json(res);
    }

    // 15. POST /api/moderation
    if (method === "POST" && pathStr === "moderation") {
      const res = mockDB.moderateItem(body.room_id, body.target_type, body.target_id, body.action);
      return NextResponse.json(res);
    }

    // 16. POST /api/cloudinary/sign
    if (method === "POST" && pathStr === "cloudinary/sign") {
      return NextResponse.json({
        signature: "mock_sig_" + Date.now(),
        timestamp: Math.floor(Date.now() / 1000),
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo",
        api_key: "mock_key",
      });
    }

    return errorResponse(404, "VALIDATION_ERROR", "Route not found");
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: err?.code || "INTERNAL_ERROR", message: err?.message || "Internal Error" } },
      { status: err?.status || 500 }
    );
  }
}
