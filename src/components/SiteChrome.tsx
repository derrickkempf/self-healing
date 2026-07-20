import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useIsAdmin } from "../utils/useIsAdmin";

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
          On mobile the logo is now part of the bottom cluster, so top
          padding only needs to clear the hamburger + top chrome strip.
          `pointer-events: none` on the wrapper lets clicks pass through
          to the chrome underneath (logo, corner links); each interactive
          descendant (card, button, form) opts back in with the
          `pointer-events-auto` class. Without this the wrapper's z-10
          intercepts every click that lands outside a card, and the
          logo — which sits at z-[2] to allow cards to float above it —
          becomes non-clickable.
          =══════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 pt-14 xl:pt-24 pointer-events-none"
        style={{ paddingRight: "var(--cell)" }}
      >
        {children}

        {/* Mobile / tablet footer — rendered here (after content) so it
            flows to the bottom of the page. Hidden on xl+ because there
            the footer lives in the fixed top-right chrome instead. */}
        {!hideFooter && <MobileFooter />}
      </div>

      {navOpen && (
        <NavOverlay variant={variant} onClose={() => setNavOpen(false)} />
      )}
    </div>
  );
}

/**
 * Mobile / tablet footer wrapper — the complete chrome cluster (logo +
 * info card + badges) stacked as one connected block, centered at the
 * bottom of the page.
 */
function MobileFooter() {
  // Chrome cluster on mobile — logo + info card + badges, centered
  // horizontally with grid-multiple padding + margins so the block
  // snaps to the drafting grid the same way desktop cards do.
  // pointer-events-auto so it remains interactive even inside
  // SiteChrome's pointer-events: none wrapper.
  return (
    <div
      className="xl:hidden flex flex-col items-center w-full pointer-events-auto"
      style={{
        marginTop: "calc(var(--cell) * 2)",
        marginBottom: "calc(var(--cell) * 2)",
        paddingLeft: "var(--cell)",
        paddingRight: "var(--cell)",
      }}
    >
      <InlineLogo />
      <FooterCard />
      <FooterBadges />
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
  const rawItems = variant === "public" ? PUBLIC_NAV : PRIVATE_NAV;
  // Non-admins never see the "Content" nav item — CMS is admin-only.
  const { isAdmin } = useIsAdmin();
  const items = isAdmin
    ? rawItems
    : rawItems.filter((i) => i.label !== "Content");

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
  // Anchor items: cross-navigate via Link AND fire an explicit event
  // that the current page listens for. The event is the reliable path
  // — react-router's location.key doesn't always fire when the target
  // URL is the same page + hash the user just came from, which is
  // exactly what happens when someone closes a card and reopens it.
  // Belt + suspenders: Link handles cross-page navigation; the event
  // handles same-page reopens.
  return (
    <Link
      to={`${item.base}${item.href}`}
      onClick={() => {
        const id = item.href.replace("#", "");
        // Defer to microtask so the Link's navigate() runs first.
        queueMicrotask(() =>
          window.dispatchEvent(
            new CustomEvent("sh:open-card", { detail: id }),
          ),
        );
      }}
      className={className}
    >
      {item.label}
    </Link>
  );
}

type NavLinkItem =
  | { kind: "route"; label: string; to: string }
  | { kind: "anchor"; label: string; href: string; base: string };

// `base` is the page the anchor lives on. Anchor Links use `${base}${href}`
// so clicking "About" from /settings navigates to /dashboard#about (or
// /#about for logged-out users) instead of dead-ending on /settings.
const PUBLIC_NAV: NavLinkItem[] = [
  { kind: "route", label: "Home", to: "/" },
  { kind: "route", label: "Story", to: "/story" },
  { kind: "anchor", label: "Progress", href: "#progress", base: "/" },
  { kind: "anchor", label: "Gallery", href: "#gallery", base: "/" },
  { kind: "route", label: "Create", to: "/create" },
  { kind: "route", label: "Notify", to: "/notify" },
  // Login for returning collaborators. Sits at the far right of the
  // desktop nav; also appears in the mobile drawer.
  { kind: "route", label: "Login", to: "/login" },
];

const PRIVATE_NAV: NavLinkItem[] = [
  { kind: "route", label: "Home", to: "/dashboard" },
  { kind: "anchor", label: "About", href: "#about", base: "/dashboard" },
  { kind: "anchor", label: "Progress", href: "#progress", base: "/dashboard" },
  { kind: "anchor", label: "Gallery", href: "#gallery", base: "/dashboard" },
  { kind: "anchor", label: "Messaging", href: "#messaging", base: "/dashboard" },
  { kind: "anchor", label: "Content", href: "#content", base: "/dashboard" },
  { kind: "route", label: "Settings", to: "/settings" },
];

// ============================================================================
// Mobile / tablet nav overlay
// ============================================================================

function NavOverlay({
  variant,
  onClose,
}: NavVariantProps & { onClose: () => void }) {
  const rawItems = variant === "public" ? PUBLIC_NAV : PRIVATE_NAV;
  // Same admin filter as TopLeftNav — non-admins don't see Content in
  // the mobile drawer either.
  const { isAdmin } = useIsAdmin();
  const items = isAdmin
    ? rawItems
    : rawItems.filter((i) => i.label !== "Content");
  const linkClass =
    "font-serif text-5xl text-white/90 hover:text-white transition-colors uppercase leading-none";

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
            <Link
              key={item.label}
              to={`${item.base}${item.href}`}
              onClick={() => {
                onClose();
                const id = item.href.replace("#", "");
                queueMicrotask(() =>
                  window.dispatchEvent(
                    new CustomEvent("sh:open-card", { detail: id }),
                  ),
                );
              }}
              className={linkClass}
            >
              {item.label}
            </Link>
          );
        })}

      </div>
    </div>
  );
}

