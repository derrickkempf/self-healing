import { useEffect, useState } from "react";
import { listPosts, subscribe } from "../utils/supabase";
import Reveal from "./Reveal";
import type { Post } from "../types";

/**
 * Renders all posts (newest first). Listens for `posts` changes so a new
 * post inserted from this tab — or another tab — appears immediately.
 *
 * Each post fades up via <Reveal> as it scrolls into view. The first
 * two items get a tiny stagger delay so they don't all snap up at once
 * when above the fold on initial mount.
 */
export default function PostFeed() {
  const [posts, setPosts] = useState<Post[]>(() => listPosts());

  useEffect(() => subscribe("posts", () => setPosts(listPosts())), []);

  if (posts.length === 0) {
    return (
      <p className="text-muted text-sm py-12 text-center">
        No posts yet. Create the first one.
      </p>
    );
  }

  return (
    <ol className="space-y-14">
      {posts.map((p, i) => (
        <Reveal
          as="li"
          key={p.id}
          delay={i < 2 ? i * 0.08 : 0}
        >
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted mb-3">
            <span>{formatDateTime(p.created_at)}</span>
            <span aria-hidden>·</span>
            <span className="text-sub">{p.author_email}</span>
          </div>
          <h3 className="font-serif text-3xl md:text-4xl mb-3">{p.title}</h3>
          <p className="text-sub text-[14px] leading-relaxed max-w-2xl whitespace-pre-wrap">
            {p.content}
          </p>
          {p.image_url && (
            <img
              src={p.image_url}
              alt={p.title}
              className="mt-6 w-full max-w-2xl border border-line"
            />
          )}
        </Reveal>
      ))}
    </ol>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}
