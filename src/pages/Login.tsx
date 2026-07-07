import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SiteChrome from "../components/SiteChrome";
import { requestCode, verifyCode } from "../utils/auth";
import { useAuth } from "../utils/useAuth";

type Step = "email" | "code";

/**
 * Three-step email-code sign-in flow, powered by Supabase Auth's OTP.
 *
 *   1. User enters email.
 *   2. We check the client-side whitelist for fast UX, then call
 *      supabase.auth.signInWithOtp — Supabase emails them a 6-digit code.
 *   3. User pastes the code; we verifyOtp; on success Supabase has set
 *      the session and we navigate to the dashboard.
 *
 * Dark theme throughout: black background, white type, hairline borders.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const redirectTo = location.state?.from ?? "/dashboard";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const res = await requestCode(email);
    setSubmitting(false);
    if (!res.ok) {
      if (res.reason === "not_whitelisted") {
        setError(
          "This email isn't authorized for access. Reach out to the project owner.",
        );
      } else {
        setError("Couldn't send the code. Try again in a moment.");
      }
      return;
    }
    setDevCode(res.devCode ?? null);
    setDigits(["", "", "", "", "", ""]);
    setStep("code");
    // focus the first cell once mounted
    setTimeout(() => cellRefs.current[0]?.focus(), 30);
  }

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setSubmitting(true);
    const res = await verifyCode(email, code);
    setSubmitting(false);
    if (!res.ok) {
      setError("That code is invalid or has expired. Request a new one.");
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  function handleCellChange(idx: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    if (cleaned && idx < 5) cellRefs.current[idx + 1]?.focus();
  }

  function handleCellKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      cellRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      cellRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      cellRefs.current[idx + 1]?.focus();
    } else if (e.key === "Enter" && digits.join("").length === 6) {
      handleVerify();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    cellRefs.current[focusIdx]?.focus();
  }

  async function resendCode() {
    setError(null);
    const res = await requestCode(email);
    if (res.ok) {
      setDevCode(res.devCode ?? null);
      setDigits(["", "", "", "", "", ""]);
      cellRefs.current[0]?.focus();
    }
  }

  // If the user is already authenticated, bounce them onward.
  const { session, loading } = useAuth();
  useEffect(() => {
    if (!loading && session) navigate(redirectTo, { replace: true });
  }, [loading, session, navigate, redirectTo]);

  // Panel style — visually consistent with StageCard on Home/Dashboard
  // and with the Settings account panel. A bordered #1a1a1a rectangle
  // with a 32-px inner pad; keeps the auth flow feeling like a stage
  // card rather than a floating form.
  const panelClass = "border border-white/15 w-full";
  const panelStyle: React.CSSProperties = {
    background: "#1a1a1a",
    borderRadius: "2px",
    padding: "var(--cell)",
  };

  return (
    <SiteChrome>
      <main className="min-h-screen flex items-center justify-center px-6 py-24 pointer-events-auto">
        <div className="w-full max-w-[440px]">
          {step === "email" ? (
            <form
              onSubmit={handleRequestCode}
              noValidate
              className={panelClass}
              style={panelStyle}
            >
              <h1 className="font-serif text-5xl md:text-6xl leading-none mb-4">
                Account
              </h1>
              <p className="text-sub text-sm mb-10">
                Enter your email to access your account.
              </p>

              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                autoFocus
              />

              <button
                type="submit"
                disabled={!emailValid || submitting}
                className="mt-3 w-full py-4 text-sm uppercase tracking-[0.18em] bg-white text-black disabled:bg-white/30 disabled:text-white/70 transition"
              >
                {submitting ? "…" : "Continue"}
              </button>

              {error && (
                <p className="mt-5 text-[12px] text-red-300/90 leading-relaxed">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <form
              onSubmit={handleVerify}
              noValidate
              className={panelClass}
              style={panelStyle}
            >
              <h1 className="font-serif text-5xl md:text-6xl leading-none mb-4">
                Check your email
              </h1>
              <p className="text-sub text-sm mb-10">
                Code sent to <span className="text-white">{email}</span>
              </p>

              <div className="flex gap-2 md:gap-3 justify-between mb-6">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (cellRefs.current[i] = el)}
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleCellChange(i, e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="code-cell"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={digits.join("").length !== 6 || submitting}
                className="w-full py-4 text-sm uppercase tracking-[0.18em] bg-white text-black disabled:bg-white/30 disabled:text-white/70 transition"
              >
                {submitting ? "…" : "Verify"}
              </button>

              <div className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                    setDevCode(null);
                  }}
                  className="hover:text-white transition"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={resendCode}
                  className="underline underline-offset-4 hover:text-white transition"
                >
                  Request a new code
                </button>
              </div>

              {devCode && (
                <p className="mt-8 text-[11px] text-muted leading-relaxed border border-line p-3">
                  <span className="uppercase tracking-[0.18em] text-white/70">
                    Dev mode
                  </span>
                  <br />
                  Supabase not configured — your code is{" "}
                  <span className="text-white font-medium tracking-widest">
                    {devCode}
                  </span>
                  . Once you set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY,
                  real codes are emailed and this panel disappears.
                </p>
              )}

              {error && (
                <p className="mt-5 text-[12px] text-red-300/90 leading-relaxed">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </main>
    </SiteChrome>
  );
}
