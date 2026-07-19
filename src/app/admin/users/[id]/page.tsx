/**
 * /admin/users/[id] — admin user detail.
 *
 * STORY-047. Server component.
 *
 * Layout (per design spec):
 *   - Back link to /admin/users
 *   - TopBar with user's full name + role/tier badges
 *   - Profile section (avatar, email, role, tier, createdAt, totalXp)
 *   - Enrollment summary (count)
 *   - "Impersonate" button (form posting to the impersonate action)
 *
 * SOLID: thin page. Auth via `requireAdmin` (layout already does it,
 * but we re-verify at the page level too for defense in depth).
 * Data via `container.getUserDetail`. Action via the
 * `impersonateUserAction` server action.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import { impersonateUserAction } from "@/app/actions/impersonateUser.action";
import { userFullName, userInitials } from "@/domain/entities/User";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Defense in depth — the admin layout already calls requireAdmin,
  // but the page re-verifies so a future layout change can't bypass it.
  await requireAdmin();

  const container = buildContainer();
  const result = await container.getUserDetail.execute({ userId: id });

  if (!result.ok) {
    if (result.error.kind === "user_not_found") {
      notFound();
    }
    return (
      <div>
        <TopBar title="User not found" />
        <Card padding="comfortable">
          <p className={styles.error}>
            Failed to load user: {result.error.message}
          </p>
        </Card>
      </div>
    );
  }

  const { user, enrollmentCount } = result.value;
  const fullName = userFullName(user);
  const initials = userInitials(user);
  const createdDate = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Impersonate is a server action; bind to the current userId (admin)
  // and the target userId. The action is invoked via form submission.
  // We wrap the bound action to discard the result — form actions must
  // return Promise<void> per Next.js typing.
  async function impersonate() {
    "use server";
    await impersonateUserAction({ targetUserId: user.id });
  }

  return (
    <div>
      <Link href="/admin/users" className={styles.backLink}>
        ← Back to users
      </Link>

      <TopBar
        title={fullName}
        subtitle={
          <span className={styles.badges}>
            <Badge
              variant={
                user.role === "ADMIN"
                  ? "danger"
                  : user.role === "INSTRUCTOR"
                    ? "warning"
                    : "neutral"
              }
            >
              {user.role}
            </Badge>
            <Badge variant={user.subscriptionTier === "PRO" ? "accent" : "neutral"}>
              {user.subscriptionTier}
            </Badge>
          </span>
        }
      />

      <div className={styles.grid}>
        <Card padding="comfortable" className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <span className={styles.avatar}>{initials}</span>
            <div>
              <div className={styles.name}>{fullName}</div>
              <div className={styles.email}>{user.email}</div>
            </div>
          </div>

          <dl className={styles.details}>
            <dt>Created</dt>
            <dd className={styles.mono}>{createdDate}</dd>
            <dt>Total XP</dt>
            <dd className={styles.mono}>{user.totalXp}</dd>
            <dt>Enrollments</dt>
            <dd className={styles.mono}>{enrollmentCount}</dd>
            <dt>Verification</dt>
            <dd>{user.verificationStatus}</dd>
          </dl>

          {/* Impersonate form */}
          {user.role !== "ADMIN" && (
            <form action={impersonate} className={styles.impersonateForm}>
              <button type="submit" className={styles.impersonateButton}>
                Impersonate {user.firstName}
              </button>
              <p className={styles.impersonateHelp}>
                You will be signed in as this user. The admin session
                is preserved so you can return via the &ldquo;Stop
                impersonating&rdquo; banner.
              </p>
            </form>
          )}
          {user.role === "ADMIN" && (
            <p className={styles.impersonateDisabled}>
              Admins cannot impersonate other admins.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
