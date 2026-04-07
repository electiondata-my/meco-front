import Metadata from "@components/Metadata";
import { Button, Card } from "@components/index";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { clx } from "@lib/helpers";
import { GetStaticProps } from "next";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import Container from "@components/Container";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "/api/auth";

const SignInPage: Page = () => {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const turnstileWidgetRef = useRef<string | null>(null);
  const turnstileCallbackRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  // Redirect to /console if already signed in
  useEffect(() => {
    fetch(`${AUTH_URL}/me`, { credentials: "include" })
      .then((r) => {
        if (r.ok) router.replace("/console");
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, []);

  const handleScriptLoad = () => {
    if (typeof window === "undefined" || !window.turnstile) return;
    turnstileWidgetRef.current = window.turnstile.render("#cf-turnstile", {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
      callback: (token: string) => turnstileCallbackRef.current?.resolve(token),
      "error-callback": () =>
        turnstileCallbackRef.current?.reject(new Error("Verification failed")),
      size: "invisible",
      execution: "execute",
    });
  };

  const getTurnstileToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!turnstileWidgetRef.current || !window.turnstile) {
        reject(new Error("Verification not available"));
        return;
      }
      turnstileCallbackRef.current = { resolve, reject };
      window.turnstile.reset(turnstileWidgetRef.current);
      window.turnstile.execute(turnstileWidgetRef.current);
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const turnstile_token = await getTurnstileToken();
      const res = await fetch(`${AUTH_URL}/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, turnstile_token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message ?? "Failed to send OTP. Please try again.",
        );
      }
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message ?? "Invalid or expired OTP. Please try again.",
        );
      }
      router.replace("/console");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Metadata
        title="Sign In"
        description="Sign in to the ElectionData.MY API Console."
        keywords=""
      />

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />

      <Container
        as="main"
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16"
      >
        <div className="col-span-full flex w-full max-w-md flex-col items-center">
          <Card className="w-full p-8">
            {checkingSession ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-otl-gray-200 border-t-txt-black-900" />
              </div>
            ) : (
            <>
            <div className="mb-8 flex flex-col gap-2">
              <h1 className="font-heading text-heading-sm font-semibold text-txt-black-900">
                {step === "email" ? "Sign in" : "Check your email"}
              </h1>
              <p className="text-body-sm text-txt-black-700">
                {step === "email"
                  ? "Enter your email to receive a one-time passcode."
                  : `We sent a code to ${email}. Enter it below to continue.`}
              </p>
            </div>

            {step === "email" ? (
              <form
                onSubmit={handleEmailSubmit}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-body-sm font-medium text-txt-black-900"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={clx(
                      "w-full rounded-md border px-3 py-2 text-body-sm text-txt-black-900",
                      "bg-bg-white outline-none transition",
                      "placeholder:text-txt-black-500",
                      "focus:border-otl-gray-400 focus:ring-primary/20 focus:ring-2",
                      error ? "border-txt-danger" : "border-otl-gray-200",
                    )}
                  />
                </div>

                {error && (
                  <p className="text-body-sm text-txt-danger">{error}</p>
                )}

                {/* Invisible Turnstile widget */}
                <div id="cf-turnstile" className="hidden" />

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || !email}
                  className="w-full justify-center py-2"
                >
                  {loading ? "Sending…" : "Send code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="otp"
                    className="text-body-sm font-medium text-txt-black-900"
                  >
                    One-time passcode
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    required
                    autoComplete="one-time-code"
                    placeholder="11235813"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className={clx(
                      "w-full rounded-md border px-3 py-2 font-mono tracking-widest text-body-sm text-txt-black-900",
                      "bg-bg-white outline-none transition",
                      "placeholder:text-txt-black-500",
                      "focus:border-otl-gray-400 focus:ring-primary/20 focus:ring-2",
                      error ? "border-txt-danger" : "border-otl-gray-200",
                    )}
                  />
                </div>

                {error && (
                  <p className="text-body-sm text-txt-danger">{error}</p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || otp.length < 4}
                  className="w-full justify-center py-2"
                >
                  {loading ? "Verifying…" : "Continue"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError(null);
                  }}
                  className="text-body-sm text-txt-black-500 underline-offset-2 hover:text-txt-black-900 hover:underline"
                >
                  Use a different email
                </button>
              </form>
            )}
            </>
            )}
          </Card>
        </div>
      </Container>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "signin", type: "misc" } },
}));

export default SignInPage;
