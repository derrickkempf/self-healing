import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";
import type { GalleryImage, Message, Post, Profile } from "../types";
import {
  createPost,
  deleteMessage,
  deletePost,
  getContent,
  getProfile,
  listMessages,
  saveContent,
  sendMessage,
  subscribe,
} from "../utils/supabase";
import RichTextEditor from "./RichTextEditor";

// ============================================================================
// About card content — hero copy + FAQ + CTA
// ============================================================================

/** Hardcoded default for the About body — used until a CMS row for
 *  `home.about` is saved, and as a permanent fallback if the fetch
 *  fails. Kept in sync with the `home.about` entry in EDITABLE_ENTRIES
 *  below so the editor pre-populates with the same text. */
const HOME_ABOUT_DEFAULT_HTML =
  "<p>A cutting mat is a base layer for healing. It takes the blade so the work can continue. This mat is built for the people making things that don't exist yet, and healing from the making at the same time.</p>" +
  "<p>Matte black on one side. Green on the other. A3. Self-healing rubber. Numbered. Hand signed. Made in collaboration with Opepen edition artists and collectors.</p>" +
  "<p>Created by hand. Built on Ethereum.</p>";

export function AboutContent() {
  const [bodyHtml, setBodyHtml] = useState<string>(HOME_ABOUT_DEFAULT_HTML);

  // CMS-first, fallback-second. If a `home.about` row exists in the
  // site_content table, use it. Otherwise render the hardcoded default
  // so the page never shows an empty About card.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await getContent("home.about");
      if (!cancelled && row?.body_html) setBodyHtml(row.body_html);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Reveal
        as="h2"
        className="font-serif text-6xl md:text-6xl leading-[0.95] mb-6 uppercase"
      >
        A Place For
        <br />
        Self-Healing
      </Reveal>

      <Reveal delay={0.05}>
        {/*
          `cms-body` scoped styles below match the site's typography so
          rich-text HTML from the editor renders consistently with the
          hardcoded default that was here before.
        */}
        <div
          className="cms-body text-white/70 text-[13px] leading-relaxed mb-8"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </Reveal>

      <Reveal delay={0.22}>
        <Link
          to="/story"
          className="inline-block border border-white/70 px-6 py-3 text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition"
        >
          Discover More →
        </Link>
      </Reveal>

      <style>{`
        .cms-body p { margin: 0 0 1em; }
        .cms-body p:last-child { margin-bottom: 0; }
        .cms-body h2 { font-family: "Instrument Serif", serif; font-size: 26px; text-transform: uppercase; letter-spacing: 0.03em; color: #fff; margin: 0.8em 0 0.4em; line-height: 1.1; }
        .cms-body h3 { font-family: "Instrument Serif", serif; font-size: 18px; text-transform: uppercase; letter-spacing: 0.03em; color: #fff; margin: 0.8em 0 0.4em; }
        .cms-body ul, .cms-body ol { padding-left: 1.4em; margin: 0 0 1em; }
        .cms-body ul { list-style: disc; }
        .cms-body ol { list-style: decimal; }
        .cms-body blockquote { border-left: 2px solid rgba(255,255,255,0.25); padding-left: 1em; margin: 0.4em 0 0.8em; color: rgba(255,255,255,0.6); font-style: italic; }
        .cms-body a { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
        .cms-body hr { border: 0; border-top: 1px solid rgba(255,255,255,0.15); margin: 1em 0; }
      `}</style>
    </div>
  );
}

// ============================================================================
// Progress card content — date separators + tag-pill entries
// ============================================================================

/** Best-effort mapping from a post's title/content to a status tag. Titles
 *  like "Shipped", "Fix …", "Update …" pick the right pill; otherwise the
 *  default is UPDATE. Add a real `kind` column later if you want editor
 *  control. */
function deriveTag(post: Post): "UPDATE" | "FIXED" | "SHIPPED" {
  const t = post.title.toLowerCase();
  if (t.startsWith("ship") || t.includes("shipped")) return "SHIPPED";
  if (t.startsWith("fix") || t.includes("fixed") || t.includes("bug")) {
    return "FIXED";
  }
  return "UPDATE";
}

interface ProgressContentProps {
  posts: Post[];
  /** If provided, entries authored by this email get a Delete affordance
      on hover. Public /Home doesn't pass this — visitors can't delete. */
  currentEmail?: string;
}

