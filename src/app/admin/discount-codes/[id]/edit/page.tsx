/**
 * /admin/discount-codes/[id]/edit — admin edit discount code form.
 *
 * STORY-050d. Server component.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import { updateDiscountCodeAction } from "@/app/actions/updateDiscountCode.action";
import { archiveDiscountCodeAction } from "@/app/actions/archiveDiscountCode.action";
import styles from "../../new/page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditDiscountCodePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetDiscountCode.execute(id);

  if (!result.ok) {
    notFound();
  }
  const dc = result.value;

  const errorMsg = sp.error
    ? {
        invalid_code: "Code may only contain letters, numbers, dashes, and underscores.",
        invalid_value: "Percentage must be 1–100. Fixed amount must be positive.",
        invalid_max_uses: "Max uses must be a non-negative number.",
        not_found: "Discount code not found.",
      }[sp.error]
    : null;

  const defaultValidFrom = dc.validFrom
    ? new Date(dc.validFrom).toISOString().slice(0, 16)
    : "";
  const defaultValidUntil = dc.validUntil
    ? new Date(dc.validUntil).toISOString().slice(0, 16)
    : "";

  return (
    <div>
      <Link href="/admin/discount-codes" className={styles.backLink}>
        ← Back to discount codes
      </Link>

      <TopBar title={`Edit: ${dc.code}`} subtitle={dc.id} />

      {errorMsg && (
        <Card padding="comfortable" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--color-danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding="comfortable">
        <form action={handleUpdate(id)} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Code</span>
            <input
              type="text"
              name="code"
              required
              maxLength={30}
              defaultValue={dc.code}
              className={styles.input}
              style={{ textTransform: "uppercase" }}
            />
            <span className={styles.hint}>Letters, numbers, dashes, underscores. Auto-uppercased.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Type</span>
            <select name="type" required defaultValue={dc.type} className={styles.input}>
              <option value="PERCENTAGE">Percentage off</option>
              <option value="FIXED">Fixed amount (₱)</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Value</span>
            <input
              type="number"
              name="value"
              required
              min="1"
              max="100000"
              defaultValue={dc.value}
              className={styles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Max uses (leave blank for unlimited)</span>
            <input
              type="number"
              name="maxUses"
              min="0"
              defaultValue={dc.maxUses ?? ""}
              className={styles.input}
              style={{ width: "8rem" }}
              placeholder="e.g. 100"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Valid from</span>
            <input
              type="datetime-local"
              name="validFrom"
              defaultValue={defaultValidFrom}
              className={styles.input}
              style={{ width: "auto" }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Valid until</span>
            <input
              type="datetime-local"
              name="validUntil"
              defaultValue={defaultValidUntil}
              className={styles.input}
              style={{ width: "auto" }}
            />
          </label>

          <div className={styles.actions}>
            <Link href="/admin/discount-codes" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save changes
            </button>
          </div>
        </form>
      </Card>

      {/* Archive section */}
      <Card padding="comfortable" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem 0", color: "var(--color-danger)" }}>
          Danger zone
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: "0 0 1rem 0" }}>
          Archiving a discount code prevents new uses. Existing orders using this code are unaffected.
        </p>
        <form action={handleArchive(id)}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Archive discount code
          </button>
        </form>
      </Card>
    </div>
  );
}

function handleUpdate(id: string) {
  return async function (formData: FormData) {
    "use server";

    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const type = String(formData.get("type") ?? "PERCENTAGE") as "PERCENTAGE" | "FIXED";
    const value = parseInt(String(formData.get("value") ?? "0"), 10);
    const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
    const validFromRaw = String(formData.get("validFrom") ?? "").trim();
    const validUntilRaw = String(formData.get("validUntil") ?? "").trim();

    const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
    const validFrom = validFromRaw ? new Date(validFromRaw) : null;
    const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;

    const r = await updateDiscountCodeAction({
      id,
      patch: {
        code,
        type,
        value,
        maxUses: maxUses ?? null,
        validFrom: validFrom ? validFrom.toISOString() : null,
        validUntil: validUntil ? validUntil.toISOString() : null,
      },
    });

    if (!r.ok) {
      redirect(`/admin/discount-codes/${id}/edit?error=${r.error}`);
      return;
    }

    redirect("/admin/discount-codes");
  };
}

function handleArchive(id: string) {
  return async function () {
    "use server";
    const r = await archiveDiscountCodeAction(id);
    if (!r.ok) {
      redirect(`/admin/discount-codes/${id}/edit?error=${r.error}`);
      return;
    }
    redirect("/admin/discount-codes");
  };
}
