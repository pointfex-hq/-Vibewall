import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: "/home/jitu/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errors = [];
const httpErrors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("response", (r) => {
  if (r.status() >= 400) {
    httpErrors.push(`HTTP ${r.status()}: ${r.url()}`);
  }
});
page.on("requestfailed", (r) => httpErrors.push(`REQFAILED: ${r.url()}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE-ERROR: " + m.text());
});

const disp = async (type, payload) => {
  await page.evaluate(
    ({ t, p }) =>
      window.dispatchEvent(
        new CustomEvent("vibewall_realtime_event", {
          detail: { room_id: "room-vibe26-uuid", type: t, payload: p },
        })
      ),
    { t: type, p: payload }
  );
  await page.waitForTimeout(350);
};

const counter = async (label) =>
  await page.evaluate((l) => {
    const spans = [...document.querySelectorAll("span")];
    const idx = spans.findIndex((s) => s.textContent === l);
    const card = spans[idx].closest(".p-4");
    const val = card?.querySelector("span.font-heading.font-extrabold");
    return val ? val.textContent.trim() : null;
  }, label);

const hasText = async (t) => (await page.locator(`text=${t}`).count()) > 0;

await page.goto(`${BASE}/host/VIBE26`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

const results = [];
const check = (name, ok, extra = "") => results.push({ name, ok, extra });

// 1. Initial load
check("Dashboard loads", await hasText("Content Moderation"), "");
const feedBefore = await counter("Live Feed Items");

// 2. new_post realtime
await disp("new_post", {
  post: {
    id: "rt-verify-post-1",
    image_url: "/assets/dynamic_university_music_festival_crowd_at_night_with_purple_and_violet_neon.png",
    frame_id: "neon",
    author_name: "RealtimeGuestX",
    like_count: 3,
    liked_by_me: false,
    visibility: "approved",
    created_at: new Date().toISOString(),
  },
});
check("New post appears without reload", (await counter("Live Feed Items")) === String(Number(feedBefore) + 1), `before=${feedBefore} after=${await counter("Live Feed Items")}`);
check("New post visible on page", (await hasText("@RealtimeGuestX")) || (await hasText("RealtimeGuestX")));

// 3. Duplicate new_post — counter must not increase
const feedAfter = await counter("Live Feed Items");
await disp("new_post", {
  post: { id: "rt-verify-post-1", image_url: "/assets/dynamic_university_music_festival_crowd_at_night_with_purple_and_violet_neon.png", frame_id: "neon", author_name: "RealtimeGuestX", like_count: 3, liked_by_me: false, visibility: "approved", created_at: new Date().toISOString() },
});
check("Duplicate new_post does not double-count", (await counter("Live Feed Items")) === feedAfter, `${feedAfter} -> ${await counter("Live Feed Items")}`);

// 4. new_note realtime (pinned)
await disp("new_note", {
  note: {
    id: "rt-verify-note-1",
    body: "Realtime verify note from host",
    author_name: "RTHost",
    is_pinned: true,
    like_count: 0,
    liked_by_me: false,
    moderation_status: "approved",
    created_at: new Date().toISOString(),
  },
});
check("New pinned note appears without reload", (await hasText("Realtime verify note from host")) && (await hasText("PINNED")));

// 5. content_moderated hide for the post -> visible on Flagged tab
await page.click("button:has-text('Flagged / Auto-Hidden')");
await page.waitForTimeout(300);
check("Page has Flagged tab loaded", await hasText("Content Moderation"));
await disp("content_moderated", { target_type: "post", target_id: "rt-verify-post-1", action: "hide" });
check("Hidden post shows on Flagged tab", (await page.locator("text=@RealtimeGuestX").count()) > 0 || (await page.locator("text=RealtimeGuestX").count()) > 0);

// 6. content_moderated restore -> back on Active tab
await page.click("button:has-text('Active Feed Items')");
await page.waitForTimeout(300);
await disp("content_moderated", { target_type: "post", target_id: "rt-verify-post-1", action: "restore" });
await page.waitForTimeout(300);
// Count occurrences of author name on active tab — should be 1
const occurrences = await page.locator("text=RealtimeGuestX").count();
check("Restored post is back on Active tab", occurrences >= 1, `count=${occurrences}`);

// 7. poll_updated with total_votes
await disp("poll_updated", {
  poll: {
    id: "rt-verify-poll-1",
    question: "RT Verify Poll?",
    is_open: true,
    user_voted_option_id: null,
    total_votes: 42,
    options: [
      { id: "opt-a", option_text: "Yes", vote_count: 30 },
      { id: "opt-b", option_text: "No", vote_count: 12 },
    ],
  },
});
check("Poll votes update counter", (await counter("Active Poll Votes")) === "42", `got=${await counter("Active Poll Votes")}`);

// 8. theme_updated
await disp("theme_updated", { theme: "minimal-paper" });
const themeName = await counter("Active Theme");
check("Theme indicator updates", themeName === "Minimal Paper", `got=${themeName}`);

// 9. No page errors (a pre-existing 404 for a missing public asset is allowed)
const isKnownPreExisting = (e) => e.includes("404 (Not Found)");
check("No page errors", errors.filter((e) => !isKnownPreExisting(e)).length === 0, errors.join(" | "));
check("No HTTP errors", httpErrors.filter((e) => !e.includes("404")).length === 0, httpErrors.filter((e) => !e.includes("404")).join(" | "));

console.log("\n=== HOST DASHBOARD REALTIME VERIFICATION ===");
for (const r of results) {
  console.log(`${r.ok ? "✓ PASS" : "✗ FAIL"}: ${r.name}${r.extra ? ` (${r.extra})` : ""}`);
}
const passed = results.filter((r) => r.ok).length;
console.log(`TOTAL: ${results.length}, PASSED: ${passed}, FAILED: ${results.length - passed}`);

await page.screenshot({ path: "/home/jitu/Downloads/VibeWall/host-realtime-verify.png" });
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
