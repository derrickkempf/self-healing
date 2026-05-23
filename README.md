# Self-Healing

A dual-purpose web app for tracking Self-Healing Mats production progress: a public landing page plus a private collaborator dashboard with feed, group chat, and settings.

## Stack

- Vite + React 18 + TypeScript
- React Router v6
- Tailwind CSS
- Instrument Serif (headlines) + Geist Mono (body/UI) via Google Fonts
- **Backend: Supabase** — Postgres + Auth (email OTP) + Realtime

## Quick start

```bash
npm install
cp .env.example .env.local       # then fill in your Supabase values
npm run dev                       # http://localhost:5173
```

Then visit `/` for the public landing page or `/login` to sign in. See "Setting up Supabase" below for first-time backend setup.

### Signing in

The login screen asks for your email, calls `supabase.auth.signInWithOtp`, and Supabase emails you a 6-digit code. Enter it on the next screen to start a session.

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset (e.g. a fresh checkout with no `.env.local`), the login flow falls back to a dev-only path that prints the code to the console and a "Dev mode" panel — useful for demoing the UI before Supabase is provisioned.

## Build

```bash
npm run build        # outputs to dist/
npm run preview      # serve the production build locally
```

## Project structure

```
src/
  pages/
    Home.tsx         public landing — hero, progress feed, gallery, CTA
    Login.tsx        email-OTP sign-in flow
    Dashboard.tsx    private feed + New Post modal
    Chat.tsx         private group chat
    Settings.tsx     profile, account, notifications, gallery
  components/
    CornerNav.tsx    corner-pinned landing-page nav
    Header.tsx       dashboard / chat / settings header
    AuthGuard.tsx    redirects unauthenticated users to /login
    IntroOverlay.tsx one-shot boot animation
    PostForm.tsx     modal: title / content / image upload
    PostFeed.tsx     newest-first list of posts
    ChatThread.tsx   message list + composer, auto-scroll
    FAQ.tsx          accordion
    Reveal.tsx       intersection-observer fade-up wrapper
  utils/
    supabaseClient.ts createClient(...) singleton
    supabase.ts       async wrappers: posts, messages, profiles, gallery, prefs
    auth.ts           signInWithOtp + verifyOtp wrappers, whitelist check
    useAuth.ts        React hook for reactive session state
    notifications.ts  browser-notification listener
    reveal-gate.ts    coordinates reveals during intro / page transitions
  styles/
    globals.css       Tailwind layers + base styling
  types/
    index.ts          shared TS interfaces
supabase/
  schema.sql          run this in the Supabase SQL editor
```

## Setting up Supabase

1. **Create a Supabase project** at https://supabase.com/dashboard.

2. **Run the schema.** Open Supabase Dashboard → SQL Editor → New Query → paste the entire contents of `supabase/schema.sql` → Run. This creates the `whitelist`, `posts`, `messages`, `profiles`, `gallery_images`, and `notification_prefs` tables, enables Row Level Security, and turns on Realtime for the relevant tables.

3. **Add yourself to the whitelist.** In the SQL editor, run:
   ```sql
   insert into public.whitelist (email) values ('you@example.com')
     on conflict (email) do nothing;
   ```
   The schema seeds `dk@derrickkempf.com` already — edit or add as needed.

4. **Copy the project URL + anon key** from Project Settings → API.

5. **Set local env vars** by copying `.env.example` to `.env.local` and filling in:
   ```
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhb...
   VITE_WHITELISTED_EMAILS=you@example.com,collab2@example.com
   ```
   (The client-side `VITE_WHITELISTED_EMAILS` is for fast "not authorized" UX. The server-side `whitelist` table is the actual gate via RLS.)

6. **Run `npm run dev`** and try signing in with your whitelisted email — you should receive a 6-digit code in your inbox within a few seconds.

### Email delivery

Supabase Auth uses its built-in SMTP relay by default, which is rate-limited and meant for development. For production volumes, configure your own SMTP in Authentication → Email Templates / SMTP Settings (SendGrid, Resend, AWS SES — any provider works).

The OTP email template lives in Authentication → Email Templates → Magic Link / OTP. The default copy is fine; tweak it to match the app's voice.

## Deploying to Vercel

```bash
# after pushing to GitHub:
vercel
# or click Import in the Vercel dashboard
```

A `vercel.json` is included that rewrites all paths to `index.html` so React Router's client-side routing works on refresh.

Set the same env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WHITELISTED_EMAILS`) in Vercel's project settings.

## Whitelist

Two layers:

1. **Client-side:** `VITE_WHITELISTED_EMAILS` (comma-separated) gates the UI so a non-allowed user gets an immediate "not authorized" message instead of an email they couldn't use anyway.
2. **Server-side (the real gate):** the `whitelist` table + `is_whitelisted()` Postgres function are referenced by Row Level Security policies on every writable table. To admit a new collaborator, insert their email into `whitelist`:
   ```sql
   insert into public.whitelist (email) values ('new@example.com');
   ```
   No app redeploy required.

## Notes & caveats

- Sessions are stored by `@supabase/supabase-js` in localStorage under `sb-<project>-auth-token` and auto-refresh.
- Images (post photos, avatars, gallery uploads) are still encoded as base64 data URLs and stored in TEXT columns. This is fine for the small volume this project sees; for larger libraries migrate to a Supabase Storage bucket and store public URLs instead.
- The notification listener in `utils/notifications.ts` is in-tab only — for true server-driven email digests, add a Supabase Edge Function that reads `notification_prefs` and fans out via your SMTP provider.
