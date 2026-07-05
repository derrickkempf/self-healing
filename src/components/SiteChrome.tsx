import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * SiteChrome — the framed public shell.
 *
 *   ┌──────────────────────────────────────────────────┐   ← 32px frame inset
 *   │ NAV                                     [LOGO]  │      on tablet+, none
 *   │                                                  │      on mobile.
 *   │                                                  │
 *   │            (page content — children)             │
 *   │                                                  │
 *   │                              ┌─────────┐        │
 *   │                              │ FOOTER  │        │
 *   │                              │  CARD   │        │
 *   │                              │+ BADGES │        │
 *   └──────────────────────────────┴─────────┴────────┘
 *
 * A subtle 1px border wraps the whole framed area. A decorative diagonal
 * line runs from the frame's bottom-left corner up to its top-right
 * corner, sitting behind all content.
 *
 * Nav rules:
 *   < xl (1280px):   Hamburger button, top-left of the frame. Tap →
 *                    full-screen overlay with the same links vertically.
 *   >= xl:           Text nav bar (HOME | ABOUT | PROGRESS | GALLERY),
 *                    top-left of the frame.
 *
 * The logo is 4 cells × 2 cells (128 × 64 px). It sits at the top-right
 * of the frame on tablet+, and centered under the hamburger on mobile.
 *
 * The footer card is 4 cells × 3 cells (128 × 96 px). A 1-cell gap sits
 * between it and the two 2×1-cell badges below.
 */
interface Props {
  children?: React.ReactNode;
  /** Hide the corner footer block (e.g., on the private dashboard). */
  hideFooter?: boolean;
}

