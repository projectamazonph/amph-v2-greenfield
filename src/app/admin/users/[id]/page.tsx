import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Badge, Card } from "@astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { impersonateUserAction } from "@/app/actions/impersonateUser.action";
import { adminGrantSubscriptionAction } from "@/app/actions/adminGrantSubscription.action";
import { adminSetEnrollmentStatusAction } from "@/app/actions/adminSetEnrollmentStatus.action";
import { userFullName, userInitials, type SubscriptionTier } from "@/domain/entities/User";
import type { EnrollmentStatus } from "@/domain/entities/Enrollment";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}

const NOTICE_MESSAGES: Record<string, string> = {
  "tier-updated": "Subscription tier updated.",
  "enrollment-granted": "Course access granted.",
  "enrollment-restored": "Course access restored.",
  "enrollment-revoked": "Course access revoked.",
  "enrollment-unchanged": "No access change was needed.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_tier: "Choose a valid subscription tier.",
  invalid_status: "Choose a valid enrollment action.",
  user_not_found: "This student no longer exists.",
  course_not_found: "This course no longer exists.",
  not_enrolled: "The student is not enrolled in that course.",
  refunded_enrollment: "Refunded enrollments cannot be restored. Create a new paid order instead.",
  db_error: "The change could not be saved. Try again.",
};

function isSubscriptionTier(value: string): value is SubscriptionTier {
  return value === "FREE" || value === "STARTER" || value === "PRO";
}

function isManagedEnrollmentStatus(value: string): value is "active" | "cancelled" {
  return value === "active" || value === "cancelled";
}

