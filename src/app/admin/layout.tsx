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
import { MobileNavToggle } from "@/components/ui/MobileNavToggle";
import { CommandPalette } from "@/components/ui/CommandPalette";
import styles from "./layout.module.css";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Auth gate. This redirects to /login or /dashboard?error=forbidden
  // if the user isn't an admin. The redirect throws — execution does
  // not continue past this line in the unauthorized case.
  const user = await requireAdmin();

  return (
    <div className={styles.shell}>
      <MobileNavToggle sidebarId="admin-sidebar" />
      <NavSidebar user={user} />
      <main className={styles.main}>{children}</main>
      <CommandPalette
        items={[
          { href: "/admin", label: "Dashboard", section: "Overview" },
          { href: "/admin/courses", label: "Courses", section: "Content" },
          { href: "/admin/content", label: "Content", section: "Content" },
          { href: "/admin/simulators", label: "Simulators", section: "Content" },
          { href: "/admin/quizzes", label: "Quizzes", section: "Content" },
          { href: "/admin/badges", label: "Badges", section: "Content" },
          { href: "/admin/email-templates", label: "Email templates", section: "Content" },
          { href: "/admin/resources", label: "Download center", section: "Content" },
          { href: "/admin/users", label: "Users", section: "Operations" },
          { href: "/admin/payments", label: "Payments", section: "Operations" },
          { href: "/admin/refunds", label: "Refunds", section: "Operations" },
          { href: "/admin/live-classes", label: "Live Classes", section: "Operations" },
          { href: "/admin/certificates", label: "Certificates", section: "Operations" },
          { href: "/admin/settings", label: "Settings", section: "System" },
          { href: "/admin/audit-log", label: "Audit Log", section: "System" },
          { href: "/admin/users/new", label: "Create User", section: "Quick Actions" },
          { href: "/admin/courses/new", label: "Create Course", section: "Quick Actions" },
        ]}
      />
    </div>
  );
}
