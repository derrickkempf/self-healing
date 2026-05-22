import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { unblockReveal } from "../utils/reveal-gate";

/**
 * One-shot intro overlay (Semplice-style brief loader).
 *
 * Timeline (≈ 2.3s total):
 *   0.00 - black overlay covers screen
 *   0.05 - thin top hairline scales in (10ms ease)
 *   0.10 - logo reveals via a left-to-right clip-path wipe
 *   0.85 - tagline characters stagger in
 *   1.90 - tagline + logo fade slightly, then…
 *   2.10 - whole overlay slides up (yPercent: -100) revealing the page
 *
 * The overlay sets a sessionStorage flag so it only plays once per browser
 * session. Pass `force` to replay (used by a hidden dev keyboard shortcut).
 *
 * Click anywhere to skip — the timeline jumps to its end.
 */

const STORAGE_KEY = "sh.intro.seen";

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
  const logoRef = useRef<HTMLDivElement | null>(null);
  const taglineRef = useRef<HTMLDivElement | null>(null);
  const topLineRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!show) return;
    if (!rootRef.current) return;

    // NOTE: deliberately NOT wrapping this in gsap.context(). The previous
    // version did, and ctx.revert() on unmount was killing the hero's
    // <Reveal> fade-in tween via gsap's cross-context tracking (the
    // tween was scheduled from inside one of this timeline's .call
    // callbacks, which gsap apparently associates with the surrounding
    // context). Result: hero faded in, then snapped back to opacity 0
    // when the overlay unmounted. Plain gsap calls + manual tl.kill()
    // on unmount sidesteps the issue entirely.
    const introChars = rootRef.current.querySelectorAll(".intro-char");

    // Initial states
    gsap.set(rootRef.current, { autoAlpha: 1, yPercent: 0 });
    gsap.set(topLineRef.current, { scaleX: 0, transformOrigin: "left center" });
    gsap.set(logoRef.current, {
      clipPath: "inset(0 100% 0 0)",
      opacity: 1,
    });
    gsap.set(introChars, { yPercent: 110, opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        // Idempotent — also called from the exit tween's onStart and from
        // handleSkip(). Belt + suspenders in case anything jumps past the
        // call without firing it.
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

    tl.to(topLineRef.current, { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0.05)
      .to(
        logoRef.current,
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.95,
          ease: "expo.out",
        },
        0.1,
      )
      // Animate a "0 → 100" counter alongside the wipe.
      .to(
        { v: 0 },
        {
          v: 100,
          duration: 1.4,
          ease: "power1.inOut",
          onUpdate() {
            const v = Math.round(this.targets()[0].v);
            if (counterRef.current) {
              counterRef.current.textContent = String(v).padStart(3, "0");
            }
          },
        },
        0.1,
      )
      .to(
        introChars,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.025,
          ease: "power3.out",
        },
        0.85,
      )
      .to(
        [logoRef.current, taglineRef.current, topLineRef.current],
        { opacity: 0, duration: 0.4, ease: "power2.in" },
        "+=0.25",
      )
      // Unblock the reveal-gate the moment the overlay starts sliding off,
      // so above-the-fold <Reveal>s start fading up *while* the overlay
      // rises. By the time the overlay is gone, content is mid-animation —
      // no awkward "page appears empty, then animates" two-step.
      .call(() => unblockReveal("intro"), [], "-=0.15")
      .to(
        rootRef.current,
        { yPercent: -100, duration: 0.9, ease: "expo.inOut" },
        "<",
      );

    tlRef.current = tl;

    return () => {
      // Always release the reveal-gate on unmount — belt + suspenders in
      // case the timeline got killed before its own unblock call fired.
      unblockReveal("intro");
      // Kill the timeline (stops the tick + frees handlers). Deliberately
      // no ctx.revert() — see note at the top of this effect.
      tl.kill();
    };
  }, [show, onDone]);

  function handleSkip() {
    // Don't trust GSAP to fire the embedded .call when we seek past it —
    // unblock here too. unblockReveal is idempotent.
    unblockReveal("intro");
    tlRef.current?.progress(0.95).play();
  }

  if (!show) return null;

  const tagline = "Between every cut a space for healing";

  return (
    <div
      ref={rootRef}
      onClick={handleSkip}
      aria-hidden
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer select-none"
      style={{ willChange: "transform, opacity" }}
    >
      {/* Top hairline — animates in first, lends a sense of "system booting" */}
      <div
        ref={topLineRef}
        className="absolute top-0 left-0 right-0 h-px bg-white/30"
      />

      {/* Logo: clipped reveal */}
      <div
        ref={logoRef}
        className="w-[min(80vw,540px)] px-4"
        style={{ willChange: "clip-path" }}
      >
        <img src="/logo.svg" alt="Self-Healing" className="w-full h-auto" />
      </div>

      {/* Tagline with char-stagger */}
      <div
        ref={taglineRef}
        className="mt-6 text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/70 flex overflow-hidden"
        aria-label={tagline}
      >
        {tagline.split("").map((ch, i) => (
          <span
            key={i}
            className="intro-char inline-block"
            style={{ whiteSpace: "pre" }}
          >
            {ch}
          </span>
        ))}
      </div>

      {/* Bottom row: counter + skip hint */}
      <div className="absolute bottom-6 left-0 right-0 px-6 md:px-10 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/40">
        <span>
          <span ref={counterRef}>000</span>
          <span> · loading</span>
        </span>
        <span className="hidden md:inline">click to skip</span>
      </div>
    </div>
  );
}