function statusLabel(status: EnrollmentStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  await requireAdmin();

  const container = buildContainer();
  const [detailResult, coursesResult] = await Promise.all([
    container.getUserDetail.execute({ userId: id }),
    container.listCourses.execute(),
  ]);

  if (!detailResult.ok) {
    if (detailResult.error.kind === "user_not_found") notFound();
    return (
      <div>
        <TopBar title="User unavailable" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load this user: {detailResult.error.message}</p>
        </Card>
      </div>
    );
  }

  const { user, enrollments, enrollmentCount } = detailResult.value;
  const courses = coursesResult.ok ? coursesResult.courses : [];
  const enrollmentByCourseId = new Map(
    enrollments.map((enrollment) => [enrollment.courseId, enrollment]),
  );
  const publishedCourseIds = new Set(courses.map((course) => course.id));
  const legacyEnrollments = enrollments.filter(
    (enrollment) => !publishedCourseIds.has(enrollment.courseId),
  );
  const fullName = userFullName(user);
  const createdDate = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const notice = query.notice ? NOTICE_MESSAGES[query.notice] : null;
  const error = query.error
    ? (ERROR_MESSAGES[query.error] ?? "The change could not be saved.")
    : null;

  async function updateTier(formData: FormData) {
    "use server";
    const tier = String(formData.get("subscriptionTier") ?? "");
    if (!isSubscriptionTier(tier)) redirect(`/admin/users/${id}?error=invalid_tier`);
    const result = await adminGrantSubscriptionAction({
      email: user.email,
      subscriptionTier: tier,
    });
    if (!result.ok) redirect(`/admin/users/${id}?error=${result.error}`);
    redirect(`/admin/users/${id}?notice=tier-updated`);
  }

  async function setEnrollment(courseId: string, formData: FormData) {
    "use server";
    const status = String(formData.get("status") ?? "");
    if (!isManagedEnrollmentStatus(status)) {
      redirect(`/admin/users/${id}?error=invalid_status`);
    }
    const result = await adminSetEnrollmentStatusAction({ userId: id, courseId, status });
    if (!result.ok) redirect(`/admin/users/${id}?error=${result.error}`);
    if (!result.changed) redirect(`/admin/users/${id}?notice=enrollment-unchanged`);
    redirect(`/admin/users/${id}?notice=enrollment-${result.change}`);
  }

  async function impersonate() {
    "use server";
    await impersonateUserAction({ targetUserId: user.id });
  }

  return (
    <div>
      <Link href="/admin/users" className={styles.backLink}>
        <ArrowLeft size={16} weight="bold" aria-hidden />
        Back to users
      </Link>

      <TopBar
        title={fullName}
        subtitle={
          <span className={styles.badges}>
            <Badge
              variant={
                user.role === "ADMIN" ? "error" : user.role === "INSTRUCTOR" ? "warning" : "neutral"
              }
              label={user.role}
            />
            <Badge
              variant={
                user.subscriptionTier === "PRO"
                  ? "orange"
                  : user.subscriptionTier === "STARTER"
                    ? "blue"
                    : "neutral"
              }
              label={user.subscriptionTier}
            />
          </span>
        }
      />

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.grid}>
        <Card padding={6} className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <span className={styles.avatar}>{userInitials(user)}</span>
            <div className={styles.profileIdentity}>
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

          {user.role !== "ADMIN" ? (
            <form action={impersonate} className={styles.impersonateForm}>
              <SubmitButton className={styles.secondaryButton}>
                Impersonate {user.firstName}
              </SubmitButton>
              <p className={styles.help}>
                Open the student experience while keeping the admin session available.
              </p>
            </form>
          ) : (
            <p className={styles.help}>Admin accounts cannot impersonate other admins.</p>
          )}
        </Card>

        <Card padding={6} className={styles.accessCard}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Subscription tier</h2>
              <p>Controls platform-level access for this account.</p>
            </div>
          </div>
          <form action={updateTier} className={styles.inlineForm}>
            <label className={styles.field}>
              <span>Tier</span>
              <select name="subscriptionTier" defaultValue={user.subscriptionTier}>
                <option value="FREE">Free</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
              </select>
            </label>
            <SubmitButton className={styles.primaryButton}>Save tier</SubmitButton>
          </form>
        </Card>

        <Card padding={6} className={styles.enrollmentCard}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Course enrollments</h2>
              <p>Grant or revoke course access. Progress remains stored when access is revoked.</p>
            </div>
            <span className={styles.count}>{enrollmentCount}</span>
          </div>

          {!coursesResult.ok ? (
            <p className={styles.errorBanner}>Published courses could not be loaded.</p>
          ) : courses.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No published courses are available.</p>
              <Link href="/admin/courses/new" className={styles.textLink}>
                Create a course
              </Link>
            </div>
          ) : (
            <div className={styles.enrollmentList}>
              {courses.map((course) => {
                const enrollment = enrollmentByCourseId.get(course.id);
                const status = enrollment?.status;
                const canRestore = status === "cancelled" || status === "expired";
                return (
                  <div className={styles.enrollmentRow} key={course.id}>
                    <div className={styles.courseInfo}>
                      <strong>{course.title}</strong>
                      <span>{status ? statusLabel(status) : "Not enrolled"}</span>
                    </div>
                    {status === "active" ? (
                      <form action={setEnrollment.bind(null, course.id)}>
                        <input type="hidden" name="status" value="cancelled" />
                        <ConfirmSubmitButton
                          className={styles.dangerButton}
                          confirmMessage={`Revoke access to ${course.title}? Progress will be preserved.`}
                        >
                          Revoke
                        </ConfirmSubmitButton>
                      </form>
                    ) : status === "refunded" ? (
                      <span className={styles.lockedLabel}>Refunded</span>
                    ) : (
                      <form action={setEnrollment.bind(null, course.id)}>
                        <input type="hidden" name="status" value="active" />
                        <SubmitButton className={styles.primaryButton}>
                          {canRestore ? "Restore" : "Enroll"}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {legacyEnrollments.length > 0 ? (
            <div className={styles.legacyRecords}>
              <h3>Other enrollment records</h3>
              {legacyEnrollments.map((enrollment) => (
                <div key={enrollment.id} className={styles.legacyRow}>
                  <code>{enrollment.courseId}</code>
                  <span>{statusLabel(enrollment.status)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
