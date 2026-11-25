// Shared runtime configuration for the mock vs. real Supabase authentication mode.
//
// Single source of truth for auth-mode detection. Both `lib/supabase.ts` and
// `lib/api.ts` must use these helpers so the decision stays consistent:
//   - `mock`     -> explicit `NEXT_PUBLIC_USE_MOCK=true` (overrides any real credentials).
//   - `supabase` -> real Supabase auth + API (valid, non-placeholder credentials).
//   - `unconfigured` -> no fake identities; safe guest/offline behavior.

export const PLACEHOLDER_SUPABASE_URL = "https://placeholder-project.supabase.co";
export const PLACEHOLDER_SUPABASE_ANON_KEY = "placeholder-anon-key";

export type AuthMode = "mock" | "supabase" | "unconfigured";

/** Explicit mock mode flag. `NEXT_PUBLIC_USE_MOCK=true` forces mock auth + mock API,
 * even when valid Supabase credentials are present. */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === "true";
}

/** Real Supabase mode requires a usable (non-empty, non-placeholder) URL + anon key. */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const validUrl =
    typeof url === "string" && url.trim().length > 0 && url.trim() !== PLACEHOLDER_SUPABASE_URL;
  const validKey =
    typeof anonKey === "string" && anonKey.trim().length > 0 && anonKey.trim() !== PLACEHOLDER_SUPABASE_ANON_KEY;
  return validUrl && validKey;
}

/** Resolves the effective auth mode with explicit-mock-mode precedence. */
export function getAuthMode(): AuthMode {
  if (isMockMode()) return "mock";
  if (isSupabaseConfigured()) return "supabase";
  return "unconfigured";
}

/** Explicit demo-host opt-in. Never enabled implicitly; only via env flag. */
export function isDemoHostEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIBEWALL_DEMO_HOST === "true";
}

/** Demo host identity, only returned when the explicit opt-in is enabled. */
export function getDemoHostUser() {
  return {
    id: "guest-host-user",
    email: "host@vibewall.app",
    user_metadata: {
      full_name: "Jihadul Islam Jitu (Host)",
      avatar_url:
        "/assets/stylized_modern_digital_vector_portrait_illustration_of_a_charismatic_south.png",
    },
  };
}
