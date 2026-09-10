import { useCallback, useEffect, useRef, useState } from "react";
import { useIsAdmin } from "../utils/useIsAdmin";
import { useLocalImageOverride } from "../utils/useLocalImageOverride";
import {
  addPageImage,
  listPageImages,
  removePageImage,
  subscribe,
  updatePageImage,
} from "../utils/supabase";
import type { PageImage } from "../types";
import FreeformImage from "./FreeformImage";

/**
 * FreeformImageLayer — the freeform image overlay for a public page.
 *
 * Admins see a small "+ Add Image" trigger. Uploading drops a new image
 * onto the stage at a sensible default spot; admins can then drag/resize
 * it, and that position is the DEFAULT every visitor sees (saved to
 * Supabase via updatePageImage).
 *
 * Non-admin visitors can still drag an image — that just nudges a
 * purely local override (localStorage, per browser) on top of the
 * admin's default. It never touches the database, so it's invisible to
 * anyone else, including the admin.
 *
 * Desktop-only, same trade-off StageCard already makes for the card
 * grid: free-form absolute positioning needs real drag space, so on
 * mobile/tablet the layer simply doesn't render.
 */

const DEFAULT_W = 10;
const DEFAULT_H = 10;

export default function FreeformImageLayer({
  page,
  isDesktop,
  onMaxBottomChange,
}: {
  page: string;
  isDesktop: boolean;
  /** Called with the lowest edge (in cells) of any placed image,
   *  whenever the image list changes — so the page hosting this layer
   *  can grow its own height (and, with it, the grid/background) to
   *  keep covering images placed further down than the cards alone
   *  would require. */
  onMaxBottomChange?: (cells: number) => void;
}) {
  const { isAdmin } = useIsAdmin();
  const [images, setImages] = useState<PageImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxZ, setMaxZ] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await listPageImages(page);
      if (cancelled) return;
      setImages(rows);
      setMaxZ((prev) => Math.max(prev, ...rows.map((r) => r.z), 1));
    }
    load();
    const unsub = subscribe("page_images", load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [page]);

  // Report the lowest image edge back up to the page so its container
  // (and therefore the grid background, which fills that container)
  // can grow to keep including it. Images are absolutely positioned,
  // so they'd otherwise overflow silently past a container sized only
  // for the cards, with the grid/background stopping short above them.
  useEffect(() => {
    if (!onMaxBottomChange) return;
    const bottom = images.reduce((max, img) => Math.max(max, img.y + img.h), 0);
    onMaxBottomChange(bottom);
  }, [images, onMaxBottomChange]);

  const focusImage = useCallback((id: string) => {
    setMaxZ((prev) => {
      const next = prev + 1;
      // Bump the local z immediately so the dragged image renders on
      // top; the server write below will keep it that way for everyone
      // once it lands.
      setImages((imgs) =>
        imgs.map((img) => (img.id === id ? { ...img, z: next } : img)),
      );
      void updatePageImage(id, { z: next });
      return next;
    });
  }, []);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image is over 4 MB — please use a smaller file.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(r.error);
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      const { error: err } = await addPageImage({
        page,
        url: dataUrl,
        x: 2,
        y: 2,
        w: DEFAULT_W,
        h: DEFAULT_H,
      });
      if (err) setError(err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    const { error: err } = await removePageImage(id);
    if (err) setError(err);
  }

  // Desktop-only: free-form absolute positioning needs real drag space,
  // matching the existing card-grid trade-off.
  if (!isDesktop) return null;

  return (
    <>
      {images.map((img) => (
        <FreeformImageItem
          key={img.id}
          page={page}
          image={img}
          isAdmin={isAdmin}
          onFocus={() => focusImage(img.id)}
          onDelete={() => handleDelete(img.id)}
        />
      ))}

      {isAdmin && (
        <div
          className="pointer-events-auto absolute"
          style={{ left: "var(--cell)", bottom: "var(--cell)", zIndex: maxZ + 1000 }}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border border-dashed border-white/30 hover:border-white/70 transition px-4 py-2 bg-[#0a0a0a] text-[10px] uppercase tracking-[0.22em] text-white/70 hover:text-white"
          >
            {uploading ? "Uploading…" : "+ Add Image"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
          {error && (
            <p className="mt-2 text-[11px] text-red-300/90 max-w-[240px]">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}

/** One overlay image + its local-override state. Split into its own
 *  component so each image gets its own useLocalImageOverride hook call
 *  (can't call hooks inside a .map loop directly). */
function FreeformImageItem({
  page,
  image,
  isAdmin,
  onFocus,
  onDelete,
}: {
  page: string;
  image: PageImage;
  isAdmin: boolean;
  onFocus: () => void;
  onDelete: () => void;
}) {
  const base = { x: image.x, y: image.y, w: image.w, h: image.h };
  const { box, set: setLocal } = useLocalImageOverride(page, image.id, base);

  function handleMove(x: number, y: number) {
    if (isAdmin) {
      void updatePageImage(image.id, { x, y });
    } else {
      setLocal({ ...box, x, y });
    }
  }

  function handleResize(w: number, h: number) {
    // Resize is admin-only (the resize handle only renders for admins —
    // see FreeformImage's canResize prop), so this always commits to
    // the shared default.
    void updatePageImage(image.id, { w, h });
  }

  return (
    <FreeformImage
      id={image.id}
      url={image.url}
      x={box.x}
      y={box.y}
      w={box.w}
      h={box.h}
      z={image.z}
      canResize={isAdmin}
      canDelete={isAdmin}
      onMove={handleMove}
      onResize={handleResize}
      onDelete={onDelete}
      onFocus={onFocus}
    />
  );
}
