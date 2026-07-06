import { useState } from "react";
import SiteChrome from "../components/SiteChrome";
import Reveal from "../components/Reveal";

/**
 * Shop page — modeled after visualizevalue.com/shop.
 *
 * Structure:
 *   Prints section — heading + tagline + grid of print cards
 *   Merch section  — heading + grid of merch cards
 *
 * Each card: large square image on top, small title + price beneath.
 * Grid: 2 cols on mobile, 3 cols on md, 4 cols on lg+, right-aligned to
 * match the site's overall top-right anchor.
 *
 * Products are currently seed data (defined in-file). Later this can pull
 * from a Supabase `products` table (or Shopify Storefront API) using the
 * same subscribe pattern as posts.
 */

interface Product {
  id: string;
  title: string;
  priceUsd: number;
  image: string;
  href: string;
}

const PRINTS: Product[] = [
  {
    id: "print-1",
    title: "First Cut",
    priceUsd: 60,
    image: "prints/first-cut",
    href: "#",
  },
  {
    id: "print-2",
    title: "Kerf",
    priceUsd: 60,
    image: "prints/kerf",
    href: "#",
  },
  {
    id: "print-3",
    title: "Cure",
    priceUsd: 60,
    image: "prints/cure",
    href: "#",
  },
  {
    id: "print-4",
    title: "Rebound",
    priceUsd: 60,
    image: "prints/rebound",
    href: "#",
  },
];

const MERCH: Product[] = [
  {
    id: "merch-1",
    title: "Mat No. 1 (A2)",
    priceUsd: 120,
    image: "merch/mat-a2",
    href: "#",
  },
  {
    id: "merch-2",
    title: "Mat No. 1 (A3)",
    priceUsd: 80,
    image: "merch/mat-a3",
    href: "#",
  },
  {
    id: "merch-3",
    title: "Blade Refill Set",
    priceUsd: 24,
    image: "merch/blade-set",
    href: "#",
  },
  {
    id: "merch-4",
    title: "Studio Tee",
    priceUsd: 38,
    image: "merch/tee",
    href: "#",
  },
  {
    id: "merch-5",
    title: "Ruler + Square",
    priceUsd: 45,
    image: "merch/rule-square",
    href: "#",
  },
  {
    id: "merch-6",
    title: "Notebook Pack",
    priceUsd: 22,
    image: "merch/notebook",
    href: "#",
  },
];

export default function Shop() {
  return (
    <SiteChrome variant="public">
      <div
        className="w-full"
        style={{
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 8)",
        }}
      >
        {/* PRINTS */}
        <section id="prints" className="mb-16 md:mb-24 scroll-mt-20">
          <Reveal className="mb-8">
            <h1 className="font-serif text-4xl md:text-6xl mb-2">Prints</h1>
            <p className="text-white/60 text-[13px]">
              Giclée printed on Japanese archival paper. Numbered, signed.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {PRINTS.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* MERCH */}
        <section id="merch" className="scroll-mt-20">
          <Reveal className="mb-8">
            <h2 className="font-serif text-3xl md:text-5xl mb-2">Merch</h2>
            <p className="text-white/60 text-[13px]">
              Studio-tested tools and small runs of apparel.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {MERCH.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}

// ============================================================================
// Product card — image-first, title + price beneath. Placeholder image is
// a deterministic gradient (same trick as Home gallery placeholders) so
// the grid never looks broken before real product photography is added.
// ============================================================================

function ProductCard({ product }: { product: Product }) {
  const [hover, setHover] = useState(false);
  // Deterministic placeholder gradient — swap for <img src={product.image}>
  // once the CDN URLs are wired.
  const seed = hashString(product.image);
  const angle = seed % 360;
  const hueA = seed % 220;
  const hueB = (seed * 7) % 220;

  return (
    <a
      href={product.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="block group"
    >
      <div
        className="aspect-square w-full border border-white/10 overflow-hidden relative"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(255,255,255,0) 70%), conic-gradient(from ${angle}deg at 50% 50%, hsl(${hueA} 20% 12%), hsl(${hueB} 15% 10%), hsl(${hueA} 25% 14%), hsl(${hueB} 18% 9%))`,
        }}
      >
        {/* Product name centered inside the tile as a placeholder for the
            eventual product photo. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-white/25 uppercase tracking-[0.28em] transition"
            style={{
              fontSize: "10px",
              transform: hover ? "scale(1.04)" : "scale(1)",
            }}
          >
            {product.title}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <p className="font-serif text-lg leading-tight text-white/85 group-hover:text-white transition">
          {product.title}
        </p>
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 mt-1">
          ${product.priceUsd}
        </p>
      </div>
    </a>
  );
}

// Cheap deterministic hash so placeholder gradients differ per product but
// stay stable across renders.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

