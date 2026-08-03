/**
 * /admin/email-templates/[type]/edit — admin edit email template form.
 *
 * STORY-095. Server component. Works whether or not a row already
 * exists for the type (create-on-first-save, matching the upsert-by-type
 * repository contract).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { isEmailTemplateType, type EmailTemplateType } from "@/domain/entities/EmailTemplate";
import { updateEmailTemplateAction } from "@/app/actions/updateEmailTemplate.action";
import styles from "../../../badges/new/page.module.css";

const TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  email_verification: "Email verification",
  password_reset: "Password reset",
  welcome: "Welcome",
  receipt: "Receipt",
  refund: "Refund confirmation",
  certificate: "Certificate issued",
  live_class_reminder: "Live class reminder",
};

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditEmailTemplatePage({ params, searchParams }: PageProps) {
  const { type: rawType } = await params;
  const sp = await searchParams;
  await requireAdmin();

  if (!isEmailTemplateType(rawType)) {
    notFound();
  }
  const type = rawType;

  const container = buildContainer();
  const result = await container.getEmailTemplate.execute({ type });
  if (!result.ok) {
    notFound();
  }
  const template = result.value.template;

  const errorMsg = sp.error
    ? {
        invalid_type: "Unknown template type.",
        invalid_input: "All fields are required.",
        db_error: "Database error. Try again.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/email-templates" className={styles.backLink}>
        ← Back to email templates
      </Link>

      <TopBar title={`Edit: ${TEMPLATE_LABELS[type]}`} subtitle={type} />

      <Card padding={6} style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ink-500)" }}>
          Saving here replaces the corresponding email&apos;s live copy the next time it sends
          (STORY-095.5). There is no {"{{"}placeholder{"}}"} support — whatever you write here
          replaces the default text verbatim, so a per-recipient detail baked into the default (like
          the student&apos;s first name in a headline) is lost once you customize that field.
          {type === "refund"
            ? " The refund email has no call-to-action button, so Cta label has no effect here."
            : null}
        </p>
      </Card>

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleUpdate(type)} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Subject *</span>
            <input
              type="text"
              name="subject"
              required
              maxLength={150}
              defaultValue={template?.subject ?? ""}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Headline *</span>
            <input
              type="text"
              name="headline"
              required
              maxLength={100}
              defaultValue={template?.headline ?? ""}
              className={styles.input}
            />
            <span className={styles.hint}>Large H1-style line at the top of the email body.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Intro body *</span>
            <textarea
              name="introBody"
              required
              maxLength={500}
              defaultValue={template?.introBody ?? ""}
              className={styles.textarea}
            />
            <span className={styles.hint}>
              1-3 sentences between the headline and the CTA button.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>CTA button label *</span>
            <input
              type="text"
              name="ctaLabel"
              required
              maxLength={40}
              defaultValue={template?.ctaLabel ?? ""}
              className={styles.input}
            />
          </label>

          <div className={styles.actions}>
            <Link href="/admin/email-templates" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save changes
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function handleUpdate(type: EmailTemplateType) {
  return async function (formData: FormData) {
    "use server";

    const subject = String(formData.get("subject") ?? "").trim();
    const headline = String(formData.get("headline") ?? "").trim();
    const introBody = String(formData.get("introBody") ?? "").trim();
    const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();

    const r = await updateEmailTemplateAction({ type, subject, headline, introBody, ctaLabel });

    if (!r.ok) {
      redirect(`/admin/email-templates/${type}/edit?error=${r.error}`);
      return;
    }

    redirect("/admin/email-templates");
  };
}
