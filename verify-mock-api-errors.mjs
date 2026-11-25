// Verifies the mock-mode API error response contract (Playbook v2.1 §8).
const BASE = "http://localhost:3000";

const results = [];
const check = (name, ok, extra = "") => results.push({ name, ok, extra });

async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

// Error shape checks
const errorCases = [
  { url: "/api/rooms/UNKNOWN", method: "GET", expectStatus: 404, expectCode: "VALIDATION_ERROR", name: "GET /api/rooms/[code] (room not found)" },
  { url: "/api/rooms/UNKNOWN/join", method: "POST", expectStatus: 404, expectCode: "VALIDATION_ERROR", name: "POST /api/rooms/[code]/join (room not found)" },
  { url: "/api/rooms/UNKNOWN", method: "PATCH", expectStatus: 404, expectCode: "VALIDATION_ERROR", name: "PATCH /api/rooms/[code] (room not found)" },
  { url: "/api/screen/bad-token", method: "GET", expectStatus: 200, expectCode: null, name: "GET /api/screen/[token] (mock fallback: default room for demo screens — pre-existing behavior; 404 path returns VALIDATION_ERROR/'Invalid screen token')" },
  { url: "/api/nonexistent-route", method: "GET", expectStatus: 404, expectCode: "VALIDATION_ERROR", name: "GET unknown route (Route not found)" },
];

for (const c of errorCases) {
  const { status, json } = await call(c.method, c.url);
  const code = json?.error?.code;
  const message = json?.error?.message;
  check(`${c.name} → ${c.expectStatus}`, status === c.expectStatus, `got ${status}`);
  if (c.expectCode === null) {
    // Documented pre-existing mock behavior (fallback to default room).
    check(`${c.name} → no error object`, !json?.error, JSON.stringify(json)?.slice(0, 80));
    continue;
  }
  check(`${c.name} → error.code present`, typeof code === "string" && code.length > 0, `got ${JSON.stringify(code)}`);
  check(`${c.name} → error.message present`, typeof message === "string" && message.length > 0, `got ${JSON.stringify(message)}`);
  check(`${c.name} → code === ${c.expectCode}`, code === c.expectCode, `got ${code}`);
}

// Success cases (responses must be unchanged)
const ok1 = await call("GET", "/api/rooms/VIBE26");
check("GET /api/rooms/VIBE26 → 200 with room", ok1.status === 200 && Array.isArray(ok1.json?.room?.id) === false && ok1.json?.room?.code === "VIBE26", `status=${ok1.status}`);
const ok2 = await call("GET", "/api/rooms/VIBE26/feed");
check("GET /api/rooms/VIBE26/feed → 200", ok2.status === 200 && Array.isArray(ok2.json?.posts), `status=${ok2.status}`);

// lib/api.ts compatibility: err.code parsed from response
const { error: errBody } = (await call("GET", "/api/rooms/UNKNOWN")).json ?? {};
const hasCode = typeof errBody?.code === "string";
check("lib/api.ts-compatible error.code", hasCode);

console.log("\n=== MOCK API ERROR CONTRACT VERIFICATION ===");
for (const r of results) {
  console.log(`${r.ok ? "✓ PASS" : "✗ FAIL"}: ${r.name}${r.extra ? ` (${r.extra})` : ""}`);
}
const passed = results.filter((r) => r.ok).length;
console.log(`TOTAL: ${results.length}, PASSED: ${passed}, FAILED: ${results.length - passed}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
