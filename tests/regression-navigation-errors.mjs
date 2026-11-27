/**
 * Issue #24 regression tests — navigation & API error handling.
 *
 * Covers:
 *   1. Existing valid room.
 *   2. Missing room / 404.
 *   3. Unauthorized / 401.
 *   4. Forbidden / 403.
 *   5. Server error / 500.
 *   6. Offline / network failure.
 *   7. Landing page with no active rooms.
 *
 * Usage: BASE_URL=http://localhost:3000 node tests/regression-navigation-errors.mjs
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EXE = "/home/jitu/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome";

const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ["--no-sandbox"] });
const results = [];
function log(step, passed, details = "") {
  const sym = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`${sym}: ${step}${details ? ` (${details})` : ""}`);
  results.push({ step, passed, details });
}

function norm(t) { return (t || "").replace(/\s+/g, " ").trim(); }

async function withApiFailure(status, paths, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route(
    (url) => url.origin === new URL(BASE_URL).origin && url.pathname.startsWith("/api/") && paths.some((p) => url.pathname.includes(p)),
    (route) =>
      status === "off"
        ? route.abort("failed")
        : route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ error: { code: `HTTP_${status}`, message: `Injected ${status}` } }),
          })
  );
  try { await fn(page); } finally { await ctx.close(); }
}

try {
  // 1. Existing valid room ---------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/r/VIBE26`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const body = norm(await page.locator("body").innerText());
    log("Existing valid room shows room title", body.includes("Dynamic University Fest 2026"));
    log("Existing valid room shows guest CTA", /Continue with Google to Enter|Preview as Read-Only/i.test(body));
    await ctx.close();
  }

  // 2. Missing room / 404 ---------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/r/NOROOM999`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const body = norm(await page.locator("body").innerText());
    log("Missing room entry shows Not Found", /Room #NOROOM999 Not Found|Not Found/i.test(body));
    log("Missing room entry shows home button", /Back to Home/i.test(body));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/r/NOROOM999/wall`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const body = norm(await page.locator("body").innerText());
    log("Missing room wall shows Not Found", /Room #NOROOM999 Not Found|Not Found/i.test(body));
    log("Missing room wall shows retry", /Try Again/i.test(body));
    await ctx.close();
  }

  // 3. Unauthorized / 401 --------------------------------------------
  await withApiFailure(401, ["/rooms/"], async (page) => {
    await page.goto(`${BASE_URL}/r/ZZZTEST99/wall`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = norm(await page.locator("body").innerText());
    log("401 wall shows Authentication Required", /Authentication Required/i.test(body));
    log("401 wall shows Sign In action", /Sign In with Google/i.test(body));
  });

  // 4. Forbidden / 403 ------------------------------------------------
  await withApiFailure(403, ["/rooms/"], async (page) => {
    await page.goto(`${BASE_URL}/r/ZZZTEST99/wall`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = norm(await page.locator("body").innerText());
    log("403 wall shows Access Denied", /Access Denied/i.test(body));
  });

  // 5. Server error / 500 --------------------------------------------
  await withApiFailure(500, ["/rooms/"], async (page) => {
    await page.goto(`${BASE_URL}/r/ZZZTEST99/wall`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = norm(await page.locator("body").innerText());
    log("500 wall shows Server Error", /Server Error/i.test(body));
    log("500 wall shows Try Again", /Try Again/i.test(body));
  });

  // 6. Offline / network failure --------------------------------------
  await withApiFailure("off", ["/rooms/"], async (page) => {
    await page.goto(`${BASE_URL}/r/ZZZTEST99/wall`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = norm(await page.locator("body").innerText());
    log("Offline wall shows Connection Error", /Connection Error/i.test(body));
    log("Offline wall shows Try Again", /Try Again/i.test(body));
  });

  // 7. Landing page with no active rooms -------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const key = Symbol.for("vibewall.mock.store");
      globalThis[key] = {
        rooms: new Map(),
        posts: new Map(),
        notes: new Map(),
        polls: new Map(),
        stories: new Map(),
      };
    });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const body = norm(await page.locator("body").innerText());
    log("Landing empty state shows 'No Active Rooms Right Now'", /No Active Rooms Right Now/i.test(body));
    log("Landing empty state shows create CTA", /Create the First Room/i.test(body));
    await ctx.close();
  }

  // 8. Host page access denied (403) ----------------------------------
  await withApiFailure(403, ["/rooms/"], async (page) => {
    await page.goto(`${BASE_URL}/host/ZZZTEST99`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = norm(await page.locator("body").innerText());
    log("Host 403 shows Access Denied", /Access Denied/i.test(body));
  });

  // 9. Screen page invalid token (404) --------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.route("**/api/screen/**", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "NOT_FOUND", message: "Invalid screen token" } }) })
    );
    await page.goto(`${BASE_URL}/screen/totally_invalid_token`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = norm(await page.locator("body").innerText());
    log("Screen invalid token shows error (not infinite loading)", !body.includes("Connecting Venue Display"));
    log("Screen invalid token shows Not Found", /Not Found/i.test(body));
    await ctx.close();
  }

} finally {
  await browser.close();
}

console.log("\n==================================================");
console.log("   REGRESSION NAVIGATION ERROR TESTS");
console.log("==================================================");
const passed = results.filter((r) => r.passed).length;
console.log(`TOTAL: ${results.length}, PASSED: ${passed}, FAILED: ${results.length - passed}`);
console.log(passed === results.length ? "ALL PASS" : "FAILURES PRESENT");
process.exit(passed === results.length ? 0 : 1);
