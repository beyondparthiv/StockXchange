"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Alert,
  AuthShell,
  ConfigNotice,
  Field,
  SubmitButton,
} from "@/components/auth/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // The recovery email links back through /auth/callback, which exchanges the
    // code for a (recovery) session and forwards to /reset-password.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <Link
          href="/login"
          className="font-semibold text-teal hover:text-teal-deep"
        >
          Back to log in
        </Link>
      }
    >
      {!configured && (
        <div className="mb-4">
          <ConfigNotice />
        </div>
      )}

      {sent ? (
        <Alert kind="success">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way. Check your inbox.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <Alert kind="error">{error}</Alert>}
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
          <SubmitButton loading={loading} disabled={!configured}>
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
