"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/auth/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/game/config";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export default function ProfileForm({
  userId,
  email,
  initialDisplayName,
  initialAvatarUrl,
  createdAt,
}: {
  userId: string;
  email: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  createdAt: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );

  const initial = (displayName || email || "T").charAt(0).toUpperCase();

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", userId);
    setSaving(false);
    if (error) return setMsg({ kind: "error", text: error.message });
    setMsg({ kind: "success", text: "Profile updated." });
    router.refresh();
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);

    if (!file.type.startsWith("image/")) {
      return setMsg({ kind: "error", text: "Please choose an image file." });
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return setMsg({ kind: "error", text: "Image must be under 2 MB." });
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    // Store under the user's own folder so storage RLS allows the write.
    const path = `${userId}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setUploading(false);
      return setMsg({ kind: "error", text: uploadError.message });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setUploading(false);
    if (updateError) return setMsg({ kind: "error", text: updateError.message });

    setAvatarUrl(publicUrl);
    setMsg({ kind: "success", text: "Avatar updated." });
    router.refresh();
  }

  const stats = [
    { label: "Games played", value: "0" },
    { label: "Win rate", value: "0%" },
    { label: "Best net worth", value: formatINR(0) },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
        Profile
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your public identity and lifetime stats.
      </p>

      {msg && (
        <div className="mt-4">
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}

      {/* Identity card */}
      <div className="mt-6 rounded-2xl border border-ink/5 bg-surface p-6 shadow-[0_14px_30px_-20px_rgba(13,59,55,0.4)]">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-teal-soft text-3xl font-bold text-teal">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Change avatar"}
            </button>
            <p className="mt-1.5 text-xs text-ink-soft">PNG or JPG, up to 2 MB.</p>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={handleAvatar}
              className="hidden"
            />
          </div>
        </div>

        <form onSubmit={handleSaveName} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Display name
            </span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Email
            </span>
            <input
              type="email"
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-ink/10 bg-surface-2 px-3 py-2.5 text-sm text-ink-soft"
            />
          </label>

          {createdAt && (
            <p className="text-xs text-ink-soft">
              Member since {new Date(createdAt).toLocaleDateString()}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-deep disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="mt-6">
        <h2 className="font-display text-lg font-bold text-ink">Stats</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-ink/5 bg-surface p-5 text-center shadow-[0_14px_30px_-20px_rgba(13,59,55,0.35)]"
            >
              <div className="font-display text-2xl font-extrabold text-ink">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-ink-soft">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Stats start counting once you finish your first game (Phase 9).
        </p>
      </div>
    </main>
  );
}
