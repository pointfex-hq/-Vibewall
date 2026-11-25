import { randomUUID } from "node:crypto";
import {
  db,
  identity,
  deny,
  fail,
  limited,
  code,
  token,
  hash,
  roomDTO,
  string,
  uuid,
  themes,
  emit,
  sign,
  verifyAsset,
} from "./core.mjs";
import { feed, items, pollDTO, storyDTO } from "./feed.mjs";

const routes = [
  ["POST", "rooms", "create"],
  ["GET", "rooms/:code", "preview"],
  ["PATCH", "rooms/:code", "update"],
  ["POST", "rooms/:code/join", "join"],
  ["GET", "rooms/:code/feed", "feed"],
  ["GET", "screen/:token", "screen"],
  ["POST", "rooms/:code/posts", "post"],
  ["POST", "rooms/:code/notes", "note"],
  ["POST", "rooms/:code/stories", "story"],
  ["POST", "stories/:id/entries", "entry"],
  ["POST", "rooms/:code/polls", "poll"],
  ["POST", "polls/:id/vote", "vote"],
  ["POST", "likes/toggle", "like"],
  ["POST", "reports", "report"],
  ["POST", "moderation", "moderate"],
  ["POST", "cloudinary/sign", "sign"],
];
export function match(method, path) {
  const parts = path.split("/");
  for (const [verb, pattern, action] of routes) {
    const segments = pattern.split("/");
    if (
      verb === method &&
      segments.length === parts.length &&
      segments.every((s, i) => s.startsWith(":") || s === parts[i])
    )
      return { action, key: parts[1] };
  }
  fail(404, "Unknown API route");
}
const targetTables = {
  post: "posts",
  note: "notes",
  story_entry: "story_entries",
};
async function run(sql, route, b, actor, url, headers) {
  const { action, key } = route;
  const uid = actor?.id ?? null;
  const origin = process.env.APP_ORIGIN;
  if (!uid && !["preview", "screen"].includes(action))
    fail(401, "Sign in with Google", "UNAUTHORIZED");
  await sql`set local search_path = wall,public`;
  if (actor && !["preview", "feed", "screen"].includes(action))
    await sql`insert into users(id,provider_subject,display_name,avatar_url,email) values(${uid},${actor.sub},${actor.name},${actor.avatar},${actor.email}) on conflict(id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url,email=excluded.email`;
  if (action === "create") {
    const title = string(b.title, 200),
      theme = b.theme ?? themes[0],
      hours = b.expires_in_hours ?? 24;
    if (
      !themes.includes(theme) ||
      !Number.isInteger(hours) ||
      hours <= 0 ||
      hours > 24
    )
      fail(400, "Invalid theme or duration");
    const secret = token();
    let room;
    while (!room)
      [room] =
        await sql`insert into rooms(owner_user_id,code,title,theme,screen_token_hash,expires_at) values(${uid},${code()},${title},${theme},${hash(secret)},now()+make_interval(hours=>${hours})) on conflict(code) do nothing returning *`;
    await sql`insert into room_members values(${room.id},${uid},now())`;
    return {
      room: roomDTO(room),
      qr_url: new URL("/r/" + room.code, origin).href,
      screen_url: new URL("/screen/" + secret, origin).href,
    };
  }
  if (action === "sign") {
    if (b.folder !== "vibewall") fail(400, "Invalid folder");
    const [member] =
      await sql`select from room_members m join rooms r on r.id=m.room_id where m.user_id=${uid} and r.status='open' and r.expires_at>now() limit 1`;
    if (!member) deny();
    const public_id = randomUUID(),
      timestamp = Math.floor(Date.now() / 1000);
    const params = {
      folder: "vibewall",
      public_id,
      timestamp,
      overwrite: "false",
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
    };
    await sql`insert into uploads(public_id,user_id) values(${"vibewall/" + public_id},${uid})`;
    headers.set("X-VibeWall-Upload-Params", JSON.stringify(params));
    return {
      signature: sign(params),
      timestamp,
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    };
  }
  let lookup, target, table, poll, story;
  if (["like", "report", "moderate"].includes(action)) {
    if (
      !Object.hasOwn(targetTables, b.target_type) ||
      (action === "like" && b.target_type === "story_entry")
    )
      fail(400, "Invalid target type");
    table = targetTables[b.target_type];
    const id = uuid(b.target_id);
    [target] =
      table === "story_entries"
        ? await sql`select e.*,s.room_id from story_entries e join stories s on s.id=e.story_id where e.id=${id}`
        : await sql`select * from ${sql(table)} where id=${id}`;
    if (!target) fail(404, "Item not found");
    lookup = sql`id=${target.room_id}`;
  } else if (action === "vote" || action === "entry") {
    const [parent] =
      await sql`select * from ${sql(action === "vote" ? "polls" : "stories")} where id=${uuid(key)}`;
    if (!parent) fail(404, "Item not found");
    lookup = sql`id=${parent.room_id}`;
  } else
    lookup =
      action === "screen"
        ? sql`screen_token_hash=${hash(key)}`
        : sql`code=${key.toUpperCase()}`;
  const write = !["screen", "preview", "feed"].includes(action);
  const [room] =
    await sql`select * from rooms where ${lookup} ${write ? sql`for update` : sql``}`;
  if (!room) fail(404, "Room not found");
  const owner = room.owner_user_id === uid;
  const [membership] =
    await sql`select from room_members where room_id=${room.id} and user_id=${uid}`;
  const dto = roomDTO(room);
  if (action === "preview")
    return { room: dto, is_owner: owner, is_member: !!membership };
  if (["update", "story", "poll", "moderate"].includes(action) && !owner)
    deny();
  if (!["join", "screen"].includes(action) && !owner && !membership) deny();
  if (
    dto.status !== "open" &&
    !(owner && ["feed", "moderate"].includes(action))
  )
    fail(409, "Room is closed", "ROOM_CLOSED");
  if (action === "screen")
    return { room: dto, ...(await feed(sql, room.id, null, false, true)) };
  if (action === "feed") {
    const hidden = url.searchParams.get("include_hidden") === "true";
    if (hidden && !owner) deny();
    return feed(sql, room.id, uid, hidden, false);
  }
  if (action === "join") {
    if (!membership) {
      const [members] = await sql`select count(*)::int n from room_members where room_id=${room.id}`;
      if (members.n >= 150) fail(409, "Room is full");
    }
    await sql`insert into room_members(room_id,user_id) values(${room.id},${uid}) on conflict do nothing`;
    return { joined: true, room: dto };
  }
  if (action === "update") {
    if (
      (b.theme !== undefined && !themes.includes(b.theme)) ||
      (b.status !== undefined && b.status !== "closed") ||
      (b.rotate_screen_token !== undefined && b.rotate_screen_token !== true)
    )
      fail(400, "Invalid room update");
    const secret = b.rotate_screen_token ? token() : null;
    const [updated] =
      await sql`update rooms set theme=${b.theme ?? room.theme},status=${b.status ?? room.status},screen_token_hash=${secret ? hash(secret) : room.screen_token_hash} where id=${room.id} returning *`;
    if (b.theme) await emit(sql, room.id, "theme_updated", { theme: b.theme });
    return {
      room: roomDTO(updated),
      ...(secret
        ? { screen_url: new URL("/screen/" + secret, origin).href }
        : {}),
    };
  }
  if (action === "post" || action === "note") {
    const photo = action === "post";
    const [quota] =
      await sql`select count(*)::int total, max(created_at)>now()-make_interval(secs=>${photo ? 20 : 15}) cooling from ${sql(photo ? "posts" : "notes")} where room_id=${room.id} and author_user_id=${uid}`;
    if (quota.cooling || (photo && quota.total >= 15)) limited();
    let row;
    if (photo) {
      const asset = await verifyAsset(sql, uid, b);
      [row] =
        await sql`insert into posts(room_id,author_user_id,image_url,cloudinary_public_id,frame_id) values(${room.id},${uid},${b.image_url},${asset},${string(b.frame_id ?? "classic", 80)}) returning id`;
    } else {
      const body = string(b.body, 280);
      if (
        /(?:^|[^\p{L}\p{M}])(?:fuck|shit|banchod|balchoda|বোকাচোদা|বালছাল)(?![\p{L}\p{M}])/iu.test(
          body.normalize("NFKC"),
        )
      )
        fail(400, "Please revise the note");
      [row] =
        await sql`insert into notes(room_id,author_user_id,body) values(${room.id},${uid},${body}) returning id`;
    }
    const [item] = await items(sql, action, room.id, uid, false, row.id);
    const result = { [action]: item };
    await emit(sql, room.id, "new_" + action, { [action]: { ...item, liked_by_me: false } });
    return result;
  }
  if (action === "story") {
    await sql`update stories set is_active=false where room_id=${room.id} and is_active`;
    [story] =
      await sql`insert into stories(room_id,prompt) values(${room.id},${string(b.prompt, 280)}) returning *`;
    return { story: await storyDTO(sql, story) };
  }
  if (action === "entry") {
    [story] = await sql`select * from stories where id=${key} and is_active`;
    if (!story) fail(409, "Story has ended");
    const asset = await verifyAsset(sql, uid, b);
    const [entry] =
      await sql`insert into story_entries(story_id,author_user_id,image_url,cloudinary_public_id,sequence_order) select ${key},${uid},${b.image_url},${asset},coalesce(max(sequence_order),0)+1 from story_entries where story_id=${key} on conflict(story_id,author_user_id) do nothing returning id,image_url,sequence_order,created_at`;
    if (!entry) fail(409, "Already contributed");
    return { entry: { ...entry, author_name: actor.name } };
  }
  if (action === "like" || action === "vote") {
    await sql`delete from interactions where user_id=${uid} and created_at<=now()-interval '10 seconds'`;
    const [count] =
      await sql`select count(*)::int n from interactions where user_id=${uid}`;
    if (count.n >= 10) limited();
    await sql`insert into interactions(user_id) values(${uid})`;
  }
  if (action === "poll" || action === "vote") {
    if (action === "poll") {
      if (
        !Array.isArray(b.options) ||
        b.options.length < 2 ||
        b.options.length > 4
      )
        fail(400, "Provide 2–4 options");
      await sql`update polls set is_open=false where room_id=${room.id} and is_open`;
      [poll] =
        await sql`insert into polls(room_id,question) values(${room.id},${string(b.question, 280)}) returning *`;
      for (const [i, option] of b.options.entries())
        await sql`insert into poll_options(poll_id,option_text,position) values(${poll.id},${string(option, 160)},${i})`;
    } else {
      [poll] = await sql`select * from polls where id=${key} and is_open`;
      if (!poll) fail(409, "Poll has ended");
      const [option] =
        await sql`select id from poll_options where id=${uuid(b.option_id)} and poll_id=${key}`;
      if (!option) fail(400, "Invalid poll option");
      const [vote] =
        await sql`insert into poll_votes(poll_id,option_id,user_id) values(${key},${option.id},${uid}) on conflict do nothing returning poll_id`;
      if (!vote) fail(409, "Already voted");
    }
    const dto = await pollDTO(sql, poll, uid);
    await emit(sql, room.id, "poll_updated", {
      poll: { ...dto, user_voted_option_id: null },
    });
    return { poll: dto };
  }
  const field = table === "notes" ? "moderation_status" : "visibility";
  [target] = await sql`select * from ${sql(table)} where id=${b.target_id}`;
  if (!target || target[field] === "deleted") fail(404, "Item not found");
  if (action !== "moderate" && target[field] !== "approved") deny();
  if (action === "like") {
    const removed =
      await sql`delete from likes where target_type=${b.target_type} and target_id=${target.id} and user_id=${uid} returning id`;
    if (!removed.length)
      await sql`insert into likes(target_type,target_id,user_id) values(${b.target_type},${target.id},${uid})`;
    const [row] =
      await sql`select count(*)::int like_count from likes where target_type=${b.target_type} and target_id=${target.id}`;
    return { liked: !removed.length, ...row };
  }
  const targetRef = { target_type: b.target_type, target_id: target.id };
  if (action === "report") {
    await sql`insert into reports(reporter_user_id,target_type,target_id) values(${uid},${b.target_type},${target.id}) on conflict do nothing`;
    const [r] =
      await sql`select count(*)::int n from reports where target_type=${b.target_type} and target_id=${target.id}`;
    if (table !== "story_entries")
      await sql`update ${sql(table)} set report_count=${r.n} where id=${target.id}`;
    if (r.n >= 3) {
      await sql`update ${sql(table)} set ${sql(field)}='hidden' where id=${target.id}`;
      await emit(sql, room.id, "content_moderated", {
        ...targetRef,
        action: "hide",
      });
    }
    return { reported: true, auto_hidden: r.n >= 3 };
  }
  if (b.room_id !== room.id) deny();
  const op = b.action;
  if (["pin", "unpin"].includes(op) && table === "notes") {
    await sql`update notes set is_pinned=${op === "pin"} where id=${target.id}`;
  } else {
    const state = { hide: "hidden", restore: "approved", delete: "deleted" };
    if (!Object.hasOwn(state, op)) fail(400, "Invalid moderation action");
    if (op === "delete" && target.cloudinary_public_id) {
      const params = {
        public_id: target.cloudinary_public_id,
        timestamp: Math.floor(Date.now() / 1000),
        invalidate: "true",
      };
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/" +
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME +
          "/image/destroy",
        {
          method: "POST",
          body: new URLSearchParams({
            ...params,
            signature: sign(params),
            api_key: process.env.CLOUDINARY_API_KEY,
          }),
        },
      );
      if (!res.ok || !["ok", "not found"].includes((await res.json()).result))
        throw Error("Media deletion failed");
    }
    await sql`update ${sql(table)} set ${sql(field)}=${state[op]} where id=${target.id}`;
    if (op === "restore") {
      await sql`delete from reports where target_type=${b.target_type} and target_id=${target.id}`;
      if (table !== "story_entries")
        await sql`update ${sql(table)} set report_count=0 where id=${target.id}`;
    }
    if (op === "delete" && table === "notes")
      await sql`update notes set body='',is_pinned=false where id=${target.id}`;
    if (op === "delete" && table !== "notes")
      await sql`update ${sql(table)} set image_url='',cloudinary_public_id='' where id=${target.id}`;
  }
  await sql`insert into moderation_actions(room_id,actor_user_id,target_type,target_id,action) values(${room.id},${uid},${b.target_type},${target.id},${op})`;
  await emit(sql, room.id, "content_moderated", { ...targetRef, action: op });
  return { success: true, action: op };
}
export async function handle(req, { params }) {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  try {
    const route = match(req.method, (await params).path.join("/"));
    const actor = await identity(req);
    let body = {};
    if (req.method !== "GET") {
      try {
        body = await req.json();
      } catch {
        fail(400, "Invalid JSON");
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        fail(400, "Expected a JSON object");
    }
    const result = await db().begin((sql) =>
      run(sql, route, body, actor, new URL(req.url), headers),
    );
    return Response.json(result, { headers });
  } catch (e) {
    if (!e.status) console.error("VibeWall backend failure", e.name, e.code);
    return Response.json(
      {
        error: {
          code: e.status ? e.code : "INTERNAL_ERROR",
          message: e.status ? e.message : "Service unavailable",
        },
      },
      { status: e.status ?? 500, headers },
    );
  }
}
