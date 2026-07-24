/**
 * /admin-login — dedicated admin login page.
 *
 * Separate from the regular /login page. This page is:
 * - Publicly accessible (not behind the /admin/* proxy protection)
 * - Styled to look like an admin portal
 * - POSTs to /api/auth/admin-login (which checks ADMIN role)
 *
 * The regular /login page redirects to /courses after success.
 * This page redirects to /admin.
 */

import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorKind = params.error ?? null;

  return <AdminLoginForm errorKind={errorKind} />;
}
