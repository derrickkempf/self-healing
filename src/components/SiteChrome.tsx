import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

/**
 * SiteChrome — the page shell.
 *
 * Region model (per the user's color-coded mockups):
 *   ┌───────────────────────────────────────┬─────┐  ← "top chrome strip"
 *   │  NAV (top-left)                       │LOGO │
 *   ├───────────────────────────────────────┤─────┤
 *   │                                       │     │
 *   │  ▓▓▓▓▓ CONTENT GRID AREA ▓▓▓▓▓▓▓▓▓▓▓ │right│
 *   │  (grid lines visible here, tile 32px, │chrome│
 *   │   aligned top-right)                  │strip│
 *   │                                       │     │
 *   │                                       │CARD │
 *   │                                       │BADG │
 *   └───────────────────────────────────────┴─────┘
 *
 *   • Chrome strips (top + right) are SOLID BLACK, no grid.
 *   • Grid is only visible inside the content area, always aligned to
 *     its top-right corner.
 *   • Logo and footer are yellow-region elements that straddle the
 *     boundary between chrome and content area.
 *   • Diagonal line runs from bottom-left of the VIEWPORT to the
 *     top-right corner of the GRID AREA. It sits above the grid but
 *     below all other content.
 *
 * Breakpoints:
 *   Mobile (<md):    top strip only, no right strip. Logo centers below
 *                    the top nav; footer stacks at page end.
 *   Tablet (md-xl):  top strip + right strip. Logo top-right. Footer
 *                    bottom-right, single content column.
 *   Desktop (xl+):   same chrome as tablet, but the content area splits
 *                    into three columns handled by the page's children.
 */

interface Props {
  children?: React.ReactNode;
  /** Which nav to render. "public" = Home/About/Progress/Gallery;
      "private" = Feed/Chat/Settings for signed-in pages. */
  variant?: "public" | "private";
  /** Hide the corner footer block (rarely useful — leave true for a
      minimal chrome, e.g., during auth flow if desired). */
  hideFooter?: boolean;
}

export default function SiteChrome({
  children,
  variant = "public",
  hideFooter = false,
}: Props) {
  const [navOpen, setNavOpen] = useState(false);

  // Lock body scroll while the mobile nav overlay is open; also handle Esc.
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
    <div
      className="relative min-h-screen text-white overflow-x-hidden"
      style={{ background: "#1a1a1a" }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          GRID AREA — fixed to the viewport. On mobile it starts below
          the top strip and spans the full width. On tablet+ it also
          leaves a right strip. This is the ONLY place the grid pattern
          is visible.
          =══════════════════════════════════════════════════════════════ */}
      <div
        aria-hidden
        className="sh-grid fixed left-0 z-0 pointer-events-none"
        style={{
          top: "var(--cell)",
          right: 0,
          bottom: 0,
        }}
      />
      {/* Right chrome strip: overlays the grid on tablet+ from the right
          edge inward by one cell. Mobile has none. Includes a subtle 1px
          left border that draws the right edge of the grid area itself
          (previously invisible). */}
      <div
        aria-hidden
        className="hidden md:block fixed top-0 bottom-0 right-0 z-0 pointer-events-none border-l border-white/10"
        style={{ width: "var(--cell)", background: "#1a1a1a" }}
      />
      {/* Top chrome strip. Adds a 1px bottom border so the boundary
          between the strip and the grid reads clearly. */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 z-0 pointer-events-none border-b border-white/10"
        style={{ height: "var(--cell)", background: "#1a1a1a" }}
      />

      {/* ═══════════════════════════════════════════════════════════════
          DIAGONAL — from bottom-left of the viewport up to the top-right
          corner of the GRID area. Grid area's top-right corner is at
          (viewport_width - right_strip, top_strip) on tablet+, or
          (viewport_width, top_strip) on mobile. Using a fixed-position
          SVG with a viewBox that matches viewport dimensions is fragile,
          so instead we render two SVGs — one mobile, one tablet+ — with
          different endpoints. Both are z-index 1 so they sit above the
          grid but below content (z-10).
          =══════════════════════════════════════════════════════════════ */}
      <svg
        aria-hidden
        className="fixed inset-0 w-screen h-screen z-[1] pointer-events-none md:hidden"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <line
          x1="0"
          y1="100"
          x2="100"
          y2="3.2"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <svg
        aria-hidden
        className="hidden md:block fixed inset-0 w-screen h-screen z-[1] pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {/* End point at ~(96.8%, 3.2%) which corresponds to (100vw - 32px,
            32px) at a 1000px wide viewport. Non-scaling stroke keeps the
            line 1px regardless of viewBox distortion. */}
        <line
          x1="0"
          y1="100"
          x2="96.8"
          y2="3.2"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* ═══════════════════════════════════════════════════════════════
          CHROME ELEMENTS — nav (top-left), logo (top-right), footer
          (bottom-right). All fixed to viewport. Above the diagonal and
          the grid.
          =══════════════════════════════════════════════════════════════ */}
      <TopLeftNav variant={variant} onOpen={() => setNavOpen(true)} />
      <TopRightLogo />
      {!hideFooter && <BottomRightFooter />}

      {/* ═══════════════════════════════════════════════════════════════
          PAGE CONTENT — flows inside the content area. Padding leaves
          room for the fixed chrome so content isn't hidden underneath.
          =══════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10"
        style={{
          paddingTop: "calc(var(--cell) * 3)",
          paddingRight: "var(--cell)",
        }}
      >
        {children}
      </div>

      {navOpen && (
        <NavOverlay variant={variant} onClose={() => setNavOpen(false)} />
      )}
    </div>
  );
}

// ============================================================================
// Top-left nav
// ============================================================================

interface NavVariantProps {
  variant: "public" | "private";
}

function TopLeftNav({
  variant,
  onOpen,
}: NavVariantProps & { onOpen: () => void }) {
  const items = variant === "public" ? PUBLIC_NAV : PRIVATE_NAV;

  return (
    <>
      {/* Hamburger — visible below xl. Inside the top chrome strip. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open menu"
        className="
          xl:hidden fixed z-30 p-2 text-white/70 hover:text-white transition
          top-1 left-1/2 -translate-x-1/2
          md:top-1 md:left-2 md:translate-x-0
        "
      >
        <svg
          width="24"
          height="14"
          viewBox="0 0 24 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <line x1="2" y1="4" x2="22" y2="4" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      </button>

      {/* Text nav — desktop only. Inside the top chrome strip at top-left. */}
      <nav
        aria-label="Primary"
        className="hidden xl:flex items-center gap-3 fixed top-0 left-3 z-30"
        style={{ height: "var(--cell)" }}
      >
        {items.map((item, i) => (
          <span key={item.label} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden className="text-white/25 text-[10px]">
                |
              </span>
            )}
            <NavItem item={item} />
          </span>
        ))}
      </nav>
    </>
  );
}

