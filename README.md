# Self-Healing

*A cutting mat is a base layer for healing. It takes the blade so the work can continue.*

Self-Healing is a small-batch, matte-black, self-healing cutting mat made in collaboration with Opepen edition artists and their collectors. This repository holds the website behind the project — the public journal, the collector dashboard, and the drop announcements.

Live at **[self-healing.art](https://self-healing.art)**.

---

## What's in the box

The site is a small React SPA that acts as both a public storefront and a private studio journal:

- **Public — landing.** A three-card stage (About, Progress, Gallery) rendered on a 32-px drafting grid. Cards can be dragged and resized like desktop windows.
- **Public — Story.** Long-form narrative about how the project started and why.
- **Public — Notify.** A one-field email capture for people who want a note when the next drop opens.
- **Private — Dashboard.** Collectors and collaborators sign in via email OTP, publish updates, chat, and manage a shared gallery. Everything they publish appears on the public Progress feed in real time.

---

## Features

- Grid-based, drag-and-resize card layout — every measurement snaps to the 32-px cell.
- Realtime Progress feed powered by Supabase Postgres change subscriptions.
- Email-OTP auth via Supabase, with an allow-list table (nine collaborators, currently).
- Live in-app chat between collaborators, with avatars, replies, and an emoji picker.
- CSS-only drafting-grid background with a fixed diagonal accent line.
- Masonry gallery with lazy-loaded, blur-up image reveals and a lightbox on click.
- Delete affordances on your own updates and messages; RLS-enforced ownership.
- Fully responsive: desktop uses a free-form draggable stage; tablet and mobile fall back to a flex-wrap flow with a hamburger drawer nav.
- Fonts self-hosted from `public/fonts/` (CMU Typewriter Text) plus Instrument Serif from Google Fonts.
- Custom intro overlay animation on first visit each session.

---

## Stack

- **Vite** + **React 18** + **TypeScript**
- **React Router v6** for routing
- **Tailwind CSS** for utility styling
- **GSAP** for the intro-overlay animation
- **Supabase** for auth, Postgres data, storage, and realtime subscriptions
- **Vercel** for deploy

---

## Project structure

```
src/
  pages/
    Home.tsx           Public landing (three-card stage)
    Story.tsx          Long-form narrative
    Notify.tsx         Public email capture
    Login.tsx          Email-OTP sign-in for collaborators
    Dashboard.tsx      Signed-in stage (adds Compose + Messaging cards)
    Chat.tsx           Standalone messaging route (kept for deep links)
    Settings.tsx       Profile / account / notifications
  components/
    SiteChrome.tsx     Full page shell — chrome, nav, logo, footer, grid
    StageCard.tsx      Draggable, resizable panel used across the stage
    StageCards.tsx     Card content: About, Progress, Gallery, Messaging, New Update
    IntroOverlay.tsx   One-shot intro animation
    PageTransition.tsx Cross-route fade
    Reveal.tsx         Intersection-observer fade-up wrapper
    FAQ.tsx            Accordion (currently unused, kept for future)
  utils/
    supabaseClient.ts  Shared Supabase client
    supabase.ts        Async wrappers: posts, messages, profiles, gallery,
                       prefs, signups
    auth.ts            Sign-in / sign-out helpers (email OTP)
    useAuth.ts         Reactive session hook
    useStageLayout.ts  Per-card position/size state with localStorage
    notifications.ts   Browser-notification listener
    reveal-gate.ts     Coordinates reveals during intro / page transitions
  styles/
    globals.css        Tailwind layers + fonts + background grid + base
  types/
    index.ts           Shared TypeScript interfaces
supabase/
  schema.sql           Database schema + RLS policies (see below)
public/
  fonts/               CMU Typewriter Text (all weights + italics)
  badges/              Created-by-hand + Built-on-Ethereum SVGs
  logo.svg             Wordmark
```

---

## Local development

```bash
npm install
cp .env.example .env.local          # then fill in your own Supabase values
npm run dev                          # http://localhost:5173
```

You will need a Supabase project of your own for local dev — see the setup section below.

Available scripts:

- `npm run dev` — Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — TypeScript strict-mode type-check (no output on success)

---

## Backend setup

The site runs on Supabase for auth, storage, and realtime. To point this project at a Supabase instance of your own:

1. **Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard).
2. **Run the schema.** SQL Editor → paste the contents of `supabase/schema.sql` → Run.
3. **Add allow-listed emails** to the `whitelist` table for anyone who should be able to sign in as a collaborator.
4. **Copy your project URL + `anon` public key** from Project Settings → API.
5. **Set env vars** by copying `.env.example` to `.env.local` and filling them in.

