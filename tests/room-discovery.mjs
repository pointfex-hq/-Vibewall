// Run against a local NEXT_PUBLIC_USE_MOCK=true server.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { chromium } from "playwright";

test("landing search resolves room codes and event names and offers ambiguous matches", async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH });
  const page = await browser.newPage({ baseURL: process.env.BASE_URL || "http://localhost:3000" });
  try {
    const festival = "Discovery Fest " + randomUUID();
    const rooms = [];
    for (const suffix of ["Arts", "Music"]) {
      const response = await page.request.post("/api/rooms", { data: { title: festival + " " + suffix } });
      assert.equal(response.status(), 200);
      rooms.push((await response.json()).room);
    }

    const openLanding = () => Promise.all([
      page.waitForResponse((res) => new URL(res.url()).pathname === "/api/rooms"),
      page.goto("/"),
    ]);
    async function search(value) {
      const input = page.locator("#room-search");
      await input.fill(value);
      await input.press("Enter");
    }

    await openLanding();
    await search(festival.toUpperCase());
    const choices = page.locator("form").filter({ has: page.locator("#room-search") });
    await choices.getByText("Choose a live room").waitFor();
    for (const room of rooms) {
      assert.equal(await choices.getByRole("link", { name: room.title + " " + room.code }).getAttribute("href"), "/r/" + room.code);
    }
    await choices.getByRole("link", { name: rooms[1].title + " " + rooms[1].code }).click();
    await page.waitForURL("**/r/" + rooms[1].code);

    for (const term of [rooms[0].code.toLowerCase(), "  " + rooms[0].title.toLowerCase() + "  "]) {
      await openLanding();
      await search(term);
      await page.waitForURL("**/r/" + rooms[0].code);
    }

    await openLanding();
    await search("missing " + festival);
    await page.getByText("No live room matches that name or code.").waitFor();
    await page.route("**/api/rooms?*", (route) => route.fulfill({ status: 503 }));
    await search(festival);
    await page.getByText("Couldn’t search live rooms. Please try again.").waitFor();
  } finally {
    await browser.close();
  }
});
