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
import { attempt } from "@/lib/supabase/errors";

export default function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const configured = isSupabaseConfigured();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { data, error } = await attempt(() =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          // Stored on auth.users.raw_user_meta_data; the DB trigger copies
          // display_name into the public.profiles row on creation.
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      }),
    );
    setLoading(false);

    if (error) return setError(error.message);

    // If email confirmation is ON, there's no session yet — tell them to check
    // their inbox. If it's OFF, Supabase returns a session and we can proceed.
    if (data?.session) {
      router.push(next);
      router.refresh();
    } else {
      setInfo("Account created. Check your email to confirm, then log in.");
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await attempt(() =>
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      }),
    );
    if (error) {
      setLoading(false);
      setError(error.message);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start trading in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent hover:text-accent-hover"
          >
            Log in
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

        <form onSubmit={handleSignup} className="space-y-3">
          <Field
            label="Display name"
            type="text"
            required
            disabled={!configured}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Parthiv Modi"
          />
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
            autoComplete="new-password"
            required
            minLength={6}
            disabled={!configured}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          <SubmitButton loading={loading} disabled={!configured}>
            Sign up
          </SubmitButton>
        </form>

        <p className="text-center text-xs text-ink-soft">
          Prefer your phone? Use{" "}
          <Link href="/login" className="font-semibold text-accent hover:text-accent-hover">
            phone login
          </Link>{" "}
          — a verified number creates your account automatically.
        </p>
      </div>
    </AuthShell>
  );
}
