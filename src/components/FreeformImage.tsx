import { useEffect, useRef, useState } from "react";

/**
 * FreeformImage — a single draggable (and, for admins, resizable) image
 * panel that floats on top of the Home stage, independent of the
 * gallery/progress/about cards.
 *
 * Reuses StageCard's pixel-precise (non-snapping) drag math: deltas are
 * measured in raw pixels and converted to fractional grid cells, so the
 * image can land anywhere rather than snapping to the 32-px grid.
 *
 * Everyone can drag the image (admins reposition the default for all
 * visitors; non-admins only move it locally in their own browser — see
 * useLocalImageOverride, which decides what onMove ends up doing).
 * Only admins get the resize handle and the delete button, since those
 * actions are gated by RLS to admin-only writes anyway.
 */

const CELL = 32;
const MIN_W_CELLS = 2;
const MIN_H_CELLS = 2;

interface Props {
  id: string;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  canResize: boolean;
  canDelete: boolean;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onDelete?: () => void;
  onFocus?: () => void;
}

export default function FreeformImage({
  id,
  url,
  x,
  y,
  w,
  h,
  z,
  canResize,
  canDelete,
  onMove,
  onResize,
  onDelete,
  onFocus,
}: Props) {
  const dragRef = useRef<null | {
    kind: "move" | "resize";
    startX: number;
    startY: number;
    origA: number;
    origB: number;
  }>(null);
  const [ghost, setGhost] = useState<null | {
    x: number;
    y: number;
    w: number;
    h: number;
  }>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      // No rounding — full pixel precision, matching StageCard.
      const dx = (e.clientX - d.startX) / CELL;
      const dy = (e.clientY - d.startY) / CELL;
      if (d.kind === "move") {
        setGhost({
          x: Math.max(0, d.origA + dx),
          y: Math.max(0, d.origB + dy),
          w,
          h,
        });
      } else {
        setGhost({
          x,
          y,
          w: Math.max(MIN_W_CELLS, d.origA + dx),
          h: Math.max(MIN_H_CELLS, d.origB + dy),
        });
      }
    }
    function onMouseUp() {
      const d = dragRef.current;
      if (!d) return;
      const g = ghost;
      dragRef.current = null;
      setGhost(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (!g) return;
      if (d.kind === "move") onMove(g.x, g.y);
      else onResize(g.w, g.h);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [x, y, w, h, ghost, onMove, onResize]);

  function startDrag(kind: "move" | "resize", e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onFocus?.();
    dragRef.current = {
      kind,
      startX: e.clientX,
      startY: e.clientY,
      origA: kind === "move" ? x : w,
      origB: kind === "move" ? y : h,
    };
    setGhost({ x, y, w, h });
    document.body.style.userSelect = "none";
    document.body.style.cursor = kind === "move" ? "grabbing" : "nwse-resize";
  }

  const visibleX = ghost?.x ?? x;
  const visibleY = ghost?.y ?? y;
  const visibleW = ghost?.w ?? w;
  const visibleH = ghost?.h ?? h;

  return (
    <div
      data-freeform-image={id}
      className="pointer-events-auto group"
      style={{
        position: "absolute",
        left: `calc(var(--cell) * ${visibleX})`,
        top: `calc(var(--cell) * ${visibleY})`,
        width: `calc(var(--cell) * ${visibleW})`,
        height: `calc(var(--cell) * ${visibleH})`,
        zIndex: z,
        transition: ghost
          ? "none"
          : "left 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        onMouseDown={(e) => startDrag("move", e)}
        className="w-full h-full object-contain cursor-grab active:cursor-grabbing select-none"
      />

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Remove image"
          className="absolute -top-2 -right-2 flex items-center justify-center bg-[#1a1a1a] border border-white/15 text-white/50 hover:text-white transition opacity-0 group-hover:opacity-100"
          style={{ width: "22px", height: "22px", borderRadius: "2px" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden
          >
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>
      )}

      {canResize && (
        <button
          type="button"
          onMouseDown={(e) => startDrag("resize", e)}
          aria-label="Resize image"
          className="absolute bottom-0 right-0 flex items-end justify-end text-white/0 group-hover:text-white/70 transition bg-black/30"
          style={{ width: "20px", height: "20px", cursor: "nwse-resize" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden
          >
            <line x1="6" y1="18" x2="18" y2="6" />
            <line x1="11" y1="18" x2="18" y2="11" />
            <line x1="16" y1="18" x2="18" y2="16" />
          </svg>
        </button>
      )}
    </div>
  );
}
