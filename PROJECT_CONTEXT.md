# VibeWall — Project Context & Engineering Architecture Living Memory

> **CONFIDENTIAL & PROPRIETARY — TEAM HYDROGEN, POINTFEX**  
> **Frontend Lead:** Jihadul Islam Jitu  
> **Backend Lead:** Md. Arifur Rahman Alvi  
> **UI/UX Lead:** Fatima Jannat Abonty  
> **Project Manager:** Ismail Hossen  

---

## 1. Project Overview

VibeWall is an interactive, QR-based live social wall engineered for university festivals, hackathons, concerts, and campus hangout venues.

Participants scan a venue QR code from a mobile device to open a room's gate. Visitors may preview the room without signing in, but Google authentication (Supabase OAuth) is mandatory before any interactive or write operation: joining the live wall, publishing photos, posting Vibe Notes, liking, voting in polls, and creating or contributing to Chain Stories.

Hosts manage the event via an administrative dashboard:
- Moderating submissions (approving, hiding, pinning top notes, permanently deleting with Cloudinary media purge).
- Realtime theme switching across 4 official themes (Midnight Neon, Minimal Paper, Campus Sunset, Emerald Fest).
- Managing room lifecycle, rotating screen display tokens, and broadcasting live polls.
- Projecting the synchronized 16:9 full-screen venue display for 1080p projectors and auditorium TVs.

---

## 2. Project Directory Structure

```
/home/jitu/Downloads/VibeWall/
├── code/                                # All application development workspace
│   ├── app/                             # Next.js 15 App Router
│   │   ├── api/[...path]/route.ts       # 16 REST API Route Handlers (Real Backend & Mock Fallback)
│   │   ├── host/[code]/page.tsx         # Route 5: Host Admin Dashboard
│   │   ├── r/[code]/page.tsx            # Route 2: QR Entry & Authentication Gate
│   │   ├── r/[code]/story/[storyId]/    # Route 4: Chain Story Viewer
│   │   │   └── page.tsx
│   │   ├── r/[code]/wall/page.tsx       # Route 3: Live Social Wall
│   │   ├── screen/[token]/page.tsx      # Route 6: 16:9 Venue Display
│   │   ├── globals.css                  # Tailwind styles & theme variables
│   │   ├── layout.tsx                   # Root HTML layout with Google fonts & metadata
│   │   └── page.tsx                     # Route 1: Landing & Host Portal
│   ├── components/                      # Modular React components
│   │   ├── ComposerModal.tsx            # Floating mobile composer (Photo & Note tabs)
│   │   ├── NoteCard.tsx                 # Vibe note card with pinned badges & likes
│   │   ├── PhotoCard.tsx                # Feed photo card with frame borders & like gestures
│   │   ├── PollCard.tsx                 # Live poll card with animated progress bars
│   │   ├── StoryStrip.tsx               # Chain story avatar reel
│   │   ├── ThemeWrapper.tsx             # Dynamic CSS variable injector for the 4 themes
│   │   └── VibeCardModal.tsx            # 1080x1920 Story & Polaroid PNG exporter modal
│   ├── lib/                             # Core utilities and business logic
│   │   ├── api.ts                       # Centralized client for all 16 backend endpoints
│   │   ├── mock-data.ts                 # In-memory seed store & fallback mock engine
│   │   ├── supabase.ts                  # Supabase client, Google Auth & Realtime channels
│   │   ├── themes.ts                    # The 4 CSS theme configurations & helpers
│   │   ├── upload/
│   │   │   └── compress.ts              # Browser image compression (< 2 MB target)
│   │   └── vibecard.ts                  # HTML5 Canvas generator for Story & Polaroid PNGs
│   ├── public/
│   │   └── assets/                      # Stitch design screen assets & festival photography
│   ├── types/
│   │   └── vibewall.ts                  # Shared DTO interfaces conforming to Alvi's backend
│   ├── .env.example                     # Documented environment variable template
│   ├── .env.local                       # Local development environment configuration
│   ├── .gitignore                       # Next.js & workspace git ignore rules
│   ├── next.config.mjs                  # Next.js image domain configuration
│   ├── package.json                     # Node dependencies & build scripts
│   ├── postcss.config.mjs               # PostCSS configuration
│   ├── tailwind.config.ts               # Tailwind CSS design system tokens
│   ├── tsconfig.json                    # TypeScript strict compiler configuration
│   └── PROJECT_CONTEXT.md               # Primary memory & autonomous agent handoff system
├── stitch_vibewall/                     # Google Stitch UI/UX design source of truth (READ-ONLY)
│   ├── landing_host_portal/             # Landing page Stitch design
│   ├── qr_entry_auth_gate/              # QR Entry Stitch design
│   ├── vibewall_live_social_wall/       # Social Wall Stitch design
│   ├── chain_story_viewer/              # Chain Story Stitch design
│   ├── host_dashboard_moderation/       # Host Admin Stitch design
│   └── midnight_neon/DESIGN.md          # Official Design System specifications
```

---

## 3. Design Implementation & Stitch Alignment

All six application routes are translated directly from the Stitch designs in `./stitch_vibewall/`:

| Route | Purpose | Stitch Design Reference | Implemented Component |
|---|---|---|---|
| `/` | Landing & Host Portal | `stitch_vibewall/landing_host_portal/code.html` | `app/page.tsx` |
| `/r/[code]` | QR Entry & Auth Gate | `stitch_vibewall/qr_entry_auth_gate/code.html` | `app/r/[code]/page.tsx` |
| `/r/[code]/wall` | Live Social Wall | `stitch_vibewall/vibewall_live_social_wall/code.html` | `app/r/[code]/wall/page.tsx` |
| `/r/[code]/story/[storyId]` | Chain Story Viewer | `stitch_vibewall/chain_story_viewer/code.html` | `app/r/[code]/story/[storyId]/page.tsx` |
| `/host/[code]` | Host Admin Dashboard | `stitch_vibewall/host_dashboard_moderation/code.html` | `app/host/[code]/page.tsx` |
| `/screen/[token]` | Venue Display (16:9) | `stitch_vibewall (1)/code.html` & Section 4.6 | `app/screen/[token]/page.tsx` |

### Four-Theme Implementation
The CSS variable system dynamically changes the entire visual tone on all routes:
1. **Midnight Neon**: `#09090B` background, `#18181B` card, `#8B5CF6` electric violet accent, `#FAFAFA` text.
2. **Minimal Paper**: `#F8FAFC` background, `#FFFFFF` card, `#2563EB` cobalt accent, `#0F172A` text.
3. **Campus Sunset**: `#1C1017` background, `#2A1822` card, `#F97316` amber/sunset accent, `#FFF1F2` text.
4. **Emerald Fest**: `#041410` background, `#0A241E` card, `#10B981` emerald pulse accent, `#ECFDF5` text.

