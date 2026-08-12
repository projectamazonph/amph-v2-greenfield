/**
 * buildAppUrl — assemble an absolute URL for transactional emails
 * (password reset, email verification, etc.) from the configured
 * `NEXT_PUBLIC_APP_URL` env var.
 *
 * Why this lives in domain/shared:
 *   - Pure function, no infrastructure imports.
 *   - Used by auth use cases that need to construct absolute links
 *     to put in outbound emails.
 *
 * Hardening:
 *   If `NEXT_PUBLIC_APP_URL` is set without a scheme (e.g.
 *   `amph-v2-greenfield.vercel.app`), browsers read the resulting
 *   `amph-v2-greenfield.vercel.app/reset-password/...` as a relative
 *   URL and the link is broken. We default to `https://` when no
 *   scheme is present, and `http://` only when the host is explicitly
 *   `localhost` / `127.0.0.1` (so dev still works without a scheme).
 *
 *   The original Vercel hostname was retired after the production app
 *   moved to `projectamazonph.vercel.app`. Normalize that stale value so
 *   transactional emails cannot send users to DEPLOYMENT_NOT_FOUND.
 */
const RETIRED_PRODUCTION_ORIGIN = "https://amph-v2-greenfield.vercel.app";
const LIVE_PRODUCTION_ORIGIN = "https://projectamazonph.vercel.app";

export function buildAppUrl(path: string): string {
  const raw = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const hasProtocol = /^https?:\/\//i.test(raw);
  const withProtocol = hasProtocol
    ? raw
    : /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(raw)
      ? `http://${raw}`
      : `https://${raw}`;
  const base = withProtocol.replace(/\/+$/, "");
  const canonicalBase =
    base.toLowerCase() === RETIRED_PRODUCTION_ORIGIN ? LIVE_PRODUCTION_ORIGIN : base;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${canonicalBase}${suffix}`;
}
