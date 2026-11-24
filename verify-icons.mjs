import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: "/home/jitu/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const fontRequests = [];
const errors = [];
page.on("request", (r) => {
  const url = r.url();
  if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) fontRequests.push(url);
});
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(`${BASE}/r/VIBE26/wall`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const svgCount = await page.locator("svg").count();
const lucideCount = await page.locator("svg.lucide").count();
const entry = await page.goto(`${BASE}/r/VIBE26`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const entryLucide = await page.locator("svg.lucide").count();

// Material Symbols must be gone: no request to any "Material" font, no material-symbols CSS.
const materialRequests = fontRequests.filter((u) => u.includes("Material"));
const materialCss = await page.evaluate(() =>
  [...document.styleSheets].some((s) => {
    try {
      return [...(s.cssRules || [])].some((r) => String(r.cssText || "").includes("Material+Symbols"));
    } catch {
      return false;
    }
  })
);
// Icon check: lucide svgs present
const svgCount2 = await page.locator("svg").count();
const lucideCount2 = await page.locator("svg.lucide").count();

console.log("wall svg count:", svgCount, "| lucide svgs:", lucideCount);
console.log("entry page lucide svgs:", lucideCount2);
console.log("font requests (text fonts):", fontRequests.length, JSON.stringify(fontRequests.slice(0, 2)));
console.log("material font requests:", JSON.stringify(materialRequests));
console.log("material CSS present:", materialCss);
console.log("console errors:", JSON.stringify(errors.slice(0, 3)));

const ok = lucideCount > 0 && materialRequests.length === 0 && !materialCss;
console.log(ok ? "✓ ICONS OK: lucide rendered, no external Material Symbols dependency" : "✗ ICONS ISSUE");
await browser.close();
process.exit(ok ? 0 : 1);
