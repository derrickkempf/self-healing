import { Link } from "react-router-dom";

/**
 * Minimal site chrome — just the logo, fixed top-left so it stays put on
 * scroll and remains in the same exact place on every public page (landing,
 * login, etc.).
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
        className="pointer-events-auto fixed top-6 left-6 md:top-8 md:left-10 z-50 hover:opacity-80 transition-opacity"
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
