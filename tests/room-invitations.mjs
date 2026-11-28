import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = new URL(process.env.TEST_BASE_URL || "http://127.0.0.1:4828").origin;
const code = process.env.TEST_ROOM_CODE || "VIBE26";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

try {
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      await page.goto(origin);
      await page.getByRole("link", { name: "Instant join via QR / Link" }).click({ timeout: 5000 });
      const input = page.locator("#room-search");
      assert.equal(await input.evaluate(el => el === document.activeElement), true);
      await input.fill(origin + "/r/" + code.toLowerCase());
      await input.press("Enter");
      await page.waitForURL(origin + "/r/" + code);
      if (process.env.TEST_SCREEN_TOKEN) {
        await page.goto(origin + "/screen/" + encodeURIComponent(process.env.TEST_SCREEN_TOKEN));
        const link = page.getByRole("link", { name: "Open room " + code });
        await link.getByRole("img", { name: "Room QR" }).waitFor();
        assert.equal(await link.getAttribute("href"), "/r/" + code);
        await link.click();
        await page.waitForURL(origin + "/r/" + code);
      }
      console.log("PASS room invitations", width, height);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