// ============================================================================
// Top-right logo — 4 cells × 2 cells (128 × 64). Straddles the top chrome
// strip boundary: top edge at viewport top, extends 2 cells below.
// ============================================================================

function TopRightLogo() {
  // Desktop only. On tablet/mobile the logo is rendered inline inside
  // MobileFooter so the whole chrome cluster (logo + info card + badges)
  // reads as one connected block at the bottom of the page.
  //
  // z-index [2] puts the box below floating stage cards (which start at
  // z-index 1 and cascade higher on focus) but above the grid pattern
  // and the diagonal accent line, so the box's #1a1a1a fill still
  // covers the grid lines that would otherwise cross the ellipse.
  return (
    <Link
      to="/"
      aria-label="Self-Healing — home"
      className="hidden xl:block fixed z-[2] hover:opacity-80 transition-opacity border border-white/15"
      style={{
        top: "var(--cell)",
        right: "var(--cell)",
        width: "calc(var(--cell) * 8)",
        height: "calc(var(--cell) * 3)",
        background: "#1a1a1a",
      }}
    >
      <img
        src="/logo.svg"
        alt="Self-Healing"
        className="w-full h-full object-contain"
        style={{ padding: "12px" }}
      />
    </Link>
  );
}

/** Inline (non-fixed) logo used only inside MobileFooter. Same size and
 *  visual as the desktop version so the mobile chrome cluster feels
 *  like the same object relocated to the bottom of the page. */
function InlineLogo() {
  return (
    <Link
      to="/"
      aria-label="Self-Healing — home"
      className="block hover:opacity-80 transition-opacity border border-white/15"
      style={{
        width: "calc(var(--cell) * 8)",
        height: "calc(var(--cell) * 3)",
        background: "#1a1a1a",
      }}
    >
      <img
        src="/logo.svg"
        alt="Self-Healing"
        className="w-full h-full object-contain"
        style={{ padding: "12px" }}
      />
    </Link>
  );
}

// ============================================================================
// Bottom-right footer — card (4×3 cells) + 1-cell gap + badges (4×1 cells).
// Straddles the right chrome strip boundary.
// ============================================================================

/**
 * Desktop-only corner footer — stacks directly under the top-right logo
 * with no gap between the footer card and the badges. The mobile
 * equivalent (MobileFooter, above) is rendered inline at the bottom of
 * the page content instead.
 */
function BottomRightFooter() {
  // Under the logo. Logo is 3 cells tall + starts at 1 cell → ends at
  // cell 4. Info box slots in from cell 4 downward.
  //
  // z-index [2] matches the logo above; both sit ABOVE the grid pattern
  // and diagonal accent, but BELOW the floating stage cards so a
  // dragged card can float over the top-right cluster.
  return (
    <div
      className="hidden xl:flex fixed z-[2] flex-col items-end"
      style={{
        right: "var(--cell)",
        top: "calc(var(--cell) * 4)",
      }}
    >
      <FooterCard />
      <FooterBadges />
    </div>
  );
}

function FooterCard() {
  // 8 cells wide × 5 cells tall = 256 × 160 px, per spec. All text at
  // 10 px; content justified between top/middle/bottom rows so the
  // pill sits centered vertically in the block.
  return (
    <div
      className="border border-white/15"
      style={{
        width: "calc(var(--cell) * 8)",
        height: "calc(var(--cell) * 5)",
        padding: "6px",
        fontFamily: '"CMU Typewriter Text", monospace',
        fontSize: "10px",
        lineHeight: 1.1,
        letterSpacing: "0.22em",
        borderRadius: "2px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#1a1a1a",
        // Chrome cluster body text sits at a low-opacity white so the
        // marquee (which explicitly uses full-opacity white below) reads
        // as the focal element.
        color: "#ffffff45",
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

      {/* Scrolling marquee pill — 32 px tall, 4/6 padding, 10 px text.
          Text color pinned to full-opacity white so it pops against the
          low-opacity surrounding chrome copy. */}
      <div>
        <div
          className="border border-white/15 rounded-full flex items-center overflow-hidden"
          style={{
            height: "32px",
            padding: "4px 6px",
            fontSize: "10px",
            color: "#ffffff",
          }}
        >
          <div className="sh-marquee">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="inline-flex items-center">
                <span>A SPACE FOR HEALING</span>
                <span
                  aria-hidden
                  className="inline-block rounded-full bg-white/50"
                  style={{
                    width: "3px",
                    height: "3px",
                    margin: "0 14px",
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
        style={{ fontSize: "10px" }}
      >
        <span>© 2026</span>
        <span>SELF-HEALING</span>
      </div>
    </div>
  );
}

function FooterBadges() {
  // Each badge is 4 cells × 4 cells (128 × 128 px); two side-by-side
  // gives 8 cells wide × 4 cells tall — matching the logo + info card
  // above them. Native SVG viewBox is 2:1, so `object-contain` keeps
  // the artwork centered inside the square without stretching.
  return (
    <div className="flex gap-0">
      <img
        src="/badges/created-by-hand.svg"
        alt="Created by hand"
        className="object-contain"
        style={{
          width: "calc(var(--cell) * 4)",
          height: "calc(var(--cell) * 4)",
        }}
      />
      <img
        src="/badges/built-on-eth.svg"
        alt="Built on Ethereum"
        className="object-contain"
        style={{
          width: "calc(var(--cell) * 4)",
          height: "calc(var(--cell) * 4)",
        }}
      />
    </div>
  );
}
