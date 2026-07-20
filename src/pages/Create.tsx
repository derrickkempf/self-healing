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
 * Layering / stacking:
 *   • SiteChrome's inner content wrapper is `z-10` — a stacking
 *     context that would trap any fixed element inside it above the
 *     logo (which sits at z-[2]). So we render the iframe wrapper as
 *     a SIBLING of SiteChrome (not a child), at zIndex 1 — below the
 *     logo (2) so the logo sits ON TOP of the iframe's top-right
 *     corner where its internal aside intentionally leaves an empty
 *     256×96 rectangle. This makes the logo appear to belong to the
 *     same column as the tools panel.
 */
export default function Create() {
  return (
    <>
      <SiteChrome variant="public" hideFooter />
      {/*
        Iframe fills the viewport below the top chrome strip and
        extends all the way to the right edge (past SiteChrome's
        normal right-strip padding). The tool's internal CSS keeps
        its header and stage clear of the top-right logo column, and
        pins the tools sidebar to the right — same width as the logo
        — so the whole page reads as three regions: header (top,
        clears the logo column on the right), stage (main), and
        tools (right column, sits below the logo).
      */}
      <div
        style={{
          position: "fixed",
          top: "var(--cell)",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
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
    </>
  );
}
