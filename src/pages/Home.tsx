import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteChrome from "../components/SiteChrome";
import Reveal from "../components/Reveal";
import FAQ from "../components/FAQ";
import { listGalleryImages, listPosts, subscribe } from "../utils/supabase";
import type { GalleryImage, Post } from "../types";

/**
 * Public landing page.
 *
 * Desktop layout (xl+): three columns side-by-side inside the content
 * area — Gallery on the left, Process in the middle, About on the right.
 * Each column is independently scrollable so the chrome (nav, logo,
 * footer) stays put.
 *
 * Tablet/mobile: the three sections stack in a single column (About →
 * Process → Gallery), and the whole page scrolls.
 *
 * Content:
 *   About    — hero (title, description, CTA) + FAQ
 *   Process  — vertical progress-bar timeline of posts
 *   Gallery  — grid of images
 *
 * The Progress timeline is driven by Supabase in realtime — new posts
 * created from /dashboard land here without a refresh.
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
    <SiteChrome variant="public">
      {/* Column direction flipped to RTL per the user request: About is now
          the visual-left column on desktop, Gallery is on the right.
          Reading order also flows right-to-left, so a visitor's eye lands
          on the primary intro (About) first — mirroring the site's
          overall top-right anchor. On tablet/mobile the columns stack in
          reverse source order (Gallery → Process → About, top to bottom)
          via `flex-col-reverse` at the sub-xl breakpoints. */}
      <div
        className="
          flex flex-col-reverse gap-6
          xl:grid xl:grid-cols-3 xl:gap-10
        "
        style={{
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
        }}
      >
        <Column id="about" label="About">
          <AboutContent />
        </Column>

        <Column id="process" label="Process">
          <ProcessContent posts={posts} />
        </Column>

        <Column id="gallery" label="Gallery">
          <GalleryContent images={galleryImages} />
        </Column>
      </div>
    </SiteChrome>
  );
}

// ============================================================================
// Column shell — used for all three content regions on the landing page.
// ============================================================================

function Column({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="
        relative scroll-mt-20
        xl:h-[calc(100vh-var(--cell)*4)]
        xl:overflow-y-auto xl:scrollbar-thin xl:pr-2
      "
    >
      <Reveal className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">
          {label}
        </p>
      </Reveal>
      {children}
    </section>
  );
}

// ============================================================================
// About column — hero copy + FAQ
// ============================================================================

function AboutContent() {
  return (
    <div>
      <Reveal
        as="h1"
        delay={0.05}
        className="font-serif text-4xl md:text-6xl xl:text-5xl 2xl:text-6xl leading-[0.95] mb-6"
      >
        Self-Healing
        <br />
        <span className="italic text-white/60">Mats.</span>
      </Reveal>
      <Reveal
        as="p"
        delay={0.15}
        className="text-white/70 text-[13px] leading-relaxed mb-8"
      >
        A living journal of the materials, methods and milestones behind
        Self-Healing — a small-batch elastomer mat designed to mend itself.
        Updates land here as the line moves.
      </Reveal>
      <Reveal delay={0.25} className="mb-12">
        <Link
          to="/login"
          className="inline-block border border-white/70 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition"
        >
          Access Insights →
        </Link>
      </Reveal>

      <Reveal className="mt-16 mb-6">
        <h2 className="font-serif text-3xl md:text-4xl">FAQ</h2>
      </Reveal>
      <FAQ />
    </div>
  );
}

// ============================================================================
// Process column — vertical progress-bar timeline of posts
// ============================================================================

function ProcessContent({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="text-white/40 text-sm">No updates yet.</p>;
  }

  return (
    <ol className="relative">
      {posts.map((p, i) => {
        const isLast = i === posts.length - 1;
        return (
          <Reveal
            as="li"
            key={p.id}
            delay={i < 3 ? i * 0.08 : 0}
            className={`relative pl-8 ${isLast ? "" : "pb-10"}`}
          >
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[7px] top-[19px] bottom-[-12px] w-px bg-white/25"
              />
            )}
            <span
              aria-hidden
              className="absolute left-0 top-3 z-10 flex items-center justify-center w-[15px] h-[15px] rounded-full bg-black border border-white/60"
            >
              <span className="w-[7px] h-[7px] rounded-full bg-white" />
            </span>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">
              {formatDate(p.created_at)}
            </p>
            <article>
              <h3 className="font-serif text-xl md:text-2xl mb-2">{p.title}</h3>
              <p className="text-white/70 text-[13px] leading-relaxed whitespace-pre-wrap">
                {p.content}
              </p>
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.title}
                  className="mt-4 w-full border border-white/10"
                />
              )}
            </article>
          </Reveal>
        );
      })}
    </ol>
  );
}

// ============================================================================
// Gallery column — image grid (2 columns inside the column)
// ============================================================================

function GalleryContent({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Reveal key={i} delay={(i % 2) * 0.05}>
            <Placeholder index={i} />
          </Reveal>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((img, i) => (
        <Reveal key={img.id} delay={(i % 2) * 0.05}>
          <img
            src={img.url}
            alt={img.caption}
            className="aspect-square w-full object-cover border border-white/10"
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
      className="aspect-square w-full border border-white/10"
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
