import { useEffect, useState } from "react";
import SiteChrome from "../components/SiteChrome";
import Reveal from "../components/Reveal";
import { getContent, submitSignup } from "../utils/supabase";

const NOTIFY_INTRO_DEFAULT =
  "<p>Drop 001 is going to the nine founding collectors first. Drop 002 opens to the public shortly after. Add your email and we'll let you know when it's available.</p>";

/**
 * Notify — public email capture for the drop notify list.
 *
 * Simple form on a bordered #1a1a1a card, same panel treatment as
 * Login. Success and error states are shown inline; no redirects,
 * no modal celebration. Duplicate submissions are silently treated
 * as success (they're already on the list).
 */
export default function Notify() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [introHtml, setIntroHtml] = useState<string>(NOTIFY_INTRO_DEFAULT);

  // Pull the intro copy from the CMS on mount; fall back to the
  // hardcoded default if there's no row yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await getContent("notify.intro");
      if (!cancelled && row?.body_html) setIntroHtml(row.body_html);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg(null);
    const { ok, error } = await submitSignup(email);
    if (ok) {
      setStatus("ok");
      setEmail("");
    } else {
      setStatus("err");
      setErrorMsg(error);
    }
  }

  return (
    <SiteChrome variant="public">
      <main
        className="mx-auto flex items-start justify-center pointer-events-auto"
        style={{
          maxWidth: "calc(var(--cell) * 16)",
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
        }}
      >
        <div
          className="w-full border border-white/15"
          style={{
            background: "#1a1a1a",
            borderRadius: "2px",
            padding: "calc(var(--cell) * 1.25)",
          }}
        >
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50 mb-6">
              Notify
            </p>
            <h1 className="font-serif text-5xl md:text-6xl uppercase leading-[0.95] mb-6">
              Get Notified
            </h1>
            <div
              className="cms-body text-white/70 text-[13px] leading-relaxed mb-8 max-w-md"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
            <style>{`
              .cms-body p { margin: 0 0 1em; }
              .cms-body p:last-child { margin-bottom: 0; }
              .cms-body a { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
              .cms-body ul, .cms-body ol { padding-left: 1.4em; margin: 0 0 1em; }
              .cms-body ul { list-style: disc; }
              .cms-body ol { list-style: decimal; }
              .cms-body blockquote { border-left: 2px solid rgba(255,255,255,0.25); padding-left: 1em; margin: 0.4em 0 0.8em; color: rgba(255,255,255,0.6); font-style: italic; }
            `}</style>
          </Reveal>

          {status === "ok" ? (
            <Reveal>
              <div
                className="border border-white/25 p-6"
                style={{ borderRadius: "2px" }}
              >
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/50 mb-2">
                  On the list
                </p>
                <p className="text-white/85 text-[13px] leading-relaxed">
                  You&apos;ll get one email when Drop 002 opens. No other
                  emails between now and then.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-4 text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white transition"
                >
                  Add another →
                </button>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.1}>
              <form onSubmit={handleSubmit} noValidate>
                <label
                  htmlFor="notify-email"
                  className="block text-[10px] uppercase tracking-[0.28em] text-white/50 mb-2"
                >
                  Email
                </label>
                <input
                  id="notify-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending"}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={status === "sending" || !email.trim()}
                  className="mt-4 w-full py-4 text-sm uppercase tracking-[0.22em] bg-white text-black disabled:bg-white/30 disabled:text-white/70 transition"
                >
                  {status === "sending" ? "…" : "Notify Me"}
                </button>
                {status === "err" && errorMsg && (
                  <p className="mt-4 text-[12px] text-red-300/90 leading-relaxed">
                    {errorMsg}
                  </p>
                )}
                <p className="mt-6 text-[11px] text-white/45 leading-relaxed">
                  One email per drop. No newsletters. No sharing your
                  address.
                </p>
              </form>
            </Reveal>
          )}
        </div>
      </main>
    </SiteChrome>
  );
}
