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
| Live Wall Interactive Auth Guards | IMPLEMENTED | `app/r/[code]/wall/page.tsx` | VERIFIED |
| Shared Auth Required Modal | IMPLEMENTED | `components/auth/AuthRequiredModal.tsx` | VERIFIED |
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

---

## 8. Technical Decisions & Reasoning

1. **Self-Contained Mock & Real Hybrid Architecture**:
   - `lib/api.ts` checks `NEXT_PUBLIC_USE_MOCK` or missing Supabase keys.
   - When keys are missing or offline, it routes to `lib/mock-data.ts`, allowing instant local preview, testing, and deployment verification without requiring active credentials.
   - When real keys are configured in `.env.local`, it executes genuine network calls against the backend routes.
2. **Offline-Safe Google Fonts**:
   - Loaded via `<link>` tags in `app/layout.tsx` with font fallbacks in `tailwind.config.ts` to allow `next build` to compile without network dependencies.
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
  - **Total Tests:** 36
  - **Passed:** 36 (100% Success Rate)
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

- Status: All 6 routes, 4 themes, photo upload pipeline, HTML5 canvas VibeCard exporter, real-time sync, and mock fallback engine are built, verified, and running on `http://localhost:3000`.
- Active server daemon: Next.js production server running on port 3000.
- All application source files are in `code/`. Stitch design files in `stitch_vibewall/` are untouched.

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
