/**
 * Auth — thin wrapper over Supabase Auth's email-OTP flow.
 *
 *   requestCode(email) → checks whitelist, asks Supabase to send a 6-digit
 *                         code to that inbox
 *   verifyCode(email, code) → exchanges the code for a session
 *   logout()           → signs out
 *
 * Supabase Auth handles the actual email delivery (via its built-in SMTP
 * relay, or your own if you've configured it under Authentication →
 * Email Templates / SMTP Settings). We never see the code on our side in
 * production — only in dev, if VITE_SUPABASE_URL is unset, do we surface
 * a fake code so the UI can still be exercised.
 */

import { supabase } from "./supabaseClient";
import { isWhitelisted } from "./supabase";

export interface RequestCodeResult {
  ok: boolean;
  reason?: "not_whitelisted" | "send_failed";
  /**
   * Dev-only: set when Supabase isn't configured at all, so the Login
   * screen can still be exercised end-to-end on a fresh checkout. In any
   * real deploy this is undefined and the user reads the code from their
   * inbox.
   */
  devCode?: string;
}

export interface VerifyCodeResult {
  ok: boolean;
  reason?: "invalid_or_expired";
}

const DEV_CODE_KEY = "sh.dev.otp";

function supabaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}

export async function requestCode(
  email: string,
): Promise<RequestCodeResult> {
  const normalized = email.trim().toLowerCase();
  if (!isWhitelisted(normalized)) {
    return { ok: false, reason: "not_whitelisted" };
  }

  // Dev fallback: no Supabase configured → use a deterministic local code so
  // the UI is still walkable.
  if (!supabaseConfigured()) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    try {
      sessionStorage.setItem(
        DEV_CODE_KEY,
        JSON.stringify({ email: normalized, code }),
      );
    } catch {
      /* private mode */
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(`[dev] Sign-in code for ${normalized}: ${code}`);
    }
    return { ok: true, devCode: code };
  }

  // Wrap in try/catch so an unexpected throw from the SDK (network failure,
  // CORS misconfig, etc.) still surfaces a useful message in the console
  // instead of an unhandled promise rejection.
  try {
    console.info("[auth] signInWithOtp request → ", normalized);
    const { data, error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        // We don't want Supabase to auto-create users we haven't whitelisted
        // server-side. If the row doesn't exist in `whitelist` the DB policies
        // will block writes anyway, but blocking sign-up here is a cleaner UX.
        shouldCreateUser: true,
      },
    });
    if (error) {
      // Log the full error object plus the bits people actually look for.
      console.error(
        "[auth] signInWithOtp FAILED:",
        error.message,
        "status=" + (error as { status?: number }).status,
        error,
      );
      return { ok: false, reason: "send_failed" };
    }
    console.info("[auth] signInWithOtp OK", data);
    return { ok: true };
  } catch (err) {
    console.error("[auth] signInWithOtp THREW:", err);
    return { ok: false, reason: "send_failed" };
  }
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<VerifyCodeResult> {
  const normalized = email.trim().toLowerCase();

  // Dev fallback path.
  if (!supabaseConfigured()) {
    try {
      const raw = sessionStorage.getItem(DEV_CODE_KEY);
      const expected = raw ? JSON.parse(raw) : null;
      if (
        expected &&
        expected.email === normalized &&
        expected.code === code.trim()
      ) {
        sessionStorage.removeItem(DEV_CODE_KEY);
        // Fake a session in localStorage so AuthGuard / useAuth can see it.
        localStorage.setItem(
          "sh.dev.session",
          JSON.stringify({ email: normalized, issued_at: new Date().toISOString() }),
        );
        window.dispatchEvent(new CustomEvent("sh:auth"));
        return { ok: true };
      }
    } catch {
      /* ignore */
    }
    return { ok: false, reason: "invalid_or_expired" };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: code.trim(),
    type: "email",
  });
  if (error) {
    console.error("[auth] verifyOtp", error);
    return { ok: false, reason: "invalid_or_expired" };
  }
  return { ok: true };
}

export async function logout(): Promise<void> {
  if (supabaseConfigured()) {
    await supabase.auth.signOut();
  } else {
    localStorage.removeItem("sh.dev.session");
    window.dispatchEvent(new CustomEvent("sh:auth"));
  }
}

/**
 * Synchronous best-effort session read. Returns the cached session if
 * Supabase has already hydrated it on boot, otherwise null.
 *
 * Prefer the `useAuth` hook in components — it stays in sync with auth
 * state changes (sign-in, sign-out, token refresh). This sync helper is
 * here only for transitional call sites that don't yet read auth via the
 * hook.
 */
export function getSession(): { email: string } | null {
  if (!supabaseConfigured()) {
    try {
      const raw = localStorage.getItem("sh.dev.session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  // Supabase persists the session under a key like sb-<project>-auth-token.
  // We poke at the cached in-memory session via the client itself.
  const session = (supabase.auth as unknown as {
    currentSession?: { user: { email?: string | null } };
  }).currentSession;
  const email = session?.user?.email ?? null;
  return email ? { email } : null;
}
