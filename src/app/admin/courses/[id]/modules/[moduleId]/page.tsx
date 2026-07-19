/**
 * /admin/courses/[id]/modules/[moduleId] — module detail (read-only).
 *
 * STORY-048b. Server component.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import { deleteModuleAction } from "@/app/actions/deleteModule.action";
import styles from "../../../../courses.module.css";

interface PageProps {
  params: Promise<{ id: string; moduleId: string }>;
}

export default async function ModuleDetailPage({ params }: PageProps) {
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

  const created = module.createdAt.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const updated = module.updatedAt.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  async function handleDelete() {
    "use server";
    await deleteModuleAction({ moduleId });
    redirect(`/admin/courses/${courseId}`);
  }

  return (
    <div>
      <Link
        href={`/admin/courses/${courseId}`}
        className={styles.backLink}
      >
        ← Back to course
      </Link>

      <TopBar
        title={module.title}
        subtitle={
          <span className={styles.badges}>
            <Badge variant="neutral">Order {module.displayOrder}</Badge>
          </span>
        }
        actions={
          <div className={styles.actions}>
            <Link
              href={`/admin/courses/${courseId}/modules/${module.id}/edit`}
              className={styles.editButton}
            >
              Edit
            </Link>
            <form action={handleDelete}>
              <button type="submit" className={styles.archiveButton}>
                Delete
              </button>
            </form>
          </div>
        }
      />

      <Card padding="comfortable">
        <dl className={styles.details}>
          <dt>ID</dt>
          <dd className={styles.mono}>{module.id}</dd>
          <dt>Title</dt>
          <dd>{module.title}</dd>
          <dt>Display order</dt>
          <dd className={styles.mono}>{module.displayOrder}</dd>
          <dt>Created</dt>
          <dd className={styles.mono}>{created}</dd>
          <dt>Updated</dt>
          <dd className={styles.mono}>{updated}</dd>
        </dl>

        <p className={styles.placeholder}>
          Lessons inside this module are added in{" "}
          <strong>STORY-048c</strong>.
        </p>
      </Card>
    </div>
  );
}
