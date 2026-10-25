import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Origins allowed to request dev-only assets.
   *
   * Next blocks cross-origin requests to dev endpoints by default, and the
   * failure is quiet and very confusing: the page server-renders and looks
   * completely normal, the scripts appear in the DOM, but React never
   * hydrates — so every button silently does nothing. Forms fall back to a
   * native GET, which is why signing up from another device just reloaded
   * the page with a `?` on the URL and no error.
   *
   * These entries let anyone on the LAN use the dev server (`next dev -H
   * 0.0.0.0`) to test multiplayer from a second device. Dev-only: this has
   * no effect on a production build.
   */
  allowedDevOrigins: [
    // Literal hosts and globs only — CIDR notation is not supported.
    // Covers the usual private LAN ranges a router hands out.
    "10.0.0.*",
    "10.*.*.*",
    "192.168.*.*",
    "172.16.*.*",
    // Tunnels, for testing with someone not on the same network.
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
