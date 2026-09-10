import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Notify from "./pages/Notify";
import Create from "./pages/Create";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import AuthGuard from "./components/AuthGuard";
import PageTransition from "./components/PageTransition";
import IntroOverlay from "./components/IntroOverlay";

import "./styles/globals.css";

/**
 * App shell.
 *
 *   IntroOverlay  — one-shot "mat wipe" splash on first visit each
 *                   session (z-100). Slides itself away on completion,
 *                   sliding #site-shell up into place at the same time.
 *   PageTransition — fade + sweep between routes (z-60)
 *   <Routes>      — actual page content, wrapped in #site-shell so the
 *                   intro's exit tween has an element to animate.
 */
function App() {
  return (
    <>
      <IntroOverlay />
      <RoutedShell />
    </>
  );
}

/**
 * The PageTransition wrapper needs to live *inside* the BrowserRouter so
 * useLocation works. We render Routes as its children — the wrapper handles
 * the visual transition on every pathname change.
 */
function RoutedShell() {
  const location = useLocation();
  return (
    <div id="site-shell">
      <PageTransition>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/notify" element={<Notify />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/chat"
            element={
              <AuthGuard>
                <Chat />
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Settings />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
