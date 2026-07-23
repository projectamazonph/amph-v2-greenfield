/**
 * /admin/badges/[slug]/edit — admin edit badge form.
 *
 * STORY-050e. Server component.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { updateBadgeAction } from "@/app/actions/updateBadge.action";
import { archiveBadgeAction } from "@/app/actions/archiveBadge.action";
import type { BadgeSlug } from "@/domain/entities/Badge";
import styles from "../../new/page.module.css";

const VALID_SLUGS: readonly BadgeSlug[] = [
  "first-quiz-pass",
  "5-day-streak",
  "all-3-courses-enrolled",
] as const;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditBadgePage({ params, searchParams }: PageProps) {
  const { slug: rawSlug } = await params;
  const sp = await searchParams;
  await requireAdmin();

  if (!VALID_SLUGS.includes(rawSlug as BadgeSlug)) {
    notFound();
  }
  const slug = rawSlug as BadgeSlug;

  const container = buildContainer();
  const result = await container.adminGetBadge.execute(slug);

  if (!result.ok) {
    notFound();
  }
  const b = result.value;

  const errorMsg = sp.error
    ? {
        not_found: "Badge not found.",
        db_error: "Database error. Try again.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/badges" className={styles.backLink}>
        ← Back to badges
      </Link>

      <TopBar title={`Edit: ${b.name}`} subtitle={b.slug} />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--color-danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleUpdate(slug)} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Slug (read-only)</span>
            <input
              type="text"
              disabled
              defaultValue={b.slug}
              className={styles.input}
              style={{ fontFamily: "monospace", backgroundColor: "var(--color-bg-muted)" }}
            />
            <span className={styles.hint}>Slugs cannot be changed once created.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Name *</span>
            <input
              type="text"
              name="name"
              required
              maxLength={60}
              defaultValue={b.name}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description *</span>
            <textarea
              name="description"
              required
              maxLength={200}
              defaultValue={b.description}
              className={styles.textarea}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Icon name *</span>
            <input
              type="text"
              name="iconName"
              required
              maxLength={40}
              defaultValue={b.iconName}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>XP reward *</span>
            <input
              type="number"
              name="xpReward"
              required
              min="1"
              max="10000"
              defaultValue={b.xpReward}
              className={styles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <div className={styles.actions}>
            <Link href="/admin/badges" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save changes
            </button>
          </div>
        </form>
      </Card>

      {/* Archive section */}
      {!b.archived && (
        <Card padding={6} style={{ marginTop: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              margin: "0 0 0.75rem 0",
              color: "var(--color-danger)",
            }}
          >
            Danger zone
          </h2>
          <p
            style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: "0 0 1rem 0" }}
          >
            Archiving hides this badge from new awards. Existing BadgeAward records are unaffected.
          </p>
          <form action={handleArchive(slug)}>
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
              Archive badge
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

function handleUpdate(slug: BadgeSlug) {
  return async function (formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const iconName = String(formData.get("iconName") ?? "").trim();
    const xpReward = parseInt(String(formData.get("xpReward") ?? "0"), 10);

    const r = await updateBadgeAction({
      slug,
      patch: { name, description, iconName, xpReward },
    });

    if (!r.ok) {
      redirect(`/admin/badges/${slug}/edit?error=${r.error}`);
      return;
    }

    redirect("/admin/badges");
  };
}

function handleArchive(slug: BadgeSlug) {
  return async function () {
    "use server";
    const r = await archiveBadgeAction(slug);
    if (!r.ok) {
      redirect(`/admin/badges/${slug}/edit?error=${r.error}`);
      return;
    }
    redirect("/admin/badges");
  };
}
