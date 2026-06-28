import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../utils/useAuth";
import { startNotificationListener } from "../utils/notifications";
import { getProfile, subscribe } from "../utils/supabase";

interface Props {
  variant?: "public" | "private";
}

/**
 * Top header. `public` is used on the marketing landing page and login;
 * `private` shows the dashboard / chat / settings nav for signed-in users.
 */
export default function Header({ variant = "public" }: Props) {
  const { session } = useAuth();

  // Mount the notification listener once per signed-in page load. It reads
  // the user's prefs on each tick, so toggling them in Settings takes effect
  // immediately without re-subscribing.
  useEffect(() => {
    if (variant !== "private" || !session?.email) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    startNotificationListener(session.email).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      cleanup = fn;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [variant, session?.email]);

  // Show the user's display name (from Profile settings) in the nav. Refresh
  // when the profile changes so saving in Settings is reflected immediately.
  const [profileLabel, setProfileLabel] = useState<string>("");

  useEffect(() => {
    if (!session?.email) {
      setProfileLabel("");
      return;
    }
    let cancelled = false;
    async function load() {
      const p = await getProfile(session!.email);
      if (!cancelled) setProfileLabel(p.display_name || session!.email);
    }
    load();
    const unsub = subscribe("profiles", load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [session?.email]);

  return (
    <header className="w-full">
      <div className="mx-auto max-w-5xl px-6 md:px-10 pt-8 pb-6 flex items-center justify-between">
        <Link
          to="/"
          className="block hover:opacity-80 transition"
          aria-label="Self-Healing"
        >
          <img
            src="/logo.svg"
            alt="Self-Healing"
            className="h-7 md:h-9 w-auto"
          />
        </Link>

        {variant === "public" ? (
          // Public variant has no nav — the landing/login pages use CornerNav
          // for a fixed-position logo instead. Kept here only as a no-op so
          // any old references don't break.
          <span />
        ) : (
          <nav className="flex items-center gap-5 text-[11px] uppercase tracking-[0.18em] text-muted">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? "text-white" : "hover:text-white transition"
              }
            >
              Feed
            </NavLink>
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                isActive ? "text-white" : "hover:text-white transition"
              }
            >
              Chat
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                isActive ? "text-white" : "hover:text-white transition"
              }
            >
              {profileLabel ? truncate(profileLabel) : "Settings"}
            </NavLink>
          </nav>
        )}
      </div>
      <div className="hairline" />
    </header>
  );
}

function truncate(s: string, n = 20) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
