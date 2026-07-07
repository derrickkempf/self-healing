import { Link } from "react-router-dom";
import SiteChrome from "../components/SiteChrome";
import Reveal from "../components/Reveal";

/**
 * Story page — the long-form narrative behind Self-Healing.
 *
 * Voice: direct, journal, no emojis, minimal philosophical framing.
 * Structure follows the four questions any visitor arrives with — how
 * did this start, what is it, why Opepen, what comes next — plus a
 * short section on community.
 *
 * Rendered inside SiteChrome so the chrome (logo, corner footer, nav)
 * is consistent with the rest of the site. Uses a single centered
 * panel rather than the draggable stage; this is content, not a
 * workspace.
 */
export default function Story() {
  return (
    <SiteChrome variant="public">
      <main
        className="mx-auto flex items-start justify-center pointer-events-auto"
        style={{
          maxWidth: "calc(var(--cell) * 24)",
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
        }}
      >
        <article
          className="w-full border border-white/15"
          style={{
            background: "#1a1a1a",
            borderRadius: "2px",
            padding: "calc(var(--cell) * 1.25)",
          }}
        >
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50 mb-6">
              Story
            </p>
            <h1 className="font-serif text-6xl md:text-7xl uppercase leading-[0.95] mb-8">
              A place for
              <br />
              self-healing
            </h1>
            <p className="text-white/60 text-[13px] leading-relaxed mb-10 max-w-xl">
              A living journal of the materials, methods, and milestones
              behind Self-Healing — a small-batch cutting mat made in
              collaboration with Opepen edition artists and their collectors.
              A public art protocol on Ethereum, now in your studio.
            </p>
          </Reveal>

          <Section title="How it started" delay={0.1}>
            <p>
              On July 10, 2025, nine collectors put 0.069 ETH each in front
              of an idea: an Opepen edition made physical. Not another print.
              Not a mockup. A working object — a cutting mat you could put
              on your desk and use.
            </p>
            <p>
              Nine people said yes. That&apos;s what made this real.
            </p>
          </Section>

          <Section title="What it is" delay={0.15}>
            <p>
              A matte-black-on-one-side, green-on-the-other A3 self-healing
              cutting mat. Rubber that closes after the blade. Numbered 01
              through 09 for the founding collectors, then in small numbered
              runs for anyone who wants to join them.
            </p>
            <p>
              Every mat is made by hand in small batches, shipped from a
              studio, and signed. Every mat is anchored on Ethereum with a
              public record — mint date, edition number, owner history.
            </p>
          </Section>

          <Section title="Why Opepen" delay={0.2}>
            <p>
              Opepen is a public art protocol on Ethereum. Editions are
              minted, held, and traded — but they have mostly lived as
              digital images or paper prints. Bringing an edition into a
              functional, physical object was untested.
            </p>
            <p>
              The nine founding collectors funded that test. Their belief
              paid for the rubber, the mold, the grid printing, and the
              global shipping. Their names — or their wallets — are on the
              record.
            </p>
            <p>
              This is what an Opepen edition can be when it steps off the
              screen.
            </p>
          </Section>

          <Section title="Community made this" delay={0.25}>
            <p>
              Every step of this project was decided in public. The
              artwork, the material, the color, the run size, the ship
              date — all discussed with the nine, then documented on the
              Progress feed for everyone else to see.
            </p>
            <p>
              The nine are not customers. They are the reason the project
              exists. Everyone who joins after them joins a community that
              already believes.
            </p>
          </Section>

          <Section title="What comes next" delay={0.3}>
            <p>
              Drop 001 ships to the founding nine.
            </p>
            <p>
              Drop 002 opens for public pre-order shortly after — a small,
              numbered run for anyone on the notify list.
            </p>
            <p>
              Later drops will introduce new artist collaborations, new
              colorways, new editions. Each one made by hand. Each one
              anchored on-chain. Each one a chapter.
            </p>
          </Section>

          <Reveal className="mt-12 pt-8 border-t border-white/10">
            <p className="text-white/70 text-[13px] leading-relaxed mb-6">
              Follow the process on the Progress feed. Get notified when
              Drop 002 opens.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/notify"
                className="inline-block border border-white/70 px-6 py-3 text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition"
              >
                Notify Me →
              </Link>
              <Link
                to="/#progress"
                className="inline-block border border-white/25 px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-white/70 hover:text-white hover:border-white/60 transition"
              >
                Read the Progress Feed
              </Link>
            </div>
          </Reveal>
        </article>
      </main>
    </SiteChrome>
  );
}

/**
 * Section — small heading + body paragraph(s). The heading is a mono
 * small-caps label so it reads as a chapter mark, not a magazine
 * headline. Body paragraphs are 13px white/70 with generous leading.
 */
function Section({
  title,
  delay = 0,
  children,
}: {
  title: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="mb-10" delay={delay}>
      <h2 className="text-[10px] uppercase tracking-[0.28em] text-white/50 mb-4">
        {title}
      </h2>
      <div className="text-white/70 text-[13px] leading-relaxed space-y-4 max-w-xl">
        {children}
      </div>
    </Reveal>
  );
}