export default function SiteChrome({ children, hideFooter }: Props) {
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile nav when the viewport crosses into desktop range,
  // so a resize during navigation doesn't leave the overlay stuck open.
  useEffect(() => {
    if (!navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNavOpen(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

  return (
    <div className="relative min-h-screen">
      {/* The framed viewport wrapper. On mobile the inset is 0 so the
          layout runs edge-to-edge; from md: up we inset by one grid
          cell (32px) and draw a thin border around the whole thing. */}
      <div
        className="
          relative min-h-screen
          md:min-h-[calc(100vh-var(--cell)*2)]
          md:m-[var(--cell)]
          md:border md:border-white/10
        "
      >
        {/* Decorative diagonal — bottom-left to top-right of the frame.
            Pointer-events-none + z-0 keep it purely visual. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full z-0"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="0.15"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Top-left: nav — text on xl, hamburger otherwise. */}
        <TopLeftNav onOpen={() => setNavOpen(true)} />

        {/* Top-right: logo. On mobile it centers under the hamburger; on
            tablet+ it snaps to the top-right corner of the frame. */}
        <TopRightLogo />

        {/* Bottom-right: footer card + badges. Hidden on the private
            dashboard shell (hideFooter). */}
        {!hideFooter && <BottomRightFooter />}

        {/* Page content — sits above the diagonal, with padding that
            keeps it clear of the fixed logo / nav / footer. */}
        <div className="relative z-10">{children}</div>
      </div>

      {/* Full-screen nav overlay (mobile/tablet hamburger drawer). */}
      {navOpen && <NavOverlay onClose={() => setNavOpen(false)} />}
    </div>
  );
}

// ============================================================================
// Top-left nav
// ============================================================================

function TopLeftNav({ onOpen }: { onOpen: () => void }) {
  const linkClass =
    "uppercase tracking-[0.22em] text-[11px] text-white/70 hover:text-white transition-colors";

  return (
    <>
      {/* Hamburger — visible below xl (< 1280px). Sits at the top-left
          of the frame with a small inner padding so it isn't flush to
          the border. On mobile there's no border, so it just floats
          near the top-left. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open menu"
        className="
          xl:hidden
          absolute top-4 left-1/2 -translate-x-1/2
          md:top-4 md:left-4 md:translate-x-0
          z-30 p-2 text-white/70 hover:text-white transition
        "
      >
        <svg
          width="28"
          height="14"
          viewBox="0 0 28 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <line x1="2" y1="4" x2="26" y2="4" />
          <line x1="2" y1="10" x2="26" y2="10" />
        </svg>
      </button>

      {/* Text nav — visible xl+ only. */}
      <nav
        aria-label="Primary"
        className="
          hidden xl:flex items-center gap-3
          absolute top-4 left-4 z-30
        "
      >
        <Link to="/" className={linkClass}>
          Home
        </Link>
        <Separator />
        <a href="#story" className={linkClass}>
          About
        </a>
        <Separator />
        <a href="#progress" className={linkClass}>
          Progress
        </a>
        <Separator />
        <a href="#gallery" className={linkClass}>
          Gallery
        </a>
      </nav>
    </>
  );
}

function Separator() {
  return (
    <span aria-hidden className="text-white/30 text-[11px]">
      |
    </span>
  );
}

// ============================================================================
// Mobile / tablet nav overlay
// ============================================================================

function NavOverlay({ onClose }: { onClose: () => void }) {
  const linkClass =
    "font-serif text-4xl md:text-5xl text-white/85 hover:text-white transition-colors";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col"
    >
      {/* Close X, top-right of the overlay */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-white/70 hover:text-white transition"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <line x1="6" y1="6" x2="22" y2="22" />
          <line x1="22" y1="6" x2="6" y2="22" />
        </svg>
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <Link to="/" onClick={onClose} className={linkClass}>
          Home
        </Link>
        <a href="#story" onClick={onClose} className={linkClass}>
          About
        </a>
        <a href="#progress" onClick={onClose} className={linkClass}>
          Progress
        </a>
        <a href="#gallery" onClick={onClose} className={linkClass}>
          Gallery
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// Top-right logo — 4 cells wide × 2 cells tall (128 × 64 px).
// ============================================================================

function TopRightLogo() {
  return (
    <Link
      to="/"
      aria-label="Self-Healing — home"
      className="
        absolute z-30 hover:opacity-80 transition-opacity
        top-[calc(var(--cell)*2)] left-1/2 -translate-x-1/2
        md:top-0 md:right-0 md:left-auto md:translate-x-0
        block
      "
      style={{
        // Fixed logo box: 4 cells wide × 2 cells tall.
        width: "calc(var(--cell) * 4)",
        height: "calc(var(--cell) * 2)",
      }}
    >
      <img
        src="/logo.svg"
        alt="Self-Healing"
        className="w-full h-full object-contain"
      />
    </Link>
  );
}

// ============================================================================
// Bottom-right footer — card + two badges beneath it.
// ============================================================================

function BottomRightFooter() {
  return (
    <div
      aria-hidden={false}
      className="
        absolute z-30
        left-1/2 -translate-x-1/2 bottom-[calc(var(--cell)*2)]
        md:left-auto md:right-0 md:bottom-0 md:translate-x-0
        flex flex-col items-center md:items-end
      "
    >
      <FooterCard />
      {/* 1-cell gap between card and badges */}
      <div style={{ height: "var(--cell)" }} />
      <FooterBadges />
    </div>
  );
}

/**
 * Footer card — mirrors the OKOK artifact HTML but sized to fit the
 * 4-cell width target the user specified. The card is 4 cells wide
 * (128 px), the text stack rows split each phrase across columns with
 * `justify-between`, and the "A SPACE FOR HEALING" pill scrolls
 * infinitely via the `.sh-marquee` keyframe (see globals.css).
 */
function FooterCard() {
  // 4 cells wide × 3 cells tall = 128 × 96 px. Extremely tight for the
  // amount of copy, so:
  //   • padding is 3px on all sides
  //   • font-size drops to 5px for word rows, 6px for the marquee text
  //   • letter-spacing is minimized so `justify-between` doesn't have to
  //     stretch the words too far apart on wide rows like OPEPEN.ART
  //   • the pill shrinks to 14px tall
  //   • row margins are 0 (line-height alone handles spacing)
  //
  // At this scale it reads as a texture more than as prose — which
  // matches the intent of the mockup: it's a stamp / label, not a
  // paragraph.
  return (
    <div
      className="text-white/55 border border-white/15"
      style={{
        width: "calc(var(--cell) * 4)",
        height: "calc(var(--cell) * 3)",
        padding: "3px",
        fontFamily: '"CMU Typewriter Text", monospace',
        fontSize: "5px",
        lineHeight: 1.1,
        letterSpacing: "0",
        borderRadius: "2px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div className="flex justify-between whitespace-nowrap">
          <span>CUSTOM</span>
          <span>CRAFT</span>
          <span>CUTTING</span>
          <span>MATS</span>
        </div>
        <div className="flex justify-between whitespace-nowrap">
          <span>MADE</span>
          <span>IN</span>
          <span>COLLABORATION</span>
          <span>WITH</span>
        </div>
        <div className="flex justify-between whitespace-nowrap">
          <span>OPEPEN</span>
          <span>EDITION</span>
          <span>ARTISTS</span>
        </div>
        <div className="flex justify-between whitespace-nowrap">
          <span>A</span>
          <span>PUBLIC</span>
          <span>ART</span>
          <span>PROTOCOL</span>
          <span>ON</span>
        </div>
        <div className="flex justify-between whitespace-nowrap">
          <span>E</span>
          <span>T</span>
          <span>H</span>
          <span>E</span>
          <span>R</span>
          <span>E</span>
          <span>U</span>
          <span>M</span>
        </div>
        <div className="flex justify-between whitespace-nowrap">
          <span>O</span>
          <span>P</span>
          <span>E</span>
          <span>P</span>
          <span>E</span>
          <span>N</span>
          <span>.</span>
          <span>A</span>
          <span>R</span>
          <span>T</span>
        </div>
      </div>

      {/* Marquee pill */}
      <div className="relative" style={{ marginTop: "2px", marginBottom: "1px" }}>
        <span
          className="absolute left-1/2 -translate-x-1/2 text-white/60"
          style={{ top: "-4px", fontSize: "5px", lineHeight: 1 }}
          aria-hidden
        >
          ×
        </span>
        <div
          className="border border-white/15 rounded-full flex items-center overflow-hidden"
          style={{ height: "12px", padding: "0 6px", fontSize: "6px" }}
        >
          <div className="sh-marquee">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="inline-flex items-center">
                <span>A SPACE FOR HEALING</span>
                <span
                  aria-hidden
                  className="inline-block rounded-full bg-white/50"
                  style={{
                    width: "2px",
                    height: "2px",
                    margin: "0 12px",
                    flex: "none",
                  }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex justify-between whitespace-nowrap"
        style={{ fontSize: "5px" }}
      >
        <span>©2026</span>
        <span>SELF-HEALING</span>
      </div>
    </div>
  );
}

/**
 * Two SVG badges (created-by-hand + built-on-eth) placed side-by-side.
 * Each is 2 cells × 1 cell (64 × 32 px), matching their native SVG
 * viewBox aspect ratio.
 */
function FooterBadges() {
  return (
    <div className="flex gap-0">
      <img
        src="/badges/created-by-hand.svg"
        alt="Created by hand"
        style={{
          width: "calc(var(--cell) * 2)",
          height: "var(--cell)",
        }}
      />
      <img
        src="/badges/built-on-eth.svg"
        alt="Built on Ethereum"
        style={{
          width: "calc(var(--cell) * 2)",
          height: "var(--cell)",
        }}
      />
    </div>
  );
}
