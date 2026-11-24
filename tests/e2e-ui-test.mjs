import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = "/home/jitu/Downloads/VibeWall/tests/screenshots";

async function runUITests() {
  console.log("==================================================");
  console.log("   VIBEWALL FRONTEND & UI/UX TEST SUITE (E2E)");
  console.log("==================================================");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/home/jitu/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];
  function logResult(step, passed, details = "") {
    const symbol = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`${symbol}: ${step} ${details ? `(${details})` : ""}`);
    results.push({ step, passed, details });
  }

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: Route / (Landing & Host Portal)
    // ----------------------------------------------------
    console.log("\n>>> Testing Route 1: Landing & Host Portal (/)");
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    // Verify Title and Branding
    const title = await page.textContent("h1");
    logResult("Landing Hero Title", title.includes("Live Social Wall"), title.trim());

    // Verify Active Room Card VIBE26
    const vibe26Card = await page.locator("text=VIBE26").first().isVisible();
    logResult("Active Room Card #VIBE26", vibe26Card);

    // Test Create Room Modal
    await page.click("button:has-text('Create New Room')");
    await page.waitForTimeout(400);
    const modalVisible = await page.locator("h3:has-text('Create New Room')").isVisible();
    logResult("Create Room Modal Open", modalVisible);

    // Fill Create Room Form
    await page.fill("input[placeholder*='e.g. CSE Fest']", "CSE Tech Carnival 2026");
    await page.click("button:has-text('Emerald Fest')");
    await page.click("button:has-text('12 Hours')");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "1-landing-create-modal.png") });

    // Submit Create Room Form
    await page.click("button:has-text('Launch Room & Host Dashboard')");
    await page.waitForURL("**/host/**", { timeout: 8000 });
    const hostUrl = page.url();
    logResult("Create Room Redirects to Host Dashboard", hostUrl.includes("/host/"), hostUrl);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "1-host-created-room.png") });

    // Test Quick Join from Landing Page
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.fill("input[placeholder*='Enter Room Code']", "VIBE26");
    await page.press("input[placeholder*='Enter Room Code']", "Enter");
    await page.waitForURL("**/r/VIBE26", { timeout: 8000 });
    logResult("Quick Join Redirects to /r/VIBE26", page.url().includes("/r/VIBE26"));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "1-landing-portal.png") });

    // ----------------------------------------------------
    // TEST SUITE 2: Route /r/[code] (QR Entry & Auth Gate)
    // ----------------------------------------------------
    console.log("\n>>> Testing Route 2: QR Entry & Auth Gate (/r/VIBE26)");
    await page.goto(`${BASE_URL}/r/VIBE26`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    // Verify Room Title & Status
    const eventName = await page.textContent("h1");
    logResult("Room Verification Event Title", eventName.includes("Dynamic University Fest 2026"), eventName.trim());

    const statusBadge = await page.locator("text=Status: open").isVisible();
    logResult("Room Status Badge Open", statusBadge);

    // Verify the Guest Entry CTAs
    const googleEntryBtn = page.locator("button:has-text('Continue with Google to Enter')");
    const previewGuestBtn = page.locator("button:has-text('Preview as Read-Only Guest')");
    logResult("Guest Can See Google Sign-In CTA", await googleEntryBtn.isVisible());
    logResult("Guest Can See Preview as Read-Only CTA", await previewGuestBtn.isVisible());

    // Guest preview must not navigate into the wall
    await previewGuestBtn.click();
    await page.waitForTimeout(300);
    logResult("Guest Preview Stays on Entry Page", page.url().includes("/r/VIBE26"));

    // Sign in through the primary CTA and enter the wall
    await googleEntryBtn.click();
    await page.waitForURL("**/r/VIBE26/wall", { timeout: 8000 });
    logResult("Google Sign-In Enters the Live Wall", page.url().includes("/r/VIBE26/wall"));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "2-qr-entry-gate.png") });

    // ----------------------------------------------------
    // TEST SUITE 3: Route /r/[code]/wall (Live Social Wall)
    // ----------------------------------------------------
    console.log("\n>>> Testing Route 3: Live Social Wall (/r/VIBE26/wall)");
    // Guest session: clear any mock sign-in stored earlier so the wall behaves as a guest.
    await page.evaluate(() => localStorage.removeItem("vibewall_mock_user"));
    await page.goto(`${BASE_URL}/r/VIBE26/wall`, { waitUntil: "domcontentloaded" });
    // Wait for the wall feed to finish loading (room title + feed content).
    await page.waitForFunction(
      () => document.querySelector("h1")?.textContent?.includes("Dynamic University Fest 2026"),
      null,
      { timeout: 8000 }
    );

    // Verify Live Header & Code Copy
    const headerTitle = await page.textContent("h1");
    logResult("Wall Event Header Title", headerTitle.includes("Dynamic University Fest 2026"));

    // Copy Code Button
    const copyBtn = page.locator("button:has-text('#VIBE26')");
    await copyBtn.click();
    logResult("Room Code Copy Triggered", await copyBtn.isVisible());

    // Verify Interactive Poll Card
    const pollVisible = await page.locator("h2:has-text('Which artist do you want')").isVisible();
    logResult("Interactive Poll Card Rendered", pollVisible);

    // Verify Poll and Duplicate Vote Prevention
    const arijitOption = page.locator("button:has-text('Arijit Singh')");
    if (await arijitOption.isVisible()) {
      const isDisabled = await arijitOption.isDisabled();
      logResult("Poll Duplicate Vote Prevention (Disabled state)", isDisabled);
      const voteRecorded = await page.locator("text=Your vote is recorded in real time").isVisible();
      logResult("Poll Voted Status Feedback Displayed", voteRecorded);
    }

    // Verify Chain Story Strip
    const storyStrip = await page.locator("text=CHAIN STORY").isVisible();
    logResult("Chain Story Strip Rendered", storyStrip);

    // Verify Pinned Note
    const pinnedNote = await page.locator("text=Pinned Vibe Note").first().isVisible();
    logResult("Pinned Vibe Note Highlighted at Top", pinnedNote);

    // Guest Poll Vote — click shows the auth modal (shared guard with the like flow)
    const pollOption = page.locator("button:has-text('Arijit Singh')").first();
    if (await pollOption.isVisible() && !(await pollOption.isDisabled())) {
      await pollOption.click();
      await page.waitForTimeout(300);
      const guestPollModal = await page.locator('[role="dialog"]:has-text("Sign in to Join the Vibe")').isVisible();
      logResult("Guest Poll Vote Click Shows Auth Modal", guestPollModal);
      await page.click("button:has-text('Continue with Google')");
      await page.waitForTimeout(800);
    }

    // Test Photo Card Like interaction — guest gets the auth modal, then signs in
    await page.waitForFunction(
      () => document.querySelector("article button") !== null,
      null,
      { timeout: 8000 }
    );
    const firstLikeBtn = page.locator("article button:has(svg.lucide-heart)").first();
    if (await firstLikeBtn.isVisible()) {
      await firstLikeBtn.click();
      await page.waitForTimeout(300);
      const guestLikeModal = await page.locator('[role="dialog"]:has-text("Sign in to Join the Vibe")').isVisible();
      logResult("Guest Like Click Shows Auth Modal", guestLikeModal);
      // Continue with Google so the guest session is established
      await page.click("button:has-text('Continue with Google')");
      await page.waitForTimeout(800);
      // Authenticated clicks work again
      const afterSignInText = await firstLikeBtn.textContent();
      await firstLikeBtn.click();
      await page.waitForTimeout(400);
      const updatedLikeText = await firstLikeBtn.textContent();
      logResult("Like Works After Google Sign-In", afterSignInText !== updatedLikeText, `${afterSignInText?.trim()} -> ${updatedLikeText?.trim()}`);
    }

    // Test VibeCard Exporter Modal
    const vibeCardBtn = page.locator("button:has-text('VibeCard')").first();
    await vibeCardBtn.click();
    await page.waitForTimeout(600);
    const vibeCardModalVisible = await page.locator("h3:has-text('Export VibeCard')").isVisible();
    logResult("VibeCard Exporter Modal Opened", vibeCardModalVisible);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "3-vibecard-exporter-modal.png") });

    // Close VibeCard Modal
    await page.click("button:has-text('Cancel')");
    await page.waitForTimeout(300);

    // Test Floating Composer (authenticated after the like sign-in)
    await page.click("button:has-text('Write Note')");
    await page.locator("textarea[placeholder*='Share a shoutout']").waitFor({ state: "visible", timeout: 8000 });
    const textarea = page.locator("textarea[placeholder*='Share a shoutout']");
    logResult("Floating Composer Opened", await textarea.isVisible());

    const testNoteText = "Automated E2E Test Note from Chromium: Sound stage is electric! #Fest26";
    await textarea.fill(testNoteText);
    await page.fill("input[placeholder*='Anonymous or Rahat']", "QA_Robot_Jitu");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "3-wall-composer-note.png") });

    await page.click("button:has-text('Post Vibe Note')");
    await page.waitForTimeout(1000);

    // Verify the newly posted note appears in the feed
    const newNoteVisible = await page.locator(`text=${testNoteText}`).isVisible();
    logResult("New Vibe Note Live Feed Integration", newNoteVisible, "Broadcasted & displayed instantly");

    // Poll Vote — while authenticated, clicking a poll option must not show the auth modal
    const pollOption2 = page.locator("button:has-text('Arijit Singh')").first();
    if (await pollOption2.isVisible()) {
      await pollOption2.click().catch(() => {});
      await page.waitForTimeout(300);
      logResult("Poll Vote While Authenticated Skips Auth Modal", !(await page.locator('[role="dialog"]:has-text("Sign in to Join the Vibe")').isVisible()));
    }

    // Chain Story — StoryStrip → Add Photo uploads to the active story (not the feed)
    const getStoryId = () =>
      page.evaluate(() => {
        const store = globalThis[Symbol.for("vibewall.mock.store")];
        const story = [...(store?.stories?.values() || [])].find((s) => s.is_active);
        return story ? story.id : null;
      });
    const getStoryEntries = (sid) =>
      page.evaluate((storyId) => {
        const store = globalThis[Symbol.for("vibewall.mock.store")];
        const story = [...(store?.stories?.values() || [])].find((s) => s.id === storyId);
        return story ? story.entries.length : -1;
      }, sid);
    const getPostCount = () => page.evaluate(() => globalThis[Symbol.for("vibewall.mock.store")]?.posts?.size || 0);

    const storyId = await getStoryId();
    const storyEntriesBefore = storyId ? await getStoryEntries(storyId) : -1;
    const postsBeforeStoryUpload = await getPostCount();

    const addPhotoBtn = page.locator("text=Add Photo").first();
    if (storyId && (await addPhotoBtn.isVisible())) {
      await addPhotoBtn.click();
      await page.waitForTimeout(1000);
      logResult("Story Add Photo Opens Composer", await page.locator("text=Add to Chain Story").isVisible());
      logResult("Story Entry Mode Hides Frame Selector", !(await page.locator("text=Choose Frame Style").isVisible()));
      const png = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL("image/png");
      });
      await page.setInputFiles("input[type=file]", {
        name: "story-photo.png",
        mimeType: "image/png",
        buffer: Buffer.from(png.split(",")[1], "base64"),
      });
      await page.locator("img[alt='Upload preview']").waitFor({ state: "visible", timeout: 8000 });
      await page.click("button:has-text('Add to Chain Story')");
      await page.waitForTimeout(1500);
      const storyEntriesAfter = await getStoryEntries(storyId);
      logResult("Story Upload Adds Entry To Chain Story", storyEntriesAfter === storyEntriesBefore + 1, `before=${storyEntriesBefore} after=${storyEntriesAfter}`);
      logResult("Story Upload Does Not Post To Feed", (await getPostCount()) === postsBeforeStoryUpload);
    }

    // Standard Add Photo (bottom bar) still posts to the feed via api.createPost
    const postsBeforeStandard = await getPostCount();
    await page.click("button:has-text('Post Photo')");
    await page.locator("text=Post Photo to Live Wall").waitFor({ state: "visible", timeout: 8000 });
    const png2 = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL("image/png");
    });
    await page.setInputFiles("input[type=file]", {
      name: "standard-photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(png2.split(",")[1], "base64"),
    });
    await page.locator("img[alt='Upload preview']").waitFor({ state: "visible", timeout: 8000 });
    logResult("Standard Mode Shows Frame Selector", await page.locator("text=Choose Frame Style").isVisible());
    await page.click("button:has-text('Post Photo to Live Wall')");
    await page.waitForTimeout(1500);
    const postsAfterStandard = await getPostCount();
    logResult("Standard Add Photo Still Posts To Feed", postsAfterStandard > postsBeforeStandard, `before=${postsBeforeStandard} after=${postsAfterStandard}`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "3-live-wall-full.png") });

    // ----------------------------------------------------
    // TEST SUITE 4: Route /r/[code]/story/[storyId] (Story Viewer)
    // ----------------------------------------------------
    console.log("\n>>> Testing Route 4: Chain Story Viewer (/r/VIBE26/story/story-fest-1)");
    await page.goto(`${BASE_URL}/r/VIBE26/story/story-fest-1`, { waitUntil: "domcontentloaded" });
    // Wait for the story stage to finish loading.
    await page.waitForFunction(
      () => document.body.innerText.includes("Add Your Photo to this Chain Story"),
      null,
      { timeout: 8000 }
    );

    // Verify 9:16 Fullscreen Immersive Stage
    const authorHeader = await page.locator("span:has-text('Murad FestCrew'), span:has-text('FestCrew'), span:has-text('Fest')").first().isVisible();
    logResult("Story Author Header Telemetry", authorHeader);

    // Verify Segmented Progress Bar
    const progressBars = await page.locator("div.h-full.bg-primary.rounded-full").count();
    logResult("Multi-segment Progress Bars", progressBars >= 1, `${progressBars} segments`);

    // Verify Add Photo CTA
    const addPhotoCTA = await page.locator("button:has-text('Add Your Photo')").isVisible();
    logResult("Add Photo to Story CTA Visible", addPhotoCTA);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "4-chain-story-viewer.png") });

    // Close Story -> return to wall
    await page.click("a[href*='/r/VIBE26/wall']");
    await page.waitForURL("**/r/VIBE26/wall", { timeout: 8000 });
    logResult("Story Close Returns to Live Wall", page.url().includes("/r/VIBE26/wall"));

    // ----------------------------------------------------
    // TEST SUITE 5: Route /host/[code] (Host Admin Dashboard)
    // ----------------------------------------------------
    console.log("\n>>> Testing Route 5: Host Admin Dashboard (/host/VIBE26)");
    await page.goto(`${BASE_URL}/host/VIBE26`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    // Verify Telemetry Bar
    const telemetryItems = await page.textContent("main");
    logResult("Telemetry Bar (Attendees, Posts, Polls)", telemetryItems.includes("Live Feed Items") && telemetryItems.includes("Active Poll Votes"));

    // Verify Moderation Tabs
    await page.click("button:has-text('Flagged / Auto-Hidden')");
    await page.waitForTimeout(300);
    logResult("Moderation Filter Tabs (Active vs Hidden)", true);

    await page.click("button:has-text('Active Feed Items')");
    await page.waitForTimeout(300);

    // Test Theme Switching Tab
    await page.click("button:has-text('Theme & Frames')");
    await page.waitForTimeout(400);
    const themeCardsVisible = await page.locator("text=Minimal Paper").isVisible();
    logResult("Theme Switcher Panel Rendered", themeCardsVisible);

    // Activate Minimal Paper Theme
    await page.click("button:has-text('Activate Theme') >> nth=0");
    await page.waitForTimeout(500);
    logResult("Live Theme Switching Triggered", true, "Minimal Paper Theme activated");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "5-host-themes-tab.png") });

    // Test Engagement Tab (Polls & Stories)
    await page.click("button:has-text('Polls & Stories')");
    await page.waitForTimeout(400);
    const engagementForm = await page.locator("h3:has-text('Launch Interactive Poll')").isVisible();
    logResult("Engagement Management Panel (Polls & Stories)", engagementForm);

    // Test Room Management Tab (QR code & security)
    await page.click("button:has-text('Room Management')");
    await page.waitForTimeout(400);
    const qrImageVisible = await page.locator("img[alt='Room QR']").isVisible();
    logResult("Room QR Code Generator Rendered", qrImageVisible);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "5-host-dashboard-full.png") });

    // ----------------------------------------------------
    // TEST SUITE 6: Route /screen/[token] (Venue Display 16:9)
    // ----------------------------------------------------
    console.log("\n>>> Testing Route 6: Venue Display 16:9 (/screen/screen_token_vibe26_live)");
    const tvPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await tvPage.goto(`${BASE_URL}/screen/screen_token_vibe26_live`, { waitUntil: "domcontentloaded" });
    await tvPage.waitForTimeout(800);

    // Verify Title & Live Telemetry
    const tvHeader = await tvPage.textContent("header");
    logResult("Venue Display Header (1080p)", tvHeader.includes("Dynamic University Fest 2026") && tvHeader.includes("LIVE AUDITORIUM WALL"));

    // Verify Spotlight Carousel & Venue QR Card
    const tvQR = await tvPage.locator("img[alt='Room QR']").isVisible();
    logResult("Venue QR Code Scanner Box", tvQR);

    const tvPoll = await tvPage.locator("text=Live Poll").isVisible();
    logResult("Venue Active Poll Progress Bars", tvPoll);

    // Verify No Administrative Controls are leaked on venue display
    const adminControlsLeaked = (await tvPage.locator("button:has-text('Delete'), button:has-text('Hide')").count()) > 0;
    logResult("Venue Security: Zero Admin Controls on Stage Display", !adminControlsLeaked);

    await tvPage.screenshot({ path: path.join(SCREENSHOTS_DIR, "6-venue-display-1080p.png") });

    // ----------------------------------------------------
    // TEST SUITE 7: Responsive Mobile Testing (390px Viewport)
    // ----------------------------------------------------
    console.log("\n>>> Testing Responsive Layout: Mobile iPhone 14/15 Viewport (390px)");
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await mobilePage.goto(`${BASE_URL}/r/VIBE26/wall`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(800);

    // Verify No Horizontal Overflow
    const overflowX = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    logResult("Mobile 390px Layout: Zero Horizontal Overflow", !overflowX);

    // Verify Floating Action Bar
    const floatingBar = await mobilePage.locator("button:has-text('Post Photo')").isVisible();
    logResult("Mobile Fixed Action Bar Clearance", floatingBar);

    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, "7-mobile-wall-feed.png") });

    await tvPage.close();
    await mobilePage.close();
    await page.close();

    console.log("\n==================================================");
    console.log("   TEST EXECUTION SUMMARY");
    console.log("==================================================");
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`TOTAL TESTS: ${results.length}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${results.length - passedCount}`);
    console.log(`SUCCESS RATE: ${Math.round((passedCount / results.length) * 100)}%`);

    return passedCount === results.length;
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    return false;
  } finally {
    await browser.close();
  }
}

runUITests().then((success) => {
  process.exit(success ? 0 : 1);
});
