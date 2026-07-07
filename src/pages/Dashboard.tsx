import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import SiteChrome from "../components/SiteChrome";
import StageCard from "../components/StageCard";
import {
  AboutContent,
  ContentAdminContent,
  GalleryContent,
  MessagingContent,
  NewPostContent,
  ProgressContent,
} from "../components/StageCards";
import { useStageLayout, type CardLayout } from "../utils/useStageLayout";
import { listGalleryImages, listPosts, subscribe } from "../utils/supabase";
import { useAuth } from "../utils/useAuth";
import type { GalleryImage, Post } from "../types";

/**
 * Signed-in dashboard. Uses the same free-form-on-desktop /
 * flow-on-smaller-screens stage layout as the public Home, plus a
 * Messaging card and a New Update composer only collaborators see.
 * Wider default panel sizes than the public page so chat + compose
 * forms don't feel truncated.
 */

type CardId =
  | "compose"
  | "progress"
  | "gallery"
  | "messaging"
  | "about"
  | "content";
const ALL_CARDS: CardId[] = [
  "compose",
  "progress",
  "gallery",
  "messaging",
  "about",
  "content",
];

const INITIAL_LAYOUT: CardLayout = {
  // Top row — Compose | Progress | Messaging — 1-cell gaps between all
  // three so nothing overlaps on first open. Widths tuned so the row
  // fits inside a 1440 px viewport (12 + 1 + 14 + 1 + 15 = 43 cells =
  // 1376 px, then 32 px right chrome).
  compose: { x: 0, y: 0, w: 12, h: 18, z: 1 },
  progress: { x: 13, y: 0, w: 14, h: 22, z: 2 },
  messaging: { x: 28, y: 0, w: 15, h: 22, z: 3 },
  // Bottom row — Gallery | About | Content — 1-cell gaps between them,
  // and a 1-cell vertical gap below the tallest top-row card
  // (progress/messaging = 22). Content is closed by default; users
  // reopen it via the "Content" nav item when they want to edit copy.
  gallery: { x: 0, y: 23, w: 14, h: 20, z: 4 },
  about: { x: 15, y: 23, w: 14, h: 20, z: 5 },
  content: { x: 30, y: 23, w: 18, h: 26, z: 6 },
};

export default function Dashboard() {
  const { session } = useAuth();
  const email = session?.email ?? "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [openCards, setOpenCards] = useState<Set<CardId>>(
    // Default open: compose + progress + messaging (the collaborator
    // workflow). About and Gallery are one nav-click away.
    new Set<CardId>(["compose", "progress", "messaging"]),
  );

  const { layout, isDesktop, moveCard, resizeCard, focusCard } =
    useStageLayout({
      storageKey: "sh.layout.dashboard.v3",
      initial: INITIAL_LAYOUT,
    });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await listPosts(50);
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
    function handleHash() {
      const hash = window.location.hash.replace("#", "") as CardId;
      if (hash && ALL_CARDS.includes(hash)) {
        open(hash);
      }
    }
    function handleEvent(e: Event) {
      const id = (e as CustomEvent<string>).detail as CardId;
      if (ALL_CARDS.includes(id)) open(id);
    }
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("sh:open-card", handleEvent);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("sh:open-card", handleEvent);
    };
  }, [open]);

  const maxBottom = Math.max(
    24,
    ...Object.values(layout).map((b) => b.y + b.h),
  );

  // Card factory that wires the desktop free-form props for a given id.
  function freeFormProps(id: CardId) {
    if (!isDesktop) return {};
    const box = layout[id];
    if (!box) return {};
    return {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      zIndex: box.z,
      onMove: (x: number, y: number) => moveCard(id, x, y),
      onResize: (w: number, h: number) => resizeCard(id, w, h),
      onFocus: () => focusCard(id),
    };
  }

  return (
    <SiteChrome variant="private">
      <div
        className={isDesktop ? "relative" : "flex flex-wrap items-start"}
        style={{
          gap: isDesktop ? undefined : "var(--cell)",
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
          minHeight: isDesktop ? `calc(var(--cell) * ${maxBottom + 2})` : undefined,
        }}
      >
        {openCards.has("compose") && (
          <StageCard
            id="compose"
            label="New Update"
            onClose={() => close("compose")}
            {...freeFormProps("compose")}
          >
            <NewPostContent authorEmail={email} />
          </StageCard>
        )}
        {openCards.has("progress") && (
          <StageCard
            id="progress"
            label="Progress"
            onClose={() => close("progress")}
            {...freeFormProps("progress")}
          >
            <ProgressContent posts={posts} currentEmail={email} />
          </StageCard>
        )}
        {openCards.has("messaging") && (
          <StageCard
            id="messaging"
            label="Messaging"
            onClose={() => close("messaging")}
            {...freeFormProps("messaging")}
          >
            <MessagingContent currentEmail={email} />
          </StageCard>
        )}
        {openCards.has("gallery") && (
          <StageCard
            id="gallery"
            label="Gallery"
            onClose={() => close("gallery")}
            {...freeFormProps("gallery")}
          >
            <GalleryContent images={images} />
          </StageCard>
        )}
        {openCards.has("about") && (
          <StageCard
            id="about"
            label="About"
            onClose={() => close("about")}
            {...freeFormProps("about")}
          >
            <AboutContent />
          </StageCard>
        )}
        {openCards.has("content") && (
          <StageCard
            id="content"
            label="Content"
            onClose={() => close("content")}
            {...freeFormProps("content")}
          >
            <ContentAdminContent />
          </StageCard>
        )}
      </div>
    </SiteChrome>
  );
}