---

## 4. Application Architecture

- **Next.js App Router (v15)**: Client components handle reactive state, gesture navigation, and optimistic UI updates.
- **Unified API Client (`lib/api.ts`)**: Implements strict typing for all 16 backend endpoints. When `NEXT_PUBLIC_USE_MOCK=true` or Supabase/Cloudinary keys are unset, it falls back seamlessly to `lib/mock-data.ts`, enabling fully functional offline/mock development.
- **Supabase Realtime (`lib/supabase.ts`)**: Subscribes to broadcast channels `room:{room_id}` for 5 core events: `new_post`, `new_note`, `content_moderated`, `poll_updated`, and `theme_updated`. When running in mock mode, it broadcasts via browser custom events so multiple tabs/windows synchronize instantly.
- **Image Compression Pipeline (`lib/upload/compress.ts`)**: Compresses user photos client-side to target < 2 MB before requesting Cloudinary signatures.

---

## 5. Feature Implementation Tracker

| Feature | Status | Primary Files | Testing Status |
|---|---|---|---|
| Landing & Host Portal | IMPLEMENTED | `app/page.tsx` | VERIFIED |
| Create Room Modal | IMPLEMENTED | `app/page.tsx`, `lib/api.ts` | VERIFIED |
| QR Entry & Room Verification | IMPLEMENTED | `app/r/[code]/page.tsx` | VERIFIED |
| Guest Entry & Google Auth Gate | IMPLEMENTED | `app/r/[code]/page.tsx`, `lib/auth.ts`, `lib/supabase.ts` | VERIFIED |
| Live Social Wall | IMPLEMENTED | `app/r/[code]/wall/page.tsx` | VERIFIED |
| Host Dashboard Realtime Sync | IMPLEMENTED | `app/host/[code]/page.tsx` | VERIFIED |
| Mock API Error Contract | IMPLEMENTED | `app/api/[...path]/route.ts` | VERIFIED |
| Live Wall Interactive Auth Guards | IMPLEMENTED | `app/r/[code]/wall/page.tsx` | VERIFIED |
| Shared Auth Required Modal | IMPLEMENTED | `components/auth/AuthRequiredModal.tsx` | VERIFIED |
| Chain Story Upload Routing | IMPLEMENTED | `app/r/[code]/wall/page.tsx`, `components/ComposerModal.tsx` | VERIFIED |
| Offline Icons (Lucide) | IMPLEMENTED | `components/icons.tsx` (new), 13 app/component files, `app/layout.tsx`, `app/globals.css` | VERIFIED |
| Poll State Reset & Realtime Sync | IMPLEMENTED | `components/PollCard.tsx`, `app/r/[code]/wall/page.tsx` | VERIFIED |
| Optimistic Like Rollback | IMPLEMENTED | `components/PhotoCard.tsx`, `components/NoteCard.tsx`, `app/r/[code]/wall/page.tsx` | VERIFIED |
| Auth Mode Unification | IMPLEMENTED | `lib/config.ts` (new), `lib/supabase.ts`, `lib/api.ts` | VERIFIED |
| Mock Session Sign-Out & Refresh | IMPLEMENTED | `lib/supabase.ts`, `tests/e2e-ui-test.mjs` | VERIFIED |
| Authenticated Google Identity in Composer | IMPLEMENTED | `components/ComposerModal.tsx`, `app/r/[code]/wall/page.tsx`, `app/r/[code]/story/[storyId]/page.tsx`, `lib/mock-data.ts`, `lib/api.ts` | VERIFIED |
| Photo Feed & Frames | IMPLEMENTED | `components/PhotoCard.tsx` | VERIFIED |
| Vibe Notes & Pinning | IMPLEMENTED | `components/NoteCard.tsx` | VERIFIED |
| Interactive Polls | IMPLEMENTED | `components/PollCard.tsx` | VERIFIED |
| Chain Story Strip | IMPLEMENTED | `components/StoryStrip.tsx` | VERIFIED |
| Chain Story Viewer | IMPLEMENTED | `app/r/[code]/story/[storyId]/page.tsx` | VERIFIED |
| Floating Mobile Composer | IMPLEMENTED | `components/ComposerModal.tsx` | VERIFIED |
| VibeCard PNG Exporter | IMPLEMENTED | `lib/vibecard.ts`, `components/VibeCardModal.tsx` | VERIFIED |
| Host Admin Dashboard | IMPLEMENTED | `app/host/[code]/page.tsx` | VERIFIED |
| Venue Display (16:9 Fullscreen) | IMPLEMENTED | `app/screen/[token]/page.tsx` | VERIFIED |
| 4-Theme Dynamic Switcher | IMPLEMENTED | `lib/themes.ts`, `components/ThemeWrapper.tsx` | VERIFIED |
| Supabase Realtime Sync | IMPLEMENTED | `lib/supabase.ts` | VERIFIED |
| Direct Cloudinary Upload Sign | IMPLEMENTED | `lib/api.ts` | VERIFIED |
| Rate Limits & Cooldowns | IMPLEMENTED | `components/ComposerModal.tsx`, `app/r/[code]/wall/page.tsx` | VERIFIED |

---

## 6. Backend Integration Documentation

Reference backend branch: `origin/alvi/backend` by Md. Arifur Rahman Alvi.  
Alvi's backend implements 16 REST endpoints using PostgreSQL connection pool and Supabase Auth identity verification:

