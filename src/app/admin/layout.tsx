/**
 * /admin layout — STORY-046.
 *
 * Server component. Calls `requireAdmin()` at the top to gate the
 * entire admin section. Renders the fixed-left NavSidebar + main content
 * area per design spec §9.1.
 *
 * Does NOT render <html>/<body> — the root layout in src/app/layout.tsx
 * owns those. App Router composes layouts; this is one of them.
 *
 * SOLID: this is a server component in the composition layer. It
 * delegates auth (requireAdmin) and the sidebar (NavSidebar) to their
 * respective modules. It has no business logic.
 */

import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { NavSidebar } from "@/components/admin/NavSidebar";
import styles from "./layout.module.css";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Auth gate. This redirects to /login or /dashboard?error=forbidden
  // if the user isn't an admin. The redirect throws — execution does
  // not continue past this line in the unauthorized case.
  const user = await requireAdmin();

  return (
    <div className={styles.shell}>
      <NavSidebar user={user} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
