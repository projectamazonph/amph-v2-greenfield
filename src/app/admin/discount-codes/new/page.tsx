/**
 * /admin/discount-codes/new — admin create discount code form.
 *
 * STORY-050d. Server component.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createDiscountCodeAction } from "@/app/actions/createDiscountCode.action";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import styles from "../new/page.module.css";
import pageStyles from "../page.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewDiscountCodePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  const errorMsg = sp.error
    ? {
        invalid_code: "Code may only contain letters, numbers, dashes, and underscores.",
        invalid_value: "Percentage must be 1–100. Fixed amount must be positive.",
        invalid_max_uses: "Max uses must be a non-negative number.",
        code_taken: "A code with this value already exists.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/discount-codes" className={styles.backLink}>
        ← Back to discount codes
      </Link>

      <TopBar title="Add discount code" subtitle="Create a new promotional discount code" />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--color-danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Code *</span>
            <input
              type="text"
              name="code"
              required
              maxLength={30}
              className={styles.input}
              placeholder="e.g. SAVE20, HOLIDAY2026"
              style={{ textTransform: "uppercase" }}
            />
            <span className={styles.hint}>
              Letters, numbers, dashes, underscores. Auto-uppercased.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Type *</span>
            <select name="type" required defaultValue="PERCENTAGE" className={styles.input}>
              <option value="PERCENTAGE">Percentage off</option>
              <option value="FIXED">Fixed amount (₱)</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Value *</span>
            <input
              type="number"
              name="value"
              required
              min="1"
              max="100000"
              defaultValue="20"
              className={styles.input}
              style={{ width: "8rem" }}
            />
            <span className={styles.hint}>
              For percentage: 1–100. For fixed: minor units (e.g. 2000 = ₱20.00).
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Max uses (leave blank for unlimited)</span>
            <input
              type="number"
              name="maxUses"
              min="1"
              className={styles.input}
              style={{ width: "8rem" }}
              placeholder="e.g. 100"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Valid from (leave blank for immediate)</span>
            <input
              type="datetime-local"
              name="validFrom"
              className={styles.input}
              style={{ width: "auto" }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Valid until (leave blank for never)</span>
            <input
              type="datetime-local"
              name="validUntil"
              className={styles.input}
              style={{ width: "auto" }}
            />
          </label>

          <div className={styles.actions}>
            <Link href="/admin/discount-codes" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Create discount code
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const type = String(formData.get("type") ?? "PERCENTAGE") as "PERCENTAGE" | "FIXED";
  const value = parseInt(String(formData.get("value") ?? "0"), 10);
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const validFromRaw = String(formData.get("validFrom") ?? "").trim();
  const validUntilRaw = String(formData.get("validUntil") ?? "").trim();

  if (!code) {
    redirect("/admin/discount-codes/new?error=invalid_code");
  }

  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  const validFrom = validFromRaw ? new Date(validFromRaw) : null;
  const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;

  const r = await createDiscountCodeAction({
    code,
    type,
    value,
    maxUses: maxUses ?? null,
    validFrom: validFrom ? validFrom.toISOString() : null,
    validUntil: validUntil ? validUntil.toISOString() : null,
  });

  if (!r.ok) {
    redirect(`/admin/discount-codes/new?error=${r.error}`);
    return;
  }

  redirect("/admin/discount-codes");
}
