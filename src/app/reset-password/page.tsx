"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Alert,
  AuthShell,
  ConfigNotice,
  Field,
  SubmitButton,
} from "@/components/auth/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { attempt } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Landing page for the password-recovery link. By the time the user arrives
 * here, /auth/callback has exchanged the recovery code for a session, so
 * `updateUser({ password })` is authorized to set the new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const { error } = await attempt(() =>
      supabase.auth.updateUser({ password }),
    );
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  return (
    <AuthShell title="Set a new password">
      {!configured && (
        <div className="mb-4">
          <ConfigNotice />
        </div>
      )}

      {done ? (
        <Alert kind="success">Password updated. Redirecting…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <Alert kind="error">{error}</Alert>}
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            disabled={!configured}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          <Field
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            disabled={!configured}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
          />
          <SubmitButton loading={loading} disabled={!configured}>
            Update password
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
