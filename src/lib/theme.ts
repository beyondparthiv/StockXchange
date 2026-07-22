export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "sx-theme";

/**
 * Apply a theme by toggling `data-theme` on <html> and caching the choice in
 * localStorage. The cache lets the inline head script (see layout.tsx) set the
 * theme before first paint, avoiding a light→dark flash on reload.
 */
export function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable — non-fatal.
  }
}
