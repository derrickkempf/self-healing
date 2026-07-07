import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Story from "./pages/Story";
import Notify from "./pages/Notify";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import AuthGuard from "./components/AuthGuard";
import IntroOverlay from "./components/IntroOverlay";
import PageTransition from "./components/PageTransition";

import "./styles/globals.css";

/**
 * App shell.
 *
 *   IntroOverlay  — full-screen one-shot intro (z-100); plays once per session
 *   PageTransition — fade + sweep between routes (z-60)
 *   <Routes>      — actual page content
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
    <PageTransition>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/story" element={<Story />} />
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
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
