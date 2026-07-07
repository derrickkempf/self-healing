import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import SiteChrome from "../components/SiteChrome";
import StageCard from "../components/StageCard";
import {
  AboutContent,
  GalleryContent,
  ProgressContent,
} from "../components/StageCards";
import { useStageLayout, type CardLayout } from "../utils/useStageLayout";
import { listGalleryImages, listPosts, subscribe } from "../utils/supabase";
import type { GalleryImage, Post } from "../types";

/**
 * Public landing page.
 *
 * Layout modes:
 *   • Desktop (≥1280 px) — cards are absolutely positioned on a stage.
 *     Users can drag them by the header, resize from the bottom-right
 *     corner. Positions + sizes persist to localStorage per browser.
 *   • Tablet / mobile — cards fall back to inline flow (flex-wrap),
 *     stacked in the source order below (about, progress, gallery). No
 *     drag; users just scroll.
 *
 * Cards can be closed via their header X. Clicking the matching nav
 * item reopens them.
 */

type CardId = "gallery" | "progress" | "about";
const ALL_CARDS: CardId[] = ["gallery", "progress", "about"];

const INITIAL_LAYOUT: CardLayout = {
  // (x, y, w, h) in grid cells. Three cards laid out horizontally at
  // 16 cells wide (512 px) × 22 cells tall (704 px) — enough width for
  // the progress-card body to read comfortably.
  gallery: { x: 0, y: 0, w: 16, h: 22, z: 1 },
  progress: { x: 16, y: 0, w: 16, h: 22, z: 2 },
  about: { x: 32, y: 0, w: 16, h: 22, z: 3 },
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [openCards, setOpenCards] = useState<Set<CardId>>(
    new Set(ALL_CARDS),
  );

  const { layout, isDesktop, moveCard, resizeCard, focusCard } =
    useStageLayout({
      storageKey: "sh.layout.home",
      initial: INITIAL_LAYOUT,
    });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await listPosts(20);
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
      if (!cancelled) setImages(rows);
    }
    load();
    const unsub = subscribe("gallery", load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const close = useCallback((id: CardId) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const open = useCallback((id: CardId) => {
    setOpenCards((prev) => new Set(prev).add(id));
  }, []);

  // Listen to both react-router location changes AND raw hashchange
  // events. Router changes fire when the user comes from another page
  // via Link (e.g., /settings → /#about); hashchange fires when the
  // same-page nav item is clicked repeatedly. Belt + suspenders.
  const location = useLocation();
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as CardId;
    if (!hash) return;
    if (ALL_CARDS.includes(hash)) {
      open(hash);
      setTimeout(() => {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }, 400);
    }
  }, [location.key, open]);
  useEffect(() => {
    function handle() {
      const hash = window.location.hash.replace("#", "") as CardId;
      if (hash && ALL_CARDS.includes(hash)) {
        open(hash);
      }
    }
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, [open]);

  // Container min-height grows to accommodate the lowest-hanging card.
  const maxBottom = Math.max(
    24,
    ...Object.values(layout).map((b) => b.y + b.h),
  );

  return (
    <SiteChrome variant="public">
      <StageArea isDesktop={isDesktop} minCells={maxBottom + 2}>
        {openCards.has("gallery") && (
          <StageCard
            id="gallery"
            label="Gallery"
            onClose={() => close("gallery")}
            {...(isDesktop
              ? {
                  x: layout.gallery.x,
                  y: layout.gallery.y,
                  w: layout.gallery.w,
                  h: layout.gallery.h,
                  zIndex: layout.gallery.z,
                  onMove: (x, y) => moveCard("gallery", x, y),
                  onResize: (w, h) => resizeCard("gallery", w, h),
                  onFocus: () => focusCard("gallery"),
                }
              : {})}
          >
            <GalleryContent images={images} />
          </StageCard>
        )}
        {openCards.has("progress") && (
          <StageCard
            id="progress"
            label="Progress"
            onClose={() => close("progress")}
            {...(isDesktop
              ? {
                  x: layout.progress.x,
                  y: layout.progress.y,
                  w: layout.progress.w,
                  h: layout.progress.h,
                  zIndex: layout.progress.z,
                  onMove: (x, y) => moveCard("progress", x, y),
                  onResize: (w, h) => resizeCard("progress", w, h),
                  onFocus: () => focusCard("progress"),
                }
              : {})}
          >
            <ProgressContent posts={posts} />
          </StageCard>
        )}
        {openCards.has("about") && (
          <StageCard
            id="about"
            label="About"
            onClose={() => close("about")}
            {...(isDesktop
              ? {
                  x: layout.about.x,
                  y: layout.about.y,
                  w: layout.about.w,
                  h: layout.about.h,
                  zIndex: layout.about.z,
                  onMove: (x, y) => moveCard("about", x, y),
                  onResize: (w, h) => resizeCard("about", w, h),
                  onFocus: () => focusCard("about"),
                }
              : {})}
          >
            <AboutContent />
          </StageCard>
        )}
      </StageArea>
    </SiteChrome>
  );
}

/**
 * Stage container — absolute positioning host on desktop, flex-wrap
 * fallback on smaller screens. minCells grows with the layout so
 * dragged-below cards don't fall off the bottom of a fixed-height stage.
 */
function StageArea({
  children,
  isDesktop,
  minCells,
}: {
  children: React.ReactNode;
  isDesktop: boolean;
  minCells: number;
}) {
  if (isDesktop) {
    return (
      <div
        className="relative"
        style={{
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
          minHeight: `calc(var(--cell) * ${minCells})`,
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className="flex flex-wrap items-start"
      style={{
        gap: "var(--cell)",
        paddingLeft: "var(--cell)",
        paddingRight: "var(--cell)",
        paddingBottom: "calc(var(--cell) * 7)",
      }}
    >
      {children}
    </div>
  );
}
