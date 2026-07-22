import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · StockXchange" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const settings: UserSettings = data
    ? {
        sound_enabled: data.sound_enabled,
        theme: data.theme,
        default_days: data.default_days,
        default_starting_cash: data.default_starting_cash,
        default_companies: data.default_companies,
        default_round_timer: data.default_round_timer,
      }
    : DEFAULT_SETTINGS;

  return <SettingsForm userId={user.id} initial={settings} />;
}