1. `POST /api/rooms` — Body: `{ title, theme, expires_in_hours }` -> Returns `{ room, qr_url, screen_url }`
2. `GET /api/rooms/[code]` — Returns `{ room, is_owner, is_member }`
3. `POST /api/rooms/[code]/join` — Returns `{ joined: true, room }`
4. `PATCH /api/rooms/[code]` — Body: `{ theme?, status?, rotate_screen_token? }` -> Returns `{ room, screen_url? }`
5. `GET /api/rooms/[code]/feed` — Supports query `?include_hidden=true` -> Returns `{ posts, pinned_notes, notes, active_poll, active_story }`
6. `GET /api/screen/[token]` — Returns `{ room, posts, pinned_notes, notes, active_poll }`
7. `POST /api/rooms/[code]/posts` — Body: `{ image_url, cloudinary_public_id, frame_id }` -> Returns `{ post }`
8. `POST /api/rooms/[code]/notes` — Body: `{ body }` -> Returns `{ note }`
9. `POST /api/rooms/[code]/stories` — Body: `{ prompt }` -> Returns `{ story }`
10. `POST /api/stories/[id]/entries` — Body: `{ image_url, cloudinary_public_id }` -> Returns `{ entry }`
11. `POST /api/rooms/[code]/polls` — Body: `{ question, options: string[] }` -> Returns `{ poll }`
12. `POST /api/polls/[id]/vote` — Body: `{ option_id }` -> Returns `{ poll }`
13. `POST /api/likes/toggle` — Body: `{ target_type, target_id }` -> Returns `{ liked, like_count }`
14. `POST /api/reports` — Body: `{ target_type, target_id }` -> Returns `{ reported, auto_hidden }`
15. `POST /api/moderation` — Body: `{ room_id, target_type, target_id, action }` -> Returns `{ success, action }`
16. `POST /api/cloudinary/sign` — Body: `{ folder: 'vibewall' }` -> Returns `{ signature, timestamp, cloud_name, api_key }` with header `X-VibeWall-Upload-Params`

---

## 7. Supabase Realtime Documentation

- Channel pattern: `room:{room_id}`
- Broadcast Events:
  - `new_post`: `{ post: PostDTO }`
  - `new_note`: `{ note: NoteDTO }`
  - `content_moderated`: `{ target_type, target_id, action }`
  - `poll_updated`: `{ poll: PollDTO }`
  - `theme_updated`: `{ theme: ThemeKey }`
- Performance target: Synchronization updates within 2 seconds.
- Subscribed surfaces (Section 16): Live Wall, Venue Display (`/screen/[token]`), and Host Dashboard (`/host/[code]`).

---

## 8. Technical Decisions & Reasoning

1. **Self-Contained Mock & Real Hybrid Architecture**:
   - `lib/api.ts` checks `NEXT_PUBLIC_USE_MOCK` or missing Supabase keys.
   - When keys are missing or offline, it routes to `lib/mock-data.ts`, allowing instant local preview, testing, and deployment verification without requiring active credentials.
   - When real keys are configured in `.env.local`, it executes genuine network calls against the backend routes.
2. **Offline-Safe Icons (Section 18)**:
   - All icons replaced with `lucide-react` components via the shared `components/icons.tsx` (`Icon`); Material Symbols names from the original design are mapped to the closest Lucide components (e.g., `progress_activity` → `LoaderCircle`, `sensors` → `RadioTower`, `favorite` → `Heart`).
   - Removed the external Google Material Symbols stylesheet from `app/layout.tsx` and the `.material-symbols-outlined` CSS rules from `app/globals.css`.
   - All 72+ Material Symbols usages across 13 app/component files were replaced (72 spans + dynamic expressions + host dashboard tab icons).
3. **HTML5 Canvas VibeCard Exporter**:
   - Zero-dependency canvas rendering with support for both 1080×1920 9:16 Story and Polaroid formats, complete with dynamic QR codes generated via `qrcode`.

---

## 9. Dependencies & Environment

Key Packages:
- `next`: `^15.5.29`
- `react`, `react-dom`: `^19.0.0`
- `tailwindcss`: `^3.4.17`
- `@supabase/supabase-js`: `^2.47.10`
- `qrcode`: `^1.5.4`
- `browser-image-compression`: `^2.0.2`
- `canvas-confetti`: `^1.9.3`

Environment Variables (in `.env.local`):
```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_PRESET=vibewall_signed
SCREEN_TOKEN_PEPPER=
APP_ORIGIN=http://localhost:3000
REPORT_AUTO_HIDE_THRESHOLD=3
PHOTO_COOLDOWN_SECONDS=20
NOTE_COOLDOWN_SECONDS=15
NEXT_PUBLIC_USE_MOCK=true
```

Commands:
- `npm run dev`: Starts local development server on port 3000
- `npm run build`: Compiles production build
- `npx tsc --noEmit`: Verifies TypeScript types

---

## 10. Testing & Verification History

- **TypeScript Typecheck (`npx tsc --noEmit`):** PASSED (0 errors).
- **Production Build (`npm run build`):** PASSED (`Compiled successfully in 5.6s`).
- **Live Production Server Daemon:** Running on `http://localhost:3000`.
- **Automated E2E Playwright UI/UX Test Suite (`code/tests/e2e-ui-test.mjs`):**
  - **Latest Run:** 46
    - **Passed:** 46 (100% Success Rate)
    - **Failed:** 0
  - **Routes & Capabilities Tested:**
    1. **Route 1 (`/`):** Hero branding, active room list, create room modal with theme & duration selection, room launch redirect, quick code join navigation.
    2. **Route 2 (`/r/VIBE26`):** Room code verification, status badge, guest identity, 1-tap entry navigation to wall.
    3. **Route 3 (`/r/VIBE26/wall`):** Live event header, room code copy, interactive poll card, duplicate vote prevention, story strip, pinned notes, photo card frame rendering, like counter toggle, HTML5 Canvas VibeCard exporter modal, floating composer (note creation & instant feed broadcast).
    4. **Route 4 (`/r/VIBE26/story/story-fest-1`):** 9:16 full-screen immersive stage, segmented progress bars, author telemetry, add photo CTA, tap navigation, return to wall.
    5. **Route 5 (`/host/VIBE26`):** Live attendee telemetry, moderation filter tabs (Active vs Hidden), live theme switching (Minimal Paper activated), engagement management (polls & stories), high-res room QR code generator.
    6. **Route 6 (`/screen/screen_token_vibe26_live`):** 1080p landscape layout, photo carousel spotlight, venue QR invitation box, pinned announcement spotlight, active poll progress bars, security check (zero administrative controls leaked on venue screen).
    7. **Mobile Responsiveness (390px Viewport):** iPhone 14/15 viewport verified with zero horizontal overflow (`scrollWidth === clientWidth`) and bottom navigation safe area clearance.
  - **Captured UI Screenshots:** Stored in `code/tests/screenshots/` (12 high-resolution screenshots covering desktop, 1080p, and mobile).

---

## 12. Current Development State

