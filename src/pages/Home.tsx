import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import CornerNav from "../components/CornerNav";
import Reveal from "../components/Reveal";
import FAQ from "../components/FAQ";
import { listGalleryImages, listPosts, subscribe } from "../utils/supabase";
import type { GalleryImage, Post } from "../types";

/**
 * Public landing page.
 *
 *   Header
 *   Hero       — staggered fade-up reveals on load (post intro)
 *   Progress   — vertical timeline; each post is a marker on a connecting track.
 *                Realtime-driven: subscribe('posts') refetches whenever a new
 *                update is published from /dashboard, so the public page
 *                always reflects what the admin has posted.
 *   Gallery    — each tile reveals as it enters the viewport
 *   Footer     — soft fade-up at the bottom of the page
 *
 * The `Reveal` wrapper coordinates with the reveal-gate utility, so
 * above-the-fold elements queue themselves until the intro overlay or a
 * page transition has cleared. Below-the-fold elements fire on scroll
 * via IntersectionObserver.
 */
export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await listPosts(10);
      if (!cancelled) setPosts(rows);
    }
    load();
    const unsub = subscribe("posts", load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await listGalleryImages();
      if (!cancelled) setGalleryImages(rows);
    }
    load();
    const unsub = subscribe("gallery", load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <CornerNav />

      {/* HERO / STORY — staggered entrance after intro / transition.
          Grid background is now handled by the body (see globals.css) so
          every page gets the same drafting-paper feel. */}
      <section
        id="story"
        className="relative w-full text-center scroll-mt-24"
      >
        <div className="mx-auto max-w-5xl w-full px-6 md:px-10 pt-20 md:pt-32 pb-24 md:pb-40">
          <Reveal
            as="h1"
            delay={0.15}
            className="font-serif text-[14vw] md:text-[7rem] leading-[0.95] mb-10"
          >
            Self-Healing
            <br />
            <span className="italic text-sub">Mats.</span>
          </Reveal>
          <Reveal
            as="p"
            delay={0.3}
            className="max-w-xl mx-auto text-sub text-[15px] md:text-base leading-relaxed mb-12"
          >
            A living journal of the materials, methods and milestones behind
            Self-Healing — a small-batch elastomer mat designed to mend itself.
            Updates land here as the line moves.
          </Reveal>
          <Reveal delay={0.45}>
            <Link
              to="/login"
              className="inline-block border border-white px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black transition"
            >
              Access Insights →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* TIMELINE / FEED — progress-bar style. Each post is a marker on a
          continuous vertical track. The track is drawn per-list-item as a
          line that runs from this dot down into the next item's space, so
          the connection feels physical even when there are big gaps between
          posts. */}
      <section
        id="progress"
        className="mx-auto max-w-5xl w-full px-6 md:px-10 py-20 md:py-28 scroll-mt-24"
      >
        <Reveal className="flex items-baseline justify-between mb-12">
          <h2 className="font-serif text-3xl md:text-5xl">Progress</h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Latest {posts.length}
          </span>
        </Reveal>

        {posts.length === 0 ? (
          <p className="text-muted text-sm">No updates yet.</p>
        ) : (
          <ol className="relative">
            {posts.map((p, i) => {
              const isLast = i === posts.length - 1;
              return (
                <Reveal
                  as="li"
                  key={p.id}
                  /* small per-item stagger for the first few which may
                     be in the viewport together on initial load */
                  delay={i < 3 ? i * 0.08 : 0}
                  className={`relative pl-10 md:pl-14 ${isLast ? "" : "pb-12"}`}
                >
                  {/* Connector line — extends from this dot's center down
                      past this li and into the next li's top padding to
                      reach the next dot. Skipped on the last item. */}
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute left-[7px] top-[19px] bottom-[-12px] w-px bg-white/25"
                    />
                  )}

                  {/* Marker dot — concentric: thin outer ring + filled
                      center. Layered above the connector line so it
                      visually "stops" the track at this post. */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-3 z-10 flex items-center justify-center w-[15px] h-[15px] rounded-full bg-black border border-white/60"
                  >
                    <span className="w-[7px] h-[7px] rounded-full bg-white" />
                  </span>

                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted mb-3">
                    {formatDate(p.created_at)}
                  </p>
                  <article>
                    <h3 className="font-serif text-2xl md:text-3xl mb-3">
                      {p.title}
                    </h3>
                    <p className="text-sub text-[14px] leading-relaxed max-w-2xl whitespace-pre-wrap">
                      {p.content}
                    </p>
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="mt-6 w-full max-w-xl border border-line"
                      />
                    )}
                  </article>
                </Reveal>
              );
            })}
          </ol>
        )}
      </section>

      {/* GALLERY */}
      <section
        id="gallery"
        className="mx-auto max-w-5xl w-full px-6 md:px-10 py-20 md:py-28 scroll-mt-24"
      >
        <Reveal className="flex items-baseline justify-between mb-12">
          <h2 className="font-serif text-3xl md:text-5xl">Gallery</h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
            {galleryImages.length} images
          </span>
        </Reveal>

        {galleryImages.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Reveal key={i} delay={(i % 3) * 0.06}>
                <Placeholder index={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {galleryImages.map((img, i) => (
              <Reveal key={img.id} delay={(i % 3) * 0.06}>
                <img
                  src={img.url}
                  alt={img.caption}
                  className="aspect-square w-full object-cover border border-line"
                />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl w-full px-6 md:px-10 py-20 md:py-28">
        <Reveal className="mb-10 md:mb-14">
          <h2 className="font-serif text-4xl md:text-6xl">FAQ</h2>
        </Reveal>
        <FAQ />
      </section>

      {/* FOOTER */}
      <Reveal
        as="footer"
        className="mx-auto max-w-5xl w-full px-6 md:px-10 py-10 pb-24 md:pb-28 flex flex-col md:flex-row gap-4 md:gap-0 md:items-center md:justify-between"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          © {new Date().getFullYear()} · Self-Healing Mats
        </p>
        <Link
          to="/login"
          className="text-[11px] uppercase tracking-[0.18em] text-muted hover:text-white transition"
        >
          Collaborators →
        </Link>
      </Reveal>
    </div>
  );
}

function Placeholder({ index }: { index: number }) {
  // Subtle radial gradient stand-ins so the grid never looks broken.
  const angle = (index * 47) % 360;
  return (
    <div
      className="aspect-square w-full border border-line"
      style={{
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), rgba(255,255,255,0) 70%), conic-gradient(from ${angle}deg at 50% 50%, #0a0a0a, #111, #050505, #0a0a0a)`,
      }}
    />
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
