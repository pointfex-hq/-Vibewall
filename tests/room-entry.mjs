// Run against a local NEXT_PUBLIC_USE_MOCK=true server using BASE_URL.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL || "http://localhost:3000";
let browser;

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH });
});
after(async () => { await browser?.close(); });

async function createRoom(request, title, expires_in_hours = 1) {
  const response = await request.post("/api/rooms", { data: { title, expires_in_hours } });
  assert.equal(response.status(), 200);
  return (await response.json()).room;
}

test("entry shows an expired room without offering to join it", async () => {
  const page = await browser.newPage({ baseURL });
  try {
    const room = await createRoom(page.request, "Expired entry test", -1);
    await page.goto(`/r/${room.code}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: room.title }).waitFor();
    await page.getByText("Status: expired", { exact: true }).waitFor({ timeout: 3000 });
    assert.equal(await page.getByRole("button", { name: "Continue with Google to Enter" }).count(), 0);
  } finally { await page.close(); }
});

test("authenticated entry submits a JSON join before opening the verified wall", async () => {
  const page = await browser.newPage({ baseURL });
  try {
    const room = await createRoom(page.request, "Open entry test");
    await page.addInitScript(() => {
      localStorage.setItem("vibewall_mock_user", JSON.stringify({
        id: "verification-user", email: "guest@example.test", user_metadata: { full_name: "Guest" },
      }));
    });
    const join = page.waitForRequest(req => req.method() === "POST" && req.url().endsWith(`/api/rooms/${room.code}/join`), { timeout: 10000 });
    await page.goto(`/r/${room.code.toLowerCase()}`, { waitUntil: "domcontentloaded" });
    assert.deepEqual((await join).postDataJSON(), {});
    await page.waitForURL(`**/r/${room.code}/wall`);
  } finally { await page.close(); }
});
