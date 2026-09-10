import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { unblockReveal } from "../utils/reveal-gate";

/**
 * One-shot intro overlay — a "mat wipe" reveal.
 *
 * Timeline (≈ 4.7s total):
 *   0.15 - the green mat (mat-green-side.svg) fades in, tilted in
 *          perspective, parked exactly half on / half off screen
 *   0.45 - "Between every cut," fades/settles in
 *   1.15 - hold beat
 *   1.15 - the mat sweeps across the screen; the first phrase fades
 *          out as the mat passes over it, the second phrase fades in
 *          as the mat clears that side — it reads as having been
 *          sitting there under the mat the whole time. The mat ends
 *          half on / half off the OPPOSITE edge from where it started.
 *   3.25 - hold on the combined frame for ~1.8s
 *   5.05 - exit: the whole overlay slides away while the live site
 *          simultaneously slides into place — same duration + ease on
 *          both, so it reads as one continuous swap.
 *
 * Desktop sweeps horizontally (mat starts bled off the right edge,
 * ends bled off the left; phrases sit left/right of each other).
 * Mobile sweeps vertically instead — narrow screens don't have the
 * width to spare for a side-by-side layout, so the mat is sized by
 * width, phrases stack top/bottom, and the mat covers the bottom of
 * the screen first before sweeping up to cover the top.
 *
 * Both variants use the same trick to guarantee "exactly half on,
 * half off screen" regardless of viewport size: the mat is CSS-anchored
 * flush to one edge (e.g. `right: 0`), then GSAP's xPercent/yPercent
 * (a transform-based offset relative to the ELEMENT's own size, not the
 * viewport) shifts it by exactly 50% of its own width/height past that
 * edge. The sweep itself is then a single `x`/`y` tween of exactly
 * "100vw"/"100vh" — since the half-on/half-off offset is baked into
 * the constant xPercent/yPercent rather than the animated property, the
 * mat lands exactly mirrored on the opposite edge with no guesswork.
 *
 * The overlay sets a sessionStorage flag so it only plays once per
 * browser session. Pass `force` to replay (e.g. a hidden dev shortcut).
 * Click anywhere to skip — the timeline jumps to its exit.
 */

const STORAGE_KEY = "sh.intro.seen";
// The site-shell wrapper (see main.tsx) that the exit tween slides up
// into place, synchronized with the overlay's own slide-up.
const SITE_SHELL_SELECTOR = "#site-shell";
const SITE_SHELL_OFFSET = 48; // px the site starts below its resting spot
// Matches the site's own `md:` breakpoint (768px) used everywhere else
// in SiteChrome, so the intro flips layout at the same point the rest
// of the chrome does.
const MOBILE_QUERY = "(max-width: 767px)";

// Perspective tilt — same on both breakpoints.
const MAT_ROTATE_X = 40;
const MAT_ROTATE_Y = -30;
const MAT_ROTATE_Z = -12;
const MAT_PERSPECTIVE = 2200;

// Desktop: sized by height, sweeps left/right.
const MAT_SLIDE_X = "-100vw";
// Mobile: sized by width, sweeps up/down.
const MAT_SLIDE_Y = "-100vh";

interface Props {
  /** Force the intro to play even if it has been shown this session. */
  force?: boolean;
  /** Fired after the overlay finishes its exit animation. */
  onDone?: () => void;
}

