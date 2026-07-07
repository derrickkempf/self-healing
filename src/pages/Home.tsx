import { useCallback, useEffect, useState } from "react";
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

  // Nav anchor links land as #about / #progress / #gallery. Listen to
  // the DOM hashchange event directly (rather than react-router's
  // useLocation) so clicking the same nav item twice — including "open a
  // card I just closed" — reliably re-fires. On each fire we open the
  // matching card and clear the hash, so a repeat click also works.
  useEffect(() => {
    function handle() {
      const hash = window.location.hash.replace("#", "") as CardId;
      if (!hash) return;
      if (ALL_CARDS.includes(hash)) {
        open(hash);
        // Give scrollIntoView a beat, then clear the hash so a second
        // click on the same link fires hashchange again.
        setTimeout(() => {
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }, 400);
      }
    }
    // Fire once on mount in case the page loaded with a hash already set.
    handle();
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, [open]);

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
  // Flex-wrap layout so each card respects its own width (set by the
  // user via the resize handle). Cards fall to a new row when they can't
  // fit horizontally. Padding + gap are always grid multiples so cards
  // remain snapped to the drafting grid.
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
