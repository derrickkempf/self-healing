import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single shared Supabase client.
 *
 * Reads the project URL + anon key from Vite env vars. Both are exposed to
 * the browser bundle (that's what the VITE_ prefix means) — the anon key is
 * designed to be public, since Row Level Security on the database side is
 * what actually controls access. Never put your service_role key in a
 * VITE_ variable.
 *
 * Local dev: copy `.env.example` to `.env.local` and fill both values.
 * Vercel:    Project Settings → Environment Variables.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Use harmless placeholders when env is missing so createClient doesn't
// throw `Invalid URL` at module load (which would blank-screen the whole
// app). The site will still render — the landing page is fully static,
// and the Login / Dashboard surfaces fall through to the dev-OTP path
// via `auth.ts`. We just log loudly so the misconfig is obvious in
// devtools.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Sign-in and data writes will fail until these are set. " +
      "In Vercel: Project → Settings → Environment Variables.",
  );
}

export const supabase: SupabaseClient = createClient(
  url || PLACEHOLDER_URL,
  anonKey || PLACEHOLDER_KEY,
  {
    auth: {
      // Persist the session in localStorage and refresh tokens automatically.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
