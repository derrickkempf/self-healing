import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * StageCard — a draggable, resizable panel that lives on the stage grid.
 *
 * Two modes:
 *   • Anchored: on tablet & mobile, or if the parent doesn't pass
 *     position props, the card renders as an inline flex item. No drag,
 *     no absolute positioning. Users just see a snug list of cards.
 *   • Free-form: on desktop, the parent passes { x, y, w, h } in cells
 *     and { onMove, onResize } handlers. The card sits absolutely inside
 *     a stage container. Users drag the header to move; drag the
 *     bottom-right handle to resize. Both actions snap to the 32-px
 *     grid on mouseup.
 *
 * Header layout:
 *   [ LABEL                                    × ]
 *   flush-right X (no padding), left label with grid-aligned inset.
 *
 * Everything is a multiple of --cell (32 px) so panels stay on the grid.
 */

const CELL = 32;
const MIN_W_CELLS = 6; // 192 px
const MIN_H_CELLS = 8; // 256 px

interface Props {
  id: string;
  label: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;

  /** Free-form positioning (in cells). If any of these is undefined the
      card renders in anchored mode (in-flow, no drag). */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  onMove?: (x: number, y: number) => void;
  onResize?: (w: number, h: number) => void;
  /** Called on drag start so the parent can bring this card to the front
      (higher z-index). */
  onFocus?: () => void;
  zIndex?: number;
}

export default function StageCard({
  id,
  label,
  onClose,
  children,
  className = "",
  x,
  y,
  w,
  h,
  onMove,
  onResize,
  onFocus,
  zIndex,
}: Props) {
  const freeForm =
    x !== undefined &&
    y !== undefined &&
    w !== undefined &&
    h !== undefined &&
    onMove &&
    onResize;

  // Live drag/resize state — mutated during pointer moves, committed to
  // the parent on mouseup.
  const dragRef = useRef<null | {
    kind: "move" | "resize";
    startX: number;
    startY: number;
    origA: number; // origX or origW
    origB: number; // origY or origH
  }>(null);
  const [ghost, setGhost] = useState<null | {
    x: number;
    y: number;
    w: number;
    h: number;
  }>(null);

  useEffect(() => {
    if (!freeForm) return;
    function onMouseMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = Math.round((e.clientX - d.startX) / CELL);
      const dy = Math.round((e.clientY - d.startY) / CELL);
      if (d.kind === "move") {
        setGhost({
          x: Math.max(0, d.origA + dx),
          y: Math.max(0, d.origB + dy),
          w: w!,
          h: h!,
        });
      } else {
        setGhost({
          x: x!,
          y: y!,
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
      if (d.kind === "move") onMove?.(g.x, g.y);
      else onResize?.(g.w, g.h);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [freeForm, x, y, w, h, ghost, onMove, onResize]);

  function startDrag(kind: "move" | "resize", e: React.MouseEvent) {
    if (!freeForm) return;
    e.preventDefault();
    onFocus?.();
    dragRef.current = {
      kind,
      startX: e.clientX,
      startY: e.clientY,
      origA: kind === "move" ? x! : w!,
      origB: kind === "move" ? y! : h!,
    };
    setGhost({ x: x!, y: y!, w: w!, h: h! });
    document.body.style.userSelect = "none";
    document.body.style.cursor = kind === "move" ? "grabbing" : "nwse-resize";
  }

  // Compose the outer style — either absolute (free-form) or inline flex.
  const visibleX = ghost?.x ?? x;
  const visibleY = ghost?.y ?? y;
  const visibleW = ghost?.w ?? w;
  const visibleH = ghost?.h ?? h;

  const baseStyle: React.CSSProperties = freeForm
    ? {
        position: "absolute",
        left: `calc(var(--cell) * ${visibleX})`,
        top: `calc(var(--cell) * ${visibleY})`,
        width: `calc(var(--cell) * ${visibleW})`,
        height: `calc(var(--cell) * ${visibleH})`,
        zIndex,
        borderRadius: "2px",
        background: "#1a1a1a",
        transition: ghost
          ? "none"
          : "left 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }
    : {
        // Non-desktop (mobile/tablet) mode: fill the flex row (parent
        // has 1-cell padding on both sides, so the card's edges land
        // on grid lines). Height is capped at 20 cells so a card with
        // a lot of content — like the gallery or a long Progress feed
        // — scrolls INSIDE the card instead of stretching the page.
        borderRadius: "2px",
        background: "#1a1a1a",
        width: "100%",
        maxHeight: "calc(var(--cell) * 20)",
      };

  return (
    <section
      id={id}
      data-card={id}
      // pointer-events-auto opts the card back in — its parent wrapper
      // in SiteChrome has pointer-events: none so gaps between cards
      // pass clicks through to the logo underneath.
      className={`stage-card flex flex-col border border-white/15 pointer-events-auto ${className}`}
      style={baseStyle}
    >
      {/* Header — drag handle in free-form mode. */}
      <header
        onMouseDown={freeForm ? (e) => startDrag("move", e) : undefined}
        className={`
          flex items-stretch justify-between border-b border-white/15 shrink-0 select-none
          ${freeForm ? "cursor-grab active:cursor-grabbing" : ""}
        `}
        style={{ height: "var(--cell)" }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.28em] text-white/70 flex items-center pl-4"
        >
          {label}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={`Close ${label}`}
            // Flush against the right edge — no horizontal padding, just
            // a 32-px hit-target square that matches the header height.
            className="text-white/50 hover:text-white transition flex items-center justify-center border-l border-white/15"
            style={{ width: "var(--cell)", height: "var(--cell)" }}
          >
            <svg
              width="14"
              height="14"
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
      </header>

      <div
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ padding: "var(--cell)" }}
      >
        {children}
      </div>

      {/* Custom resize handle — bottom-right, 24×24 hit area, chevron
          glyph. Only rendered in free-form mode. */}
      {freeForm && (
        <button
          type="button"
          onMouseDown={(e) => startDrag("resize", e)}
          aria-label={`Resize ${label}`}
          className="absolute bottom-0 right-0 flex items-end justify-end text-white/40 hover:text-white/80 transition"
          style={{
            width: "24px",
            height: "24px",
            cursor: "nwse-resize",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden
          >
            <line x1="6" y1="18" x2="18" y2="6" />
            <line x1="11" y1="18" x2="18" y2="11" />
            <line x1="16" y1="18" x2="18" y2="16" />
          </svg>
        </button>
      )}
    </section>
  );
}
