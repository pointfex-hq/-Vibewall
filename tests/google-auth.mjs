// Run against real-mode Next.js configured with https://auth.fixture.test and a test anon key.
// The browser drives the installed Supabase SDK. Only the external auth service is simulated.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const origin = process.env.BASE_URL || "http://127.0.0.1:3161";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(7000);
  const user = { id: "f578748c-479d-43e3-8fd2-ca25709b6abf", aud: "authenticated", user_metadata: { full_name: "Test Host" } };
  let challenge;
  let exchanged = 0;
  let refuseLogout = true;
  await page.route("**/api/rooms", route => route.fulfill({ json: { rooms: [] } }));
  await page.route("https://auth.fixture.test/auth/v1/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/authorize")) {
      assert.equal(url.searchParams.get("provider"), "google");
      assert.equal(url.searchParams.get("redirect_to"), origin + "/auth/callback");
      challenge = url.searchParams.get("code_challenge");
      assert.ok(challenge);
      return route.fulfill({ status: 302, headers: { Location: origin + "/auth/callback?code=fixture-code" } });
    }
    if (url.pathname.endsWith("/token")) {
      const { auth_code, code_verifier } = route.request().postDataJSON();
      assert.equal(auth_code, "fixture-code");
      assert.equal(createHash("sha256").update(code_verifier).digest("base64url"), challenge);
      exchanged++;
      return route.fulfill({ json: { user, token_type: "bearer", access_token: "fixture-access", refresh_token: "fixture-refresh", expires_in: 3600 } });
    }
    if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
    if (url.pathname.endsWith("/logout")) {
      return refuseLogout ? route.fulfill({ status: 400, json: { msg: "Sign-out temporarily unavailable" } }) : route.fulfill({ status: 204 });
    }
    throw Error("Unexpected auth request to " + url.pathname);
  });
  await page.goto(origin + "/signin?returnTo=" + encodeURIComponent("/?source=signin"));
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL(origin + "/?source=signin");
  const signOut = page.getByRole("button", { name: "Sign Out" });
  await signOut.click();
  await page.getByRole("alert").filter({ hasText: "Sign-out temporarily unavailable" }).waitFor();
  await signOut.waitFor();
  refuseLogout = false;
  await signOut.click();
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  assert.equal(exchanged, 1);
  await page.goto(origin + "/auth/callback?error=access_denied");
  await page.getByRole("alert").filter({ hasText: "access_denied" }).waitFor();
  await page.getByRole("link", { name: /sign.in/i }).click();
  await page.waitForURL(url => url.pathname === "/signin");
  console.log("Google PKCE exchange, return destination, sign-out failure/retry, persisted logout and cancelled callback passed.");
} finally {
  await browser.close();
}
