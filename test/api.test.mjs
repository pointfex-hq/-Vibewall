import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { handle } from "../server/api.mjs";
import { db } from "../server/core.mjs";
import test from "node:test";
test(
  "all backend contracts against a fresh disposable PostgreSQL database",
  { skip: !process.env.VIBEWALL_TEST_DATABASE_URL },
  async (t) => {
    Object.assign(process.env, {
      DATABASE_URL: process.env.VIBEWALL_TEST_DATABASE_URL,
      APP_ORIGIN: "http://localhost:3000",
      SCREEN_TOKEN_PEPPER: "testing",
      NEXT_PUBLIC_SUPABASE_URL: "https://auth.test",
      CLOUDINARY_API_KEY: "test",
      CLOUDINARY_API_SECRET: "test",
      CLOUDINARY_UPLOAD_PRESET: "signed",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "test",
    });
    try {
      const sql = db();
      await sql.unsafe(
        "create schema auth;create table auth.users(id uuid primary key);create schema realtime;create function realtime.send(jsonb,text,text,boolean) returns void language sql as 'select';",
      );
      await sql.unsafe(
        readFileSync("supabase/migrations/202611210001_wall.sql", "utf8"),
      );
      const ids = Array.from({ length: 4 }, () => randomUUID());
      for (const id of ids) await sql`insert into auth.users values(${id})`;
      let waitForCloudinary;
      global.fetch = async (url, opt) => {
        if (url.startsWith("https://api.cloudinary.com")) {
          if (url.endsWith("/destroy")) return Response.json({ result: "ok" });
          if (waitForCloudinary) await waitForCloudinary();
          const public_id = decodeURIComponent(url.split("/").pop());
          return Response.json({
            public_id,
            secure_url: "https://image.test/" + public_id,
            bytes: 123,
            format: "jpg",
          });
        }
        const id = opt.headers.authorization;
        return Response.json({
          id,
          identities: [
            { provider: "google", identity_data: { sub: id, name: "User" } },
          ],
        });
      };
      async function api(method, path, body, user = ids[0], status = 200) {
        const req = new Request("http://localhost/api/" + path, {
          method,
          headers: user ? { authorization: user } : {},
          body: body ? JSON.stringify(body) : undefined,
        });
        const res = await handle(req, {
          params: Promise.resolve({ path: new URL(req.url).pathname.slice("/api/".length).split("/") }),
        });
        const result = await res.json();
        assert.equal(
          res.status,
          status,
          method + " " + path + " " + JSON.stringify(result),
        );
        if (path === "cloudinary/sign")
          result.params = JSON.parse(
            res.headers.get("X-VibeWall-Upload-Params"),
          );
        return result;
      }
      const { room, screen_url } = await api("POST", "rooms", {
        title: "Test",
      });
      const base = "rooms/" + room.code;
      await t.test("public discovery searches active room names and codes", async () => {
        const create = async (title) => (await api("POST", "rooms", { title })).room;
        const campus = await create("University FEST 2026");
        const art = await create("Little Art Festival");
        const closed = await create("Closed Festival");
        const expired = await create("Expired Festival");
        await api("PATCH", "rooms/" + closed.code, { status: "closed" });
        await sql`update wall.rooms set expires_at=now() where id=${expired.id}`;
        const discover = async (q) => {
          const query = q === undefined ? "" : "?" + new URLSearchParams({ q });
          return (await api("GET", "rooms" + query, null, null)).rooms;
        };
        const codes = (matches) => matches.map(({ code }) => code).sort();
        assert.deepEqual(codes(await discover()), [room.code, campus.code, art.code].sort());
        assert.deepEqual(codes(await discover("  fEsT  ")), [campus.code, art.code].sort());
        assert.equal((await discover(campus.code.toLowerCase()))[0].id, campus.id);
        assert.deepEqual(await discover("no such event"), []);
        assert.deepEqual(await discover("%_"), []);
        assert.deepEqual(Object.keys((await discover("Little Art Festival"))[0]).sort(),
          ["code", "expires_at", "id", "status", "theme", "title"]);
      });
      await api("GET", base, null, null);
      await api("GET", base + "/feed", null, ids[1], 403);
      for (const id of ids.slice(1)) await api("POST", base + "/join", {}, id);
      const profileVersion = async () => (await sql`select xmin::text as version from wall.users where id=${ids[0]}`)[0].version;
      const beforeReads = await profileVersion();
      await api("GET", base);
      await api("GET", base + "/feed");
      assert.equal(await profileVersion(), beforeReads);
      const { note } = await api("POST", base + "/notes", { body: "hello" });
      await api("POST", base + "/notes", { body: "again" }, ids[0], 429);
      const target = { target_type: "note", target_id: note.id };
      await api("POST", "likes/toggle", target);
      await api("POST", "moderation", {
        room_id: room.id,
        ...target,
        action: "pin",
      });
      assert.equal((await api("GET", base + "/feed")).pinned_notes.length, 1);
      for (const id of ids.slice(1)) await api("POST", "reports", target, id);
      assert.equal((await api("GET", base + "/feed")).pinned_notes.length, 0);
      await api("POST", "moderation", {
        room_id: room.id,
        ...target,
        action: "restore",
      });
      const { poll } = await api("POST", base + "/polls", {
        question: "?",
        options: ["a", "b"],
      });
      await api("POST", "polls/" + poll.id + "/vote", {
        option_id: poll.options[0].id,
      });
      await api(
        "POST",
        "polls/" + poll.id + "/vote",
        { option_id: poll.options[1].id },
        ids[0],
        409,
      );
      const { story } = await api("POST", base + "/stories", {
        prompt: "Photo",
      });
      async function media() {
        const { params } = await api("POST", "cloudinary/sign", {
          folder: "vibewall",
        });
        const id = "vibewall/" + params.public_id;
        return {
          image_url: "https://image.test/" + id,
          cloudinary_public_id: id,
        };
      }
      // Saturate all three connections if verification ever moves back into a transaction.
      const pendingAssets = await Promise.all(ids.slice(1).map(async user => {
        const { params } = await api("POST", "cloudinary/sign", { folder: "vibewall" }, user);
        const id = "vibewall/" + params.public_id;
        return { cloudinary_public_id: id, image_url: "https://image.test/" + id };
      }));
      let release;
      const delayed = new Promise(resolve => { release = resolve; });
      let entered = 0;
      waitForCloudinary = () => { entered++; return delayed; };
      const uploads = pendingAssets.map((asset, i) => api("POST", base + "/posts", asset, ids[i + 1]));
      const deadline = Date.now() + 3000;
      try {
        while (entered < 3 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(entered, 3, "all three verifications overlap");
        await Promise.race([
          api("GET", base),
          new Promise((_, reject) => setTimeout(() => reject(Error("preview blocked by uploads")), 1500).unref()),
        ]);
      } finally {
        release();
        await Promise.all(uploads);
        waitForCloudinary = undefined;
      }
      const { post } = await api("POST", base + "/posts", await media());
      const { entry } = await api(
        "POST",
        "stories/" + story.id + "/entries",
        await media(),
      );
      assert.equal(entry.sequence_order, 1);
      await api("POST", "moderation", {
        room_id: room.id,
        target_type: "post",
        target_id: post.id,
        action: "delete",
      });
      await api("GET", new URL(screen_url).pathname.slice(1), null, null);
      await api("PATCH", base, {
        theme: "minimal-paper",
        rotate_screen_token: true,
      });
      await api("GET", new URL(screen_url).pathname.slice(1), null, null, 404);
      await api("PATCH", base, { status: "closed" });
      await api("POST", base + "/notes", { body: "closed" }, ids[1], 409);
    } finally {
      await db().end();
    }
  },
);
