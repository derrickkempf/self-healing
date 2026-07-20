/**
 * Supabase-backed data layer for posts, messages, profiles, gallery, and
 * notification preferences.
 *
 * All functions return Promises. Realtime updates are delivered through
 * Postgres change subscriptions on the shared `supabase` client.
 *
 * Auth (sign-in, sign-out, current session) lives in `./auth.ts` and uses
 * Supabase Auth's built-in email OTP flow.
 */

import type {
  GalleryImage,
  Message,
  NotificationPrefs,
  Post,
  Profile,
} from "../types";
import { supabase } from "./supabaseClient";

// ---------- env / whitelist (client-side UX gate) ----------
//
// The DB also enforces the whitelist via the `is_whitelisted()` policy
// predicate. This client list is just to give the user a fast "you're not
// authorized" message before we ask Supabase to email them a code they
// could never use.

const FALLBACK_WHITELIST = ["dk@derrickkempf.com"];

export function getWhitelist(): string[] {
  const raw =
    (import.meta.env.VITE_WHITELISTED_EMAILS as string | undefined) ?? "";
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : FALLBACK_WHITELIST;
}

export function isWhitelisted(email: string): boolean {
  return getWhitelist().includes(email.trim().toLowerCase());
}

/**
 * Turn a Supabase Postgres error into a message a human can act on.
 * Special-cases the most common failure modes we've seen — RLS,
 * auth, and network — so the UI can show "signed out" vs "not
 * authorized" vs "database schema not applied" instead of a generic
 * "check your connection".
 */
function formatSupabaseError(error: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const code = error.code ?? "";
  const msg = error.message ?? "";
  // RLS policy violation — most common: is_whitelisted() returning false.
  if (code === "42501" || /row-level security/i.test(msg)) {
    return "Blocked by database policy. Your account isn't on the whitelist, or the SECURITY DEFINER fix hasn't been run in Supabase yet.";
  }
  // Table doesn't exist — schema.sql wasn't run.
  if (code === "42P01" || /does not exist/i.test(msg)) {
    return "Database table missing. Run supabase/schema.sql in the Supabase SQL editor.";
  }
  // Not signed in.
  if (/JWT|token|invalid api key/i.test(msg)) {
    return "You're signed out or the API key is wrong. Sign in again.";
  }
  if (msg) return msg;
  return "Unknown Supabase error. Check the browser console for details.";
}

// ---------- posts ----------

export async function listPosts(limit?: number): Promise<Post[]> {
  const q = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } = limit ? await q.limit(limit) : await q;
  if (error) {
    console.error("[supabase] listPosts", error);
    return [];
  }
  return (data ?? []) as Post[];
}

// ---------- site_content (headless CMS) ----------

export interface ContentRow {
  key: string;
  title: string | null;
  body_html: string;
  order_index: number;
  updated_at: string;
}

/** Fetch a single content row by key. Returns null if the key hasn't
 *  been created yet — caller should fall back to a hardcoded default. */
export async function getContent(key: string): Promise<ContentRow | null> {
  const { data, error } = await supabase
    .from("site_content")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("[supabase] getContent", key, error);
    return null;
  }
  return (data as ContentRow | null) ?? null;
}

/** List all content rows whose key starts with the given prefix — used
 *  by the Story page to load every `story.*` row in one round-trip. */
export async function listContent(prefix: string): Promise<ContentRow[]> {
  const { data, error } = await supabase
    .from("site_content")
    .select("*")
    .like("key", `${prefix}%`)
    .order("order_index", { ascending: true });
  if (error) {
    console.error("[supabase] listContent", prefix, error);
    return [];
  }
  return (data ?? []) as ContentRow[];
}

/** Upsert a content row. Uses onConflict on `key` so the same helper
 *  handles both creation and editing. Returns { ok, error }. */
