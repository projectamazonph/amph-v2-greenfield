/**
 * /admin/email-templates — admin email template list.
 *
 * STORY-095. Server component. Lists all 7 known EmailTemplateType
 * values (fixed set, not a growing table) so search/filter/pagination
 * do not apply the way they do on other admin list pages.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import styles from "./page.module.css";

const TEMPLATE_LABELS: Record<string, string> = {
  email_verification: "Email verification",
  password_reset: "Password reset",
  welcome: "Welcome",
  receipt: "Receipt",
  refund: "Refund confirmation",
  certificate: "Certificate issued",
  live_class_reminder: "Live class reminder",
};

export default async function EmailTemplatesPage() {
  await requireAdmin();

  const container = buildContainer();
  const r = await container.listEmailTemplates.execute();
  const rows = r.ok ? r.value.rows : [];

  return (
    <div>
      <TopBar
        title="Email templates"
        subtitle="Edit the subject, headline, intro, and CTA text for transactional emails"
      />

      <Card padding={6} style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ink-500)" }}>
          These fields feed the customer-facing copy for each email. Not customized yet means the
          type is still using its built-in default copy.
        </p>
      </Card>

      <Card padding={6}>
        {rows.length === 0 ? (
          <p className={styles.empty}>No email template types found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Last updated</th>
                <th className={styles.actions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.type}>
                  <td className={styles.name}>{TEMPLATE_LABELS[row.type] ?? row.type}</td>
                  <td className={styles.subject}>
                    {row.template ? row.template.subject : <em>(default copy)</em>}
                  </td>
                  <td>
                    <span
                      className={[
                        styles.statusBadge,
                        row.template ? styles.customized : styles.default,
                      ].join(" ")}
                    >
                      {row.template ? "Customized" : "Not customized"}
                    </span>
                  </td>
                  <td className={styles.date}>
                    {row.template ? row.template.updatedAt.toLocaleDateString() : "—"}
                  </td>
                  <td className={styles.actions}>
                    <Link
                      href={`/admin/email-templates/${row.type}/edit`}
                      className={styles.editLink}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
