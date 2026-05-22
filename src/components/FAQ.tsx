import { useState } from "react";
import Reveal from "./Reveal";

/**
 * FAQ accordion. Each item:
 *   ─────────────────────────────────────────
 *    Question                              ⌄
 *   ─────────────────────────────────────────
 *
 * Clicking the row toggles its answer with a smooth height-style expansion
 * (we use grid-template-rows trick: rows go from 0fr → 1fr so we get free
 * animation without measuring content height).
 *
 * Edit the FAQ_ITEMS constant below to update copy.
 */
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Do I need an opepen to mint?",
    a: "No — minting is open. Holding an opepen unlocks a discounted price tier and a guaranteed allocation, but anyone on the whitelist can mint at the public price.",
  },
  {
    q: "What happens next?",
    a: "Production runs continue in small batches. Each milestone — material lock-in, prototype runs, finish trials — is posted here as it lands.",
  },
  {
    q: "How many variations are there going to be?",
    a: "Six core variations, distinguished by surface treatment and edge profile. Final counts per variation are set by the supply formula below.",
  },
  {
    q: "How long will mats be available?",
    a: "The mint window is open for 7 days from launch. After that, the supply is locked to the number of mints during the window.",
  },
  {
    q: "How is the final supply of mats determined?",
    a: "Final supply equals the number of valid mints during the 7-day window. No additional units are produced after the window closes.",
  },
  {
    q: "When will mats ship?",
    a: "Estimated shipping window is 8–12 weeks after mint close. Tracking updates are posted to the feed as each batch leaves the line.",
  },
];

export default function FAQ() {
  return (
    <ol className="border-t border-line">
      {FAQ_ITEMS.map((item, i) => (
        <Reveal as="li" key={i} delay={i < 3 ? i * 0.05 : 0}>
          <FAQRow question={item.q} answer={item.a} />
        </Reveal>
      ))}
    </ol>
  );
}

function FAQRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-6 text-left py-6 md:py-7 text-muted hover:text-white transition group"
      >
        <span className="text-[15px] md:text-base">{question}</span>
        <Chevron open={open} />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-500 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <p className="text-sub text-[14px] leading-relaxed pb-6 md:pb-7 pr-10 max-w-3xl">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`shrink-0 transition-transform duration-300 ${
        open ? "rotate-180" : "rotate-0"
      }`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
