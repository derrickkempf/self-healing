import { ReactNode } from "react";

/**
 * StageCard — a panel that "pops open on the stage" (the grid area).
 *
 * Layout (all measurements are multiples of --cell = 32px so the whole
 * card snaps cleanly onto the grid):
 *
 *   ┌───────────────────────────────────┐   ← 1px border, 2px radius
 *   │ LABEL                        [ × ]│   ← 32px header row
 *   ├───────────────────────────────────┤
 *   │                                   │
 *   │  content                          │
 *   │                                   │
 *   └───────────────────────────────────┘
 *
 * The header is a fixed 32px row (one grid cell tall) so multiple cards
 * side-by-side line up their headers. Card body flex-grows to fill the
 * column's available height. Content itself is scrollable if it overflows
 * — the header + X stay pinned at the top of the card.
 */

interface Props {
  id: string;
  label: string;
  onClose?: () => void;
  children: ReactNode;
  /** Optional extra classes on the outer card element. */
  className?: string;
}

export default function StageCard({
  id,
  label,
  onClose,
  children,
  className = "",
}: Props) {
  return (
    <section
      id={id}
      className={`
        relative flex flex-col
        border border-white/10 bg-black/60 backdrop-blur-sm
        scroll-mt-20
        ${className}
      `}
      style={{ borderRadius: "2px" }}
    >
      {/* Header — 32px tall (one grid cell). Label small-caps left, X close right. */}
      <header
        className="flex items-center justify-between border-b border-white/10 px-4"
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

      {/* Body — padded on all sides by one cell (32px). Flex-grows and
          scrolls vertically if content is tall. */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ padding: "var(--cell)" }}
      >
        {children}
      </div>
    </section>
  );
}
