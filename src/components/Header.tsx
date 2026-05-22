import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { getSession } from "../utils/auth";
import { startNotificationListener } from "../utils/notifications";
import { getProfile } from "../utils/supabase";

interface Props {
  variant?: "public" | "private";
}

/**
 * Top header. `public` is used on the marketing landing page and login;
 * `private` shows the dashboard / chat / settings nav for signed-in users.
 */
export default function Header({ variant = "public" }: Props) {
  const session = getSession();

  // Mount the notification listener once per signed-in page load. It reads
  // the user's prefs on each tick, so toggling them in Settings takes effect
  // immediately without re-subscribing.
  useEffect(() => {
    if (variant !== "private" || !session?.email) return;
    return startNotificationListener(session.email);
  }, [variant, session?.email]);

  // Show the user's display name (from Profile settings) in the nav. Refresh
  // when the profile changes so saving in Settings is reflected immediately.
  const [profileLabel, setProfileLabel] = useState<string>(() => {
    if (!session?.email) return "";
    const p = getProfile(session.email);
    return p.display_name || session.email;
  });

  useEffect(() => {
    if (!session?.email) return;
    const sync = () => {
      const p = getProfile(session.email);
      setProfileLabel(p.display_name || session.email);
    };
    sync();
    window.addEventListener("sh:profile", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sh:profile", sync);
      window.removeEventListener("storage", sync);
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
          <nav className="flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-muted">
            <span>Opepen Cutting Mats</span>
          </nav>
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
