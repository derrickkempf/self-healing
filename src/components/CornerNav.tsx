import { Link } from "react-router-dom";

/**
 * Corner-pinned navigation for the public landing page.
 *
 * Layout (inspired by lepikdaniel.com):
 *   ┌──────────────────────────────────────────┐
 *   │ [logo]                            Story  │
 *   │                                          │
 *   │                                          │
 *   │ Progress                        Gallery  │
 *   └──────────────────────────────────────────┘
 *
 * Each element is `position: fixed` so it stays anchored to its corner
 * while the page scrolls. The text links jump to in-page section anchors
 * (#story, #progress, #gallery) and are typeset in Instrument Serif.
 */
export default function CornerNav() {
  const linkClass =
    "font-serif leading-none text-white/50 hover:text-white transition-colors";
  const linkStyle = { fontSize: "3rem" } as const;

  return (
    <nav aria-label="Primary" className="pointer-events-none">
      {/* Top-left: logo */}
      <Link
        to="/"
        aria-label="Self-Healing — home"
        className="pointer-events-auto fixed top-6 left-6 md:top-8 md:left-10 z-50 hover:opacity-80 transition-opacity"
      >
        <img
          src="/logo.svg"
          alt="Self-Healing"
          className="w-auto"
          style={{ height: "3rem" }}
        />
      </Link>

      {/* Top-right: Story */}
      <a
        href="#story"
        style={linkStyle}
        className={`pointer-events-auto fixed top-6 right-6 md:top-8 md:right-10 z-50 ${linkClass}`}
      >
        Story
      </a>

      {/* Bottom-left: Progress */}
      <a
        href="#progress"
        style={linkStyle}
        className={`pointer-events-auto fixed bottom-6 left-6 md:bottom-8 md:left-10 z-50 ${linkClass}`}
      >
        Progress
      </a>

      {/* Bottom-right: Gallery */}
      <a
        href="#gallery"
        style={linkStyle}
        className={`pointer-events-auto fixed bottom-6 right-6 md:bottom-8 md:right-10 z-50 ${linkClass}`}
      >
        Gallery
      </a>
    </nav>
  );
}