- Status: All 6 routes, 4 themes, photo upload pipeline, HTML5 canvas VibeCard exporter, real-time sync (Live Wall, Venue Display, Host Dashboard), mock fallback engine, and the Guest-entry authentication flow are built, verified, and running on `http://localhost:3000`.
- Active server daemon: Next.js dev server running on port 3000.
- All application source files are in `code/`. Stitch design files in `stitch_vibewall/` are untouched.
- Mock API error contract (Section 17) verified — mock-mode error responses include `error.code` + `error.message`.
- Poll state reset, optimistic vote rollback, and like-state synchronization (Section 20) implemented and verified — new polls no longer inherit stale voted state; failed vote/like requests roll back optimistically; photo/note like state derives from authoritative feed props with parent-managed optimistic overrides.
- Auth mode unification and mock/real session-state fixes (Section 21) implemented and verified — shared `isMockMode()`/`isSupabaseConfigured()` config, explicit mock precedence, no fake identities when unconfigured, mock sign-out + refresh persistence.
- Authenticated Google identity in composer (Section 22) implemented and verified — custom author inputs removed; composer displays session-derived identity ("Posting as …") with avatar + verified badge; mock creators derive author from mock session.

---

## 13. NEXT AGENT: START HERE

1. Read this file (`code/PROJECT_CONTEXT.md`) first.
2. The frontend implementation inside `./code/` is complete, typechecked, and built.
3. If connecting to a live Supabase project and Cloudinary account:
   - Provide real credentials in `code/.env.local`
   - Set `NEXT_PUBLIC_USE_MOCK=false`
   - Verify that Google OAuth callback URL in Supabase points to the app origin.
4. All application code must remain strictly inside `./code/`. Do not modify `./stitch_vibewall/`.

---

## 14. Authentication & Guest Access (Playbook v2.1 §1.1, F-01; Route 2: `/r/[code]`)

Guests can browse a room's preview without signing in; Google authentication is mandatory before any interactive or write operation. No protected API request is made while unauthenticated.

### 14.1 Shared Auth State

- `lib/supabase.ts` — `getAuthState(): { user, isAuthenticated }` (existing `getCurrentUser`/`signInWithGoogle` unchanged):
  - Real mode (Supabase configured): `supabase.auth.getUser()` → authenticated when a user session exists.
  - Mock mode: a persisted `vibewell_mock_user` in localStorage → authenticated; no session → guest.
- `lib/auth.ts` — `useAuth()` hook returns `{ user, isAuthenticated, isReady }`. `isReady` separates "session loading" from "unauthenticated" so guest-only controls are not shown while the session is restored.

### 14.2 Room Entry (`app/r/[code]/page.tsx`)

- Guests see the normal room preview (status badge, title, expiry).
- Primary CTA: **"Continue with Google to Enter"** — calls `signInWithGoogle()`, preserving the room code and destination via `redirectTo = window.location.href`.
- Secondary CTA: **"Preview as Read-Only Guest"** — keeps visitors on the entry page without calling `api.joinRoom(code)`.
- Guest notice: "Viewing as a guest — sign in with Google to like, vote, and share moments on the live wall."
- Authenticated visitors see the normal identity bar (avatar + Google-verified name) and the normal **"Enter Live Social Wall"** CTA.
- After auth confirmation the room is joined automatically (`api.joinRoom`) and the visitor navigates to `/r/[code]/wall`. Duplicate joins are prevented by `joinInProgressRef` + `hasJoinedRef`.
- Errors: expired/failed joins show a message on the entry page (after re-checking the session via `getAuthState()`).

### 14.3 Live Wall Guards (`app/r/[code]/wall/page.tsx`)

All interactive actions are wrapped in a shared `guardAction(action)`:

| Feature | Unauthenticated behavior |
|---|---|
| View room + feed | Allowed (read-only) |
| Like a post / note | AuthRequiredModal opens |
| Vote in a poll | AuthRequiredModal opens |
| Open photo composer ("Post Photo" / "Write Note") | AuthRequiredModal opens |
| Publish a photo | AuthRequiredModal opens |
| Post a Vibe Note | AuthRequiredModal opens |
| Add photo to Chain Story (StoryStrip) | AuthRequiredModal opens |
| Contribute to a Chain Story (`app/r/[code]/story/[storyId]/page.tsx`) | AuthRequiredModal opens |

`guardAction` returns `false` when the visitor is unauthenticated so no protected request reaches the API; the cards revert their optimistic UI on `false` (see `components/PhotoCard.tsx`, `components/NoteCard.tsx`, `components/PollCard.tsx`). Authenticated users proceed with the existing actions unchanged.

### 14.4 Shared Auth Prompt Modal

- `components/auth/AuthRequiredModal.tsx` — the single shared prompt (title "Sign in to Join the Vibe", description, "Continue with Google" primary, "Continue Browsing as Guest" secondary).
  - Primary invokes `signInWithGoogle(window.location.href)`; on success it re-checks `getAuthState()` and resumes the pending action via `onAuthenticated` (returns false to stay open).
  - Backdrop click, close button, and Escape dismiss the modal. Focus management, a simple focus trap, and ARIA roles (`dialog`, `aria-modal`, labels) are implemented.
  - Loading state while signing in; error state for cancelled/failed OAuth; duplicate OAuth prevented via `isSigningIn`.

### 14.5 OAuth Redirect & Return

`signInWithGoogle(redirectTo)` (existing) sends `redirectTo` to Supabase; after the Google redirect the user returns to the same page (`/r/[code]` or `/r/[code]/wall`), `useAuth` loads the session, and:
- On `/r/[code]` the room is auto-joined and the visitor is pushed to `/r/[code]/wall`.
- On `/r/[code]/wall` the modal resumes the originally requested action; otherwise the user retries manually.
- In mock mode, `signInWithGoogle` persists the mock user to localStorage and the same guards resume immediately.

### 14.6 Files Modified (Auth Fix)

- `app/r/[code]/page.tsx` — guest/auth entry flows (Section 14.2).
- `app/r/[code]/wall/page.tsx` — `guardAction` + protected handlers (Section 14.3).
- `app/r/[code]/story/[storyId]/page.tsx` — story contribution guard.
- `components/auth/AuthRequiredModal.tsx` — new shared prompt modal.
- `components/ComposerModal.tsx`, `components/PollCard.tsx`, `components/PhotoCard.tsx`, `components/NoteCard.tsx` — return/revert on auth guard result.
- `lib/supabase.ts` — new `getAuthState()`.
- `lib/auth.ts` — new `useAuth()` hook.
- `tests/e2e-ui-test.mjs` — guest entry, guest like/poll modal, authenticated flows; stale `SCREENSHOTS_DIR` fixed.
- `PROJECT_CONTEXT.md` — this section + Testing History updates.

---

## 15. Testing & Verification History (Authentication Fix)

All commands were executed inside `./code/`:

