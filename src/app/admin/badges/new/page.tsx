/**
 * /admin/badges/new — admin create badge form.
 *
 * STORY-050e. Server component.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createBadgeAction } from "@/app/actions/createBadge.action";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const VALID_SLUGS: { slug: string; name: string; description: string }[] = [
  {
    slug: "first-quiz-pass",
    name: "First Quiz Pass",
    description: "Awarded the first time a student passes any quiz",
  },
  {
    slug: "5-day-streak",
    name: "5 Day Streak",
    description: "Awarded after 5 consecutive days of activity",
  },
  {
    slug: "all-3-courses-enrolled",
    name: "All 3 Courses Enrolled",
    description: "Awarded when a student enrolls in all 3 core courses",
  },
];

export default async function NewBadgePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  const errorMsg = sp.error
    ? {
        invalid_slug: "Slug must be one of: first-quiz-pass, 5-day-streak, all-3-courses-enrolled.",
        slug_taken: "A badge with this slug already exists.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/badges" className={styles.backLink}>
        ← Back to badges
      </Link>

      <TopBar title="Add badge" subtitle="Create a new badge template" />

      {errorMsg && (
        <Card padding="comfortable" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--color-danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding="comfortable">
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Slug *</span>
            <select name="slug" required defaultValue="" className={styles.input}>
              <option value="" disabled>
                — Select a slug —
              </option>
              {VALID_SLUGS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.slug} — {s.name}
                </option>
              ))}
            </select>
            <span className={styles.hint}>Slugs are immutable once created. They map to award criteria.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Name *</span>
            <input
              type="text"
              name="name"
              required
              maxLength={60}
              className={styles.input}
              placeholder="e.g. First Quiz Pass"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description *</span>
            <textarea
              name="description"
              required
              maxLength={200}
              className={styles.textarea}
              placeholder="What does this badge recognize?"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Icon name *</span>
            <input
              type="text"
              name="iconName"
              required
              maxLength={40}
              className={styles.input}
              placeholder="Phosphor icon name, e.g. Trophy, Fire, Star"
            />
            <span className={styles.hint}>Any Phosphor icon name. Browse at phosphoricons.com.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>XP reward *</span>
            <input
              type="number"
              name="xpReward"
              required
              min="1"
              max="10000"
              defaultValue="50"
              className={styles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <div className={styles.actions}>
            <Link href="/admin/badges" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Create badge
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const iconName = String(formData.get("iconName") ?? "").trim();
  const xpReward = parseInt(String(formData.get("xpReward") ?? "0"), 10);

  const r = await createBadgeAction({
    slug,
    name,
    description,
    iconName,
    xpReward,
  });

  if (!r.ok) {
    redirect(`/admin/badges/new?error=${r.error}`);
    return;
  }

  redirect("/admin/badges");
}