export async function saveContent(
  key: string,
  patch: {
    title?: string | null;
    body_html?: string;
    order_index?: number;
  },
): Promise<{ ok: boolean; error: string | null }> {
  const row = {
    key,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("site_content")
    .upsert(row, { onConflict: "key" });
  if (error) {
    console.error("[supabase] saveContent FAILED", error);
    return { ok: false, error: formatSupabaseError(error) };
  }
  return { ok: true, error: null };
}

// ---------- signups (public notify list) ----------
//
// Anyone can submit an email to the notify list — no auth required.
// The RLS policy allows anonymous INSERT into public.signups with no
// SELECT / UPDATE / DELETE from the client. The list is read only via
// the SQL editor by the founder.
//
// When VITE_KIT_FORM_ID and VITE_KIT_API_KEY are set, the same email
// is ALSO subscribed to a Kit (ConvertKit) form so it flows into the
// email delivery tool. Supabase remains the source of truth.

/**
 * Fire the Kit form-subscribe endpoint. Best-effort — a Kit failure
 * is logged but never blocks the user's signup. No-op if the Kit env
 * vars aren't configured, so local dev works without a Kit account.
 *
 * The `api_key` used here is Kit's PUBLIC form key — safe in the
 * browser bundle by design. Never put the `api_secret` in a VITE_*
 * variable; that one grants admin access to your whole Kit account.
 */
async function submitToKit(email: string): Promise<void> {
  const formId = import.meta.env.VITE_KIT_FORM_ID as string | undefined;
  const apiKey = import.meta.env.VITE_KIT_API_KEY as string | undefined;
  if (!formId || !apiKey) return;
  try {
    const r = await fetch(
      `https://api.kit.com/v3/forms/${formId}/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, email }),
      },
    );
    if (!r.ok) {
      const body = await r.text();
      console.warn("[kit] subscribe failed", r.status, body);
    }
  } catch (err) {
    console.warn("[kit] subscribe threw", err);
  }
}

export async function submitSignup(
  email: string,
): Promise<{ ok: boolean; error: string | null }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  // Fire both writes in parallel. Supabase is authoritative; Kit is
  // fire-and-forget for delivery. Promise.allSettled means a Kit
  // outage (or unconfigured Kit env) never blocks a successful
  // Supabase insert.
  const [supaResult] = await Promise.allSettled([
    supabase.from("signups").insert({ email: normalized }),
    submitToKit(normalized),
  ]);

  if (supaResult.status === "rejected") {
    console.error("[supabase] submitSignup network error", supaResult.reason);
    return {
      ok: false,
      error: "Something went wrong. Check your connection and try again.",
    };
  }

  const { error } = supaResult.value;
  if (error) {
    // 23505 = duplicate key (already on list). Treat as success — no
    // reason to make the user re-submit or feel like they "failed".
    if (error.code === "23505") {
      return { ok: true, error: null };
    }
    console.error(
      "[supabase] submitSignup FAILED",
      { code: error.code, message: error.message, details: error.details },
      error,
    );
    return { ok: false, error: formatSupabaseError(error) };
  }
  return { ok: true, error: null };
}

export async function deletePost(
  id: string,
): Promise<{ deleted: boolean; error: string | null }> {
  // IMPORTANT: `.select()` after `.delete()` so PostgREST returns the
  // deleted rows. If the RLS `delete` policy filters out the row (i.e.
  // the client isn't the author, or the delete policy isn't installed
  // yet), Supabase silently returns success with `data = []`. Without
  // this check the UI would think the delete worked while nothing
  // actually happened server-side.
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .select();
  if (error) {
    console.error(
      "[supabase] deletePost FAILED",
      { code: error.code, message: error.message, details: error.details, hint: error.hint },
      error,
    );
    return { deleted: false, error: formatSupabaseError(error) };
  }
  const deleted = Array.isArray(data) && data.length > 0;
  if (!deleted) {
    return {
      deleted: false,
      error:
        "Nothing was deleted. Either you're not the author of this update, or the delete RLS policy hasn't been applied in Supabase yet.",
    };
  }
  return { deleted: true, error: null };
}

export async function createPost(input: {
  title: string;
  content: string;
  image_url: string | null;
  author_email: string;
}): Promise<{ post: Post | null; error: string | null }> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: input.title,
      content: input.content,
      image_url: input.image_url,
      author_email: input.author_email,
    })
    .select()
    .single();
  if (error) {
    // Log everything we can see about the failure — code, message, details,
    // hint, and the raw object — so the browser console shows the actual
    // RLS/auth cause instead of a generic "Couldn't save the post".
    console.error(
      "[supabase] createPost FAILED",
      { code: error.code, message: error.message, details: error.details, hint: error.hint },
      error,
    );
    return { post: null, error: formatSupabaseError(error) };
  }
  return { post: data as Post, error: null };
}

// ---------- messages ----------

export async function listMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[supabase] listMessages", error);
    return [];
  }
  return (data ?? []) as Message[];
}

export async function deleteMessage(
  id: string,
): Promise<{ deleted: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .delete()
    .eq("id", id)
    .select();
  if (error) {
    console.error(
      "[supabase] deleteMessage FAILED",
      { code: error.code, message: error.message, details: error.details, hint: error.hint },
      error,
    );
    return { deleted: false, error: formatSupabaseError(error) };
  }
  const deleted = Array.isArray(data) && data.length > 0;
  if (!deleted) {
    return {
      deleted: false,
      error:
        "Nothing was deleted. Either this isn't your message, or the delete RLS policy hasn't been applied in Supabase yet.",
    };
  }
  return { deleted: true, error: null };
}

export async function sendMessage(
  sender_email: string,
  content: string,
): Promise<{ message: Message | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_email, content })
    .select()
    .single();
  if (error) {
    console.error(
      "[supabase] sendMessage FAILED",
      { code: error.code, message: error.message, details: error.details, hint: error.hint },
      error,
    );
    return { message: null, error: formatSupabaseError(error) };
  }
  return { message: data as Message, error: null };
}

// ---------- profiles ----------

function defaultProfile(email: string): Profile {
  return {
    email,
    display_name: email.split("@")[0],
    tagline: "",
    avatar_url: null,
    cover_url: null,
    links: [],
  };
}

export async function getProfile(email: string): Promise<Profile> {
  const lower = email.toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", lower)
    .maybeSingle();
  if (error) {
    console.error("[supabase] getProfile", error);
    return defaultProfile(lower);
  }
  if (!data) return defaultProfile(lower);
  return {
    email: data.email,
    display_name: data.display_name ?? "",
    tagline: data.tagline ?? "",
    avatar_url: data.avatar_url ?? null,
    cover_url: data.cover_url ?? null,
    links: Array.isArray(data.links) ? data.links : [],
  };
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const next: Profile = { ...profile, email: profile.email.toLowerCase() };
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        email: next.email,
        display_name: next.display_name,
        tagline: next.tagline,
        avatar_url: next.avatar_url,
        cover_url: next.cover_url,
        links: next.links,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  if (error) console.error("[supabase] saveProfile", error);
  return next;
}

// ---------- gallery ----------

export async function listGalleryImages(): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("position", { ascending: true });
  if (error) {
    console.error("[supabase] listGalleryImages", error);
    return [];
  }
  return (data ?? []) as GalleryImage[];
}

export async function addGalleryImage(input: {
  url: string;
  caption?: string;
}): Promise<GalleryImage | null> {
  // Compute next position. Cheap: ask for the max in a single query.
  const { data: maxRow } = await supabase
    .from("gallery_images")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("gallery_images")
    .insert({
      url: input.url,
      caption: (input.caption ?? "").trim(),
      position: nextPos,
    })
    .select()
    .single();
  if (error) {
    console.error("[supabase] addGalleryImage", error);
    return null;
  }
  return data as GalleryImage;
}

export async function removeGalleryImage(id: string): Promise<void> {
  const { error } = await supabase.from("gallery_images").delete().eq("id", id);
  if (error) {
    console.error("[supabase] removeGalleryImage", error);
    return;
  }
  // Re-pack positions so the remaining rows are contiguous (0..n-1). Doing
  // this in one round-trip per row keeps the code simple; the gallery is
  // tiny so the cost is negligible.
  const rows = await listGalleryImages();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].position !== i) {
      await supabase
        .from("gallery_images")
        .update({ position: i })
        .eq("id", rows[i].id);
    }
  }
}

export async function updateGalleryCaption(
  id: string,
  caption: string,
): Promise<void> {
  const { error } = await supabase
    .from("gallery_images")
    .update({ caption: caption.trim() })
    .eq("id", id);
  if (error) console.error("[supabase] updateGalleryCaption", error);
}

/** Move an image up (-1) or down (+1) one slot. Bounded at the edges. */
export async function moveGalleryImage(
  id: string,
  direction: -1 | 1,
): Promise<void> {
  const rows = await listGalleryImages();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapIdx];
  // Swap positions via two updates. Not atomic — but the gallery is single
  // operator and the realtime subscription will reconcile.
  await Promise.all([
    supabase
      .from("gallery_images")
      .update({ position: b.position })
      .eq("id", a.id),
    supabase
      .from("gallery_images")
      .update({ position: a.position })
      .eq("id", b.id),
  ]);
}

// ---------- notification prefs ----------

function defaultPrefs(email: string): NotificationPrefs {
  return {
    email,
    new_posts: true,
    new_messages: true,
    ignore_own: true,
    email_digest: "off",
  };
}

export async function getNotificationPrefs(
  email: string,
): Promise<NotificationPrefs> {
  const lower = email.toLowerCase();
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("email", lower)
    .maybeSingle();
  if (error) {
    console.error("[supabase] getNotificationPrefs", error);
    return defaultPrefs(lower);
  }
  if (!data) return defaultPrefs(lower);
  return {
    email: data.email,
    new_posts: !!data.new_posts,
    new_messages: !!data.new_messages,
    ignore_own: !!data.ignore_own,
    email_digest: (data.email_digest as NotificationPrefs["email_digest"]) ?? "off",
  };
}

export async function saveNotificationPrefs(
  prefs: NotificationPrefs,
): Promise<NotificationPrefs> {
  const next: NotificationPrefs = {
    ...prefs,
    email: prefs.email.toLowerCase(),
  };
  const { error } = await supabase
    .from("notification_prefs")
    .upsert(next, { onConflict: "email" });
  if (error) console.error("[supabase] saveNotificationPrefs", error);
  return next;
}

// ---------- realtime ----------
//
// Subscribes to inserts/updates/deletes on a table. The callback is
// debounced through a microtask so several quick changes coalesce into
// one re-fetch in the caller.

type Channel = "posts" | "messages" | "gallery" | "profiles";

const TABLE_FOR: Record<Channel, string> = {
  posts: "posts",
  messages: "messages",
  gallery: "gallery_images",
  profiles: "profiles",
};

export function subscribe(channel: Channel, cb: () => void): () => void {
  const table = TABLE_FOR[channel];
  let queued = false;
  function fire() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      cb();
    });
  }
  const sub = supabase
    .channel(`sh:${channel}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      fire,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(sub);
  };
}
