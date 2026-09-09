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
 *
 * Scrolling model:
 *   Every chrome layer below (grid, strips, diagonal, nav, logo, footer)
 *   is `position: absolute` inside this component's `relative` root,
 *   NOT `position: fixed` to the viewport. That means they participate
 *   in normal document flow and scroll away with the rest of the page,
 *   and the grid/right-strip backgrounds (which use `top/bottom: 0`)
 *   stretch to match the page's actual full height rather than being
 *   clipped to one viewport. Only the page-transition overlay stays
 *   `fixed`, since it's meant to always cover the whole screen
 *   regardless of scroll position.
 *
 * Nav:
 *   The nav is short now (About | Progress | Gallery | Create), so it
 *   renders persistently at every breakpoint — no hamburger, no mobile
 *   drawer. On mobile/tablet a compact "Self-Healing" wordmark sits in
 *   front of it (the big corner logo only shows at xl+), so the brand
 *   stays visible without needing a menu tap to find it.
 */

interface Props {
  children?: React.ReactNode;
  /** Which nav to render. "public" = Home/About/Progress/Gallery;
      "private" = Feed/Chat/Settings for signed-in pages. */
  variant?: "public" | "private";
  /** Hide the corner footer block (rarely useful — leave true for a
      minimal chrome, e.g., during auth flow if desired). */
  hideFooter?: boolean;
  /** Strip the chrome down to just the top nav strip — no grid, no
      right strip, no diagonal, no logo, no footer. Used by pages that
      need the full viewport for their own content (e.g. Create's
      embedded tool) but should still share the exact same nav as
      every other page. */
  chromeless?: boolean;
}

