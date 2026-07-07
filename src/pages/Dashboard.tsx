import { useCallback, useEffect, useState } from "react";
import SiteChrome from "../components/SiteChrome";
import StageCard from "../components/StageCard";
import {
  AboutContent,
  GalleryContent,
  MessagingContent,
  NewPostContent,
  ProgressContent,
} from "../components/StageCards";
import { listGalleryImages, listPosts, subscribe } from "../utils/supabase";
import { useAuth } from "../utils/useAuth";
import type { GalleryImage, Post } from "../types";

/**
 * Signed-in "Home". Same card-on-stage layout as the public / — About,
 * Progress, Gallery — plus a Messaging card and a New Update composer
 * visible only to collaborators. All cards can be closed via their header
 * X and reopened by clicking the corresponding nav link.
 */
type CardId =
  | "about"
  | "progress"
  | "gallery"
  | "messaging"
  | "compose";

const ALL_CARDS: CardId[] = [
  "compose",
  "progress",
  "gallery",
  "messaging",
  "about",
];

export default function Dashboard() {
  const { session } = useAuth();
  const email = session?.email ?? "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [openCards, setOpenCards] = useState<Set<CardId>>(
    // Default to Progress + Messaging + compose open, others available.
    new Set<CardId>(["compose", "progress", "messaging"]),
  );

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

  useEffect(() => {
    function handle() {
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
    }
    handle();
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, [open]);

  return (
    <SiteChrome variant="private">
      {/* Flex-wrap layout so each card can be resized independently and
          snaps to the underlying grid. Cards drop to a new row when they
          can't fit horizontally. */}
      <div
        className="flex flex-wrap items-start"
        style={{
          gap: "var(--cell)",
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
        }}
      >
        {openCards.has("compose") && (
          <StageCard
            id="compose"
            label="New Update"
            onClose={() => close("compose")}
          >
            <NewPostContent authorEmail={email} />
          </StageCard>
        )}
        {openCards.has("progress") && (
          <StageCard
            id="progress"
            label="Progress"
            onClose={() => close("progress")}
          >
            <ProgressContent posts={posts} />
          </StageCard>
        )}
        {openCards.has("messaging") && (
          <StageCard
            id="messaging"
            label="Messaging"
            onClose={() => close("messaging")}
          >
            <MessagingContent currentEmail={email} />
          </StageCard>
        )}
        {openCards.has("gallery") && (
          <StageCard
            id="gallery"
            label="Gallery"
            onClose={() => close("gallery")}
          >
            <GalleryContent images={images} />
          </StageCard>
        )}
        {openCards.has("about") && (
          <StageCard id="about" label="About" onClose={() => close("about")}>
            <AboutContent />
          </StageCard>
        )}
      </div>
    </SiteChrome>
  );
}
