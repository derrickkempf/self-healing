import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Reactive auth state.
 *
 *   const { session, loading } = useAuth();
 *
 *   loading === true  while we haven't yet asked Supabase for its cached
 *                     session on mount. AuthGuard uses this to avoid a
 *                     premature redirect to /login on a hard refresh.
 *   session !== null  if a Supabase user (or the dev fallback) is signed in.
 *
 * Subscribes to onAuthStateChange so sign-in, sign-out, and token refresh
 * all flow through here.
 */

export interface AppSession {
  email: string;
}

function supabaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}

function readDevSession(): AppSession | null {
  try {
    const raw = localStorage.getItem("sh.dev.session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth(): { session: AppSession | null; loading: boolean } {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    if (!supabaseConfigured()) {
      // Dev path — read from localStorage and listen for the custom event
      // our auth.ts dispatches on sign-in/sign-out.
      setSession(readDevSession());
      setLoading(false);
      const onAuth = () => setSession(readDevSession());
      window.addEventListener("sh:auth", onAuth as EventListener);
      return () => {
        cancelled = true;
        window.removeEventListener("sh:auth", onAuth as EventListener);
      };
    }

    // Real Supabase path. getSession is async (it may need to refresh).
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const email = data.session?.user.email ?? null;
      setSession(email ? { email } : null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        const email = s?.user.email ?? null;
        setSession(email ? { email } : null);
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
