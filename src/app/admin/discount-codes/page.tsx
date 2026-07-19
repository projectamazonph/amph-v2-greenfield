/**
 * /admin/discount-codes — admin discount code list.
 *
 * STORY-050d. Server component.
 */
import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import styles from "./page.module.css";

export default async function DiscountCodesPage() {
  await requireAdmin();

  const container = buildContainer();
  const r = await container.adminListDiscountCodes.execute();
  const codes = r.ok ? r.value : [];

  return (
    <div>
      <TopBar
        title="Discount codes"
        subtitle="Manage promotional discount codes"
        actions={
          <Link href="/admin/discount-codes/new" className={styles.addButton}>
            + Add discount code
          </Link>
        }
      />

      <Card padding="comfortable">
        {codes.length === 0 ? (
          <p className={styles.empty}>No discount codes yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Uses</th>
                <th>Valid until</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((dc) => (
                <tr key={dc.id}>
                  <td className={styles.code}>{dc.code}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[dc.type]}`}>
                      {dc.type}
                    </span>
                  </td>
                  <td className={styles.value}>
                    {dc.type === "PERCENTAGE" ? `${dc.value}%` : `₱${(dc.value / 100).toFixed(2)}`}
                  </td>
                  <td className={styles.uses}>
                    {dc.maxUses !== null
                      ? `${dc.usedCount} / ${dc.maxUses}`
                      : `${dc.usedCount} / ∞`}
                  </td>
                  <td className={styles.date}>
                    {dc.validUntil
                      ? dc.validUntil.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })
                      : "Never"}
                  </td>
                  <td className={styles.actions}>
                    <Link
                      href={`/admin/discount-codes/${dc.id}/edit`}
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
