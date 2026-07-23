/**
 * /admin/courses/[id]/modules/new — create a new module.
 *
 * STORY-048b. Server component.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { createModuleAction } from "@/app/actions/createModule.action";
import styles from "../../../../courses.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewModulePage({ params }: PageProps) {
  const { id: courseId } = await params;
  await requireAdmin();

  const container = buildContainer();
  const courseResult = await container.adminGetCourse.execute({ courseId });
  if (!courseResult.ok) {
    notFound();
  }
  const course = courseResult.value.course;

  async function handleSubmit(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      redirect(`/admin/courses/${courseId}/modules/new?error=missing_title`);
    }
    const r = await createModuleAction({ courseId, title });
    if (r.ok) {
      redirect(`/admin/courses/${courseId}`);
    }
    const kind = r.error.kind === "invalid_title" ? "invalid_title" : "server_error";
    redirect(`/admin/courses/${courseId}/modules/new?error=${kind}`);
  }

  return (
    <div>
      <Link href={`/admin/courses/${courseId}`} className={styles.backLink}>
        ← Back to course
      </Link>

      <TopBar
        title={`Add module to "${course.title}"`}
        subtitle="Modules organize the curriculum. Each module will hold lessons (added in STORY-048c)."
      />

      <Card padding={6}>
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              autoFocus
              className={styles.input}
              placeholder="e.g. Introduction to the platform"
            />
          </label>

          <div className={styles.formActions}>
            <Link href={`/admin/courses/${courseId}`} className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Create module
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