export default function IntroOverlay({ force = false, onDone }: Props) {
  const [show, setShow] = useState<boolean>(() => {
    if (force) return true;
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) !== "1";
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const matRef = useRef<HTMLImageElement | null>(null);
  const phrase1Ref = useRef<HTMLDivElement | null>(null);
  const phrase2Ref = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!show) return;
    if (!rootRef.current) return;

    const siteShell = document.querySelector<HTMLElement>(SITE_SHELL_SELECTOR);
    const isMobile =
      typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

    gsap.set(rootRef.current, { autoAlpha: 1, yPercent: 0 });

    // The mat's rest position is set entirely here (not just a fade) —
    // xPercent/yPercent give the "half on, half off" offset; the CSS
    // anchor (bottom+left on mobile, top+right on desktop — see JSX)
    // provides the edge each half-offset is measured from.
    gsap.set(matRef.current, {
      rotationX: MAT_ROTATE_X,
      rotationY: MAT_ROTATE_Y,
      rotationZ: MAT_ROTATE_Z,
      transformPerspective: MAT_PERSPECTIVE,
      xPercent: isMobile ? -50 : 50,
      yPercent: isMobile ? 50 : -50,
      opacity: 0,
    });
    gsap.set(phrase1Ref.current, { opacity: 0, y: 14 });
    gsap.set(phrase2Ref.current, { opacity: 0, y: 14 });
    if (siteShell) gsap.set(siteShell, { y: SITE_SHELL_OFFSET });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        // Idempotent — also reachable via handleSkip(). Belt + suspenders
        // in case anything jumps past the .call without firing it.
        unblockReveal("intro");
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* private mode etc. — ignore */
        }
        setShow(false);
        onDone?.();
      },
    });

    tl
      // Mat fades in first, parked half on / half off screen.
      .to(matRef.current, { opacity: 1, duration: 0.9, ease: "power2.out" }, 0.15)
      // First phrase settles in.
      .to(
        phrase1Ref.current,
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        0.45,
      )
      // Hold beat before the sweep.
      .to({}, { duration: 0.7 })
      // The mat sweeps across, ending half on / half off the opposite
      // edge — horizontal on desktop, vertical on mobile.
      .to(
        matRef.current,
        isMobile
          ? { y: MAT_SLIDE_Y, duration: 1.5, ease: "power3.inOut" }
          : { x: MAT_SLIDE_X, duration: 1.5, ease: "power3.inOut" },
      )
      // The first phrase disappears as the mat passes over it.
      .to(
        phrase1Ref.current,
        { opacity: 0, duration: 0.45, ease: "power2.in" },
        "<",
      )
      // The second phrase reveals as the mat clears it.
      .to(
        phrase2Ref.current,
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
        "-=0.6",
      )
      // Hold on the combined frame.
      .to({}, { duration: 1.8 })
      // Exit: overlay slides up and off screen while the site
      // simultaneously slides up from just below its resting spot —
      // same duration + ease on both so they read as one swipe.
      .addLabel("exit")
      .call(() => unblockReveal("intro"), [], "exit")
      .to(
        rootRef.current,
        { yPercent: -100, duration: 1.1, ease: "expo.inOut" },
        "exit",
      );
    if (siteShell) {
      tl.to(
        siteShell,
        { y: 0, duration: 1.1, ease: "expo.inOut", clearProps: "transform" },
        "exit",
      );
    }

    tlRef.current = tl;

    return () => {
      // Always release the reveal-gate on unmount — belt + suspenders in
      // case the timeline got killed before its own unblock call fired.
      unblockReveal("intro");
      tl.kill();
    };
  }, [show, onDone]);

  function handleSkip() {
    // Don't trust GSAP to fire the embedded .call when we seek past it —
    // unblock here too. unblockReveal is idempotent. Land just shy of the
    // end and let it play out naturally so onComplete still fires.
    unblockReveal("intro");
    tlRef.current?.progress(0.97).play();
  }

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      onClick={handleSkip}
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden cursor-pointer select-none"
      style={{ background: "#1a1a1a", willChange: "transform" }}
    >
      {/* Mat — anchored bottom+center on mobile (sized by width, sweeps
          vertically), top+right on desktop (sized by height, sweeps
          horizontally). A direct child of the root, not the max-width
          text column below, so its anchor is the real viewport edge. */}
      <img
        ref={matRef}
        src="/mat-green-side.svg"
        alt=""
        className="absolute pointer-events-none z-[1] bottom-0 left-1/2 w-[130vw] h-auto md:bottom-auto md:left-auto md:top-1/2 md:right-0 md:h-[100vh] md:w-auto"
        style={{ willChange: "transform, opacity" }}
      />

      <div className="relative z-[2] w-full h-full md:h-auto max-w-[1400px] px-3 md:px-16 flex flex-col md:flex-row justify-between items-start md:items-center pointer-events-none py-10 md:py-0">
        <div
          ref={phrase1Ref}
          className="serif text-white/95 leading-none whitespace-nowrap"
          style={{ fontSize: "clamp(1.5rem, 7.5vw, 7rem)" }}
        >
          Between every cut,
        </div>
        <div
          ref={phrase2Ref}
          className="serif text-white/95 leading-none whitespace-nowrap text-left md:text-right"
          style={{ fontSize: "clamp(1.5rem, 7.5vw, 7rem)" }}
        >
          a space for healing.
        </div>
      </div>

      <span className="absolute bottom-6 right-6 md:right-10 z-[2] text-[10px] uppercase tracking-[0.25em] text-white/40 hidden md:inline">
        click to skip
      </span>
    </div>
  );
}
