import { Link } from "react-router-dom";

/**
 * Minimal site chrome — just the logo, fixed top-center so it stays put on
 * scroll and remains in the same exact place on every public page (landing,
 * login, etc.). Uses `left-1/2` + `-translate-x-1/2` to center horizontally
 * regardless of viewport width.
 *
 * Other text nav (Story / Progress / Gallery) was removed by request; deep
 * links to in-page anchors (#story / #progress / #gallery) still work if
 * someone has the URL.
 */
export default function CornerNav() {
  return (
    <nav aria-label="Primary" className="pointer-events-none">
      <Link
        to="/"
        aria-label="Self-Healing — home"
        className="pointer-events-auto fixed top-6 md:top-8 left-1/2 -translate-x-1/2 z-50 hover:opacity-80 transition-opacity"
      >
        <img
          src="/logo.svg"
          alt="Self-Healing"
          className="w-auto"
          style={{ height: "3rem" }}
        />
      </Link>
    </nav>
  );
}
