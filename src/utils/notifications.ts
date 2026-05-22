/**
 * Browser-notification plumbing.
 *
 * Strategy:
 *   • We track the most recent post/message id we've already notified about
 *     (`sh.last_seen.posts` / `sh.last_seen.messages` in localStorage). When
 *     `subscribe()` fires, we re-read the list and notify on anything new.
 *   • Notifications are gated on (a) the user's prefs, (b) the Notification
 *     API permission, and (c) `ignore_own` so an author isn't pinged about
 *     their own post.
 *
 * In production this is augmented by server-sent email: when the
 * Supabase Edge Function inserts a post, it also enqueues an email to every
 * whitelisted address whose `notification_prefs.new_posts` is true.
 */

import { listMessages, listPosts, getNotificationPrefs, subscribe } from "./supabase";

const SEEN_KEYS = {
  posts: "sh.last_seen.posts",
  messages: "sh.last_seen.messages",
} as const;

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  const result = await Notification.requestPermission();
  return result as NotificationPermission;
}

function show(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, silent: false, tag: title });
  } catch {
    /* some browsers reject inside iframes etc. — silent fall-through */
  }
}

function getSeen(key: string): string | null {
  return localStorage.getItem(key);
}

function setSeen(key: string, id: string) {
  localStorage.setItem(key, id);
}

/**
 * Wire global listeners that turn new posts and messages into native
 * browser notifications. Call once from a top-level mounted component
 * (e.g. Header in `private` variant). Returns an unsubscribe.
 *
 * The current user is passed in so we can read their prefs and skip
 * self-authored content.
 */
export function startNotificationListener(currentEmail: string): () => void {
  // Seed the "last seen" markers so we don't notify retroactively for
  // everything already in the feed when the user first signs in.
  const posts = listPosts();
  const messages = listMessages();
  if (posts.length && !getSeen(SEEN_KEYS.posts)) {
    setSeen(SEEN_KEYS.posts, posts[0].id);
  }
  if (messages.length && !getSeen(SEEN_KEYS.messages)) {
    setSeen(SEEN_KEYS.messages, messages[messages.length - 1].id);
  }

  const unsubPosts = subscribe("posts", () => {
    const prefs = getNotificationPrefs(currentEmail);
    if (!prefs.new_posts) return;
    const all = listPosts(); // sorted newest-first
    const seenId = getSeen(SEEN_KEYS.posts);
    const fresh = [];
    for (const p of all) {
      if (p.id === seenId) break;
      fresh.push(p);
    }
    if (fresh.length === 0) return;
    setSeen(SEEN_KEYS.posts, all[0].id);
    for (const p of fresh.reverse()) {
      if (prefs.ignore_own && p.author_email === currentEmail) continue;
      show(`New post · ${p.title}`, truncate(p.content, 140));
    }
  });

  const unsubMessages = subscribe("messages", () => {
    const prefs = getNotificationPrefs(currentEmail);
    if (!prefs.new_messages) return;
    const all = listMessages(); // sorted oldest-first
    const seenId = getSeen(SEEN_KEYS.messages);
    const seenIdx = seenId ? all.findIndex((m) => m.id === seenId) : -1;
    const fresh = all.slice(seenIdx + 1);
    if (fresh.length === 0) return;
    setSeen(SEEN_KEYS.messages, all[all.length - 1].id);
    for (const m of fresh) {
      if (prefs.ignore_own && m.sender_email === currentEmail) continue;
      show(`${m.sender_email}`, truncate(m.content, 140));
    }
  });

  return () => {
    unsubPosts();
    unsubMessages();
  };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
