/**
 * Preview read-only policy.
 *
 * Every Vercel environment resolves to the same `DATABASE_URL` (one Config
 * variable scoped to Production, Preview and Development), so a PR's preview
 * deployment runs against real student data. Production secrets are withheld
 * from previews, but that only guards the flows that happen to need one:
 * 14 server actions (signup, password reset, simulator submissions) and the
 * mutating API routes reach the database without a secret.
 *
 * Build-time work is already gated on `$VERCEL_ENV = "production"` in
 * vercel.json, so migrations and seeds never run on a preview. This covers
 * the runtime half of the same gap: a preview refuses to write instead of
 * silently persisting to production.
 *
 * Only `preview` is blocked. An unset VERCEL_ENV covers local dev, `next
 * start`, and CI, where the write surface must keep working.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isReadOnlyPreviewRequest(method: string, vercelEnv: string | undefined): boolean {
  if (vercelEnv !== "preview") return false;
  return MUTATING_METHODS.has(method.toUpperCase());
}
