import type { NextConfig } from "next";

/**
 * PAWAN KALYAN SHOWCASE WEBSITE — Next.js configuration.
 *
 * allowedDevOrigins: `next dev` refuses cross-origin requests to /_next/* by
 * default. "terminal.local" is the in-terminal preview host; the wildcard lets
 * a sandboxed preview proxy (https://<port>-<id>.e2b.app) load dev assets and
 * the HMR websocket instead of being answered with 403 "Unauthorized".
 * This is a development-only setting and does not affect `next build` output.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["terminal.local", "*.e2b.app", "e2b.app"],
};

export default nextConfig;