- `npx tsc --noEmit` → PASSED (exit 0, 0 errors).
- `npm run build` → PASSED (Next.js 15.5.29, "Compiled successfully", all routes built).
- `npm run lint` → `next lint` is interactive: the repo has no ESLint config, so running it non-interactively prints the "How would you like to configure ESLint?" prompt and cannot lint. Reported as a limitation; not silently skipped.
- E2E suite `tests/e2e-ui-test.mjs` (Playwright + headless Chromium, mock mode, `http://localhost:3000`): **TOTAL: 40, PASSED: 40, FAILED: 0, SUCCESS RATE: 100%** — new assertions: "Guest Can See Google Sign-In CTA", "Guest Can See Preview as Read-Only CTA", "Guest Preview Stays on Entry Page", "Google Sign-In Enters the Live Wall", "Guest Like Click Shows Auth Modal", "Like Works After Google Sign-In", "Poll Vote While Authenticated Skips Auth Modal", plus the pre-existing 35 UI smoke tests.
- Browser console during e2e: no errors/warnings from the changed pages (the app compiled cleanly; the 404 seen in debug scripts was a pre-existing missing public asset).

Remaining issues / dependencies:
- Live Supabase Google OAuth must point back to the app origin (`APP_ORIGIN` in `.env.local`) — the redirect-return flows in Section 14.5 depend on it.
- The existing e2e poll assertions rely on mock seed data (`user_voted_option_id`); the guest poll-modal assertion runs when the option is enabled.
- Pre-existing uncommitted files (`ParaNiaChill_Project_Charter_A4.html`, `stitch_vibewall/`) were left untouched and are not part of this change.

---

## 16. Host Dashboard Realtime Synchronization (Playbook v2.1 §6.3 — Realtime; Day 5)

The Host Dashboard (`app/host/[code]/page.tsx`) now subscribes to room realtime using the existing `subscribeToRoom` infrastructure — no second subscription system.

### 16.1 Subscription Lifecycle

```ts
useEffect(() => {
  if (!room?.id) return;                       // subscribe only after room loads
  const unsubscribe = subscribeToRoom(room.id, {
    onNewPost, onNewNote, onContentModerated, onPollUpdated, onThemeUpdated
  });
  return () => unsubscribe();                  // cleanup on unmount / room change
}, [room?.id]);
```

- Subscribes only after `room.id` is available; effect cleanup unsubscribes on unmount or room change.
- The `[room?.id]` dependency + cleanup prevents duplicate subscriptions and handlers (React Strict Mode double-invokes effects in dev — the second run re-subscribes after cleanup, so no duplicates).

### 16.2 Event Handling & State Synchronization

| Event | Behavior (actual payloads per Section 7) |
|---|---|
| `new_post` | `{ post: PostDTO }` — prepends the photo to `feed.posts` (beginning of moderation queue) |
| `new_note` | `{ note: NoteDTO }` — prepends to `feed.pinned_notes` (if `note.is_pinned`) or `feed.notes` |
| `content_moderated` | `{ target_type, target_id, action }` — applies `action`: posts → `visibility` (`hide`/`restore`), notes → `moderation_status` (`hide`/`restore`), `pin`/`unpin` → `is_pinned`, `delete` → removes the item |
| `poll_updated` | `{ poll: PollDTO }` — replaces `feed.active_poll` (vote counts via `total_votes`/`options[].vote_count`; mirrors the live wall) |
| `theme_updated` | `{ theme: ThemeKey }` — updates `room.theme` (Active Theme indicator) |

- All handlers use functional `setFeed`/`setRoom` updates from the latest state — newer local state is never overwritten by stale events.
- Dedupe: `new_post`/`new_note` skip items whose id already exists in `feed.posts` / `feed.pinned_notes` / `feed.notes` (no double-count of items loaded via the initial `api.getFeed(roomCode, true)` request).
- Counters ("Live Feed Items", "Active Poll Votes", "Active Theme") update automatically from state; "Restore" (approve) also sets `moderation_status` back to `approved`.

### 16.3 Testing — Host Dashboard Realtime

Script: `verify-host-realtime.mjs` (Playwright, against the local dev server, mock mode).
Mock-mode limitation: custom window events don't cross pages, so guest actions are dispatched via the existing `vibewall_realtime_event` contract (the same shape `broadcastLocalEvent` produces); a two-browser-session run in real mode subscribes identically via Supabase.

Results (run against `http://localhost:3000`): **TOTAL: 12 — PASSED: 12 — FAILED: 0** — new post appears without reload (6→7), duplicate `new_post` doesn't double-count, pinned note appears, hidden/restored post updates immediately, poll votes update (`got=42`), theme indicator updates (`got=Minimal Paper`), no page/console errors (only the pre-existing 404 for the missing public asset `/assets/group_of_diverse_university_students_laughing_and_posing_together_with_neon.png`).

### 16.4 Files Modified (Realtime Fix)

- `app/host/[code]/page.tsx` — subscription effect + `applyNewPost` / `applyNewNote` / `applyModeration` state-sync helpers.
- `PROJECT_CONTEXT.md` — Section 16 + tracker row "Host Dashboard Realtime Sync".

Remaining issues: none new; see previous sections for known items.

---

## 17. Mock API Error Response Contract (Playbook v2.1 §8)

**Target:** `app/api/[...path]/route.ts` — the Next.js App Router mock API route used when `NEXT_PUBLIC_USE_MOCK=true`.

### 17.1 Root Cause

Every mock-mode error response was `{ error: { message } }` without the required `error.code`, while `lib/api.ts` parses `err.code = errorJson?.error?.code || "REQUEST_FAILED"` — the contract was inconsistent with the real backend and consumers.

### 17.2 Real Backend Conventions (`origin/alvi/backend`, inspected; not modified)

- `fail(status, message, code = "VALIDATION_ERROR")` — default code is `VALIDATION_ERROR`.
- Used codes: `UNAUTHORIZED` (401, "Sign in with Google"), `FORBIDDEN` (403, "Room access required"), `RATE_LIMITED` (429, "Action limit reached"), `ROOM_CLOSED` (409, "Room is closed"), `INTERNAL_ERROR` (catch-all, "Service unavailable").
- Response shape: `Response.json({ error: { code, message } })`.

### 17.3 Error-Code Mapping (mock route)

| Mock failure | Status | `error.code` | Notes |
|---|---|---|---|
| `GET /api/rooms/[code]` — room not found | 404 | `VALIDATION_ERROR` | Backend parity: `fail(404, "Room not found")` (default code) |
| `POST /api/rooms/[code]/join` — room not found | 404 | `VALIDATION_ERROR` | Backend parity |
| `PATCH /api/rooms/[code]` — room not found | 404 | `VALIDATION_ERROR` | Backend parity |
| `GET /api/screen/[token]` — invalid token | 404 | `VALIDATION_ERROR` | Message kept: "Invalid screen token" |
| Unknown route | 404 | `VALIDATION_ERROR` | Backend parity: `fail(404, "Unknown API route")` |
| Uncaught error | 500 | `INTERNAL_ERROR` | Backend parity |

