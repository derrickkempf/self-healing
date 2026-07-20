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
      <div
        className="pointer-events-auto w-full"
        style={{
          // Iframe fills the viewport minus the top chrome strip
          // (var(--cell)) and the site content wrapper's pt-14 padding.
          // We use a calc so the tool always fills the visible area.
          height: "calc(100vh - var(--cell) - 3.5rem)",
          minHeight: "600px",
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
