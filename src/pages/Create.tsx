import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

/**
 * Create — hosts the Paper Motion Studio tool.
 *
 * Deliberately does NOT use SiteChrome. The tool needs the full
 * viewport (width and height) for its stage, so we drop the logo,
 * footer, right chrome strip, and grid overlay entirely and only
 * render the top-left primary nav. Everything below the top nav
 * strip is the iframe.
 */
export default function Create() {
  return (
    <div
      className="relative min-h-screen text-white overflow-hidden"
      style={{ background: "#1a1a1a" }}
    >
      <PrimaryNav />

      {/* Iframe fills the viewport below the top nav strip
          (var(--cell) tall) — full width, full height. */}
      <iframe
        src="/create-tool.html"
        title="Create · Motion Studio"
        // Allow the tool to use its clipboard, downloads, and drag/drop.
        allow="clipboard-read; clipboard-write"
        style={{
          position: "fixed",
          top: "var(--cell)",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "calc(100vh - var(--cell))",
          border: 0,
          display: "block",
        }}
      />
    </div>
  );
}

/**
 * Standalone primary nav — same links + hamburger behaviour as
 * SiteChrome's TopLeftNav but rendered on its own so we don't drag
 * in the rest of the chrome (logo, footer, grid overlay). Sits at
 * z-30 above the iframe so it stays clickable.
 */
function PrimaryNav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links: [string, string][] = [
    ["Home", "/"],
    ["Story", "/story"],
    ["Progress", "/#progress"],
    ["Gallery", "/#gallery"],
    ["Create", "/create"],
    ["Notify", "/notify"],
    ["Login", "/login"],
  ];

  return (
    <>
      {/* Top strip — matches SiteChrome so nothing shifts when navigating */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 z-20 border-b border-white/10"
        style={{ height: "var(--cell)", background: "#1a1a1a" }}
      />

      {/* Desktop inline nav (xl+) */}
      <nav
        className="hidden xl:flex fixed top-0 left-0 z-30 items-center gap-6 px-6"
        style={{
          height: "var(--cell)",
          fontFamily: '"CMU Typewriter Text", monospace',
          fontSize: "10px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {links.map(([label, to], i) => (
          <span key={label} className="flex items-center gap-6">
            <Link
              to={to}
              className="text-white/70 hover:text-white transition-colors"
            >
              {label}
            </Link>
            {i < links.length - 1 && (
              <span className="text-white/25" aria-hidden>
                |
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Mobile/tablet hamburger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="xl:hidden fixed top-0 left-0 z-30 flex items-center justify-center hover:opacity-80 transition-opacity"
        style={{
          height: "var(--cell)",
          width: "var(--cell)",
          background: "transparent",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <div style={{ width: "16px", height: "1px", background: "#fff" }} />
          <div style={{ width: "16px", height: "1px", background: "#fff" }} />
          <div style={{ width: "16px", height: "1px", background: "#fff" }} />
        </div>
      </button>

      {/* Mobile nav overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6"
          style={{
            background: "#1a1a1a",
            fontFamily: '"CMU Typewriter Text", monospace',
            fontSize: "14px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
          onClick={() => setOpen(false)}
        >
          {links.map(([label, to]) => (
            <Link
              key={label}
              to={to}
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white"
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute top-4 right-4 text-white/60 hover:text-white"
            style={{ fontSize: "20px" }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
