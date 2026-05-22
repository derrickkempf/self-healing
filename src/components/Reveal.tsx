import { useEffect, useRef } from "react";
import gsap from "gsap";
import { isRevealBlocked, onRevealReady } from "../utils/reveal-gate";

/**
 * Lazy fade-up wrapper.
 *
 *   • Starts the wrapped element at { opacity: 0, y: <y>px }.
 *   • Uses IntersectionObserver to detect when it enters the viewport
 *     (rootMargin: 0 0 -8% 0, so it triggers a hair before fully visible).
 *   • Plays a GSAP fade + slide-up tween. If the reveal-gate is blocked
 *     (intro / page transition is covering the screen), the tween is
 *     queued and fires the moment the gate opens.
 *   • Honors `prefers-reduced-motion` — no animation, just shows.
 *
 * Use `delay` to stagger groups of items (e.g. hero rows or gallery cards).
 *
 * `as` lets you preserve semantic tags (e.g. `<Reveal as="li">` inside an
 * <ol> so we don't break list semantics by inserting a div wrapper).
 */

type Tag =
  | "div"
  | "section"
  | "article"
  | "li"
  | "header"
  | "footer"
  | "main"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "ol"
  | "ul"
  | "span";

interface Props {
  children: React.ReactNode;
  /** Delay before this element starts animating, in seconds. */
  delay?: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Y offset to animate from (px). Defaults to a subtle 24. */
  y?: number;
  /** IntersectionObserver threshold (0–1). */
  threshold?: number;
  /** GSAP ease string. */
  ease?: string;
  className?: string;
  style?: React.CSSProperties;
  as?: Tag;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export default function Reveal({
  children,
  delay = 0,
  duration = 0.85,
  y = 24,
  threshold = 0.1,
  ease = "power3.out",
  className,
  style,
  as,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(el, { opacity: 0, y, willChange: "opacity, transform" });

    let cancelPending = () => {};
    let hasFired = false;

    const fire = () => {
      if (hasFired) return;
      hasFired = true;
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration,
        delay,
        ease,
        overwrite: "auto",
        onComplete: () => {
          // clean up willChange so we don't keep the GPU layer around
          gsap.set(el, { willChange: "auto" });
        },
      });
    };

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          obs.unobserve(el);
          if (isRevealBlocked()) {
            cancelPending = onRevealReady(fire);
          } else {
            fire();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    obs.observe(el);

    return () => {
      obs.disconnect();
      cancelPending();
    };
  }, [delay, duration, y, threshold, ease]);

  const Tag = (as ?? "div") as React.ElementType;
  return (
    <Tag
      ref={ref as React.MutableRefObject<HTMLElement | null>}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
