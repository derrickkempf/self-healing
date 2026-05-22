/**
 * Mocked Supabase client.
 *
 * This file implements just enough of a Supabase-like surface area to power
 * the app locally without an actual backend. Everything is persisted to
 * `localStorage`, and "realtime" cross-tab updates are delivered via the
 * `storage` event.
 *
 * When you are ready to swap in real Supabase, replace this file with the
 * official client (`@supabase/supabase-js`) and update the call sites in
 * `auth.ts`, `Dashboard.tsx`, `PostFeed.tsx`, and `Chat.tsx` accordingly.
 * The function signatures here intentionally mirror typical Supabase usage
 * (select / insert / update / subscribe) to keep the migration small.
 */

import type {
  AuthCode,
  GalleryImage,
  Message,
  NotificationPrefs,
  Post,
  Profile,
  User,
} from "../types";

const KEYS = {
  users: "sh.users",
  auth_codes: "sh.auth_codes",
  posts: "sh.posts",
  messages: "sh.messages",
  session: "sh.session",
  profiles: "sh.profiles",
  prefs: "sh.notification_prefs",
  gallery: "sh.gallery",
} as const;

// ---------- env / whitelist ----------

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

// ---------- storage helpers ----------

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]): void {
  localStorage.setItem(key, JSON.stringify(rows));
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- seed (one-time) ----------

function seedIfEmpty(): void {
  if (read<Post>(KEYS.posts).length === 0) {
    const now = Date.now();
    const seed: Post[] = [
      {
        id: uuid(),
        title: "Prototype run #3",
        content:
          "First batch off the new line. Cure time down to 41 minutes — surface finish is noticeably cleaner.",
        image_url: null,
        created_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
        author_email: "dk@derrickkempf.com",
      },
      {
        id: uuid(),
        title: "Material sourcing locked",
        content:
          "Final supplier signed. Lead time of 11 days on the elastomer compound, two-week buffer on backing.",
        image_url: null,
        created_at: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
        author_email: "dk@derrickkempf.com",
      },
      {
        id: uuid(),
        title: "Kickoff",
        content:
          "Self-Healing Mats production tracker is live. Updates will land here as we go.",
        image_url: null,
        created_at: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
        author_email: "dk@derrickkempf.com",
      },
    ];
    write(KEYS.posts, seed);
  }
}

seedIfEmpty();

// ---------- users ----------

export function upsertUser(email: string): User {
  const users = read<User>(KEYS.users);
  const existing = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    existing.last_login = new Date().toISOString();
    existing.whitelisted = isWhitelisted(email);
    write(KEYS.users, users);
    return existing;
  }
  const created: User = {
    id: uuid(),
    email: email.toLowerCase(),
    whitelisted: isWhitelisted(email),
    last_login: new Date().toISOString(),
  };
  users.push(created);
  write(KEYS.users, users);
  return created;
}

// ---------- auth codes ----------

const CODE_TTL_MS = 10 * 60 * 1000;

export function issueAuthCode(email: string): AuthCode {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const expires = new Date(now.getTime() + CODE_TTL_MS);
  const codes = read<AuthCode>(KEYS.auth_codes);
  // Invalidate any prior unused codes for this email
  for (const c of codes) {
    if (c.email.toLowerCase() === email.toLowerCase() && !c.used) {
      c.used = true;
    }
  }
  const row: AuthCode = {
    id: uuid(),
    email: email.toLowerCase(),
    code,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    used: false,
  };
  codes.push(row);
  write(KEYS.auth_codes, codes);
  return row;
}

export function verifyAuthCode(email: string, code: string): boolean {
  const codes = read<AuthCode>(KEYS.auth_codes);
  const now = Date.now();
  let ok = false;
  for (const c of codes) {
    if (
      c.email.toLowerCase() === email.toLowerCase() &&
      c.code === code.trim() &&
      !c.used &&
      new Date(c.expires_at).getTime() > now
    ) {
      c.used = true;
      ok = true;
      break;
    }
  }
  write(KEYS.auth_codes, codes);
  return ok;
}

// ---------- posts ----------

