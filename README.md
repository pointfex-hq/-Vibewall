# VibeWall backend

This branch implements the 16 REST contracts in section 8 of the Team Hydrogen playbook v2.1. Shared frontend types are in `types/vibewall.ts`. The application uses Next.js Route Handlers and a server-only PostgreSQL connection. Keep the `wall` schema outside the Supabase Data API exposed schemas. Its tables have RLS enabled. The trusted backend database role needs access to these tables and runs authorization checks on every request.

## Configure a team development project

1. Copy `.env.example` to `.env.local`. Set the public Supabase URL and anon key, the server-only Supabase transaction pooler connection string (TLS enabled), a random screen token pepper of at least 32 bytes, and the canonical application origin.
2. Link the Supabase CLI to the development project and run `supabase db push`. The migration requires Supabase Auth and the Realtime Broadcast function `realtime.send`. A plain PostgreSQL server requires test substitutes for those two services.
3. Create a Google web OAuth client. Register the Supabase project's callback URL from its Google provider settings. Enable Google in Supabase Auth, set its client ID and secret, and configure the app's site URL and permitted redirect URLs. For the local Supabase stack, export the two Google variables referenced in `supabase/config.toml`. A verified Google identity is synchronized into the private user profile when it first calls the API.
4. Set the Cloudinary cloud name, API key and API secret. Create a signed image upload preset using legacy fixed-folder mode for the documented folder parameter, allow JPEG/PNG/WebP, and configure a 2 MiB upload limit where supported. The backend checks the stored asset format, byte count, uploader claim and delivery URL before accepting metadata.
5. Run `npm ci` and `npm run dev`. Use a Supabase Google access token in the Authorization Bearer header. Public room previews and screen reads can omit it. Subscribe to the Supabase Broadcast channel `room:{room_id}` for the five section 6.3 events. Realtime sends happen inside the mutation transaction. Poll broadcasts have a neutral viewer vote. The vote response and feed contain the requesting user's actual choice.

## Direct upload

Send the documented JSON body to `POST /api/cloudinary/sign`. The JSON response has the four fields in section 8. Parse the same-origin response header `X-VibeWall-Upload-Params` as JSON and append every entry to the Cloudinary upload form, alongside the file, signature and API key. The signed public ID binds the resulting asset to its uploader. The signed preset and overwrite flag apply the project restrictions. Submit the returned secure URL and full public ID through the post or story-entry endpoint.

## Verification

Run `npm run build`. For the integration test, set `VIBEWALL_TEST_DATABASE_URL` to a fresh, empty, disposable PostgreSQL database and run `npm test`. The suite creates its own Auth and Realtime substitutes and mocks Cloudinary network responses. Use a fresh database on each run. Real Google sign-in, cross-device Realtime delivery and the live Cloudinary upload/delete handshake require a configured development project.
---
