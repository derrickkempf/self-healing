import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SiteChrome from "../components/SiteChrome";
import StageCard from "../components/StageCard";
import {
  AboutContent,
  GalleryContent,
  ProgressContent,
} from "../components/StageCards";
import { listGalleryImages, listPosts, subscribe } from "../utils/supabase";
import type { GalleryImage, Post } from "../types";

/**
 * Public landing page.
 *
 * The "stage" (main content area between the chrome strips) hosts three
 * cards side-by-side on desktop — Gallery, Progress, About — matching the
 * order in the mockup. Each card has a close X in its header; clicking a
 * nav link in the top-left chrome reopens the corresponding card.
 *
 * Tablet: cards stack in a single column. Mobile: same, plus the top-left
 * nav becomes a hamburger drawer (handled inside SiteChrome).
 */

type CardId = "gallery" | "progress" | "about";
const ALL_CARDS: CardId[] = ["gallery", "progress", "about"];

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [openCards, setOpenCards] = useState<Set<CardId>>(
    new Set(ALL_CARDS),
  );

  // Load posts + subscribe to realtime.
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

  // Nav anchor links land as #about / #progress / #gallery. When the
  // hash changes we reopen the corresponding card (and scroll to it).
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const hash = location.hash.replace("#", "") as CardId;
    if (!hash) return;
    if (ALL_CARDS.includes(hash)) {
      open(hash);
      // Clear the hash so the same nav click can re-open a closed card.
      setTimeout(
        () => navigate(location.pathname, { replace: true }),
        400,
      );
    }
  }, [location.hash, location.pathname, navigate, open]);

  return (
    <SiteChrome variant="public">
      <StageGrid>
        {openCards.has("gallery") && (
          <StageCard id="gallery" label="Gallery" onClose={() => close("gallery")}>
            <GalleryContent images={images} />
          </StageCard>
        )}
        {openCards.has("progress") && (
          <StageCard id="progress" label="Progress" onClose={() => close("progress")}>
            <ProgressContent posts={posts} />
          </StageCard>
        )}
        {openCards.has("about") && (
          <StageCard id="about" label="About" onClose={() => close("about")}>
            <AboutContent />
          </StageCard>
        )}
      </StageGrid>
    </SiteChrome>
  );
}

/**
 * Layout shell for the cards on the stage.
 *
 * Desktop (xl+): 3 columns, each card fills the full available height of
 * the viewport minus the chrome bars, and scrolls its own content.
 * Tablet / mobile: cards stack vertically, each takes its natural height.
 * All gaps and paddings are multiples of --cell (32px) so the whole
 * stage grid aligns to the drafting grid.
 */
function StageGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        flex flex-col
        xl:grid xl:grid-cols-3 xl:h-[calc(100vh-var(--cell)*4)]
      "
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
