import { ReactNode, useEffect, useRef } from "react";

/**
 * StageCard — a resizable panel that "pops open on the stage" (the grid).
 *
 *   ┌───────────────────────────────────┐   ← 1px border
 *   │ LABEL                        [ × ]│   ← 32px header row
 *   ├───────────────────────────────────┤
 *   │                                   │
 *   │  content                          │
 *   │                                   │
 *   │                              ⌟   │   ← native browser resize handle
 *   └───────────────────────────────────┘
 *
 * `resize: both` gives the browser's native resize handle at the
 * bottom-right corner. After the user releases the mouse, a document-
 * level mouseup listener snaps the card's width and height to the
 * nearest --cell multiple (32 px) so everything stays aligned to the
 * drafting grid. Min sizes are also expressed in cells.
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
}

export default function StageCard({
  id,
  label,
  onClose,
  children,
  className = "",
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Snap the card to the grid on every document mouseup while this card
  // is mounted. Cheap — only fires per click, and only touches this
  // card's inline style if the dimensions differ from a grid multiple.
  useEffect(() => {
    function snap() {
      const el = cardRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const snappedW = Math.max(MIN_W_CELLS * CELL, Math.round(w / CELL) * CELL);
      const snappedH = Math.max(MIN_H_CELLS * CELL, Math.round(h / CELL) * CELL);
      if (snappedW !== w) el.style.width = `${snappedW}px`;
      if (snappedH !== h) el.style.height = `${snappedH}px`;
    }
    document.addEventListener("mouseup", snap);
    return () => document.removeEventListener("mouseup", snap);
  }, []);

  return (
    <section
      id={id}
      ref={cardRef}
      data-card={id}
      className={`
        stage-card relative flex flex-col
        border border-white/15
        scroll-mt-20
        ${className}
      `}
      style={{
        borderRadius: "2px",
        // Resizable via native browser corner handle.
        resize: "both",
        overflow: "hidden",
        // Sensible defaults (7 cells wide × 16 cells tall = 224 × 512 px)
        // that also match the mockup card proportions.
        width: "calc(var(--cell) * 8)",
        height: "calc(var(--cell) * 18)",
        minWidth: `${MIN_W_CELLS * CELL}px`,
        minHeight: `${MIN_H_CELLS * CELL}px`,
        background: "#1a1a1a",
        transition:
          "width 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <header
        className="flex items-center justify-between border-b border-white/15 px-4 shrink-0"
        style={{ height: "var(--cell)" }}
      >
        <span className="text-[10px] uppercase tracking-[0.28em] text-white/70">
          {label}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${label}`}
            className="p-1 text-white/50 hover:text-white transition"
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
    </section>
  );
}
