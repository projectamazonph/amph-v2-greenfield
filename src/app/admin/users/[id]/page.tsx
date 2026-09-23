import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge, Card } from "@astryxdesign/core";
import { TopBar } from "@/components/admin/TopBar";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { AdminSubPageHeader } from "@/components/admin/AdminSubPageHeader";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/Input";
import { impersonateUserAction } from "@/app/actions/impersonateUser.action";
import { adminGrantSubscriptionAction } from "@/app/actions/adminGrantSubscription.action";
import { adminSetEnrollmentStatusAction } from "@/app/actions/adminSetEnrollmentStatus.action";
import { adminUpdateUserAction } from "@/app/actions/adminUpdateUser.action";
import { adminSetUserPasswordAction } from "@/app/actions/adminSetUserPassword.action";
import { adminForceSignOutAction } from "@/app/actions/adminForceSignOut.action";
import { adminDeleteUserAction } from "@/app/actions/adminDeleteUser.action";
import {
  userFullName,
  userInitials,
  type SubscriptionTier,
  type Role,
} from "@/domain/entities/User";
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
  "profile-updated": "Profile updated.",
  "password-set": "Password has been set and all sessions revoked.",
  "signed-out": "All sessions revoked. User must re-authenticate.",
  deleted: "Account deleted and anonymized.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_tier: "Choose a valid subscription tier.",
  invalid_status: "Choose a valid enrollment action.",
  user_not_found: "This student no longer exists.",
  course_not_found: "This course no longer exists.",
  not_enrolled: "The student is not enrolled in that course.",
  refunded_enrollment: "Refunded enrollments cannot be restored. Create a new paid order instead.",
  db_error: "The change could not be saved. Try again.",
  invalid_name: "First name and last name are required.",
  invalid_role: "Choose a valid role.",
  cannot_change_own_role: "Ask another admin to change your role.",
  cannot_delete_self: "You cannot delete your own account.",
  weak_password:
    "Password is too weak. Use at least 8 characters plus two of: 12+ characters, a capital letter, a number, or a symbol.",
  hash_error: "Could not hash the password. Try again.",
};

function isSubscriptionTier(value: string): value is SubscriptionTier {
  return value === "FREE" || value === "STARTER" || value === "PRO";
}

function isManagedEnrollmentStatus(value: string): value is "active" | "cancelled" {
  return value === "active" || value === "cancelled";
}

function isRole(value: string): value is Role {
  return value === "STUDENT" || value === "INSTRUCTOR" || value === "ADMIN";
}