export function ProgressContent({
  posts,
  currentEmail,
}: ProgressContentProps) {
  // Group posts by day so we can render date rulers between them.
  const groups = useMemo(() => groupByDate(posts), [posts]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this update? This can't be undone.")) return;
    const { deleted, error } = await deletePost(id);
    if (!deleted) {
      alert("Couldn't delete: " + (error ?? "unknown error"));
      return;
    }
    // Realtime subscription will remove the row from state; nothing to
    // do here on success.
  }

  return (
    <div>
      <Reveal>
        <h2 className="font-serif text-6xl md:text-6xl uppercase mb-3">
          Progress
        </h2>
        <p className="text-white/85 text-[12px] italic mb-1">
          A record of the cuts. And the healing.
        </p>
        <p className="text-white/60 text-[12px] mb-10">
          What shipped, what changed, what was learned.
        </p>
      </Reveal>

      {groups.length === 0 && (
        <p className="text-white/40 text-sm">No updates yet.</p>
      )}

      {groups.map((g, gi) => (
        <div key={g.dateLabel} className={gi === 0 ? "" : "mt-10"}>
          <DateRule label={g.dateLabel} />

          <div className="mt-6 space-y-6">
            {g.posts.map((p) => {
              const canDelete =
                currentEmail &&
                p.author_email.toLowerCase() === currentEmail.toLowerCase();
              return (
                <Reveal
                  key={p.id}
                  className="group flex gap-4 items-start"
                >
                  <StatusTag kind={deriveTag(p)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/85 text-[13px] leading-relaxed whitespace-pre-wrap">
                      {p.content}
                    </p>
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="mt-3 w-full border border-white/10"
                      />
                    )}
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      aria-label="Delete update"
                      className="opacity-0 group-hover:opacity-100 transition text-white/40 hover:text-red-300 shrink-0 p-1"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DateRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.22em] text-white/60 whitespace-nowrap">
        {label}
      </span>
      <span
        aria-hidden
        className="flex-1 border-t border-dashed border-white/20"
      />
    </div>
  );
}

function StatusTag({ kind }: { kind: "UPDATE" | "FIXED" | "SHIPPED" }) {
  const styles: Record<typeof kind, string> = {
    UPDATE: "border-white/40 text-white/70",
    FIXED: "border-white/40 text-white/70",
    SHIPPED: "border-white/70 bg-white/10 text-white",
  };
  return (
    <span
      className={`
        inline-flex items-center justify-center
        border rounded-full
        text-[9px] uppercase tracking-[0.22em]
        px-3 py-1 min-w-[64px] shrink-0
        ${styles[kind]}
      `}
    >
      {kind}
    </span>
  );
}

function groupByDate(posts: Post[]): { dateLabel: string; posts: Post[] }[] {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const key = formatDateLabel(p.created_at);
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([dateLabel, posts]) => ({
    dateLabel,
    posts,
  }));
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

// ============================================================================
// Gallery card content — masonry-ish 3-col image grid
// ============================================================================

export function GalleryContent({ images }: { images: GalleryImage[] }) {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  if (images.length === 0) {
    // No user uploads yet — show placeholder gradient tiles in a
    // masonry-ish layout so the empty state doesn't look broken.
    return (
      <MasonryColumns>
        {Array.from({ length: 9 }).map((_, i) => (
          <Reveal key={i} delay={(i % 3) * 0.05}>
            <Placeholder index={i} />
          </Reveal>
        ))}
      </MasonryColumns>
    );
  }

  return (
    <>
      <MasonryColumns>
        {images.map((img, i) => (
          <Reveal key={img.id} delay={(i % 3) * 0.05}>
            <GalleryTile
              image={img}
              // First 6 tiles preload eagerly so the visible chunk
              // pops in immediately; the rest lazy-load as they
              // approach the viewport.
              eager={i < 6}
              onOpen={() => setLightbox(img)}
            />
          </Reveal>
        ))}
      </MasonryColumns>

      {lightbox && (
        <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

/**
 * Masonry layout using CSS multi-column. Preserves image aspect ratios
 * while filling columns evenly by height. Each tile has `break-inside:
 * avoid` so images never split across columns.
 */
function MasonryColumns({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        columnCount: 2,
        columnGap: "8px",
      }}
      className="[column-count:2] md:[column-count:3]"
    >
      {children}
    </div>
  );
}

function GalleryTile({
  image,
  onOpen,
  eager = false,
}: {
  image: GalleryImage;
  onOpen: () => void;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block relative w-full mb-2 border border-white/10 overflow-hidden bg-white/[0.04]"
      style={{ breakInside: "avoid" }}
      aria-label={`Enlarge ${image.caption || "image"}`}
    >
      <img
        src={image.url}
        alt={image.caption}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="block w-full h-auto"
        style={{
          // Blur-up reveal: soft blur + slight fade until the image
          // decodes, then transitions to sharp full-opacity.
          filter: loaded ? "blur(0px)" : "blur(14px)",
          opacity: loaded ? 1 : 0.5,
          transform: loaded ? "scale(1)" : "scale(1.03)",
          transition:
            "filter 500ms ease-out, opacity 400ms ease-out, transform 500ms ease-out",
          willChange: loaded ? "auto" : "filter, opacity, transform",
        }}
      />
      {/* Hover state: darken tile + show magnifying-glass icon center. */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="text-white"
        >
          <circle cx="12" cy="12" r="7" />
          <line x1="17" y1="17" x2="23" y2="23" />
        </svg>
      </span>
    </button>
  );
}

/**
 * Full-screen lightbox for viewing an uploaded image at its native
 * resolution. Click backdrop or press Esc to close.
 *
 * Rendered via a React portal directly on document.body so it isn't
 * trapped inside the StageCard stacking context (Cards use
 * position:absolute + their own z-index, which would otherwise cap the
 * modal's z-[80] and let sibling cards float on top of it). Portalling
 * escapes all ancestor stacking contexts, so z-[80] wins outright.
 */
function Lightbox({
  image,
  onClose,
}: {
  image: GalleryImage;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center px-6 py-10"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-white/70 hover:text-white transition"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <line x1="6" y1="6" x2="22" y2="22" />
          <line x1="22" y1="6" x2="6" y2="22" />
        </svg>
      </button>
      <img
        src={image.url}
        alt={image.caption}
        // Prevent the backdrop click from firing when the user clicks
        // the image itself (they might be trying to interact with it).
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] object-contain border border-white/10"
      />
      {image.caption && (
        <p
          onClick={(e) => e.stopPropagation()}
          className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/60"
        >
          {image.caption}
        </p>
      )}
    </div>,
    document.body,
  );
}

function Placeholder({ index }: { index: number }) {
  const angle = (index * 47) % 360;
  // Vary heights so the masonry layout looks intentional even before
  // any real photos are uploaded.
  const heightPx = 140 + ((index * 71) % 180);
  return (
    <div
      className="w-full mb-2 border border-white/10"
      style={{
        breakInside: "avoid",
        height: heightPx + "px",
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), rgba(255,255,255,0) 70%), conic-gradient(from ${angle}deg at 50% 50%, #0a0a0a, #111, #050505, #0a0a0a)`,
      }}
    />
  );
}

// ============================================================================
// Messaging card content (logged-in only) — realtime chat
// ============================================================================

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden
    >
      <line x1="2" y1="4" x2="12" y2="4" />
      <path d="M4 4v7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" />
      <line x1="6" y1="6" x2="6" y2="10" />
      <line x1="8" y1="6" x2="8" y2="10" />
      <path d="M5 4V2.5A0.5 0.5 0 0 1 5.5 2h3a0.5 0.5 0 0 1 0.5 0.5V4" />
    </svg>
  );
}

/** A small hand-picked emoji palette. Deliberately compact so it fits in
 *  the composer without needing a heavy picker library. */
const EMOJI_PALETTE = [
  "😀", "😅", "😂", "🤔", "😎", "😍", "🥲", "🥳",
  "👍", "👏", "🙏", "💪", "🤝", "🫡", "🫶", "🔥",
  "✨", "🎉", "💯", "✅", "❌", "⏳", "🚀", "⚡",
  "❤️", "💔", "👀", "🧠", "💡", "📌", "📝", "🛠️",
];


export function MessagingContent({ currentEmail }: { currentEmail: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const draftRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Insert an emoji at the current caret position in the draft input.
  function insertEmoji(emoji: string) {
    const input = draftRef.current;
    if (!input) {
      setDraft((d) => d + emoji);
      return;
    }
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    // Restore focus + move caret past the inserted emoji.
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    });
  }

  // Quote a message into the composer as a reply prefix. The user can
  // add their own text after the quote and send.
  function quoteMessage(m: Message) {
    const display =
      m.sender_email === currentEmail
        ? "you"
        : profiles[m.sender_email]?.display_name || m.sender_email.split("@")[0];
    // Trim the quoted body to something reasonable so long messages
    // don't blow out the composer.
    const preview = m.content.length > 120 ? m.content.slice(0, 118) + "…" : m.content;
    const quoted = `> @${display}: ${preview}\n\n`;
    setDraft((d) => (d.startsWith("> @") ? d : quoted + d));
    draftRef.current?.focus();
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await listMessages();
      if (!cancelled) setMessages(rows);
    }
    load();
    const unsub = subscribe("messages", load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    const senders = new Set(messages.map((m) => m.sender_email));
    const missing = Array.from(senders).filter((e) => !profiles[e]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const rows = await Promise.all(missing.map((e) => getProfile(e)));
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of rows) next[p.email] = p;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, profiles]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const { error } = await sendMessage(currentEmail, text);
    if (error) {
      // Restore the draft so the user can retry without retyping, and
      // surface the exact reason above the composer.
      setDraft(text);
      setSendError(error);
    } else {
      setSendError(null);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <Reveal>
        <h2 className="font-serif text-6xl md:text-6xl uppercase mb-6">
          Messaging
        </h2>
      </Reveal>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 mb-4">
        {messages.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">
            No messages yet.
          </p>
        ) : (
          <ol className="space-y-6">
            {messages.map((m) => {
              const isSelf = m.sender_email === currentEmail;
              const profile = profiles[m.sender_email];
              const displayName = isSelf
                ? "you"
                : profile?.display_name || m.sender_email.split("@")[0];
              return (
                <li key={m.id} className="group">
                  <div
                    className={`flex gap-3 items-start ${
                      isSelf ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isSelf && (
                      <Avatar
                        avatarUrl={profile?.avatar_url ?? null}
                        seed={m.sender_email}
                      />
                    )}
                    <div
                      className={`flex flex-col ${
                        isSelf ? "items-end" : "items-start"
                      } max-w-[min(80%,520px)] min-w-0`}
                    >
                      <div
                        className={`px-4 py-3 rounded-md text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                          isSelf
                            ? "bg-white/[0.22] text-white"
                            : "bg-white/[0.08] text-white"
                        }`}
                      >
                        {m.content}
                      </div>
                      <div className="flex items-center gap-3 mt-1 px-1">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                          {displayName.toUpperCase()} · {formatTime(m.created_at)}
                        </p>
                        {/* Reply button — quotes this message into the
                            composer. Hidden until the row is hovered so
                            it doesn't clutter the resting UI. */}
                        <button
                          type="button"
                          onClick={() => quoteMessage(m)}
                          className="text-[10px] uppercase tracking-[0.22em] text-white/40 hover:text-white transition opacity-0 group-hover:opacity-100"
                          aria-label={`Reply to ${displayName}`}
                        >
                          Reply
                        </button>
                        {/* Delete button — only shown on the current
                            user's own messages. RLS also enforces this
                            server-side. */}
                        {isSelf && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                !confirm(
                                  "Delete this message? This can't be undone.",
                                )
                              ) {
                                return;
                              }
                              const { deleted, error } = await deleteMessage(
                                m.id,
                              );
                              if (!deleted) {
                                alert(
                                  "Couldn't delete: " +
                                    (error ?? "unknown error"),
                                );
                              }
                            }}
                            className="text-white/40 hover:text-red-300 transition opacity-0 group-hover:opacity-100"
                            aria-label="Delete message"
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                    {isSelf && (
                      <Avatar
                        avatarUrl={profile?.avatar_url ?? null}
                        seed={m.sender_email}
                      />
                    )}
                  </div>
                </li>
              );
            })}
            <div ref={endRef} />
          </ol>
        )}
      </div>

      {sendError && (
        <p className="text-[12px] text-red-300/90 mb-2 leading-relaxed">
          {sendError}
        </p>
      )}

      {/* Emoji palette — 4-row grid of the most-used emoji, opens above
          the composer. Hidden by default; toggle via the 😊 button. */}
      {showEmoji && (
        <div
          className="mb-2 p-2 border border-white/15 grid grid-cols-8 gap-1 text-xl"
          style={{ background: "#1a1a1a", borderRadius: "2px" }}
        >
          {EMOJI_PALETTE.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => insertEmoji(e)}
              className="hover:bg-white/10 rounded transition text-center leading-8 h-8 w-8"
              aria-label={`Insert ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Emoji"
          className={`px-3 text-lg border transition ${
            showEmoji
              ? "border-white/60 bg-white/10 text-white"
              : "border-white/15 text-white/70 hover:border-white/40"
          }`}
          style={{ borderRadius: "2px" }}
        >
          ☺
        </button>
        <input
          ref={draftRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Typing an awesome message here…"
          className="flex-1"
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="px-6 py-3 text-[11px] uppercase tracking-[0.22em] bg-white text-black disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Avatar({
  avatarUrl,
  seed,
}: {
  avatarUrl: string | null;
  seed: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }
  const hue = hashHue(seed);
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-black text-xs font-medium"
      style={{ backgroundColor: `hsl(${hue}, 65%, 55%)` }}
      aria-hidden
    >
      {seed[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// "New Post" composer — a card body used by the private Home for admins
// to publish updates. Uses createPost + Supabase.
// ============================================================================

export function NewPostContent({
  authorEmail,
  onCreated,
}: {
  authorEmail: string;
  onCreated?: () => void;
}) {
  const [tag, setTag] = useState<"UPDATE" | "FIXED" | "SHIPPED">("UPDATE");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("Write something first.");
      return;
    }
    setSubmitting(true);
    const { post, error: err } = await createPost({
      title: tag, // The tag doubles as the title so ProgressContent can
      // derive the pill from it without a schema migration.
      content: content.trim(),
      image_url: null,
      author_email: authorEmail,
    });
    setSubmitting(false);
    if (!post) {
      setError(
        err ??
          "Couldn't save the post. Check the browser console for the exact error.",
      );
      return;
    }
    setContent("");
    setSavedAt(Date.now());
    onCreated?.();
    setTimeout(() => setSavedAt(null), 2200);
  }

  return (
    <div>
      <Reveal>
        <h2 className="font-serif text-6xl md:text-6xl uppercase mb-6">
          New Update
        </h2>
      </Reveal>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">
            Tag
          </label>
          <div className="flex gap-2">
            {(["UPDATE", "FIXED", "SHIPPED"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setTag(k)}
                className={`
                  px-4 py-2 text-[10px] uppercase tracking-[0.22em] rounded-full border transition
                  ${
                    tag === k
                      ? "bg-white/10 border-white/70 text-white"
                      : "border-white/25 text-white/60 hover:text-white hover:border-white/50"
                  }
                `}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">
            Description
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="What shipped, what changed, what was learned…"
          />
        </div>

        {error && (
          <p className="text-[12px] text-red-300/90">{error}</p>
        )}

        <div className="flex items-center justify-between">
          {savedAt ? (
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/60">
              Saved
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-6 py-3 text-[11px] uppercase tracking-[0.22em] bg-white text-black disabled:opacity-40"
          >
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Content admin card — headless CMS editor
// ============================================================================

/*
 * ============================================================================
 *  HOW TO ADD A NEW EDITABLE BLOCK  (the "two-line" change)
 * ============================================================================
 *
 *  1) Register it here (STEP 1). Add a new entry to EDITABLE_ENTRIES with:
 *       - key:         a dot-namespaced string (e.g., "home.hero_subtitle")
 *       - label:       human-readable, shows up in the dashboard dropdown
 *       - hasTitle:    true if the block has a separate title field
 *       - defaultTitle:  (optional) initial title shown before it's saved
 *       - defaultBody: HTML fallback rendered when no CMS row exists yet
 *       - order:       ordering weight in the dropdown (lower = higher)
 *
 *  2) Render it where you want (STEP 2). In whichever page/component
 *     should show this copy, add:
 *
 *       const [html, setHtml] = useState(YOUR_HARDCODED_DEFAULT);
 *       useEffect(() => {
 *         let cancelled = false;
 *         (async () => {
 *           const row = await getContent("home.hero_subtitle");
 *           if (!cancelled && row?.body_html) setHtml(row.body_html);
 *         })();
 *         return () => { cancelled = true; };
 *       }, []);
 *
 *     Then render `<div dangerouslySetInnerHTML={{ __html: html }} />`
 *     inside an element with the `cms-body` (or `story-body`) class so
 *     the shared typography rules apply.
 *
 *  That's it. The block becomes editable immediately for anyone signed in.
 *  The Content admin card in the dashboard picks it up from EDITABLE_ENTRIES
 *  automatically — no wiring required there.
 *
 *  Worked example (already registered below): `home.about`, `notify.intro`,
 *  and all six `story.*` blocks show both steps end-to-end.
 * ============================================================================
 */

interface EditableEntry {
  key: string;
  label: string;
  hasTitle: boolean;
  defaultTitle?: string;
  defaultBody: string;
  order: number;
}

const EDITABLE_ENTRIES: EditableEntry[] = [
  {
    key: "story.opening",
    label: "Story — opening dek",
    hasTitle: false,
    defaultBody:
      "<p>A living journal of the materials, methods, and milestones behind Self-Healing — a small-batch cutting mat made in collaboration with Opepen edition artists and their collectors. A public art protocol on Ethereum, now in your studio.</p>",
    order: 0,
  },
  {
    key: "story.section.how_it_started",
    label: "Story — How it started",
    hasTitle: true,
    defaultTitle: "How it started",
    defaultBody:
      "<p>On July 10, 2025, nine collectors put 0.069 ETH each in front of an idea: an Opepen edition made physical. Not another print. Not a mockup. A working object — a cutting mat you could put on your desk and use.</p><p>Nine people said yes. That's what made this real.</p>",
    order: 1,
  },
  {
    key: "story.section.what_it_is",
    label: "Story — What it is",
    hasTitle: true,
    defaultTitle: "What it is",
    defaultBody:
      "<p>A matte-black-on-one-side, green-on-the-other A3 self-healing cutting mat. Rubber that closes after the blade. Numbered 01 through 09 for the founding collectors, then in small numbered runs for anyone who wants to join them.</p><p>Every mat is made by hand in small batches, shipped from a studio, and signed. Every mat is anchored on Ethereum with a public record — mint date, edition number, owner history.</p>",
    order: 2,
  },
  {
    key: "story.section.why_opepen",
    label: "Story — Why Opepen",
    hasTitle: true,
    defaultTitle: "Why Opepen",
    defaultBody:
      "<p>Opepen is a public art protocol on Ethereum. Editions are minted, held, and traded — but they have mostly lived as digital images or paper prints. Bringing an edition into a functional, physical object was untested.</p><p>The nine founding collectors funded that test. Their belief paid for the rubber, the mold, the grid printing, and the global shipping. Their names — or their wallets — are on the record.</p><p>This is what an Opepen edition can be when it steps off the screen.</p>",
    order: 3,
  },
  {
    key: "story.section.community_made_this",
    label: "Story — Community made this",
    hasTitle: true,
    defaultTitle: "Community made this",
    defaultBody:
      "<p>Every step of this project was decided in public. The artwork, the material, the color, the run size, the ship date — all discussed with the nine, then documented on the Progress feed for everyone else to see.</p><p>The nine are not customers. They are the reason the project exists. Everyone who joins after them joins a community that already believes.</p>",
    order: 4,
  },
  {
    key: "story.section.what_comes_next",
    label: "Story — What comes next",
    hasTitle: true,
    defaultTitle: "What comes next",
    defaultBody:
      "<p>Drop 001 ships to the founding nine.</p><p>Drop 002 opens for public pre-order shortly after — a small, numbered run for anyone on the notify list.</p><p>Later drops will introduce new artist collaborations, new colorways, new editions. Each one made by hand. Each one anchored on-chain. Each one a chapter.</p>",
    order: 5,
  },
  {
    key: "home.about",
    label: "Home — About card body",
    hasTitle: false,
    defaultBody:
      "<p>A cutting mat is a base layer for healing. It takes the blade so the work can continue. This mat is built for the people making things that don't exist yet, and healing from the making at the same time.</p><p>Matte black on one side. Green on the other. A3. Self-healing rubber. Numbered. Hand signed. Made in collaboration with Opepen edition artists and collectors.</p><p>Created by hand. Built on Ethereum.</p>",
    order: 10,
  },
  {
    key: "notify.intro",
    label: "Notify — description",
    hasTitle: false,
    defaultBody:
      "<p>Drop 001 is going to the nine founding collectors first. Drop 002 opens to the public shortly after. Add your email and we'll let you know when it's available.</p>",
    order: 20,
  },
];

export function ContentAdminContent() {
  const [selectedKey, setSelectedKey] = useState<string>(EDITABLE_ENTRIES[0].key);
  const [title, setTitle] = useState<string>("");
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [dirty, setDirty] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "err">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      EDITABLE_ENTRIES.find((e) => e.key === selectedKey) ?? EDITABLE_ENTRIES[0],
    [selectedKey],
  );

  // Load the selected content row (or fall back to the default) any
  // time the user picks a different key.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setErrorMsg(null);
      const row = await getContent(selected.key);
      if (cancelled) return;
      setTitle(row?.title ?? selected.defaultTitle ?? "");
      setBodyHtml(row?.body_html ?? selected.defaultBody);
      setDirty(false);
      setStatus("idle");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    const { ok, error } = await saveContent(selected.key, {
      title: selected.hasTitle ? title : null,
      body_html: bodyHtml,
      order_index: selected.order,
    });
    if (ok) {
      setStatus("saved");
      setDirty(false);
      setTimeout(() => setStatus("idle"), 1800);
    } else {
      setStatus("err");
      setErrorMsg(error);
    }
  }

  async function handleRevert() {
    if (
      dirty &&
      !confirm("Discard your unsaved changes and load the saved version?")
    ) {
      return;
    }
    setStatus("loading");
    const row = await getContent(selected.key);
    setTitle(row?.title ?? selected.defaultTitle ?? "");
    setBodyHtml(row?.body_html ?? selected.defaultBody);
    setDirty(false);
    setStatus("idle");
  }

  return (
    <div>
      <Reveal>
        <h2 className="font-serif text-6xl md:text-6xl uppercase mb-6">
          Content
        </h2>
        <p className="text-white/60 text-[12px] mb-6">
          Edit the copy for any editable block on the site. Changes save to
          Supabase and appear on the public site immediately.
        </p>
      </Reveal>

      {/* Key picker */}
      <div className="mb-4">
        <label
          htmlFor="content-key"
          className="block text-[10px] uppercase tracking-[0.28em] text-white/50 mb-2"
        >
          Block
        </label>
        <select
          id="content-key"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="w-full border border-white/15 px-3 py-2 text-[13px] cursor-pointer"
          style={{
            background: "#1a1a1a",
            colorScheme: "dark",
            borderRadius: "2px",
          }}
        >
          {EDITABLE_ENTRIES.slice()
            .sort((a, b) => a.order - b.order)
            .map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
        </select>
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mt-2">
          key: {selected.key}
        </p>
      </div>

      {/* Title input — only shown for entries that have a title */}
      {selected.hasTitle && (
        <div className="mb-4">
          <label
            htmlFor="content-title"
            className="block text-[10px] uppercase tracking-[0.28em] text-white/50 mb-2"
          >
            Title
          </label>
          <input
            id="content-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder={selected.defaultTitle}
          />
        </div>
      )}

      {/* Body */}
      <div className="mb-4">
        <label className="block text-[10px] uppercase tracking-[0.28em] text-white/50 mb-2">
          Body
        </label>
        {status === "loading" ? (
          <div
            className="border border-white/15 p-4 text-white/40 text-sm"
            style={{ minHeight: "calc(var(--cell) * 8)", borderRadius: "2px" }}
          >
            Loading…
          </div>
        ) : (
          <RichTextEditor
            value={bodyHtml}
            onChange={(html) => {
              setBodyHtml(html);
              setDirty(true);
            }}
            placeholder="Write here…"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || status === "saving"}
            className="px-6 py-3 text-[11px] uppercase tracking-[0.22em] bg-white text-black disabled:opacity-40"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          {dirty && (
            <button
              type="button"
              onClick={handleRevert}
              className="text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white transition"
            >
              Revert
            </button>
          )}
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
          {status === "saved" && "Saved"}
          {status === "err" && errorMsg && (
            <span className="text-red-300/90">{errorMsg}</span>
          )}
          {!dirty && status === "idle" && "No changes"}
          {dirty && status === "idle" && "Unsaved changes"}
        </div>
      </div>
    </div>
  );
}
