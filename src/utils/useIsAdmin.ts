import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./useAuth";

/**
 * useIsAdmin — returns whether the signed-in user is in `public.admins`.
 *
 * Server-side truth is the `is_admin()` RLS predicate — hiding the UI
 * here is just so non-admin collaborators don't see a Content card
 * they can't actually use. The database will still refuse the write
 * either way.
 *
 * Re-fetches whenever the auth session changes. Returns false while
 * the check is pending so admin-only UI stays hidden until confirmed.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (cancelled) return;
      if (error) {
        // If the RPC doesn't exist yet (migration not run) or fails,
        // default to false — safer than accidentally showing the CMS.
        console.warn("[useIsAdmin] rpc failed", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { isAdmin, loading };
}