Note: the five Playbook codes (`RATE_LIMITED`, `UNAUTHORIZED`, `FORBIDDEN`, `ROOM_CLOSED`, `VALIDATION_ERROR`) are supported; the mock route does not itself have rate-limit/permission/closed-room paths (the real backend has `fail(401, "Sign in with Google", "UNAUTHORIZED")`, `fail(403, "Room access required", "FORBIDDEN")`, `fail(429, "Action limit reached", "RATE_LIMITED")`, `fail(409, "Room is closed", "ROOM_CLOSED")`) — codes are assigned from the actual failure condition, not generically.

### 17.4 Implementation

- `app/api/[...path]/route.ts` — new `errorResponse(status, code, message)` helper; all error returns now `{ error: { code, message } }`; catch-all returns `code: "INTERNAL_ERROR"`; HTTP statuses and messages preserved.
- `lib/api.ts` — no changes needed; `err.code` is already parsed from `errorJson?.error?.code`.

### 17.5 Testing

Script: `verify-mock-api-errors.mjs` (fetch-based, against the local dev server, mock mode).
Results (run against `http://localhost:3000`): **TOTAL: 21 — PASSED: 21 — FAILED: 0** — every error case returns the expected status and `error.code`/`error.message`; success responses (`GET /api/rooms/VIBE26`, `GET /api/rooms/VIBE26/feed`) unchanged (200).

Known behavior: `GET /api/screen/bad-token` returns 200 because `mockDB.getRoomByToken` (lib/mock-data.ts) has a pre-existing fallback returning the default room for demo screens — the 404 path of the route returns `VALIDATION_ERROR`/"Invalid screen token" and is verified by code inspection.

### 17.6 Files Modified

- `app/api/[...path]/route.ts`
- `PROJECT_CONTEXT.md` — Section 17 + tracker row "Mock API Error Contract"

Remaining issues: none.

---

## 18. Offline-Safe Icons — Material Symbols → Lucide (Playbook v2.1 §8, Technical Decision #2)

**Target:** Replace the external Google Material Symbols CDN dependency with bundled offline icons from `lucide-react` (already in `package.json`).

### 18.1 Root Cause
`app/layout.tsx` loaded `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:...` and rendered icons as `<span className="material-symbols-outlined">icon_name</span>`. At festivals with slow/no internet, icons failed to render.

### 18.2 Implementation

