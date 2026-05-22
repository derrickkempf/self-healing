# Self-Healing

A dual-purpose web app for tracking Self-Healing Mats production progress: a public landing page plus a private collaborator dashboard with feed, group chat, and settings.

## Stack

- Vite + React 18 + TypeScript
- React Router v6
- Tailwind CSS
- Instrument Serif (headlines) + Geist Mono (body/UI) via Google Fonts
- **Backend: mocked** (localStorage) — swap-in instructions below for real Supabase

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Then visit `/` for the public landing page or `/login` to sign in.

### Signing in (mocked backend)

Only `dk@derrickkempf.com` is whitelisted by default (set in `.env.example`). When you submit your email on `/login`, a 6-digit code is generated and printed to the browser console — it also appears under the code-entry form in a "Dev mode" panel so you don't need to dig through devtools. In production this code is sent by email and never displayed in the UI.

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
    Login.tsx        3-step email-code flow (Account → code → verify)
    Dashboard.tsx    private feed + New Post modal
    Chat.tsx         private group chat
    Settings.tsx     email display + logout
  components/
    Header.tsx       site header (public/private variants)
    AuthGuard.tsx    redirects unauthenticated users to /login
    PostForm.tsx     modal: title / content / image upload
    PostFeed.tsx     newest-first list of posts
    ChatThread.tsx   message list + composer, auto-scroll
  utils/
    supabase.ts      MOCKED backend (see below)
    auth.ts          requestCode / verifyCode / logout / getSession
  styles/
    globals.css      Tailwind layers + base styling, code cells, scrollbar
  types/
    index.ts         User, Post, Message, AuthCode, Session
```

## Mocked backend

`src/utils/supabase.ts` implements just enough of a Supabase-like surface to power the app entirely client-side:

- `users`, `auth_codes`, `posts`, `messages` rows live in `localStorage`
- `subscribe(channel, cb)` listens to `storage` events (cross-tab) and same-tab `CustomEvent`s, so chat and the feed update in real time across browser tabs
- Image uploads in `PostForm` are read as base64 data URLs and stored alongside the post

This is enough to demo and develop against. To make it actually multi-user across devices, swap in real Supabase.

## Swapping in real Supabase

When you're ready to go to production:

1. **Create the Supabase project** and run the SQL in `supabase/schema.sql` (included).
2. **Install the client:**
   ```bash
   npm install @supabase/supabase-js
   ```
3. **Set env vars in `.env.local`:**
   ```
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   VITE_WHITELISTED_EMAILS=dk@derrickkempf.com,collab2@...,collab3@...
   ```
4. **Replace `src/utils/supabase.ts`** with a real client. The function names exported by the mock (`listPosts`, `createPost`, `listMessages`, `sendMessage`, `subscribe`, `issueAuthCode`, `verifyAuthCode`, `upsertUser`, `getSession`, `setSession`, `clearSession`, `isWhitelisted`) are intentionally shaped to map 1:1 onto Supabase calls — see `supabase/IMPLEMENTATION_NOTES.md` for the exact mapping.
5. **Send the auth code by email** via either a Supabase Edge Function or SendGrid. Today the code is generated client-side; in production move that generation server-side so it can't be inspected from the browser.
6. **Create a Supabase Storage bucket** named `post-images` (public read), and update `PostForm.tsx` to upload the file there instead of reading it as a base64 data URL.

## Deploying to Vercel

```bash
# from the repo root, after pushing to GitHub:
vercel
# or click Import in the Vercel dashboard
```

A `vercel.json` is included that rewrites all paths to `index.html` so React Router's client-side routing works on refresh.

Set the same env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WHITELISTED_EMAILS`) in Vercel's project settings.

## Whitelist

The whitelist comes from `VITE_WHITELISTED_EMAILS` (comma-separated) and falls back to `dk@derrickkempf.com` if unset. Add the other 8 emails when you have them — no code changes needed.

## Notes & caveats

- Sessions are stored in `localStorage` under `sh.session`. Clearing site data signs you out.
- The mocked backend can only sync between tabs of the same browser on the same device — that's a limitation of `localStorage`, not a bug. Real multi-user behavior requires real Supabase.
- Image uploads in mocked mode count against your localStorage quota (~5 MB total in most browsers). The `PostForm` caps individual uploads at 4 MB.
