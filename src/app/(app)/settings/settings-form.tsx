"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/auth/auth-ui";
import {
  Chip,
  Segmented,
  SettingRow,
  Stepper,
  Toggle,
} from "@/components/ui/controls";
import {
  CASH_PRESETS,
  LIMITS,
  TIMER_OPTIONS,
  shortUSD,
} from "@/lib/game/config";
import { useGameConfigStore } from "@/lib/stores/game-config-store";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/lib/settings";
import { applyTheme, type Theme } from "@/lib/theme";
import { attempt } from "@/lib/supabase/errors";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-6 shadow-panel">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default function SettingsForm({
  userId,
  initial,
}: {
  userId: string;
  initial: UserSettings;
}) {
  const router = useRouter();
  const supabase = createClient();
  const setConfig = useGameConfigStore((s) => s.setConfig);

  const [s, setS] = useState<UserSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function patch(p: Partial<UserSettings>) {
    setS((prev) => ({ ...prev, ...p }));
  }

  function onThemeChange(theme: Theme) {
    patch({ theme });
    applyTheme(theme); // live preview before saving
  }

  async function handleSave() {
    setMsg(null);
    setSaving(true);
    const { error } = await attempt(() =>
      supabase.from("user_settings").upsert(
        {
          user_id: userId,
          sound_enabled: s.sound_enabled,
          theme: s.theme,
          default_days: s.default_days,
          default_starting_cash: s.default_starting_cash,
          default_companies: s.default_companies,
          default_round_timer: s.default_round_timer,
        },
        { onConflict: "user_id" },
      ),
    );
    setSaving(false);
    if (error) return setMsg({ kind: "error", text: error.message });

    // Push the saved room defaults into the config store so new games start
    // from them.
    setConfig({
      days: s.default_days,
      startingCash: s.default_starting_cash,
      companies: s.default_companies,
      roundTimerSec: s.default_round_timer,
    });
    applyTheme(s.theme);
    setMsg({ kind: "success", text: "Settings saved." });
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="t-display text-ink">
        Settings
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Preferences and defaults, saved to your account.
      </p>

      {msg && (
        <div className="mt-4">
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}

      <Card title="Preferences">
        <SettingRow label="Sound effects" hint="Buy/sell/round-end cues">
          <Toggle
            checked={s.sound_enabled}
            onChange={(v) => patch({ sound_enabled: v })}
            label="Sound effects"
          />
        </SettingRow>
        <SettingRow label="Theme" hint="Switches instantly">
          <Segmented<Theme>
            value={s.theme}
            onChange={onThemeChange}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </SettingRow>
      </Card>

      <Card title="Default room preferences">
        <p className="-mt-1 mb-1 text-xs text-ink-soft">
          New games start from these. You can still tweak them per game.
        </p>
        <SettingRow
          label="Days"
          hint={`${s.default_days * 2} rounds total (2 per day)`}
        >
          <Stepper
            value={s.default_days}
            min={LIMITS.days.min}
            max={LIMITS.days.max}
            onChange={(v) => patch({ default_days: v })}
          />
        </SettingRow>
        <SettingRow label="Starting cash" hint="Per player">
          <div className="flex flex-wrap gap-2">
            {CASH_PRESETS.map((amount) => (
              <Chip
                key={amount}
                active={s.default_starting_cash === amount}
                onClick={() => patch({ default_starting_cash: amount })}
              >
                {shortUSD(amount)}
              </Chip>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Companies" hint="Tickers in the market">
          <Stepper
            value={s.default_companies}
            min={LIMITS.companies.min}
            max={LIMITS.companies.max}
            onChange={(v) => patch({ default_companies: v })}
          />
        </SettingRow>
        <SettingRow label="Round timer" hint="Seconds to place orders">
          <div className="flex flex-wrap gap-2">
            {TIMER_OPTIONS.map((sec) => (
              <Chip
                key={sec}
                active={s.default_round_timer === sec}
                onClick={() => patch({ default_round_timer: sec })}
              >
                {sec}s
              </Chip>
            ))}
          </div>
        </SettingRow>
      </Card>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>

      {/* Account */}
      <Card title="Account">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">Log out</div>
            <div className="text-xs text-ink-soft">End your session on this device.</div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2"
            >
              Log out
            </button>
          </form>
        </div>
      </Card>

      {/* Danger zone */}
      <section className="mt-6 rounded-lg border border-down/30 bg-down/5 p-6">
        <h2 className="text-sm font-semibold text-down">Danger zone</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Deleting your account is permanent and removes your profile and stats.
        </p>
        {confirmingDelete ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <form action="/auth/delete-account" method="post">
              <button
                type="submit"
                className="rounded-md bg-down px-4 py-2 text-sm font-semibold text-white transition hover:bg-down-bright"
              >
                Yes, delete permanently
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 rounded-md border border-down/50 px-4 py-2 text-sm font-semibold text-down transition hover:bg-down/10"
          >
            Delete account
          </button>
        )}
      </section>
    </main>
  );
}
