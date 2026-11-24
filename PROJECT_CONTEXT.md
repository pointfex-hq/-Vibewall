# VibeWall — Project Context & Engineering Architecture Living Memory

> **CONFIDENTIAL & PROPRIETARY — TEAM HYDROGEN, POINTFEX**  
> **Frontend Lead:** Jihadul Islam Jitu  
> **Backend Lead:** Md. Arifur Rahman Alvi  
> **UI/UX Lead:** Fatima Jannat Abonty  
> **Project Manager:** Ismail Hossen  

---

## 1. Project Overview

VibeWall is an interactive, no-login, QR-based live social wall engineered for university festivals, hackathons, concerts, and campus hangout venues. 

Participants scan a venue QR code from a mobile device to immediately join an active event room without creating a password-based account. Guests can:
- Post photos with customizable event frames (Classic, Neon Glow, Fest '26, Sunset) compressed automatically on-device to under 2 MB.
- Write Vibe Notes and live confessions (up to 280 characters).
- Participate in single-choice real-time interactive polls with live animated progress bars.
- Add moments to sequential Chain Stories.
- Export high-resolution 1080×1920 Story and Polaroid cards (VibeCards) containing author details, room QR, and frame branding via HTML5 Canvas.

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
| Live Social Wall | IMPLEMENTED | `app/r/[code]/wall/page.tsx` | VERIFIED |
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
