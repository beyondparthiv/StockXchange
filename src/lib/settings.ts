import type { Theme } from "@/lib/theme";
import { DEFAULT_CONFIG } from "@/lib/game/config";

/**
 * Shape of a row in public.user_settings, plus the defaults used when a user
 * has no row yet. Kept in sync with supabase/schema.sql.
 */
export type UserSettings = {
  sound_enabled: boolean;
  theme: Theme;
  default_days: number;
  default_starting_cash: number;
  default_companies: number;
  default_round_timer: number;
};

export const DEFAULT_SETTINGS: UserSettings = {
  sound_enabled: true,
  theme: "light",
  default_days: DEFAULT_CONFIG.days,
  default_starting_cash: DEFAULT_CONFIG.startingCash,
  default_companies: DEFAULT_CONFIG.companies,
  default_round_timer: DEFAULT_CONFIG.roundTimerSec,
};
