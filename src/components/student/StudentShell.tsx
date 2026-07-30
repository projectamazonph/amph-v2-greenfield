/**
 * StudentShell — wraps student-facing pages with sidebar + main content.
 *
 * Server component. Calls `requireAuth()` to get the current user,
 * renders the StudentSidebar + children in a flex layout.
 *
 * Usage in a student page:
 *   import { StudentShell } from '@/components/student/StudentShell';
 *
 *   export default async function DashboardPage() {
 *     return (
 *       <StudentShell>
 *         <h1>Dashboard</h1>
 *       </StudentShell>
 *     );
 *   }
 *
 * SOLID: pure composition. Delegates auth to lib/auth, sidebar to
 * StudentSidebar. Has no business logic.
 */

import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth";
import { StudentSidebar } from "./StudentSidebar";
import { MobileNavToggle } from "@/components/ui/MobileNavToggle";
import { CommandPalette } from "@/components/ui/CommandPalette";
import styles from "./StudentShell.module.css";

export interface StudentShellProps {
  children: ReactNode;
  /** Pre-loaded user. If omitted, StudentShell calls requireAuth(). */
  user?: Awaited<ReturnType<typeof requireAuth>>;
}

export async function StudentShell({ children, user: providedUser }: StudentShellProps) {
  const user = providedUser ?? (await requireAuth());

  return (
    <div className={styles.shell}>
      <MobileNavToggle sidebarId="student-sidebar" />
      <StudentSidebar user={user} />
      <main className={styles.main}>{children}</main>
      <CommandPalette items={[
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/courses', label: 'My Courses' },
        { href: '/tools', label: 'Simulators' },
        { href: '/tools/bid-elevator', label: 'Bid Elevator', section: 'Tools' },
        { href: '/tools/campaign-builder', label: 'Campaign Builder', section: 'Tools' },
        { href: '/tools/keyword-research', label: 'Keyword Research', section: 'Tools' },
        { href: '/tools/listing-audit', label: 'Listing Audit', section: 'Tools' },
        { href: '/tools/str-triage', label: 'STR Triage', section: 'Tools' },
        { href: '/profile', label: 'Profile' },
        { href: '/courses', label: 'Browse Catalog', section: 'Quick Actions' }
      ]} />
    </div>
  );
}
