/**
 * /admin/certificates — admin list of every issued certificate.
 *
 * STORY-092 (US-009). Server component. requireAdmin() first, then
 * buildContainer() and AdminListCertificates.execute({}) which returns
 * { certificates, users, courses }. Tab control via ?status= search
 * param (default "all"). Empty state handled inline.
 *
 * The detail/revoke flow lives at /admin/certificates/[id] (separate
 * page in this folder).
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import {
  AdminCertificatesTable,
  type CertificateRow,
} from "@/components/admin/AdminCertificatesTable";
import styles from "./page.module.css";

type StatusFilter = "all" | "active" | "revoked";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

function buildHref(current: { status?: string }, updates: { status?: string }): string {
  const merged = { ...current, ...updates };
  const params = new URLSearchParams();
  if (merged.status && merged.status !== "all") {
    params.set("status", merged.status);
  }
  const s = params.toString();
  return s ? `/admin/certificates?${s}` : "/admin/certificates";
}

export default async function AdminCertificatesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireAdmin();

  const container = buildContainer();

  // Default to "all" — most admins want to see the full history.
  const status: StatusFilter =
    params.status === "active" || params.status === "revoked" ? params.status : "all";

  const result = await container.adminListCertificates.execute(status === "all" ? {} : { status });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Certificates" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load: {String(result.error.kind)}</p>
        </Card>
      </div>
    );
  }

  const { certificates, users, courses } = result.value;

  // Map domain Certificate[] → CertificateRow[] (plain serializable
  // for the client component).
  const rows: CertificateRow[] = certificates.map((c) => {
    const user = users.get(c.userId);
    const course = courses.get(c.courseId);
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : "(unknown)";
    return {
      id: c.id,
      userId: c.userId,
      userName: userName === "" ? "(no name)" : userName,
      userEmail: user?.email ?? c.userId,
      courseId: c.courseId,
      courseTitle: course?.title ?? "(missing course)",
      status: c.status,
      issuedAt: c.issuedAt.toISOString(),
      verificationHash: c.verificationHash,
    };
  });

  // Cheap tab counts (re-run with the other filters, limit 1 for the
  // total only). Keeps the badge honest if the certs list grows.
  const [activeCountRes, revokedCountRes] = await Promise.all([
    container.adminListCertificates.execute({ status: "active" }),
    container.adminListCertificates.execute({ status: "revoked" }),
  ]);
  const activeCount = activeCountRes.ok ? activeCountRes.value.certificates.length : null;
  const revokedCount = revokedCountRes.ok ? revokedCountRes.value.certificates.length : null;

  return (
    <div>
      <TopBar
        title="Certificates"
        subtitle={`${rows.length.toLocaleString()} certificate${rows.length === 1 ? "" : "s"} ${
          status === "all" ? "total" : status
        }`}
      />

      <nav className={styles.tabs} aria-label="Certificate status">
        <Link
          href={buildHref(params, { status: "all" })}
          className={[styles.tab, status === "all" ? styles.tabActive : ""]
            .filter(Boolean)
            .join(" ")}
          aria-current={status === "all" ? "page" : undefined}
        >
          All{certificates.length === 0 ? "" : ` (${certificates.length.toLocaleString()})`}
        </Link>
        <Link
          href={buildHref(params, { status: "active" })}
          className={[styles.tab, status === "active" ? styles.tabActive : ""]
            .filter(Boolean)
            .join(" ")}
          aria-current={status === "active" ? "page" : undefined}
        >
          Active{activeCount !== null ? ` (${activeCount.toLocaleString()})` : ""}
        </Link>
        <Link
          href={buildHref(params, { status: "revoked" })}
          className={[styles.tab, status === "revoked" ? styles.tabActive : ""]
            .filter(Boolean)
            .join(" ")}
          aria-current={status === "revoked" ? "page" : undefined}
        >
          Revoked{revokedCount !== null ? ` (${revokedCount.toLocaleString()})` : ""}
        </Link>
      </nav>

      <Card padding={0}>
        {rows.length === 0 ? (
          <p
            style={{
              padding: "var(--space-8)",
              textAlign: "center",
              color: "var(--ink-500)",
              fontSize: "var(--font-size-sm)",
              margin: 0,
            }}
          >
            No certificates match the current filter.
          </p>
        ) : (
          <AdminCertificatesTable certificates={rows} />
        )}
      </Card>
    </div>
  );
}
