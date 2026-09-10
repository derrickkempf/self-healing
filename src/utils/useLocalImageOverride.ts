import { useCallback, useState } from "react";

/**
 * useLocalImageOverride — a per-visitor, browser-local position/size
 * override for a single freeform overlay image.
 *
 * The admin's placement (stored in Supabase, via `page_images`) is the
 * DEFAULT every visitor sees. When a non-admin visitor drags an image
 * to a new spot, that new position is remembered here — in THEIR OWN
 * browser's localStorage, keyed by page + image id — and takes over
 * from the default on every future visit from that same browser. It
 * never touches the database, so it's invisible to everyone else and
 * to the admin.
 */

export interface ImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useLocalImageOverride(
  page: string,
  id: string,
  base: ImageBox,
) {
  const key = `sh.freeform_img.${page}.${id}`;
  const [override, setOverride] = useState<ImageBox | null>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as ImageBox) : null;
    } catch {
      return null;
    }
  });

  const set = useCallback(
    (box: ImageBox) => {
      setOverride(box);
      try {
        localStorage.setItem(key, JSON.stringify(box));
      } catch {
        /* private browsing, storage full, etc. — override just won't persist */
      }
    },
    [key],
  );

  const reset = useCallback(() => {
    setOverride(null);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return { box: override ?? base, hasOverride: override !== null, set, reset };
}
