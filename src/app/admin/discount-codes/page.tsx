/**
 * /admin/discount-codes — admin discount code list.
 *
 * STORY-050d. Server component.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import type { DiscountCode } from "@/domain/entities/DiscountCode";
import {
  AdminDiscountCodesTable,
  type DiscountCodeRow,
} from "@/components/astryx/AdminDiscountCodesTable";
import styles from "./page.module.css";

export default async function DiscountCodesPage() {
  await requireAdmin();

  const container = buildContainer();
  const r = await container.adminListDiscountCodes.execute();
  const codes = r.ok ? r.value : [];

  // Map domain DiscountCode[] → DiscountCodeRow[]
  const rows: DiscountCodeRow[] = codes.map((dc) => ({
    id: dc.id,
    code: dc.code,
    type: dc.type,
    value: dc.value,
    maxUses: dc.maxUses,
    usedCount: dc.usedCount,
    validUntil: dc.validUntil,
  }));

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

      <Card padding={6}>
        <AdminDiscountCodesTable codes={rows} />
      </Card>
    </div>
  );
}
