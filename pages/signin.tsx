import Metadata from "@components/Metadata";
import { Button, Card } from "@components/index";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { clx } from "@lib/helpers";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { GetStaticProps } from "next";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import Container from "@components/Container";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "/api/auth";
const OTP_LENGTH = 8;

const SignInPage: Page = () => {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Tick the countdown down every second while rate-limited
  useEffect(() => {
    if (!rateLimitedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountdown(0);
        setRateLimitedUntil(null);
        setError(null);
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rateLimitedUntil]);

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
    if (turnstileWidgetRef.current) return;
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

  // If Turnstile script was already loaded (e.g. returning from another page), onLoad
  // won't fire again — initialise the widget directly if window.turnstile already exists.
  useEffect(() => {
    if (typeof window !== "undefined" && window.turnstile) {
      handleScriptLoad();
    }
  }, []);

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
        if (res.status === 429) {
          setRateLimitedUntil(Date.now() + 60_000);
          return;
        }
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
    const otpValue = otp.join("");
    if (otpValue.length !== OTP_LENGTH) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp: otpValue }),
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

  const resetOtp = () => setOtp(Array(OTP_LENGTH).fill(""));

  const setOtpFromChars = (chars: string[]) => {
    setOtp(chars.map((char) => char.replace(/\D/g, "").slice(0, 1)));
    setError(null);
  };

  const focusOtpInput = (index: number) => {
    otpInputRefs.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus();
  };

  const applyOtpDigits = (value: string, startIndex = 0) => {
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;

    const chars = [...otp];
    const offset = digits.length === OTP_LENGTH ? 0 : startIndex;
    digits
      .slice(0, OTP_LENGTH - offset)
      .split("")
      .forEach((digit, index) => {
        chars[offset + index] = digit;
      });

    setOtpFromChars(chars);
    focusOtpInput(offset + digits.length);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      applyOtpDigits(digits, index);
      return;
    }

    const chars = [...otp];
    chars[index] = digits;
    setOtpFromChars(chars);

    if (digits && index < OTP_LENGTH - 1) focusOtpInput(index + 1);
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      focusOtpInput(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusOtpInput(index - 1);
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusOtpInput(index + 1);
    }
  };

  const handlePasteOtp = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const digits = clipboardText.replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (!digits) {
        setError("Clipboard does not contain a code.");
        return;
      }
      applyOtpDigits(digits);
    } catch {
      setError("Unable to read from clipboard. Paste the code manually.");
    }
  };

  const otpValue = otp.join("");

  return (
    <>
      <Metadata
        title="Sign In"
        description="Sign in to the ElectionData.MY API Console."
        keywords=""
      />

      {!checkingSession && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={handleScriptLoad}
        />
      )}

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
                      disabled={loading || !email || !!rateLimitedUntil}
                      className="w-full justify-center py-2"
                    >
                      {loading
                        ? "Sending…"
                        : rateLimitedUntil
                          ? `Rate limited | Retry in ${countdown}s`
                          : "Send code"}
                    </Button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleOtpSubmit}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor="otp-0"
                          className="text-body-sm font-medium text-txt-black-900"
                        >
                          One-time passcode
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handlePasteOtp}
                          className="px-2 py-1 text-body-sm"
                          icon={<ClipboardDocumentIcon className="h-4 w-4" />}
                        >
                          Paste
                        </Button>
                      </div>
                      <div
                        className={clx(
                          "grid grid-cols-8 overflow-hidden rounded-md border bg-bg-white",
                          error ? "border-txt-danger" : "border-otl-gray-200",
                        )}
                      >
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            id={index === 0 ? "otp-0" : undefined}
                            ref={(el) => {
                              otpInputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            required
                            autoComplete={index === 0 ? "one-time-code" : "off"}
                            aria-label={`Passcode digit ${index + 1}`}
                            value={digit}
                            onChange={(e) =>
                              handleOtpChange(index, e.target.value)
                            }
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={(e) => {
                              e.preventDefault();
                              applyOtpDigits(
                                e.clipboardData.getData("text"),
                                index,
                              );
                            }}
                            className={clx(
                              "h-12 w-full border-0 text-center font-mono text-2xl font-semibold text-txt-black-900 sm:h-14 sm:text-3xl",
                              "bg-bg-white outline-none transition",
                              "focus:border-otl-gray-400 focus:ring-primary/20 focus:ring-2",
                              index < OTP_LENGTH - 1 &&
                                "border-r border-otl-gray-200",
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {error && (
                      <p className="text-body-sm text-txt-danger">{error}</p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading || otpValue.length !== OTP_LENGTH}
                      className="w-full justify-center py-2"
                    >
                      {loading ? "Verifying…" : "Continue"}
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        resetOtp();
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
