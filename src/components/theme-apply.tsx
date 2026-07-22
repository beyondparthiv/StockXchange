"use client";

import { useEffect } from "react";
import { applyTheme, type Theme } from "@/lib/theme";

/**
 * Applies the server-known theme (from user_settings) on the client and keeps
 * the localStorage cache in sync. Mounted by the (app) layout so every
 * authenticated page reflects the saved preference. Renders nothing.
 */
export function ThemeApply({ theme }: { theme: Theme }) {
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}
