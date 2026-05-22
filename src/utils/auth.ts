/**
 * Auth helpers. Wraps the (currently mocked) supabase.ts surface to provide
 * a clean three-step flow:
 *
 *   requestCode(email)  → checks whitelist, issues 6-digit code
 *   verifyCode(email, code) → returns { ok: true } and sets session, or { ok: false, reason }
 *   logout()            → clears session
 *
 * In dev (mocked backend) the issued code is printed to the console AND shown
 * via the returned object so the UI can surface it during testing.
 */

import {
  clearSession,
  getSession as getRawSession,
  isWhitelisted,
  issueAuthCode,
  setSession,
  upsertUser,
  verifyAuthCode,
} from "./supabase";

export interface RequestCodeResult {
  ok: boolean;
  reason?: "not_whitelisted";
  /**
   * The 6-digit code. ONLY returned in dev (mocked) builds — in production
   * this would be undefined because the code is sent by email.
   */
  devCode?: string;
}

export function requestCode(email: string): RequestCodeResult {
  const normalized = email.trim().toLowerCase();
  if (!isWhitelisted(normalized)) {
    return { ok: false, reason: "not_whitelisted" };
  }
  upsertUser(normalized);
  const row = issueAuthCode(normalized);
  // In a real deployment this is where you'd call your SendGrid /
  // Supabase Edge Function to email the code. In dev we surface it.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[dev] Sign-in code for ${normalized}: ${row.code}`);
  }
  return { ok: true, devCode: row.code };
}

export interface VerifyCodeResult {
  ok: boolean;
  reason?: "invalid_or_expired";
}

export function verifyCode(email: string, code: string): VerifyCodeResult {
  const normalized = email.trim().toLowerCase();
  const ok = verifyAuthCode(normalized, code);
  if (!ok) return { ok: false, reason: "invalid_or_expired" };
  setSession(normalized);
  return { ok: true };
}

export function logout(): void {
  clearSession();
}

export function getSession() {
  return getRawSession();
}

export function isAuthenticated(): boolean {
  return getRawSession() !== null;
}