- **New shared component** `components/icons.tsx` — exports `Icon({ name, size, className, filled })`:
  - `ICON_MAP` maps Material Symbols names → closest Lucide components (`progress_activity` → `LoaderCircle`, `sensors` → `RadioTower`, `favorite` → `Heart`, `visibility` → `Eye`, `send` → `Send`, `check_circle` → `CheckCircle2`, `radio_button_unchecked` → `Circle`, etc.).
  - Uses `import * as lucide from "lucide-react"` and `size` prop (equivalent of Material `text-[Npx]`), `filled` prop (equivalent of the Material `.fill` variant — adds `fill-current`).
  - Total: 38 Material Symbols names + 4 host dashboard tab icons + dynamic expression children (e.g., `{copiedToast ? "check" : "content_copy"}`, `{reported ? "flag" : "more_vert"}`, PollCard's `{isSelected ? "check_circle" : "radio_button_unchecked"}`).
- **72+ span replacements** across 13 files: `app/page.tsx`, `app/r/[code]/page.tsx`, `app/r/[code]/wall/page.tsx`, `app/r/[code]/story/[storyId]/page.tsx`, `app/host/[code]/page.tsx`, `app/screen/[token]/page.tsx`, `components/{PhotoCard,NoteCard,PollCard,ComposerModal,StoryStrip,VibeCardModal,auth/AuthRequiredModal}.tsx`.
- **Removed** from `app/layout.tsx`: the Material Symbols `<link rel="stylesheet">` (plus the two `preconnect` links that served it).
- **Removed** from `app/globals.css`: the `.material-symbols-outlined` / `.material-symbols-outlined.fill` CSS rules.
- Visual parity preserved: sizes (e.g., `text-[15px]` → `size={15}`), colors, `animate-spin`/`animate-ping`, `fill` variants, and Stitch design system untouched. Text fonts (Inter, Plus Jakarta Sans) remain as-is — they are typography, not icons.

### 18.3 Offline Verification

Script: `verify-icons.mjs` (Playwright, against `http://localhost:3000`).
Results: **lucide SVGs render on all routes (wall: 36, entry: 7)**; **zero requests to any `Material+Symbols` URL**; **no `Material+Symbols` CSS in the document**; only the pre-existing 404 for the missing public asset `/assets/group_of_diverse_university_students_laughing_and_posing_together_with_neon.png` in console.

### 18.4 Files Modified

- `components/icons.tsx` (new), 13 app/component files (icon replacements), `app/layout.tsx`, `app/globals.css`, `PROJECT_CONTEXT.md` — Section 18 + tracker row "Offline Icons (Lucide)".

Remaining issues: none.

---

## 19. Chain Story Photo Upload Routing Fix (Target: `app/r/[code]/wall/page.tsx`)

**Root cause:** Clicking **Add Photo** in `StoryStrip` opened the wall's `ComposerModal` in standard photo mode; submission called `api.createPost(roomCode, ...)`, creating a feed post instead of a Chain Story entry.

### 19.1 Implemented behavior

- `StoryStrip.onAddEntry` → wall `guardAction(() => { if (!feed.active_story) return; setComposerMode("story-entry"); setStoryEntryId(feed.active_story.id); setComposerDefaultTab("photo"); setIsComposerOpen(true); })`.
- `ComposerModal` gets new props: `mode: "standard" | "story-entry"` (type `ComposerMode`) + `storyId?: string`; `onSubmitPhoto` now receives `{ file, authorName, mode, frameId?, storyId? }`.
- **Story-entry mode:**
  - Frame selector hidden (standard mode unchanged).
  - Submit calls `api.addStoryEntry(storyId, { image_url, cloudinary_public_id, author_name })` — never `api.createPost()`.
  - Standard Add Photo triggers (bottom-bar buttons, ComposerModal tab) still use `api.createPost()` with `frame_id`.
  - Submit button shows "Add to Chain Story"; upload shows "Adding entry...".
  - If the story ID is unavailable at submit → error message shown; no API request is sent.
- Wall `handleSubmitPhoto` branches on `data.mode === "story-entry"` → `api.addStoryEntry` → `setFeed(prev => ({ ...prev, active_story: { ...story, entries: [...entries, res.entry] } }))` (same state-update conventions as the realtime handlers).
- State resets on composer close (`resetComposer`) and `ComposerModal`'s close-effect resets `selectedFile`/`previewResult`/`selectedFrame`/`photoAuthor`, so no frame or file leaks between modes.
- Auth guards unchanged: story uploads are behind `guardAction` (Section 14).

### 19.2 Testing

E2E suite `tests/e2e-ui-test.mjs` — new Suite 3 assertions (all executed, results recorded below):
- StoryStrip → "Add Photo" → composer opens with "Add to Chain Story" (`Story Add Photo Opens Composer`).
- Frame selector hidden in story-entry mode (`Story Entry Mode Hides Frame Selector`).
- Upload via `page.setInputFiles` → `Story Upload Adds Entry To Chain Story (before=3 after=4)` (mock store check).
- Story upload does not post to the feed (`Story Upload Does Not Post To Feed`).
- Standard mode: frame selector visible after file upload, standard upload still posts to feed (`Standard Mode Shows Frame Selector`, `Standard Add Photo Still Posts To Feed (before=4 after=5)`).
- Suite 4 waits updated for the story viewer (`Story Author Header Telemetry`, `Multi-segment Progress Bars (3 segments)`, `Add Photo to Story CTA Visible`).

### 19.3 Files Modified

- `app/r/[code]/wall/page.tsx` — composer mode state, `handleSubmitPhoto` story branch, StoryStrip `onAddEntry`, ComposerModal render props, `resetComposer`.
- `components/ComposerModal.tsx` — `ComposerMode` type + props, story-entry submit branch, frame-selector hiding, submit labels, close-reset effect.
- `tests/e2e-ui-test.mjs` — new story upload tests + robust waits (all passing).
- `PROJECT_CONTEXT.md` — Sections 18 + 19 + tracker rows.

Remaining issues: none.

---

## 20. Poll State Reset, Optimistic Rollback, & Realtime Like Synchronization (Playbook v2.1 §3.2, §3.3; F-03)

**Task:** Fix three related frontend state-management bugs: new polls incorrectly inheriting the previous poll's voted state, failed vote/like requests leaving incorrect optimistic UI, and photo/note like states becoming stale after Realtime updates.

### 20.1 Poll State Reset & New-Poll Lockout (Fixed)

**Root cause:** `PollCard` kept `selectedOptionId` in local state initialized from `poll.user_voted_option_id`; when a Realtime event replaced the active poll, the component could retain the previous poll's selection and treat the new poll as already voted.

**Fix (two safeguards):**
1. `app/r/[code]/wall/page.tsx`: `<PollCard key={feed.active_poll.id} ... />` forces remount on poll identity change.
2. `components/PollCard.tsx`: `useEffect` syncs `selectedOptionId` from `poll.user_voted_option_id` when `poll.id` / `poll.user_voted_option_id` change.

**Expected behavior:** A newly launched poll starts with its own voted state; a vote on an old poll never locks voting on a new poll; same-poll realtime updates keep valid selections.

### 20.2 Optimistic Vote Rollback (Fixed)

- Wall `handlePollVote` wraps the vote in `pollInFlightRef` in-flight dedupe, calls `api.votePoll`, reconciles feed with the authoritative `res.poll`, and on error (incl. 401 session re-check) surfaces feedback via the new wall action notice and returns `false`.
- `guardAction` now propagates the action's boolean outcome (previously always returned `true` after the guarded action ran), so `false` signals rollback to the card.
- `PollCard.handleVote` reverts the optimistic selection when `onVote` returns `false` or throws.

### 20.3 Like-State Ownership & Optimistic Rollback (Fixed)

**Root cause:** `PhotoCard`/`NoteCard` kept `isLiked`/`likeCount` in local state that could desync from the feed after Realtime updates or failed toggles.

**Fix (parent-owned state):**
- Wall (`app/r/[code]/wall/page.tsx`): added `optimisticLikes` map (`{ liked, count }` per content id), `likeInFlightRef` dedupe, `getLikeBase` (authoritative state from feed props), and shared `runLikeAction(targetType, targetId)` performing optimistic toggle → `api.toggleLike` → reconcile with `res.liked`/`res.like_count` → rollback + `showActionNotice` on failure. `handlePostLike`/`handleNoteLike` route through `guardAction` + `runLikeAction`.
- Cards: accept `optimisticLike?: { liked, count } | null` prop and derive display from it (falling back to post/note props) — no local like state.

### 20.4 Files Modified

- `components/PollCard.tsx` — poll identity/voted-state sync effect, optimistic rollback on failure.
- `app/r/[code]/wall/page.tsx` — poll in-flight guard, vote error handling, like optimistic map/rollback, action notice UI, `key` on PollCard, like props wiring.
- `components/PhotoCard.tsx` — derive like state from props + `optimisticLike`.
- `components/NoteCard.tsx` — derive like state from props + `optimisticLike`.
- `PROJECT_CONTEXT.md` — Section 20 + tracker rows.

Remaining issues: none.

---

## 21. Auth Mode Unification & Mock/Real Session-State Fixes (Playbook v2.1 §1.1, §8)

**Task:** Unify mock and Supabase authentication modes and fix session-state bugs.

### 21.1 Shared Mock-Mode Detection Helper (Fixed)

- New `lib/config.ts` — single source of truth:
  - `isMockMode(): boolean` → `process.env.NEXT_PUBLIC_USE_MOCK === "true"` (explicit mock overrides real credentials).
  - `isSupabaseConfigured(): boolean` → valid, non-empty, non-placeholder Supabase URL + anon key.
  - `getAuthMode(): "mock" | "supabase" | "unconfigured"` → mock > supabase > unconfigured precedence.
  - `isDemoHostEnabled()` / `getDemoHostUser()` → explicit demo-host opt-in only.
- `lib/supabase.ts` and `lib/api.ts` both consume the shared helpers (no raw env comparisons in feature modules).

### 21.2 Mock vs. Real Supabase Behavior (Fixed)

- Mock mode (`NEXT_PUBLIC_USE_MOCK=true`): `signInWithGoogle` uses the mock user flow; API calls use `mockDB`; UI uses mock auth state.
- Real mode (mock off + valid credentials): real Google OAuth via Supabase; real sessions; API attaches Supabase access token (`getAuthHeader` gates on real mode).
- Unconfigured (mock off + missing/placeholder credentials): no fake authenticated user; safe guest behavior.

### 21.3 Stale Mock User / Sign-Out Fixes (Fixed)

- `getCurrentUser` / `getAuthState` resolve via `getAuthMode()`: mock → stored mock user (or explicit demo host) / null; supabase → Supabase session; unconfigured → null.
- Removed automatic hardcoded `"guest-host-user"` fallback from normal session restoration (explicit opt-in only via `NEXT_PUBLIC_VIBEWALL_DEMO_HOST`).
- `signOut` clears mock user and, in real mode, signs out of Supabase.

### 21.4 Files Modified

- `lib/config.ts` (new), `lib/supabase.ts`, `lib/api.ts`, `.env.example`, `.env.local` (demo-host opt-in), `tests/e2e-ui-test.mjs`, `PROJECT_CONTEXT.md`.

### 21.5 Testing

E2E additions (`tests/e2e-ui-test.mjs`, Suite 2 auth regression):
- Mock Signed-In State Shows Sign Out, Mock Sign-Out Clears Mock User, Mock Sign-Out Returns to Signed-Out State, Mock Sign-Out Persists After Refresh, Mock State Cleared After Refresh.

### 21.6 Validation

- `npx tsc --noEmit` → PASSED (0 errors).
- `npm run build` → PASSED (`Compiled successfully`).
- E2E suite → **TOTAL: 51 — PASSED: 51 — FAILED: 0 — SUCCESS RATE: 100%**.

Remaining issues: none.

---

## 22. Authenticated Google Identity in Composer (Playbook v2.1 §1.4, §2 — F-06)

**Task:** Remove manual author inputs and display the authenticated Google identity in the composer.

### 22.1 Implemented behavior

- `components/ComposerModal.tsx`:
  - Removed `photoAuthor` / `noteAuthor` local state, inputs, resets, and submit-payload author fields.
  - Added `useAuth()`-derived identity: `authorName` (from `user.user_metadata.full_name`), `authorAvatar` (from `user.user_metadata.avatar_url`), initials fallback.
  - Composer header renders compact identity section: avatar (or initials fallback), **"Posting as [Full Name]"**, verified badge — only when authenticated with a display name.
- `app/r/[code]/wall/page.tsx`:
  - `handleSubmitPhoto` / `handleSubmitNote` no longer accept author names from the composer; they pass the authenticated identity (`auth.user.user_metadata`) into `api.createPost` / `api.addStoryEntry` / `api.createNote`.
- `app/r/[code]/story/[storyId]/page.tsx`:
  - Story entry submit now derives author from the authenticated session instead of hardcoded `"FestSquad"`.
- `lib/mock-data.ts`:
  - Added `resolveMockAuthor()` (mock-session localStorage user); removed fabricated defaults (`"VibeGuest"`, `"VibeParticipant"`) from mock post/note/story-entry creation.

### 22.2 Files Modified

- `components/ComposerModal.tsx`, `app/r/[code]/wall/page.tsx`, `app/r/[code]/story/[storyId]/page.tsx`, `lib/mock-data.ts`, `lib/api.ts`, `tests/e2e-ui-test.mjs`, `PROJECT_CONTEXT.md`.

### 22.3 Testing

E2E: `Composer Shows Authenticated Identity` added and passing; full suite → **TOTAL: 52 — PASSED: 52 — FAILED: 0 — SUCCESS RATE: 100%**.

### 22.4 Validation

- `npx tsc --noEmit` → PASSED (0 errors).
- `npm run build` → PASSED (`Compiled successfully`).

Remaining issues: none.

---

## 23. Issue #24 — Home Navigation, Demo Room Dependency and API Error Handling (P0)

### 23.1 Summary

Landing page previously hardcoded a fake `VIBE26` room card ("Dynamic University Fest 2026", "LIVE • 124 Guests", "Central Auditorium, SEU") linking to `/r/VIBE26`, `/host/VIBE26`, and `/screen/screen_token_vibe26_live`. Invalid room codes silently rendered empty fake shells. Mock screen-token lookup fell back to the demo room. Host dashboard rendered fake "Room Status: Open" for missing rooms and never verified `is_owner`. Venue screen looped forever on invalid tokens.

### 23.2 Implementation

- `app/page.tsx`: replaced hardcoded room card with a real `api.getActiveRooms()`-driven grid, plus loading skeleton, network/error state with Retry, and empty state ("No Active Rooms Right Now"). `Create the First Room` CTA.
- `app/api/[...path]/route.ts`: added `GET /api/rooms` listing endpoint; feed endpoint now 404s for missing rooms; room preview returns `screen_token`/`screen_url`; screen endpoint rejects unknown tokens (no fallback).
- `lib/mock-data.ts`: added `getActiveRooms()`, `clearRooms()`, `resetStore()`; removed `VIBE26` fallback in `getRoomByToken()`; `getFeed()` now throws 404 for missing rooms.
- `lib/api.ts`: network-error handling (status 0, code `NETWORK_ERROR`, `isNetwork`), consistent HTTP error codes (UNAUTHORIZED/FORBIDDEN/NOT_FOUND/SERVER_ERROR); `getActiveRooms()`; mock fallbacks preserve server error semantics (no silent collapse into 404); `getRoomPreview`/`getFeed`/`getScreenData` return structured errors.
- `components/ErrorState.tsx`: reusable 401/403/404/500/network error UI with Retry and Sign-In actions.
- `app/r/[code]/page.tsx`, `app/r/[code]/wall/page.tsx`, `app/r/[code]/story/[storyId]/page.tsx`, `app/host/[code]/page.tsx`, `app/screen/[token]/page.tsx`: wired `ErrorState` with structured status/code/isNetwork, loading states, retry; host page enforces `is_owner` (403 otherwise) and resolves `screen_url` from the room's real screen token (no hardcoded demo token).
- `types/vibewall.ts`: added `screen_token?` and `screen_url?` to `RoomDTO` and `RoomPreviewResponse`.

### 23.3 Tests

- `tests/regression-navigation-errors.mjs`: 18 assertions covering valid room, missing room (404), 401, 403, 500, offline/network, empty landing, host 403, screen 404 — all passing.
- Existing `tests/e2e-ui-test.mjs`: still **52/52 PASS**.

### 23.4 Validation

- `npx tsc --noEmit` → PASSED (0 errors).
- `npm run build` → PASSED (`Compiled successfully`).
- `node tests/regression-navigation-errors.mjs` → 18/18 PASS.
- `node tests/e2e-ui-test.mjs` → 52/52 PASS.

Remaining issues: none for this issue.