Read the top of `supabase/schema.sql` for a full walkthrough of what each table does and the RLS policies that guard it.

---

## Deploying

The project is set up to deploy to Vercel with zero configuration. A `vercel.json` at the repo root handles SPA rewrites so React Router works on refresh.

1. Push to GitHub.
2. Import the repo on [vercel.com](https://vercel.com).
3. Set the three `VITE_*` env vars under Project → Settings → Environment Variables.
4. Trigger a deploy.

---

## Kit (ConvertKit) integration for the notify list

The `/notify` form is optionally wired to Kit so signups flow into an email delivery tool alongside the Supabase record. Set two env vars and the site pushes each signup into a Kit form automatically:

```
VITE_KIT_FORM_ID=1234567
VITE_KIT_API_KEY=your_public_api_key_here
```

Where to find them:

- **Form ID.** Kit → Grow → Landing Pages & Forms → your form → the numeric id in the URL when you're editing it.
- **API key.** Kit → Settings → Advanced → API Keys → **API Key** (the *public* one). Do **not** use "API Secret" — that key grants admin access to your Kit account and is not safe in a browser bundle.

Behaviour with both set:

- Every notify signup gets inserted into Supabase (`public.signups`) AND subscribed to the Kit form.
- Kit is fire-and-forget — if the Kit request fails, the user still sees success and the row is still in Supabase.
- Supabase remains the source of truth. Kit is only for email delivery.

Behaviour with them unset:

- Signup still goes into Supabase.
- No Kit call is made (the helper is a no-op if the env vars are missing).

---

## Editable content (the built-in CMS)

Any block of copy on the public site can be made editable through the in-app **Content** card on the dashboard. There is no external CMS to run.

**Currently editable:**

- `home.about` — Home page About-card body
- `notify.intro` — Notify page description
- `story.opening` — Story page opening paragraph
- `story.section.how_it_started` … `story.section.what_comes_next` — the five Story chapters

**Adding a new editable block is a two-line change:**

1. **Register it** in `src/components/StageCards.tsx`, in the `EDITABLE_ENTRIES` array. Give it a `key`, a `label` for the dashboard dropdown, and a `defaultBody` HTML fallback.
2. **Render it** wherever it should appear on the site:

   ```tsx
   const [html, setHtml] = useState(HARDCODED_DEFAULT);
   useEffect(() => {
     let cancelled = false;
     (async () => {
       const row = await getContent("home.hero_subtitle");
       if (!cancelled && row?.body_html) setHtml(row.body_html);
     })();
     return () => { cancelled = true; };
   }, []);

   return <div className="cms-body" dangerouslySetInnerHTML={{ __html: html }} />;
   ```

The Content admin card in the dashboard picks up new entries automatically — no other wiring needed.

Full inline documentation is at the top of `EDITABLE_ENTRIES` in `StageCards.tsx`.

---

## Design system

The site is built on a 32-pixel cell. Everything — the background grid, the card sizes, the logo box, the chrome strips, the footer card, the badges — is a multiple of that unit.

- **Base color:** `#1a1a1a` charcoal
- **Text:** white at three opacities (`#ffffff`, `#ffffff70`, `#ffffff45`)
- **Lines:** `rgba(255, 255, 255, 0.15)` for borders, `0.10` for the grid
- **Type:** *Instrument Serif* for display, *CMU Typewriter Text* for everything else
- **Grid unit:** exposed as `--cell: 32px` in CSS

---

## License

Code in this repository is available for reference. If you want to reuse substantial parts of the design, layout, or brand voice — say hi first.

---

*Custom craft cutting mats. Made in collaboration with Opepen edition artists. A public art protocol on Ethereum.*
