import SiteChrome from "../components/SiteChrome";

/**
 * Create — hosts the Paper Motion Studio tool.
 *
 * Uses SiteChrome's `chromeless` mode: this renders the exact same
 * top-left nav (About | Progress | Gallery | Create, same mobile
 * wordmark, same admin filtering) as every other page, so navigation
 * stays perfectly consistent site-wide — but skips the grid, logo,
 * footer, and diagonal line so the tool gets the full viewport for
 * its stage.
 */
export default function Create() {
  return (
    <SiteChrome variant="public" chromeless>
      {/* Fills exactly the space below the shared top nav strip. Not
          fixed — it's a normal block in the page flow, consistent
          with the rest of the site's scroll-with-content chrome. The
          tool itself manages its own internal scrolling when its
          layout stacks on narrow viewports. */}
      <div
        className="pointer-events-auto"
        style={{ width: "100%", height: "calc(100vh - var(--cell))" }}
      >
        <iframe
          src="/create-tool.html"
          title="Create · Motion Studio"
          // Allow the tool to use its clipboard, downloads, and drag/drop.
          allow="clipboard-read; clipboard-write"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />
      </div>
    </SiteChrome>
  );
}
