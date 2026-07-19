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
import { Card } from "@/components/ui";
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
  const module = result.value.module;
  if (module.courseId !== courseId) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      redirect(
        `/admin/courses/${courseId}/modules/${moduleId}/edit?error=missing_title`,
      );
    }
    const r = await updateModuleAction({
      moduleId,
      patch: { title },
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
    redirect(
      `/admin/courses/${courseId}/modules/${moduleId}/edit?error=${kind}`,
    );
  }

  return (
    <div>
      <Link
        href={`/admin/courses/${courseId}/modules/${moduleId}`}
        className={styles.backLink}
      >
        ← Back to module
      </Link>

      <TopBar title={`Edit "${module.title}"`} />

      <Card padding="comfortable">
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              autoFocus
              defaultValue={module.title}
              className={styles.input}
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
