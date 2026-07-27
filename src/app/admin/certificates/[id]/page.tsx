/**
 * /admin/certificates/[id] — single certificate detail + revoke form.
 *
 * STORY-092 (US-009). Server component. Loads the cert via
 * AdminGetCertificate (which joins user + course). Renders the
 * certificate metadata plus the hydrated user + course in Card
 * sections. If the cert is still active, shows a revoke form that
 * posts (server action) to revokeCertificateAction. Already-revoked
 * certs skip the form and show the reason + revocation date.
 *
 * Success/error feedback: redirect back to this page with ?revoked=1
 * or ?error=<kind> search params, like the /admin/refunds/[orderId]
 * pattern (STORY-062).
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@astryxdesign/core";
import { revokeCertificateAction } from "@/app/actions/revokeCertificate.action";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; revoked?: string; wasAlready?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "You must be an admin to revoke a certificate.",
  certificate_not_found: "Certificate no longer exists.",
  invalid_reason: "Revocation reason is required.",
  db_error: "Database error. Try again.",
};

export default async function AdminCertificateDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetCertificate.execute({ certificateId: id });

  if (!result.ok) {
    if (result.error.kind === "certificate_not_found") notFound();
    return (
      <div>
        <TopBar title="Error" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load certificate: {String(result.error.kind)}</p>
        </Card>
      </div>
    );
  }

  const { certificate, user, course } = result.value;
  const isRevoked = certificate.status === "revoked";
  const errorMsg = sp.error ? (ERROR_MESSAGES[sp.error] ?? `Error: ${sp.error}`) : null;

  async function handleRevoke(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") ?? "").trim();
    const r = await revokeCertificateAction({ certificateId: id, reason });
    if (r.ok) {
      const params = new URLSearchParams();
      params.set("revoked", "1");
      if (r.value.wasAlreadyRevoked) params.set("wasAlready", "1");
      redirect(`/admin/certificates/${id}?${params.toString()}`);
      return;
    }
    redirect(`/admin/certificates/${id}?error=${r.error.kind}`);
  }

  return (
    <div>
      <Link href="/admin/certificates" className={styles.backLink}>
        ← Back to certificates
      </Link>

      <TopBar
        title={`Certificate · ${certificate.id}`}
        subtitle={
          <span className={styles.badges}>
            <Badge
              variant={isRevoked ? "orange" : "neutral"}
              label={isRevoked ? "Revoked" : "Active"}
            />
            <Badge variant="neutral" label={course.title} />
          </span>
        }
      />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p className={styles.error}>
            <strong>Error:</strong> {errorMsg}
          </p>
        </Card>
      )}

      {sp.revoked && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p className={styles.success}>
            <strong>Certificate revoked.</strong>{" "}
            {sp.wasAlready
              ? "(It was already revoked before — the audit log entry is recorded for traceability.)"
              : "Public verification page now reflects the revoked status."}
          </p>
        </Card>
      )}

      <div className={styles.grid}>
        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Certificate</h2>
          <dl className={styles.details}>
            <dt>ID</dt>
            <dd className={styles.mono}>{certificate.id}</dd>
            <dt>Status</dt>
            <dd>{certificate.status}</dd>
            <dt>Issued at</dt>
            <dd>
              {certificate.issuedAt.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
            <dt>Verification hash</dt>
            <dd className={styles.mono}>{certificate.verificationHash}</dd>
            {isRevoked && certificate.revokedAt && (
              <>
                <dt>Revoked at</dt>
                <dd>
                  {certificate.revokedAt.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
                <dt>Revoked reason</dt>
                <dd>{certificate.revokedReason ?? "—"}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Student</h2>
          <dl className={styles.details}>
            <dt>Name</dt>
            <dd>
              {user.firstName} {user.lastName}
            </dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>User ID</dt>
            <dd className={styles.mono}>{user.id}</dd>
          </dl>
        </Card>

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Course</h2>
          <dl className={styles.details}>
            <dt>Title</dt>
            <dd>{course.title}</dd>
            <dt>Slug</dt>
            <dd className={styles.mono}>{course.slug}</dd>
            <dt>Course ID</dt>
            <dd className={styles.mono}>{course.id}</dd>
          </dl>
        </Card>

        {!isRevoked && (
          <Card padding={6} className={styles.fullSpan}>
            <h2 className={styles.sectionTitle}>Revoke certificate</h2>
            <p className={styles.muted}>
              This will mark the certificate as revoked. The public verification page (
              <code>/certificates/{certificate.verificationHash.slice(0, 8)}…</code>) will reflect
              the revoked status. An audit log entry recording the admin, the reason, and the
              timestamps will be persisted.
            </p>
            <form action={handleRevoke} className={styles.revokeForm}>
              <label className={styles.revokeLabel}>
                <span>Reason (required)</span>
                <textarea
                  name="reason"
                  required
                  minLength={1}
                  rows={3}
                  className={styles.revokeTextarea}
                  placeholder="e.g. Refund processed for order #12345 (chargeback by student)"
                />
              </label>
              <button type="submit" className={styles.revokeButton}>
                Revoke certificate
              </button>
            </form>
          </Card>
        )}

        {isRevoked && (
          <Card padding={6} className={styles.fullSpan}>
            <h2 className={styles.sectionTitle}>Revocation</h2>
            <p className={styles.muted}>
              This certificate was revoked on{" "}
              <strong>
                {certificate.revokedAt?.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>{" "}
              for: <strong>{certificate.revokedReason ?? "(no reason recorded)"}</strong>. The
              action is idempotent — re-revoking does nothing destructive.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
