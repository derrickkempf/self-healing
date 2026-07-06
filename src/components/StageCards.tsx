import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";
import type { GalleryImage, Message, Post, Profile } from "../types";
import {
  createPost,
  getProfile,
  listMessages,
  sendMessage,
  subscribe,
} from "../utils/supabase";

// ============================================================================
// About card content — hero copy + FAQ + CTA
// ============================================================================

export function AboutContent() {
  return (
    <div>
      <Reveal
        as="h2"
        className="font-serif text-4xl md:text-5xl leading-[0.95] mb-6 uppercase"
      >
        A Place For
        <br />
        Self-Healing
      </Reveal>

      <Reveal as="p" delay={0.05} className="text-white/70 text-[13px] leading-relaxed mb-4">
        A living journal of the materials, methods and milestones behind
        Self-Healing — a small-batch elastomer mat designed to mend itself.
        Every update lands here as the line moves.
      </Reveal>

      <Reveal as="p" delay={0.1} className="text-white/70 text-[13px] leading-relaxed mb-8">
        Custom craft cutting mats made in collaboration with Opepen edition
        artists. A public art protocol on Ethereum.
      </Reveal>

      <Reveal delay={0.2}>
        <Link
          to="/login"
          className="inline-block border border-white/70 px-6 py-3 text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition"
        >
          Click Here
        </Link>
      </Reveal>
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

export function ProgressContent({ posts }: { posts: Post[] }) {
  // Group posts by day so we can render date rulers between them.
  const groups = useMemo(() => groupByDate(posts), [posts]);

  return (
    <div>
      <Reveal>
        <h2 className="font-serif text-5xl md:text-6xl uppercase mb-3">
          Progress
        </h2>
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
            {g.posts.map((p) => (
              <Reveal key={p.id} className="flex gap-4 items-start">
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
              </Reveal>
            ))}
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
  if (images.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Reveal key={i} delay={(i % 3) * 0.05}>
            <Placeholder index={i} />
          </Reveal>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {images.map((img, i) => (
        <Reveal key={img.id} delay={(i % 3) * 0.05}>
          <img
            src={img.url}
            alt={img.caption}
            className="aspect-[3/4] w-full object-cover border border-white/10"
          />
        </Reveal>
      ))}
    </div>
  );
}

function Placeholder({ index }: { index: number }) {
  const angle = (index * 47) % 360;
  return (
    <div
      className="aspect-[3/4] w-full border border-white/10"
      style={{
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), rgba(255,255,255,0) 70%), conic-gradient(from ${angle}deg at 50% 50%, #0a0a0a, #111, #050505, #0a0a0a)`,
      }}
    />
  );
}

// ============================================================================
// Messaging card content (logged-in only) — realtime chat
// ============================================================================

export function MessagingContent({ currentEmail }: { currentEmail: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

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
    await sendMessage(currentEmail, text);
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <Reveal>
        <h2 className="font-serif text-5xl md:text-6xl uppercase mb-6">
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
                <li key={m.id}>
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
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 mt-1 px-1">
                        {displayName.toUpperCase()} · {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
            <div ref={endRef} />
          </ol>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-3">
        <input
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
    const created = await createPost({
      title: tag, // The tag doubles as the title so ProgressContent can
      // derive the pill from it without a schema migration.
      content: content.trim(),
      image_url: null,
      author_email: authorEmail,
    });
    setSubmitting(false);
    if (!created) {
      setError(
        "Couldn't save the post. Check your connection and try again.",
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
        <h2 className="font-serif text-4xl md:text-5xl uppercase mb-6">
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