function NavItem({ item }: { item: NavLinkItem }) {
  const className =
    "uppercase tracking-[0.22em] text-[10px] text-white/70 hover:text-white transition-colors";
  if (item.kind === "route") {
    return (
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) =>
          `${className} ${isActive ? "text-white" : ""}`
        }
      >
        {item.label}
      </NavLink>
    );
  }
  return (
    <a href={item.href} className={className}>
      {item.label}
    </a>
  );
}

type NavLinkItem =
  | { kind: "route"; label: string; to: string }
  | { kind: "anchor"; label: string; href: string };

const PUBLIC_NAV: NavLinkItem[] = [
  { kind: "route", label: "Home", to: "/" },
  { kind: "anchor", label: "About", href: "#about" },
  { kind: "anchor", label: "Progress", href: "#progress" },
  { kind: "anchor", label: "Gallery", href: "#gallery" },
];

const PRIVATE_NAV: NavLinkItem[] = [
  { kind: "route", label: "Home", to: "/dashboard" },
  { kind: "anchor", label: "About", href: "#about" },
  { kind: "anchor", label: "Progress", href: "#progress" },
  { kind: "anchor", label: "Gallery", href: "#gallery" },
  { kind: "anchor", label: "Messaging", href: "#messaging" },
  { kind: "route", label: "Settings", to: "/settings" },
];

// ============================================================================
// Mobile / tablet nav overlay
// ============================================================================

function NavOverlay({
  variant,
  onClose,
}: NavVariantProps & { onClose: () => void }) {
  const items = variant === "public" ? PUBLIC_NAV : PRIVATE_NAV;
  const linkClass =
    "font-serif text-5xl text-white/90 hover:text-white transition-colors uppercase leading-none";
  const secondaryClass =
    "uppercase tracking-[0.28em] text-[11px] text-white/60 hover:text-white transition";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[60] bg-black flex flex-col"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="absolute top-2 left-1/2 -translate-x-1/2 p-2 text-white/70 hover:text-white transition md:left-2 md:translate-x-0"
      >
        <svg
          width="24"
          height="14"
          viewBox="0 0 24 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <line x1="2" y1="4" x2="22" y2="4" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {items.map((item) => {
          if (item.kind === "route") {
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={onClose}
                className={linkClass}
              >
                {item.label}
              </Link>
            );
          }
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={linkClass}
            >
              {item.label}
            </a>
          );
        })}

        {/* Secondary auth action — LOGIN for public visitors, mirroring the
            mobile drawer in the design mockup. Signed-in users see LOGOUT. */}
        <div style={{ marginTop: "var(--cell)" }}>
          {variant === "public" ? (
            <Link to="/login" onClick={onClose} className={secondaryClass}>
              Login
            </Link>
          ) : (
            <Link to="/settings" onClick={onClose} className={secondaryClass}>
              Settings
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Top-right logo — 4 cells × 2 cells (128 × 64). Straddles the top chrome
// strip boundary: top edge at viewport top, extends 2 cells below.
// ============================================================================

function TopRightLogo() {
  // Pinned to the top-right corner of the GRID AREA (not the viewport).
  // Sits one cell below the top chrome strip and one cell left of the
  // right chrome strip. Painted rectangle background covers any grid
  // lines that would otherwise cross the logo. Border ties it visually
  // to the chrome frame.
  return (
    <Link
      to="/"
      aria-label="Self-Healing — home"
      className="fixed z-30 hover:opacity-80 transition-opacity block border border-white/15"
      style={{
        top: "var(--cell)",
        right: "var(--cell)",
        width: "calc(var(--cell) * 4)",
        height: "calc(var(--cell) * 2)",
        background: "#1a1a1a",
      }}
    >
      <img
        src="/logo.svg"
        alt="Self-Healing"
        className="w-full h-full object-contain p-1"
      />
    </Link>
  );
}

// ============================================================================
// Bottom-right footer — card (4×3 cells) + 1-cell gap + badges (4×1 cells).
// Straddles the right chrome strip boundary.
// ============================================================================

function BottomRightFooter() {
  return (
    <div
      className="fixed z-30 flex flex-col items-end"
      style={{
        right: 0,
        bottom: 0,
      }}
    >
      <FooterCard />
      <div style={{ height: "var(--cell)" }} />
      <FooterBadges />
    </div>
  );
}

function FooterCard() {
  // 4 cells wide × 3 cells tall = 128 × 96 px, forced sizing per user request.
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
        background: "#000",
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

      <div
        className="relative"
        style={{ marginTop: "2px", marginBottom: "1px" }}
      >
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
