/**
 * VibeWall P0 Regression Verification Suite: Screen Token Resolution (P0-1 & P0-2)
 *
 * Verifies:
 * 1. Room creation generates unique screen tokens for different rooms.
 * 2. Host dashboard dynamically retrieves and links to the room's actual venue screen token (not demo token).
 * 3. Empty href is prevented (disabled state shown if unavailable).
 * 4. Venue screen displays only its corresponding room.
 * 5. Unknown or invalid screen tokens return HTTP 404 with error envelope (never fall back to VIBE26).
 * 6. Rotated screen tokens immediately invalidate old tokens (returning 404) and new tokens resolve properly.
 */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function run() {
  console.log("==================================================================");
  console.log("   VIBEWALL P0 REGRESSION VERIFICATION: SCREEN TOKEN RESOLUTION   ");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = "") {
    if (condition) {
      console.log(`[PASS] ${message} ${details ? `(${details})` : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Step 1: Create two different rooms via POST /api/rooms
  // -------------------------------------------------------------
  console.log("\n--- Step 1: Testing Room Creation and Distinct Screen Token Generation ---");
  
  const res1 = await fetch(`${BASE_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P0 Verification Room Alpha",
      theme: "midnight-neon",
      expires_in_hours: 12,
    }),
  });
  const data1 = await res1.json();
  const room1 = data1.room;
  const token1 = room1?.screen_token;
  const screenUrl1 = data1.screen_url;

  assert(res1.status === 200, "Create Room 1 HTTP 200", `code: ${room1?.code}`);
  assert(Boolean(token1), "Room 1 has a screen_token", token1);
  assert(screenUrl1 && screenUrl1.includes(token1), "Room 1 screen_url contains token1", screenUrl1);
  assert(token1 !== "screen_token_vibe26_live", "Room 1 does NOT use hardcoded demo token");

  const res2 = await fetch(`${BASE_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P0 Verification Room Beta",
      theme: "campus-sunset",
      expires_in_hours: 6,
    }),
  });
  const data2 = await res2.json();
  const room2 = data2.room;
  const token2 = room2?.screen_token;
  const screenUrl2 = data2.screen_url;

  assert(res2.status === 200, "Create Room 2 HTTP 200", `code: ${room2?.code}`);
  assert(Boolean(token2), "Room 2 has a screen_token", token2);
  assert(screenUrl2 && screenUrl2.includes(token2), "Room 2 screen_url contains token2", screenUrl2);
  assert(token2 !== "screen_token_vibe26_live", "Room 2 does NOT use hardcoded demo token");
  assert(token1 !== token2, "Room 1 and Room 2 have DISTINCT screen tokens", `${token1} !== ${token2}`);

  // -------------------------------------------------------------
  // Step 2: GET /api/rooms/[code] returns actual screen_token and screen_url
  // -------------------------------------------------------------
  console.log("\n--- Step 2: Testing Room Preview API Returns Room-Specific Token ---");

  const previewRes1 = await fetch(`${BASE_URL}/api/rooms/${room1.code}`);
  const previewData1 = await previewRes1.json();
  assert(previewRes1.status === 200, "GET /api/rooms/[code1] HTTP 200");
  assert(previewData1.screen_token === token1, "Preview 1 returns room1 screen_token", previewData1.screen_token);
  assert(previewData1.screen_url && previewData1.screen_url.includes(token1), "Preview 1 returns room1 screen_url");

  const previewRes2 = await fetch(`${BASE_URL}/api/rooms/${room2.code}`);
  const previewData2 = await previewRes2.json();
  assert(previewRes2.status === 200, "GET /api/rooms/[code2] HTTP 200");
  assert(previewData2.screen_token === token2, "Preview 2 returns room2 screen_token", previewData2.screen_token);
  assert(previewData2.screen_url && previewData2.screen_url.includes(token2), "Preview 2 returns room2 screen_url");

  // -------------------------------------------------------------
  // Step 3: GET /api/screen/[token] resolves only corresponding room
  // -------------------------------------------------------------
  console.log("\n--- Step 3: Testing Screen Resolution & Room Content Isolation ---");

  const screenRes1 = await fetch(`${BASE_URL}/api/screen/${token1}`);
  const screenData1 = await screenRes1.json();
  assert(screenRes1.status === 200, "GET /api/screen/[token1] HTTP 200");
  assert(screenData1.room?.code === room1.code, "Screen 1 returns Room 1 code", screenData1.room?.code);
  assert(screenData1.room?.title === "P0 Verification Room Alpha", "Screen 1 returns Room 1 title");

  const screenRes2 = await fetch(`${BASE_URL}/api/screen/${token2}`);
  const screenData2 = await screenRes2.json();
  assert(screenRes2.status === 200, "GET /api/screen/[token2] HTTP 200");
  assert(screenData2.room?.code === room2.code, "Screen 2 returns Room 2 code", screenData2.room?.code);
  assert(screenData2.room?.title === "P0 Verification Room Beta", "Screen 2 returns Room 2 title");

  // -------------------------------------------------------------
  // Step 4: P0-2 - Unknown or invalid screen tokens return HTTP 404
  // -------------------------------------------------------------
  console.log("\n--- Step 4: Testing P0-2 - Rejection of Invalid Screen Tokens ---");

  const invalidTokens = [
    "invalid_token_does_not_exist_xyz",
    "screen_token_vibe26_fake",
    "st_random_nonexistent",
    "undefined",
    "null",
  ];

  for (const invToken of invalidTokens) {
    const invRes = await fetch(`${BASE_URL}/api/screen/${invToken}`);
    const invData = await invRes.json();
    assert(invRes.status === 404, `GET /api/screen/${invToken} returns HTTP 404`, `status: ${invRes.status}`);
    assert(invData.error && invData.error.code === "VALIDATION_ERROR", `Invalid token error envelope contains VALIDATION_ERROR`);
    assert(invData.room === undefined, `Invalid token does NOT expose any room content (no fallback to VIBE26)`);
  }

  // -------------------------------------------------------------
  // Step 5: Screen Token Rotation and Invalidation of Old Token
  // -------------------------------------------------------------
  console.log("\n--- Step 5: Testing Token Rotation & Invalidation of Stale Tokens ---");

  const rotateRes = await fetch(`${BASE_URL}/api/rooms/${room1.code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rotate_screen_token: true }),
  });
  const rotateData = await rotateRes.json();
  assert(rotateRes.status === 200, "PATCH /api/rooms/[code1] rotate token HTTP 200");
  
  const newToken1 = rotateData.room?.screen_token;
  assert(Boolean(newToken1), "Room 1 received a new rotated screen token", newToken1);
  assert(newToken1 !== token1, "New token is different from old token", `${newToken1} !== ${token1}`);

  // Old token MUST now return 404
  const oldTokenRes = await fetch(`${BASE_URL}/api/screen/${token1}`);
  const oldTokenData = await oldTokenRes.json();
  assert(oldTokenRes.status === 404, "Old rotated token returns HTTP 404", `status: ${oldTokenRes.status}`);
  assert(oldTokenData.room === undefined, "Old rotated token does NOT expose any room");

  // New token MUST return Room 1
  const newTokenRes = await fetch(`${BASE_URL}/api/screen/${newToken1}`);
  const newTokenData = await newTokenRes.json();
  assert(newTokenRes.status === 200, "New rotated token returns HTTP 200");
  assert(newTokenData.room?.code === room1.code, "New token resolves to Room 1");

  // Room 2 token should remain completely unaffected
  const screen2AfterRotate = await fetch(`${BASE_URL}/api/screen/${token2}`);
  const screen2AfterData = await screen2AfterRotate.json();
  assert(screen2AfterRotate.status === 200, "Room 2 token remains valid after Room 1 rotation");
  assert(screen2AfterData.room?.code === room2.code, "Room 2 still resolves properly");

  // -------------------------------------------------------------
  // Step 6: Browser E2E Verification with Playwright
  // -------------------------------------------------------------
  console.log("\n--- Step 6: Testing Browser UI Host Dashboard & Screen Rendering ---");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/home/jitu/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    // Visit Host Dashboard for Room 1
    await page.goto(`${BASE_URL}/host/${room1.code}`, { waitUntil: "domcontentloaded" });
    const venueDisplayLink = page.locator("a:has-text('Open Venue Display')");
    await venueDisplayLink.waitFor({ state: "visible", timeout: 8000 });
    const linkVisible = await venueDisplayLink.isVisible();
    assert(linkVisible, "Host Dashboard displays 'Open Venue Display' button");

    const href1 = await venueDisplayLink.getAttribute("href");
    assert(Boolean(href1), "Venue Display link href is NOT empty", href1);
    assert(href1.includes(`/screen/${newToken1}`), "Host Dashboard links to room's actual rotated screen token", href1);
    assert(!href1.includes("screen_token_vibe26_live"), "Host Dashboard does NOT link to demo token", href1);

    // Visit Host Dashboard for Room 2
    await page.goto(`${BASE_URL}/host/${room2.code}`, { waitUntil: "domcontentloaded" });
    const venueDisplayLink2 = page.locator("a:has-text('Open Venue Display')");
    await venueDisplayLink2.waitFor({ state: "visible", timeout: 8000 });
    const href2 = await venueDisplayLink2.getAttribute("href");
    assert(Boolean(href2), "Room 2 Host Dashboard link href is NOT empty", href2);
    assert(href2.includes(`/screen/${token2}`), "Room 2 Host Dashboard links to Room 2 screen token", href2);
    assert(href1 !== href2, "Host dashboards link to DIFFERENT venue screen URLs", `${href1} !== ${href2}`);

    // Visit Venue Screen for Room 2
    await page.goto(`${BASE_URL}/screen/${token2}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("header", { timeout: 8000 });
    const screenTitle = await page.textContent("header");
    assert(screenTitle.includes("P0 Verification Room Beta"), "Venue Screen displays Room 2 title", screenTitle.trim().substring(0, 50));
    assert(screenTitle.includes(room2.code), "Venue Screen displays Room 2 code");

    // Visit Invalid Screen Token in Browser
    await page.goto(`${BASE_URL}/screen/completely_invalid_token_999`, { waitUntil: "domcontentloaded" });
    const errorHeadingLocator = page.locator("h1:has-text('Venue Display Unavailable')");
    await errorHeadingLocator.waitFor({ state: "visible", timeout: 8000 });
    const errorHeading = await errorHeadingLocator.isVisible();
    assert(errorHeading, "Invalid token page displays 'Venue Display Unavailable' heading");
    const errorHttpText = await page.locator("text=HTTP 404").isVisible();
    assert(errorHttpText, "Invalid token page displays 'HTTP 404'");

  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`   VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Verification execution error:", err);
  process.exit(1);
});
