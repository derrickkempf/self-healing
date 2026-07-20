import SiteChrome from "../components/SiteChrome";

/**
 * Create — hosts the Paper Motion Studio tool.
 *
 * The tool is a large self-contained HTML+JS app that would take
 * significant refactoring to port into React. Instead we serve it as
 * a static file from /public/create-tool.html and embed it in an
 * iframe below the site chrome. This preserves all of the tool's
 * behaviour (drag/drop, keyboard shortcuts, export, save/load) while
 * keeping the site's brand chrome around it.
 *
 * The tool's own CSS was re-skinned to the Self-Healing palette
 * (#1a1a1a canvas, white line accents, CMU Typewriter Text) so the
 * iframe blends visually rather than looking like a foreign widget.
 */
export default function Create() {
  return (
    <SiteChrome variant="public" hideFooter>
      {/*
        Iframe positioned as a fixed viewport-filling element so it can
        extend all the way to the right edge (past SiteChrome's normal
        right-strip padding). The tool's internal CSS keeps its header
        and stage clear of the top-right logo column, and pins the
        tools sidebar to the right — same width as the logo — so the
        whole page reads as three regions: header (top-left), stage
        (main), and tools (right, below logo).
      */}
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