export default function SiteChrome({
  children,
  variant = "public",
  hideFooter = false,
  chromeless = false,
}: Props) {
  return (
    <div
      className="relative min-h-screen text-white overflow-x-hidden"
      style={{ background: "#1a1a1a" }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          GRID AREA — absolute within the page (not fixed to the
          viewport), so it stretches to the page's full scrollable
          height and scrolls away with everything else. On mobile it
          starts below the top strip and spans the full width. On
          tablet+ it also leaves a right strip. This is the ONLY place
          the grid pattern is visible. Skipped entirely in chromeless
          mode.
          =══════════════════════════════════════════════════════════════ */}
      {!chromeless && (
        <div
          aria-hidden
          className="sh-grid absolute left-0 z-0 pointer-events-none"
          style={{
            top: "var(--cell)",
            right: 0,
            bottom: 0,
          }}
        />
      )}
      {/* Right chrome strip: overlays the grid on tablet+ from the right
          edge inward by one cell. Mobile has none. Includes a subtle 1px
          left border that draws the right edge of the grid area itself
          (previously invisible). Starts at `top: var(--cell)` — i.e.
          below the top strip, level with the logo — rather than
          `top: 0`. It used to run the full viewport height, which put a
          stray vertical border segment above the logo, through the nav
          row where it served no purpose. */}
      {!chromeless && (
        <div
          aria-hidden
          className="hidden md:block absolute bottom-0 right-0 z-0 pointer-events-none border-l border-white/10"
          style={{ top: "var(--cell)", width: "var(--cell)", background: "#1a1a1a" }}
        />
      )}
      {/* Top chrome strip. Adds a 1px bottom border so the boundary
          between the strip and the grid reads clearly. On tablet+ (in
          non-chromeless mode) it stops exactly at the right chrome
          strip's left edge instead of spanning the full width — that
          full-width span used to paint the strip's background (and its
          bottom border line) straight across the top-right corner,
          crossing over/under the right strip's vertical border and
          making the corner look like a "+" instead of a clean L. */}
      <div
        aria-hidden
        className={`absolute top-0 left-0 right-0 z-0 pointer-events-none border-b border-white/10 ${
          chromeless ? "" : "md:right-[var(--cell)]"
        }`}
        style={{ height: "var(--cell)", background: "#1a1a1a" }}
      />

      {/* ═══════════════════════════════════════════════════════════════
          DIAGONAL — from the bottom-left of the page up to the
          top-right corner of the GRID area. Absolute + inset-0 + w/h
          full so it scales with the page's actual rendered box (not
          the viewport), scrolling away with the rest of the chrome.
          Two SVGs — one mobile, one tablet+ — with different
          endpoints. Both sit above the grid but below content.
          Skipped in chromeless mode.
          =══════════════════════════════════════════════════════════════ */}
      {!chromeless && (
        <>
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full z-[1] pointer-events-none md:hidden"
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
            className="hidden md:block absolute inset-0 w-full h-full z-[1] pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            {/* End point at ~(96.8%, 3.2%) which corresponds to
                (100% - 32px, 32px) at a 1000px wide viewport.
                Non-scaling stroke keeps the line 1px regardless of
                viewBox distortion. */}
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
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CHROME ELEMENTS — nav (top-left), logo (top-right), footer
          (bottom-right). All absolute within the page. Above the
          diagonal and the grid. The nav renders in every mode
          (including chromeless) so navigation is identical everywhere;
          logo + footer are skipped in chromeless mode.
          =══════════════════════════════════════════════════════════════ */}
      <TopLeftNav variant={variant} />
      {!chromeless && <TopRightLogo />}
      {!hideFooter && !chromeless && <BottomRightFooter />}

      {/* ═══════════════════════════════════════════════════════════════
          PAGE CONTENT — flows inside the content area. Padding leaves
          room for the chrome so content isn't hidden underneath. On
          mobile the logo is now part of the bottom cluster, so top
          padding only needs to clear the hamburger + top chrome strip.
          Chromeless mode only reserves the single top-strip cell —
          there's no logo cluster to clear.
          `pointer-events: none` on the wrapper lets clicks pass through
          to the chrome underneath (logo, corner links); each interactive
          descendant (card, button, form) opts back in with the
          `pointer-events-auto` class. Without this the wrapper's z-10
          intercepts every click that lands outside a card, and the
          logo — which sits at z-[2] to allow cards to float above it —
          becomes non-clickable.
          =══════════════════════════════════════════════════════════════ */}
      <div
        className={`relative z-10 pointer-events-none ${
          chromeless ? "" : "pt-14 xl:pt-24"
        }`}
        style={{
          paddingRight: chromeless ? 0 : "var(--cell)",
          ...(chromeless ? { paddingTop: "var(--cell)" } : {}),
        }}
      >
        {children}

        {/* Mobile / tablet footer — rendered here (after content) so it
            flows to the bottom of the page. Hidden on xl+ because there
            the footer lives in the top-right chrome instead. Skipped
            in chromeless mode along with the rest of the footer. */}
        {!hideFooter && !chromeless && <MobileFooter />}
      </div>
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

function TopLeftNav({ variant }: NavVariantProps) {
  const rawItems = variant === "public" ? PUBLIC_NAV : PRIVATE_NAV;
  // Non-admins never see the "Content" nav item — CMS is admin-only.
  const { isAdmin } = useIsAdmin();
  const items = isAdmin
    ? rawItems
    : rawItems.filter((i) => i.label !== "Content");

  return (
    <nav
      aria-label="Primary"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 md:gap-x-3 absolute top-0 left-3 z-30 py-2 md:py-0"
      style={{ minHeight: "var(--cell)" }}
    >
      {/* Compact persistent wordmark — mobile/tablet only. The big
          corner logo (TopRightLogo) only renders at xl+, so below that
          breakpoint the brand needs a lightweight stand-in that's
          always visible, replacing what used to be a hamburger button
          that hid the nav behind a tap. */}
      <Link
        to="/"
        aria-label="Self-Healing — home"
        className="xl:hidden uppercase tracking-[0.22em] text-[10px] text-white/90 hover:text-white transition-colors shrink-0"
      >
        Self-Healing
      </Link>
      <span aria-hidden className="xl:hidden text-white/25 text-[10px]">
        |
      </span>
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2 md:gap-3">
          {i > 0 && (
            <span aria-hidden className="text-white/25 text-[10px]">
              |
            </span>
          )}
          <NavItem item={item} />
        </span>
      ))}
    </nav>
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
  { kind: "anchor", label: "About", href: "#about", base: "/" },
  { kind: "anchor", label: "Progress", href: "#progress", base: "/" },
  { kind: "anchor", label: "Gallery", href: "#gallery", base: "/" },
  { kind: "route", label: "Create", to: "/create" },
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
      className="hidden xl:block absolute z-[2] hover:opacity-80 transition-opacity border border-white/15"
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
      className="hidden xl:flex absolute z-[2] flex-col items-end"
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
