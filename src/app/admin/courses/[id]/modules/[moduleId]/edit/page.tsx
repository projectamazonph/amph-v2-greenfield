/**
 * /admin/courses/[id]/modules/[moduleId]/edit — edit a module.
 *
 * STORY-048b. Server component.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { updateModuleAction } from "@/app/actions/updateModule.action";
import styles from "../../../../../courses.module.css";

interface PageProps {
  params: Promise<{ id: string; moduleId: string }>;
}

export default async function EditModulePage({ params }: PageProps) {
  const { id: courseId, moduleId } = await params;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetModule.execute({ moduleId });
  if (!result.ok) {
    notFound();
  }
  const moduleEntity = result.value.module;
  if (moduleEntity.courseId !== courseId) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      redirect(`/admin/courses/${courseId}/modules/${moduleId}/edit?error=missing_title`);
    }
    const coverImage = String(formData.get("coverImage") ?? "").trim() || null;
    const r = await updateModuleAction({
      moduleId,
      patch: { title, coverImage },
    });
    if (r.ok) {
      redirect(`/admin/courses/${courseId}/modules/${moduleId}`);
    }
    const kind =
      r.error.kind === "invalid_input"
        ? "invalid_input"
        : r.error.kind === "module_not_found"
          ? "not_found"
          : "server_error";
    redirect(`/admin/courses/${courseId}/modules/${moduleId}/edit?error=${kind}`);
  }

  return (
    <div>
      <Link href={`/admin/courses/${courseId}/modules/${moduleId}`} className={styles.backLink}>
        ← Back to module
      </Link>

      <TopBar title={`Edit "${moduleEntity.title}"`} />

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
              defaultValue={moduleEntity.title}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Cover image URL</span>
            <input
              name="coverImage"
              type="url"
              defaultValue={moduleEntity.coverImage ?? ""}
              className={styles.input}
              placeholder="https://..."
            />
          </label>

          <div className={styles.formActions}>
            <Link
              href={`/admin/courses/${courseId}/modules/${moduleId}`}
              className={styles.cancelButton}
            >
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
