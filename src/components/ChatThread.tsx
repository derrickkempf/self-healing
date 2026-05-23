import { useEffect, useMemo, useRef, useState } from "react";
import {
  getProfile,
  listMessages,
  sendMessage,
  subscribe,
} from "../utils/supabase";
import type { Message, Profile } from "../types";

interface Props {
  currentEmail: string;
}

/**
 * Group chat thread.
 *
 *   Other users:  [avatar]  [bubble(s)]
 *                            USERNAME · HH:MM PM
 *
 *   Current user:                            [bubble(s)]
 *                                                  YOU · HH:MM PM
 *
 *   • Bubbles are rounded, the current user's bubble is a notably lighter
 *     gray to differentiate it from collaborators.
 *   • Avatars are only shown for other users. They use the sender's
 *     uploaded `profile.avatar_url` if set (see Settings → Profile),
 *     otherwise a deterministic colored circle with their initial.
 *   • Consecutive messages from the same sender within 3 minutes are
 *     visually grouped into a single avatar + label block.
 *   • Auto-scrolls to the latest message when new ones arrive.
 *
 * Backed by Supabase. `listMessages` is reloaded whenever realtime fires
 * a change on the `messages` table. Profiles are fetched lazily and
 * cached in component state so we don't re-query for every render.
 */
export default function ChatThread({ currentEmail }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  // Load messages + subscribe to realtime updates.
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

  // Whenever a new sender appears in the messages list, fetch their
  // profile once and cache it. Same for the profiles channel — if anyone
  // updates their display name or avatar, refresh that row.
  useEffect(() => {
    const seen = new Set(messages.map((m) => m.sender_email));
    const missing = Array.from(seen).filter((email) => !profiles[email]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(missing.map((e) => getProfile(e)));
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of fetched) next[p.email] = p;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, profiles]);

  // Subscribe to profile updates so display-name / avatar changes are picked
  // up live.
  useEffect(() => {
    const unsub = subscribe("profiles", async () => {
      const emails = Object.keys(profiles);
      if (emails.length === 0) return;
      const fetched = await Promise.all(emails.map((e) => getProfile(e)));
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of fetched) next[p.email] = p;
        return next;
      });
    });
    return unsub;
  }, [profiles]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft(""); // optimistic clear
    await sendMessage(currentEmail, text);
  }

  const groups = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-160px)]">
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        {groups.length === 0 ? (
          <p className="text-muted text-sm py-12 text-center">
            No messages yet. Say something.
          </p>
        ) : (
          <ol className="space-y-7 py-4 px-1">
            {groups.map((g, gi) => (
              <MessageGroup
                key={gi}
                group={g}
                isSelf={g.email === currentEmail}
                profile={profiles[g.email]}
              />
            ))}
            <div ref={endRef} />
          </ol>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-line pt-4 mt-2 flex gap-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1"
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="px-5 py-3 text-xs uppercase tracking-[0.18em] bg-white text-black disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// MessageGroup — one avatar block + N bubbles + sender/time label
// ============================================================================

function MessageGroup({
  group,
  isSelf,
  profile,
}: {
  group: Group;
  isSelf: boolean;
  profile: Profile | undefined;
}) {
  const displayName = isSelf
    ? "You"
    : profile?.display_name || group.email.split("@")[0];
  const lastTime = group.messages[group.messages.length - 1].created_at;

  return (
    <li>
      <div
        className={`flex gap-3 items-start ${
          isSelf ? "justify-end" : "justify-start"
        }`}
      >
        {/* Avatar — others only */}
        {!isSelf && (
          <Avatar
            avatarUrl={profile?.avatar_url ?? null}
            seed={group.email}
            size={40}
          />
        )}

        {/* Column: bubbles + label */}
        <div
          className={`flex flex-col gap-2 max-w-[min(78%,640px)] min-w-0 ${
            isSelf ? "items-end" : "items-start"
          }`}
        >
          {group.messages.map((m) => (
            <div
              key={m.id}
              className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                isSelf
                  ? "bg-white/[0.22] text-white"
                  : "bg-white/[0.07] text-white"
              }`}
            >
              {m.content}
            </div>
          ))}
          <p
            className={`text-[10px] uppercase tracking-[0.22em] text-muted mt-1 px-1 ${
              isSelf ? "text-right" : "text-left"
            }`}
          >
            {isSelf ? "You" : displayName} · {formatTime(lastTime)}
          </p>
        </div>
      </div>
    </li>
  );
}

// ============================================================================
// Avatar — uses uploaded avatar_url, otherwise a deterministic colored circle
// ============================================================================

function Avatar({
  avatarUrl,
  seed,
  size,
}: {
  avatarUrl: string | null;
  seed: string;
  size: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const { bg, fg } = colorFromSeed(seed);
  const initial = seed[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-medium select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

/**
 * Deterministic color from a string (e.g. an email). Same seed always
 * returns the same color, so a given collaborator's fallback avatar is
 * stable across sessions and devices.
 */
function colorFromSeed(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  // Slightly punchy but not neon — sits well against a black background.
  return { bg: `hsl(${hue}, 62%, 52%)`, fg: "#000" };
}

// ============================================================================
// Grouping
// ============================================================================

interface Group {
  email: string;
  messages: Message[];
}

function groupMessages(messages: Message[]): Group[] {
  const out: Group[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (
      last &&
      last.email === m.sender_email &&
      withinMinutes(
        last.messages[last.messages.length - 1].created_at,
        m.created_at,
        3,
      )
    ) {
      last.messages.push(m);
    } else {
      out.push({ email: m.sender_email, messages: [m] });
    }
  }
  return out;
}

function withinMinutes(a: string, b: string, minutes: number): boolean {
  return (
    Math.abs(new Date(a).getTime() - new Date(b).getTime()) <
    minutes * 60 * 1000
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}
