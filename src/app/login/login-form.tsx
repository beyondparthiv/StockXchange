"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Alert,
  AuthShell,
  ConfigNotice,
  Divider,
  Field,
  GoogleButton,
  SubmitButton,
} from "@/components/auth/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Method = "password" | "phone";
type PhoneStep = "enter-phone" | "enter-code";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const urlError = params.get("error");

  const configured = isSupabaseConfigured();
  const supabase = createClient();

  const [method, setMethod] = useState<Method>("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);
  const [info, setInfo] = useState<string | null>(null);

  // Email / password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter-phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  function done() {
    router.push(next);
    router.refresh(); // re-run the proxy + server components with the new session
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) return setError(error.message);
    done();
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
    // On success the browser is redirected to Google, so no further action here.
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return setError(error.message);
    setPhoneStep("enter-code");
    setInfo(`We sent a code to ${phone}.`);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) return setError(error.message);
    done();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to trade."
      footer={
        <>
          New here?{" "}
          <Link
            href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Create an account
          </Link>
        </>
      }
    >
      {!configured && (
        <div className="mb-4">
          <ConfigNotice />
        </div>
      )}

      <div className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}

        <GoogleButton onClick={handleGoogle} disabled={!configured || loading} />

        <Divider label="or" />

        {/* Method switch */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-900 p-1 text-xs">
          {(["password", "phone"] as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setError(null);
                setInfo(null);
              }}
              className={`rounded-md py-1.5 font-medium transition ${
                method === m
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m === "password" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        {method === "password" ? (
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              required
              disabled={!configured}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              disabled={!configured}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Forgot password?
              </Link>
            </div>
            <SubmitButton loading={loading} disabled={!configured}>
              Log in
            </SubmitButton>
          </form>
        ) : phoneStep === "enter-phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <Field
              label="Phone number (with country code)"
              type="tel"
              required
              disabled={!configured}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
            />
            <SubmitButton loading={loading} disabled={!configured}>
              Send code
            </SubmitButton>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <Field
              label="6-digit code"
              type="text"
              inputMode="numeric"
              required
              disabled={!configured}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
            />
            <SubmitButton loading={loading} disabled={!configured}>
              Verify &amp; log in
            </SubmitButton>
            <button
              type="button"
              onClick={() => {
                setPhoneStep("enter-phone");
                setOtp("");
                setInfo(null);
              }}
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
