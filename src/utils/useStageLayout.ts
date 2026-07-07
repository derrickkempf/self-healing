import { useCallback, useEffect, useState } from "react";

/**
 * useStageLayout — per-card position/size state for the free-form stage.
 *
 * Each card has (x, y, w, h) in grid cells + a z-index (for focus/bring
 * to front). The layout persists to localStorage under a namespaced key
 * so returning users see their previous arrangement.
 *
 * Also exposes an `isDesktop` flag — the caller uses free-form on
 * desktop (>= 1280 px) and falls back to inline flow below that width.
 */

export interface CardBox {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}
export type CardLayout = Record<string, CardBox>;

interface Options {
  /** Namespace for localStorage; different per page (home vs dashboard). */
  storageKey: string;
  /** Initial layout used the first time this page loads. */
  initial: CardLayout;
}

export function useStageLayout({ storageKey, initial }: Options) {
  const [layout, setLayout] = useState<CardLayout>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with initial so newly-added cards get sensible defaults.
        return { ...initial, ...parsed };
      }
    } catch {
      /* ignore */
    }
    return initial;
  });
  const [maxZ, setMaxZ] = useState<number>(() =>
    Math.max(0, ...Object.values(layout).map((b) => b.z ?? 0)),
  );
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1280px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      /* private mode etc. */
    }
  }, [layout, storageKey]);

  const moveCard = useCallback((id: string, x: number, y: number) => {
    setLayout((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { w: 12, h: 20, z: 1 }), x, y },
    }));
  }, []);

  const resizeCard = useCallback((id: string, w: number, h: number) => {
    setLayout((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { x: 0, y: 0, z: 1 }), w, h },
    }));
  }, []);

  const focusCard = useCallback((id: string) => {
    setMaxZ((prev) => {
      const next = prev + 1;
      setLayout((l) => ({
        ...l,
        [id]: { ...(l[id] ?? { x: 0, y: 0, w: 12, h: 20 }), z: next },
      }));
      return next;
    });
  }, []);

  return { layout, isDesktop, moveCard, resizeCard, focusCard };
}
