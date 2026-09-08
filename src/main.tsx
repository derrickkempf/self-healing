import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Story from "./pages/Story";
import Notify from "./pages/Notify";
import Create from "./pages/Create";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import AuthGuard from "./components/AuthGuard";
import PageTransition from "./components/PageTransition";

import "./styles/globals.css";

/**
 * App shell.
 *
 *   PageTransition — fade + sweep between routes (z-60)
 *   <Routes>      — actual page content
 *
 * (The one-shot splash/intro overlay that used to play on first visit
 * each session has been removed — the site now goes straight to the
 * requested page.)
 */
function App() {
  return <RoutedShell />;
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
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
