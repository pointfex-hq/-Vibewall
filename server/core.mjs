import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import postgres from "postgres";

let pool;
export function db() {
  if (!process.env.DATABASE_URL) throw Error("Missing database configuration");
  return (pool ??= postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
  }));
}
export function fail(status, message, code = "VALIDATION_ERROR") {
  throw Object.assign(new Error(message), { status, code });
}
export function string(value, max) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    Array.from(value.trim()).length > max
  )
    fail(400, "Invalid text value");
  return value.trim();
}
export function uuid(value) {
  if (
    typeof value !== "string" ||
    !/^([0-9a-f]{8}-)([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
  )
    fail(400, "Invalid identifier");
  return value;
}
export const deny = () => fail(403, "Room access required", "FORBIDDEN");
export const limited = () => fail(429, "Action limit reached", "RATE_LIMITED");
export const code = () =>
  Array.from(
    { length: 6 },
    () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[randomInt(36)],
  ).join("");
export const token = () => randomBytes(32).toString("base64url");
export const hash = (t) =>
  createHmac("sha256", process.env.SCREEN_TOKEN_PEPPER).update(t).digest("hex");
export function roomDTO({ id, code, title, theme, status, expires_at }) {
  return {
    id,
    code,
    title,
    theme,
    status: new Date(expires_at) <= new Date() ? "expired" : status,
    expires_at,
  };
}
export const themes = [
  "midnight-neon",
  "minimal-paper",
  "campus-sunset",
  "emerald-fest",
];
export async function identity(req) {
  const authorization = req.headers.get("authorization");
  if (!authorization) return null;
  const res = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/user",
    {
      headers: {
        authorization,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    if ([401, 403].includes(res.status))
      fail(401, "Sign in with Google", "UNAUTHORIZED");
    throw Error("Auth unavailable");
  }
  const user = await res.json();
  const google = user.identities?.find((i) => i.provider === "google");
  const profile = google?.identity_data;
  const subject = profile?.sub || google?.id;
  if (!subject) fail(401, "Google identity required", "UNAUTHORIZED");
  return {
    id: user.id,
    sub: subject,
    name:
      profile?.full_name ||
      profile?.name ||
      "Participant",
    avatar: profile?.avatar_url || null,
    email: user.email || null,
  };
}
export async function emit(sql, room, event, payload) {
  await sql`select realtime.send(${sql.json(payload)},${event},${"room:" + room},false)`;
}
export function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => k + "=" + params[k])
    .join("&");
  return createHash("sha256")
    .update(canonical + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");
}
export async function claimAsset(sql, user, id) {
  const [claim] = await sql`update uploads set used=true where public_id=${id} and user_id=${user} and not used returning public_id`;
  if (!claim) deny();
  return id;
}
export async function verifyAsset(user, body) {
  const id = string(body.cloudinary_public_id, 200);
  const [claim] = await db()`select from wall.uploads where public_id=${id} and user_id=${user} and not used`;
  if (!claim) deny();
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const auth = Buffer.from(
    process.env.CLOUDINARY_API_KEY + ":" + process.env.CLOUDINARY_API_SECRET,
  ).toString("base64");
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/" +
      cloud +
      "/resources/image/upload/" +
      encodeURIComponent(id),
    { headers: { authorization: "Basic " + auth }, cache: "no-store" },
  );
  if (!res.ok) fail(400, "Uploaded image could not be verified");
  const asset = await res.json();
  if (
    asset.secure_url !== body.image_url ||
    asset.public_id !== id ||
    asset.bytes > 2097152 ||
    !["jpg", "jpeg", "png", "webp"].includes(asset.format)
  )
    fail(400, "Invalid uploaded image");
  return id;
}