export function listPosts(limit?: number): Post[] {
  const rows = read<Post>(KEYS.posts).slice().sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export function createPost(input: {
  title: string;
  content: string;
  image_url: string | null;
  author_email: string;
}): Post {
  const post: Post = {
    id: uuid(),
    title: input.title,
    content: input.content,
    image_url: input.image_url,
    created_at: new Date().toISOString(),
    author_email: input.author_email,
  };
  const rows = read<Post>(KEYS.posts);
  rows.push(post);
  write(KEYS.posts, rows);
  // Notify listeners in this tab as well — `storage` only fires in other tabs.
  window.dispatchEvent(new CustomEvent("sh:posts"));
  return post;
}

// ---------- messages ----------

export function listMessages(): Message[] {
  return read<Message>(KEYS.messages).slice().sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}

export function sendMessage(sender_email: string, content: string): Message {
  const msg: Message = {
    id: uuid(),
    sender_email,
    content,
    created_at: new Date().toISOString(),
  };
  const rows = read<Message>(KEYS.messages);
  rows.push(msg);
  write(KEYS.messages, rows);
  window.dispatchEvent(new CustomEvent("sh:messages"));
  return msg;
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

export function getProfile(email: string): Profile {
  const rows = read<Profile>(KEYS.profiles);
  const existing = rows.find(
    (p) => p.email.toLowerCase() === email.toLowerCase(),
  );
  return existing ?? defaultProfile(email.toLowerCase());
}

export function saveProfile(profile: Profile): Profile {
  const rows = read<Profile>(KEYS.profiles);
  const idx = rows.findIndex(
    (p) => p.email.toLowerCase() === profile.email.toLowerCase(),
  );
  const next: Profile = { ...profile, email: profile.email.toLowerCase() };
  if (idx === -1) rows.push(next);
  else rows[idx] = next;
  write(KEYS.profiles, rows);
  window.dispatchEvent(new CustomEvent("sh:profile"));
  return next;
}

// ---------- gallery ----------

export function listGalleryImages(): GalleryImage[] {
  return read<GalleryImage>(KEYS.gallery)
    .slice()
    .sort((a, b) => a.position - b.position);
}

export function addGalleryImage(input: {
  url: string;
  caption?: string;
}): GalleryImage {
  const rows = read<GalleryImage>(KEYS.gallery);
  const maxPos = rows.reduce((m, r) => Math.max(m, r.position), -1);
  const next: GalleryImage = {
    id: uuid(),
    url: input.url,
    caption: (input.caption ?? "").trim(),
    position: maxPos + 1,
    created_at: new Date().toISOString(),
  };
  rows.push(next);
  write(KEYS.gallery, rows);
  window.dispatchEvent(new CustomEvent("sh:gallery"));
  return next;
}

export function removeGalleryImage(id: string): void {
  const rows = read<GalleryImage>(KEYS.gallery).filter((r) => r.id !== id);
  // Re-pack positions so they stay contiguous (0..n-1).
  rows
    .slice()
    .sort((a, b) => a.position - b.position)
    .forEach((r, i) => (r.position = i));
  write(KEYS.gallery, rows);
  window.dispatchEvent(new CustomEvent("sh:gallery"));
}

export function updateGalleryCaption(id: string, caption: string): void {
  const rows = read<GalleryImage>(KEYS.gallery);
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  row.caption = caption.trim();
  write(KEYS.gallery, rows);
  window.dispatchEvent(new CustomEvent("sh:gallery"));
}

/** Move an image up (-1) or down (+1) one slot. Bounded at the edges. */
export function moveGalleryImage(id: string, direction: -1 | 1): void {
  const rows = read<GalleryImage>(KEYS.gallery)
    .slice()
    .sort((a, b) => a.position - b.position);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapIdx];
  const tmp = a.position;
  a.position = b.position;
  b.position = tmp;
  write(KEYS.gallery, rows);
  window.dispatchEvent(new CustomEvent("sh:gallery"));
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

export function getNotificationPrefs(email: string): NotificationPrefs {
  const rows = read<NotificationPrefs>(KEYS.prefs);
  const existing = rows.find(
    (p) => p.email.toLowerCase() === email.toLowerCase(),
  );
  return existing ?? defaultPrefs(email.toLowerCase());
}

export function saveNotificationPrefs(
  prefs: NotificationPrefs,
): NotificationPrefs {
  const rows = read<NotificationPrefs>(KEYS.prefs);
  const idx = rows.findIndex(
    (p) => p.email.toLowerCase() === prefs.email.toLowerCase(),
  );
  const next: NotificationPrefs = {
    ...prefs,
    email: prefs.email.toLowerCase(),
  };
  if (idx === -1) rows.push(next);
  else rows[idx] = next;
  write(KEYS.prefs, rows);
  return next;
}

// ---------- realtime-ish subscription ----------

type Channel = "posts" | "messages" | "gallery";

export function subscribe(channel: Channel, cb: () => void): () => void {
  const storageKey =
    channel === "posts"
      ? KEYS.posts
      : channel === "messages"
        ? KEYS.messages
        : KEYS.gallery;
  const eventName = `sh:${channel}`;
  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey) cb();
  };
  const onCustom = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, onCustom as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(eventName, onCustom as EventListener);
  };
}

// ---------- session ----------

export function getSession(): { token: string; email: string } | null {
  try {
    const raw = localStorage.getItem(KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(email: string): void {
  const token = uuid() + "." + uuid();
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({ token, email, issued_at: new Date().toISOString() }),
  );
}

export function clearSession(): void {
  localStorage.removeItem(KEYS.session);
}
