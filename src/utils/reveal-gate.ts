/**
 * A global "should reveals be allowed to play right now?" gate.
 *
 * Why this exists: <Reveal> uses IntersectionObserver to play its
 * fade-up animation when an element scrolls into view. But during the
 * IntroOverlay and the PageTransition fade-to-black, above-the-fold
 * elements are "in view" while the overlay is covering them — if the
 * reveals fire right then, the user never sees them.
 *
 * IntroOverlay and PageTransition register themselves as blockers; the
 * Reveal component queues its animation if anything is blocking and
 * fires it the moment the last blocker releases.
 *
 * Multiple blockers can coexist (intro + transition during the very
 * first navigation, for example). Reveals fire only when the set is
 * empty.
 */

type Reason = "intro" | "transition";

const blockers = new Set<Reason>();
const listeners = new Set<() => void>();

// Boot-time state: if the intro hasn't been seen yet this session,
// preemptively block. The IntroOverlay component will release this
// when its timeline starts its exit tween.
//
// Failsafe: if IntroOverlay's timeline gets killed before it can call
// unblock (StrictMode double-invocation, fast remount, gsap context
// revert, etc.) we'd leave above-the-fold Reveals stuck at opacity 0.
// The intro timeline runs ~3.1s total, so 4s is a safe ceiling that
// won't fight a healthy intro but will rescue a broken one.
if (typeof window !== "undefined") {
  try {
    if (sessionStorage.getItem("sh.intro.seen") !== "1") {
      blockers.add("intro");
      setTimeout(() => unblockReveal("intro"), 4000);
    }
  } catch {
    // Safari private mode etc. — fall through; the intro will release.
  }
}

export function blockReveal(reason: Reason): void {
  blockers.add(reason);
}

export function unblockReveal(reason: Reason): void {
  blockers.delete(reason);
  if (blockers.size === 0 && listeners.size > 0) {
    const toFire = Array.from(listeners);
    listeners.clear();
    // Defer to a fresh task. unblockReveal is sometimes invoked from inside
    // an active gsap.context (e.g., from a timeline's .call callback in
    // IntroOverlay). If the listener creates gsap tweens synchronously,
    // those tweens get recorded into that context — and a later
    // ctx.revert() on unmount would yank them back to their start state.
    // Hopping out to setTimeout escapes the context cleanly.
    toFire.forEach((fn) => setTimeout(fn, 0));
  }
}

export function isRevealBlocked(): boolean {
  return blockers.size > 0;
}

/**
 * Schedule a callback to fire as soon as no blockers remain. If nothing
 * is blocking right now it fires immediately. Returns a cancel fn so
 * an unmounting Reveal doesn't fire a stale animation.
 */
export function onRevealReady(cb: () => void): () => void {
  if (blockers.size === 0) {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
