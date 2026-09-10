import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { unblockReveal } from "../utils/reveal-gate";

/**
 * One-shot intro overlay — a "mat wipe" reveal.
 *
 * Timeline (≈ 3.6s total):
 *   0.10 - the green mat (mat-green-side.svg) fades in at full height,
 *          tilted in perspective, parked bleeding off the right edge
 *   0.35 - "Between every cut," fades/settles in on the left
 *   1.10 - hold beat
 *   1.10 - the mat slides left, sweeping across the middle of the
 *          screen; "Between every cut," fades out as the mat passes
 *          over it, "a space for healing." fades in on the right as the
 *          mat clears that side — the second phrase reads as having
 *          been sitting there under the mat the whole time; the mat
 *          ends bleeding off the LEFT edge instead
 *   2.55 - hold on the combined "mat (left) + second phrase (right)"
 *          frame for ~1.4s
 *   3.35 - exit: the whole overlay (mat + phrase) slides up and off
 *          screen while the live site simultaneously slides up from
 *          just below its resting position into place — same duration
 *          and ease on both, so it reads as one continuous swap rather
 *          than a cover being lifted off a static page.
 *
 * The overlay sets a sessionStorage flag so it only plays once per
 * browser session. Pass `force` to replay (e.g. a hidden dev shortcut).
 * Click anywhere to skip — the timeline jumps to its exit.
 *
 * The mat's tilt/size numbers below are a first-pass approximation of
 * the reference mockup. An earlier version used a full 3D
 * perspective + rotateX + rotateZ combo, but at this element's size
 * that produced a wildly exaggerated diagonal stripe instead of a
 * recognizable tilted mat — so this is deliberately a plain 2D
 * `rotate()` on a moderately-sized box instead. Nudge MAT_* if the
 * angle or scale still needs adjusting.
 */

const STORAGE_KEY = "sh.intro.seen";
// The site-shell wrapper (see main.tsx) that the exit tween slides up
// into place, synchronized with the overlay's own slide-up.
const SITE_SHELL_SELECTOR = "#site-shell";
const SITE_SHELL_OFFSET = 48; // px the site starts below its resting spot

// Mat sizing / tilt. Height-driven (not width-driven) so it reads as
// "fills the viewport top-to-bottom, bleeds off one side" — width
// follows automatically from the SVG's own ~1.5:1 aspect ratio.
const MAT_HEIGHT = "76vh";
const MAT_ROTATE = -14; // simple 2D spin — no 3D perspective/rotateX
const MAT_REST_RIGHT = "-6%"; // rest position: bleeds off the right edge
const MAT_SLIDE_X = "-92vw"; // sweep distance: ends bleeding off the left

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

    // Initial states. The mat's rest position (before any slide) is set
    // via CSS (`right: MAT_REST_RIGHT`, see JSX) so it already bleeds
    // off the right edge — only the tilt, vertical centering, and fade
    // need to be set here.
    gsap.set(rootRef.current, { autoAlpha: 1, yPercent: 0 });
    gsap.set(matRef.current, {
      rotation: MAT_ROTATE,
      yPercent: -50,
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
      // Mat fades in first, parked bleeding off the right edge.
      .to(matRef.current, { opacity: 1, duration: 0.7, ease: "power2.out" }, 0.1)
      // "Between every cut," settles in on the left.
      .to(
        phrase1Ref.current,
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
        0.35,
      )
      // Hold beat before the sweep.
      .to({}, { duration: 0.5 })
      // The mat sweeps left across the middle of the screen, ending
      // bled off the left edge instead.
      .to(matRef.current, { x: MAT_SLIDE_X, duration: 1.15, ease: "power3.inOut" })
      // The first phrase disappears as the mat passes over it.
      .to(
        phrase1Ref.current,
        { opacity: 0, duration: 0.35, ease: "power2.in" },
        "<",
      )
      // The second phrase reveals on the right as the mat clears it.
      .to(
        phrase2Ref.current,
        { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" },
        "-=0.5",
      )
      // Hold on the combined frame.
      .to({}, { duration: 1.4 })
      // Exit: overlay slides up and off screen while the site
      // simultaneously slides up from just below its resting spot —
      // same duration + ease on both so they read as one swipe.
      .addLabel("exit")
      .call(() => unblockReveal("intro"), [], "exit")
      .to(
        rootRef.current,
        { yPercent: -100, duration: 0.9, ease: "expo.inOut" },
        "exit",
      );
    if (siteShell) {
      tl.to(
        siteShell,
        { y: 0, duration: 0.9, ease: "expo.inOut", clearProps: "transform" },
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
      {/* Full-bleed mat — a direct child of the root (not the
          max-width text column below) so its right/left offsets are
          measured against the actual viewport and it can genuinely
          bleed off either edge. */}
      <img
        ref={matRef}
        src="/mat-green-side.svg"
        alt=""
        className="absolute pointer-events-none z-[1]"
        style={{
          top: "50%",
          right: MAT_REST_RIGHT,
          height: MAT_HEIGHT,
          width: "auto",
          willChange: "transform, opacity",
        }}
      />

      <div className="relative z-[2] w-full max-w-[1400px] px-6 md:px-16 flex items-center justify-between pointer-events-none">
        <div
          ref={phrase1Ref}
          className="serif text-white/95 leading-none"
          style={{ fontSize: "clamp(1.75rem, 9vw, 7rem)" }}
        >
          Between every cut,
        </div>
        <div
          ref={phrase2Ref}
          className="serif text-white/95 leading-none text-right"
          style={{ fontSize: "clamp(1.75rem, 9vw, 7rem)" }}
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
