/**
 * StudentShell — wraps student-facing pages with sidebar + main content.
 *
 * Server component. By default, calls `requireAuth()` to get the
 * current user, then renders the StudentSidebar + children in a flex
 * layout.
 *
 * Usage on an authenticated page:
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
 * Usage on a public page (course catalog, course detail):
 *
 *   <StudentShell requireAuth={false}>
 *     <h1>Course Catalog</h1>
 *   </StudentShell>
 *
 * When `requireAuth={false}`:
 *   - No redirect to /login is performed.
 *   - If the visitor is signed in, the full sidebar is rendered
 *     (logged-in visitors see their personalized nav).
 *   - If the visitor is signed out, the sidebar is replaced with a
 *     public header (Brand + Sign in + Sign up + Browse Catalog).
 *     The CommandPalette and MobileNavToggle are omitted in the public
 *     mode because they're wired for the sidebar layout.
 *
 * SOLID: pure composition. Delegates auth to lib/auth, sidebar to
 * StudentSidebar, public header to PublicCatalogHeader. No business
 * logic.
 */

import type { ReactNode } from "react";
import { requireAuth, getSessionUser } from "@/lib/auth";
import { StudentSidebar } from "./StudentSidebar";
import { PublicCatalogHeader } from "./PublicCatalogHeader";
import { MobileNavToggle } from "@/components/ui/MobileNavToggle";
import { CommandPalette } from "@/components/ui/CommandPalette";
import styles from "./StudentShell.module.css";

export interface StudentShellProps {
  children: ReactNode;
  /**
   * Pre-loaded user. If omitted, StudentShell calls requireAuth()
   * (auth mode) or getSessionUser() (optional-auth mode).
   *
   * When `requireAuth={false}`, you can still pass an explicit `user`
   * to lock the shell into the authenticated layout for a known
   * logged-in caller (e.g. the dashboard already has the user).
   */
  user?: Awaited<ReturnType<typeof requireAuth>> | null;
  /**
   * Whether the page REQUIRES auth. Defaults to `true`.
   *
   * - `true`  (default) — anonymous visitors are redirected to /login.
   *   Use for /dashboard, /profile, /tools/*, /admin/*.
   * - `false` — anonymous visitors see a public shell instead.
   *   Use for the course catalog (/courses) and course detail
   *   (/courses/[slug]), which are intentionally browseable without
   *   an account.
   */
  requireAuth?: boolean;
}

export async function StudentShell({
  children,
  user: providedUser,
  requireAuth: authRequired = true,
}: StudentShellProps) {
  // Resolve the user once. In auth-required mode, `requireAuth()` throws
  // NEXT_REDIRECT for anonymous visitors (handled by the framework).
  // In optional-auth mode, we resolve the user best-effort and fall
  // back to the public shell when no session is present.
  let user: Awaited<ReturnType<typeof requireAuth>> | null;
  if (providedUser !== undefined) {
    user = providedUser;
  } else if (authRequired) {
    user = await requireAuth();
  } else {
    user = await getSessionUser();
  }

  // Public shell: no sidebar, no CommandPalette (sidebar-anchored),
  // no MobileNavToggle. Renders the PublicCatalogHeader (which is the
  // simple Brand + Sign in + Sign up + Browse Catalog strip) and a
  // clean <main>.
  if (!user) {
    return (
      <div className={styles.publicShell}>
        <PublicCatalogHeader />
        <main className={styles.publicMain}>{children}</main>
      </div>
    );
  }

  // Authenticated shell: full sidebar layout (current behavior).
  return (
    <div className={styles.shell}>
      <MobileNavToggle sidebarId="student-sidebar" />
      <StudentSidebar user={user} />
      <main className={styles.main}>{children}</main>
      <CommandPalette items={COMMAND_PALETTE_ITEMS} />
    </div>
  );
}

// CommandPalette items live as a module-level constant so the
// authenticated JSX stays close to the public shell JSX without
// duplicating the same 10-entry array twice.
const COMMAND_PALETTE_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "My Courses" },
  { href: "/tools", label: "Tools" },
  { href: "/tools/bid-elevator", label: "Bid Elevator", section: "Tools" },
  { href: "/tools/campaign-builder", label: "Campaign Builder", section: "Tools" },
  { href: "/tools/keyword-research", label: "Keyword Research", section: "Tools" },
  { href: "/tools/listing-audit", label: "Listing Audit", section: "Tools" },
  { href: "/tools/str-triage", label: "STR Triage", section: "Tools" },
  { href: "/tools/ad-console", label: "Amazon Ad Console", section: "Tools" },
  { href: "/resources", label: "Download center" },
  { href: "/profile", label: "Profile" },
  { href: "/courses", label: "Browse Catalog", section: "Quick Actions" },
] as const;
