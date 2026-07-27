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
 * Hardening (fixes the "Forgot password" broken-link bug):
 *   If `NEXT_PUBLIC_APP_URL` is set without a scheme (e.g.
 *   `amph-v2-greenfield.vercel.app`), browsers read the resulting
 *   `amph-v2-greenfield.vercel.app/reset-password/...` as a relative
 *   URL and the link is broken. We default to `https://` when no
 *   scheme is present, and `http://` only when the host is explicitly
 *   `localhost` / `127.0.0.1` (so dev still works without a scheme).
 *
 *   See: PR #211, which shipped the email-body fix; this closes the
 *   related env-var gap.
 */
export function buildAppUrl(path: string): string {
  const raw = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const hasProtocol = /^https?:\/\//i.test(raw);
  const withProtocol = hasProtocol
    ? raw
    : /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(raw)
      ? `http://${raw}`
      : `https://${raw}`;
  const base = withProtocol.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
