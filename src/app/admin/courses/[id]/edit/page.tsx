/**
 * /admin/courses/[id]/edit — admin course edit form.
 *
 * STORY-048a. Server component (server-action driven).
 *
 * Pre-populated with the current course values. Modules / Lessons
 * editing is a placeholder (STORY-048b/c).
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import { updateCourseAction } from "@/app/actions/updateCourse.action";
import type { UpdateCourseInput } from "@/usecases/UpdateCourse";
import type { UpdateCoursePatch } from "@/domain/entities/Course";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCoursePage({ params }: PageProps) {
  const { id } = await params;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetCourse.execute({ courseId: id });
  if (!result.ok) {
    if (result.error.kind === "course_not_found") {
      notFound();
    }
    throw new Error(result.error.message);
  }
  const course = result.value.course;

  async function handleSubmit(formData: FormData) {
    "use server";
    const patch: UpdateCoursePatch = {
      slug: String(formData.get("slug") ?? "").trim() || undefined,
      title: String(formData.get("title") ?? "").trim() || undefined,
      tagline: String(formData.get("tagline") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
      priceMinor:
        parseInt(String(formData.get("priceMinor") ?? "0"), 10) || undefined,
      courseTier: (String(formData.get("courseTier") ?? course.courseTier)) as
        | "STARTER"
        | "PRO"
        | "PREVIEW",
      previewLessonCount:
        parseInt(String(formData.get("previewLessonCount") ?? "1"), 10) || undefined,
      isFeatured: formData.get("isFeatured") === "on" ? true : undefined,
      displayOrder:
        parseInt(String(formData.get("displayOrder") ?? "0"), 10) || undefined,
      coverImage:
        String(formData.get("coverImage") ?? "").trim() || undefined,
      status: (String(formData.get("status") ?? course.status)) as
        | "DRAFT"
        | "PUBLISHED"
        | "ARCHIVED",
    };
    const input: UpdateCourseInput = { courseId: id, patch };
    const r = await updateCourseAction(input);
    if (r.ok) {
      redirect(`/admin/courses/${id}`);
    }
  }

  return (
    <div>
      <Link href={`/admin/courses/${id}`} className={styles.backLink}>
        ← Back to course
      </Link>

      <TopBar title={`Edit: ${course.title}`} subtitle={course.slug} />

      <form action={handleSubmit} className={styles.form}>
        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Basics</h2>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Slug</span>
              <input
                name="slug"
                type="text"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                defaultValue={course.slug}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Title</span>
              <input
                name="title"
                type="text"
                required
                defaultValue={course.title}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Tagline</span>
              <input
                name="tagline"
                type="text"
                defaultValue={course.tagline}
                className={styles.input}
              />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Description</span>
              <textarea
                name="description"
                rows={4}
                defaultValue={course.description}
                className={styles.textarea}
              />
            </label>
          </div>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Pricing & access</h2>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Price (PHP, in centavos)</span>
              <input
                name="priceMinor"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={course.price.minor}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Course tier</span>
              <select
                name="courseTier"
                defaultValue={course.courseTier}
                className={styles.input}
              >
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="PREVIEW">Preview only</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Preview lessons</span>
              <input
                name="previewLessonCount"
                type="number"
                min="0"
                step="1"
                defaultValue={course.previewLessonCount}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Display order</span>
              <input
                name="displayOrder"
                type="number"
                step="1"
                defaultValue={course.displayOrder}
                className={styles.input}
              />
            </label>
          </div>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Modules & lessons (placeholder)</h2>
          <p className={styles.placeholder}>
            The curriculum editor lands in <strong>STORY-048b</strong>{" "}
            (modules) and <strong>STORY-048c</strong> (lessons + MDX). The
            course currently has {course.curriculum.sections.length}{" "}
            section(s) and{" "}
            {course.curriculum.sections.reduce(
              (n, s) => n + s.lessons.length,
              0,
            )}{" "}
            lesson(s).
          </p>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Publishing</h2>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Status</span>
              <select
                name="status"
                defaultValue={course.status}
                className={styles.input}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Cover image URL</span>
              <input
                name="coverImage"
                type="url"
                defaultValue={course.coverImage ?? ""}
                className={styles.input}
              />
            </label>

            <label className={`${styles.field} ${styles.checkboxField}`}>
              <input
                name="isFeatured"
                type="checkbox"
                defaultChecked={course.isFeatured}
              />
              <span>Feature on the homepage</span>
            </label>
          </div>
        </Card>

        <div className={styles.actions}>
          <Link href={`/admin/courses/${id}`} className={styles.cancelButton}>
            Cancel
          </Link>
          <button type="submit" className={styles.submitButton}>
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
