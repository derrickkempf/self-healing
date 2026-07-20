import SiteChrome from "../components/SiteChrome";

/**
 * Create — hosts the Paper Motion Studio tool.
 *
 * The tool is a large self-contained HTML+JS app that would take
 * significant refactoring to port into React. Instead we serve it as
 * a static file from /public/create-tool.html and embed it in an
 * iframe below the site chrome.
 *
 * Chrome-inside-iframe pattern:
 *   The iframe is fixed to fill the viewport below the top chrome
 *   strip (from `top: var(--cell)` down). Because it lives inside
 *   SiteChrome's `z-10` content wrapper it gets trapped above the
 *   fixed site logo (`z-[2]`) and would hide it. Rather than fight
 *   the stacking (which turned out fragile), we draw a matching
 *   logo AND a matching right chrome strip INSIDE the iframe at
 *   the exact same positions. To the user it looks like the site
 *   chrome continues through the Create page. The site's top nav
 *   (z-30) still floats over the iframe, so it stays reachable.
 */
export default function Create() {
  return (
    <SiteChrome variant="public" hideFooter>
      <div
        className="pointer-events-auto"
        style={{
          position: "fixed",
          top: "var(--cell)",
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <iframe
          src="/create-tool.html"
          title="Create · Motion Studio"
          className="block w-full h-full border-0"
          // Allow the tool to use its clipboard, downloads, and drag/drop.
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </SiteChrome>
  );
}
