/**
 * /admin/users/new — admin grant-subscription form.
 *
 * Grants a student a subscription tier (FREE/STARTER/PRO) outside the
 * checkout flow — for students who paid outside the platform (bank
 * transfer, GCash sent directly, cash). Creates the student's account
 * if they don't have one yet and emails them a "set your password"
 * link. Optionally records how they paid for bookkeeping.
 *
 * Server component, mirrors /admin/badges/new.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminGrantSubscriptionAction } from "@/app/actions/adminGrantSubscription.action";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_name:
    "This student doesn't have an account yet — first and last name are required to create one.",
  db_error: "Something went wrong saving this. Try again.",
};

export default async function NewUserPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  const errorMsg = sp.error ? (ERROR_MESSAGES[sp.error] ?? "Something went wrong.") : null;

  return (
    <div>
      <Link href="/admin/users" className={styles.backLink}>
        ← Back to users
      </Link>

      <TopBar
        title="Add student"
        subtitle="Grant a subscription tier without going through checkout — for students who paid outside the platform."
      />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Student email *</span>
            <input
              type="email"
              name="email"
              required
              className={styles.input}
              placeholder="student@email.com"
              autoComplete="off"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>First name</span>
            <input type="text" name="firstName" maxLength={60} className={styles.input} />
            <span className={styles.hint}>
              Only needed if this student doesn't have an account yet.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Last name</span>
            <input type="text" name="lastName" maxLength={60} className={styles.input} />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Subscription tier *</span>
            <select
              name="subscriptionTier"
              required
              defaultValue="STARTER"
              className={styles.select}
            >
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
              <option value="FREE">Free (revoke a grant)</option>
            </select>
          </label>

          <details className={styles.paymentDetails}>
            <summary className={styles.paymentSummary}>
              Record a payment for bookkeeping (paid outside the platform)
            </summary>
            <div className={styles.paymentFields}>
              <label className={styles.field}>
                <span className={styles.label}>Payment method</span>
                <select name="paymentMethod" defaultValue="" className={styles.select}>
                  <option value="">— None (comp / free grant) —</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Amount paid (₱)</span>
                <input
                  type="number"
                  name="paymentAmount"
                  min="0"
                  step="0.01"
                  className={styles.input}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Reference / note</span>
                <input
                  type="text"
                  name="paymentReference"
                  maxLength={200}
                  className={styles.input}
                  placeholder="e.g. GCash ref #123456789"
                  autoComplete="off"
                />
              </label>
            </div>
          </details>

          <div className={styles.actions}>
            <Link href="/admin/users" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Grant access
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const subscriptionTier = String(formData.get("subscriptionTier") ?? "STARTER") as
    "FREE" | "STARTER" | "PRO";
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paymentAmountRaw = String(formData.get("paymentAmount") ?? "").trim();
  const paymentReference = String(formData.get("paymentReference") ?? "").trim();

  const payment =
    paymentMethod && paymentAmountRaw
      ? {
          method: paymentMethod,
          amountMinor: Math.round(parseFloat(paymentAmountRaw) * 100),
          reference: paymentReference || undefined,
        }
      : undefined;

  const r = await adminGrantSubscriptionAction({
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    subscriptionTier,
    payment,
  });

  if (!r.ok) {
    redirect(`/admin/users/new?error=${r.error}`);
    return;
  }

  redirect(`/admin/users/${r.userId}`);
}