function statusLabel(status: EnrollmentStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const admin = await requireAdmin();

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

  async function setEnrollment(formData: FormData) {
    "use server";
    const courseId = String(formData.get("courseId") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!courseId) redirect(`/admin/users/${id}?error=missing_course_id`);
    if (!isManagedEnrollmentStatus(status)) {
      redirect(`/admin/users/${id}?error=invalid_status`);
    }
    const result = await adminSetEnrollmentStatusAction({ userId: id, courseId, status });
    if (!result.ok) redirect(`/admin/users/${id}?error=${result.error}`);
    if (!result.changed) redirect(`/admin/users/${id}?notice=enrollment-unchanged`);
    redirect(`/admin/users/${id}?notice=enrollment-${result.change}`);
  }

  async function updateProfile(formData: FormData) {
    "use server";
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const roleRaw = formData.get("role");

    if (!firstName || !lastName) redirect(`/admin/users/${id}?error=invalid_name`);

    const role = roleRaw === null ? undefined : String(roleRaw);
    if (role !== undefined && !isRole(role)) redirect(`/admin/users/${id}?error=invalid_role`);

    const result = await adminUpdateUserAction({ userId: id, firstName, lastName, role });
    if (!result.ok) redirect(`/admin/users/${id}?error=${result.error}`);
    redirect(`/admin/users/${id}?notice=profile-updated`);
  }

  async function setPassword(formData: FormData) {
    "use server";
    const newPassword = String(formData.get("newPassword") ?? "");
    const sendEmail = formData.get("sendEmail") === "on";

    const result = await adminSetUserPasswordAction({
      userId: id,
      newPassword,
      sendNotificationEmail: sendEmail,
    });
    if (!result.ok) redirect(`/admin/users/${id}?error=${result.error}`);
    redirect(`/admin/users/${id}?notice=password-set`);
  }

  async function forceSignOut() {
    "use server";
    const result = await adminForceSignOutAction({ userId: id });
    if (!result.ok) redirect(`/admin/users/${id}?error=${result.error}`);
    redirect(`/admin/users/${id}?notice=signed-out`);
  }

  async function deleteUser() {
    "use server";
    const result = await adminDeleteUserAction({ userId: id });
    if (!result.ok) redirect(`/admin/users/${id}?error=${result.error}`);
    redirect("/admin/users?notice=deleted");
  }

  async function impersonate() {
    "use server";
    await impersonateUserAction({ targetUserId: user.id });
  }

  return (
    <div>
      <AdminSubPageHeader
        title={fullName}
        backHref="/admin/users"
        backLabel="Back to users"
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
            <Badge
              variant={user.twoFactorEnabled ? "success" : "neutral"}
              label={user.twoFactorEnabled ? "2FA On" : "2FA Off"}
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
        <div className={styles.leftColumn}>
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

          <Card padding={6} className={styles.editProfileCard}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Edit profile</h2>
                <p>Update the student name or change their role.</p>
              </div>
            </div>
            <form action={updateProfile} className={styles.profileForm}>
              <Input label="First name" name="firstName" defaultValue={user.firstName} required />
              <Input label="Last name" name="lastName" defaultValue={user.lastName} required />
              {admin.id === user.id ? (
                <p className={styles.help}>Ask another admin to change your role.</p>
              ) : (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Role</label>
                  <select name="role" defaultValue={user.role} className={styles.select}>
                    <option value="STUDENT">Student</option>
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              )}
              <div className={styles.formActions}>
                <SubmitButton className={styles.primaryButton}>Save changes</SubmitButton>
              </div>
            </form>
          </Card>
        </div>

        <div className={styles.rightColumn}>
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
                <p>
                  Grant or revoke course access. Progress remains stored when access is revoked.
                </p>
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
                        <form action={setEnrollment}>
                          <input type="hidden" name="courseId" value={course.id} />
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
                        <form action={setEnrollment}>
                          <input type="hidden" name="courseId" value={course.id} />
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

          <Card padding={6} className={styles.passwordCard}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Set password</h2>
                <p>
                  Directly set or reset the student password. All active sessions will be revoked
                  immediately.
                </p>
              </div>
            </div>
            <form action={setPassword} className={styles.passwordForm}>
              <Input
                label="New password"
                name="newPassword"
                type="password"
                hint="At least 8 characters, plus two of: 12+ characters, a capital letter, a number, or a symbol."
                required
              />
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="sendEmail" defaultChecked />
                <span>Send password change notification email to student</span>
              </label>
              <SubmitButton className={styles.primaryButton}>Set password</SubmitButton>
            </form>
          </Card>

          <Card padding={6} className={styles.signOutCard}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Force sign-out</h2>
                <p>Revoke all active sessions for this account. The user must re-authenticate.</p>
              </div>
            </div>
            <form action={forceSignOut}>
              <SubmitButton className={styles.dangerButton}>Revoke all sessions</SubmitButton>
            </form>
          </Card>

          <Card padding={6} className={styles.dangerCard}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Delete account</h2>
                <p>
                  Permanently anonymize and delete this account. Financial and audit records are
                  preserved. This action cannot be undone.
                </p>
              </div>
            </div>
            {admin.id === user.id ? (
              <p className={styles.help}>
                You cannot delete your own account. Ask another admin if this account must be
                removed.
              </p>
            ) : (
              <form action={deleteUser}>
                <ConfirmSubmitButton
                  className={styles.dangerButton}
                  confirmMessage={`Delete ${fullName}'s account? This anonymizes all PII and cannot be undone.`}
                >
                  Delete account
                </ConfirmSubmitButton>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
