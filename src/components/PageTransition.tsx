import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import { blockReveal, unblockReveal } from "../utils/reveal-gate";

/**
 * Page transition — simple black opacity fade.
 *
 *   on route change:
 *     1) full-screen black overlay fades 0 → 1   (0.30s, ease in-out)
 *     2) swap the rendered page, scroll to top    (synchronous)
 *     3) wait for the next paint frame             (~16ms, double rAF)
 *     4) overlay fades 1 → 0                       (0.45s, ease out)
 *
 * Why this design (after iterating away from transform sweeps and
 * colored curtains):
 *
 *   • A single opacity tween on a single element is the smoothest, most
 *     reliable transition we can run alongside React's reconciliation
 *     work during the swap. GPU compositor handles it, no main-thread
 *     paint thrash.
 *
 *   • The double-rAF paint wait between the swap and the fade-out makes
 *     sure the new page has actual pixels on screen before we begin
 *     revealing it, so no flash/stutter.
 *
 *   • The effect deps are intentionally only `[location.pathname]`. The
 *     `setRendered` call inside the timeline changes the `children`
 *     prop reference; if `children` were a dep, the effect would re-run
 *     and `tl.kill()` would freeze the overlay mid-screen. Latest
 *     children are read via a ref instead.
 *
 * Reduced motion: skips the fade, just swaps + scrolls.
 */

interface Props {
  children: React.ReactNode;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export default function PageTransition({ children }: Props) {
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Latest children, readable from inside async timeline callbacks
  // without having to put `children` in the effect dep list.
  const childrenRef = useRef(children);
  childrenRef.current = children;

  // null = haven't rendered yet (first mount). Otherwise the path of the
  // most recent transition. Doubles as a guard against React StrictMode's
  // double-invocation of effects in dev.
  const lastPath = useRef<string | null>(null);

  const [rendered, setRendered] = useState<React.ReactNode>(children);

  useEffect(() => {
    const path = location.pathname;

    // First mount — show the page immediately, no fade. (The IntroOverlay
    // handles the first reveal of the site.)
    if (lastPath.current === null) {
      lastPath.current = path;
      return;
    }

    // Path unchanged (StrictMode double-run, or same-route content
    // update). Just sync the rendered children and bail.
    if (lastPath.current === path) {
      setRendered(childrenRef.current);
      return;
    }

    lastPath.current = path;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    // Kill anything still in flight (rapid back-to-back navigations).
    tlRef.current?.kill();

    if (reduced) {
      setRendered(childrenRef.current);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    // Block reveals as soon as we know we're starting a transition, so
    // any <Reveal>s on the incoming page wait until the overlay is on
    // its way out instead of firing while the screen is still black.
    blockReveal("transition");

    const tl = gsap.timeline({
      onComplete: () => {
        // Defensive: ensure the overlay can't be left visible, and that
        // the reveal-gate is always released even if something goes wrong
        // mid-timeline. unblockReveal is idempotent.
        gsap.set(overlayRef.current, { opacity: 0 });
        unblockReveal("transition");
      },
    });
    tlRef.current = tl;

    tl
      // 1) Cover the page in black.
      .to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.inOut",
      })
      // 2) Swap content + scroll while the overlay is fully opaque.
      .add(() => {
        setRendered(childrenRef.current);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      })
      // 3) Wait two animation frames so React commits + the browser
      //    paints the new page before we start revealing it.
      .call(() => {
        tl.pause();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Open the reveal gate the moment we resume — Reveal animations
            // run alongside the overlay's fade-out so by the time the
            // overlay clears, content is already mid-fade-up.
            unblockReveal("transition");
            tl.resume();
          });
        });
      })
      // 4) Fade the black overlay away to reveal the new page.
      .to(overlayRef.current, {
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
      });
  }, [location.pathname]);

  // Unmount cleanup only. Reset the overlay so it can never be left
  // visible, and release any reveal-gate blocker we still hold.
  useEffect(() => {
    return () => {
      tlRef.current?.kill();
      if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 0 });
      unblockReveal("transition");
    };
  }, []);

  return (
    <>
      <div>{rendered}</div>
      <div
        ref={overlayRef}
        aria-hidden
        className="fixed inset-0 z-[60] bg-black pointer-events-none"
        style={{ opacity: 0, willChange: "opacity" }}
      />
    </>
  );
}
