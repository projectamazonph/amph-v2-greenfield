/**
 * /admin/resources/[id]/edit — admin edit download-center resource form.
 *
 * STORY-098. Server component.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { updateResourceAction } from "@/app/actions/updateResource.action";
import { deleteResourceAction } from "@/app/actions/deleteResource.action";
import { purgeResourceAction } from "@/app/actions/purgeResource.action";
import type { ResourceCategory, ResourceFileType } from "@/domain/entities/Resource";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";
import styles from "../../new/page.module.css";

const CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: "guide", label: "Guide / quick guide" },
  { value: "template", label: "Template (reporting, monitoring, audit)" },
  { value: "automation_tool", label: "Automation tool (e.g. STR scanner sheet)" },
  { value: "cheat_sheet", label: "Cheat sheet" },
  { value: "handout", label: "Student handout" },
];

const FILE_TYPES: ResourceFileType[] = ["pdf", "xlsx", "gsheet", "docx", "zip", "link"];
const ACCESS_TIERS: CourseAccessTier[] = ["PREVIEW", "STARTER", "PRO"];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditResourcePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetResource.execute(id);

  if (!result.ok) {
    notFound();
  }
  const resource = result.value;

  const errorMsg = sp.error
    ? {
        invalid_title: "Title is required.",
        invalid_description: "Description is required.",
        invalid_category: "Please choose a category.",
        invalid_file_type: "Please choose a file type.",
        invalid_file_url: "Please enter a valid http(s) URL.",
        invalid_access_tier: "Please choose an access tier.",
        not_found: "Resource not found.",
        db_error: "Something went wrong. Please try again.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/resources" className={styles.backLink}>
        ← Back to download center
      </Link>

      <TopBar title={`Edit: ${resource.title}`} subtitle={resource.id} />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleUpdate(id)} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Resource ID</span>
            <input
              type="text"
              value={resource.id}
              disabled
              className={styles.input}
              style={{ opacity: 0.5 }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Title *</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              defaultValue={resource.title}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description *</span>
            <textarea
              name="description"
              required
              maxLength={500}
              defaultValue={resource.description}
              className={styles.textarea}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Category *</span>
            <select
              name="category"
              required
              defaultValue={resource.category}
              className={styles.select}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>File type *</span>
            <select
              name="fileType"
              required
              defaultValue={resource.fileType}
              className={styles.select}
            >
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Replace file</span>
            <input type="file" name="file" className={styles.input} />
            <span className={styles.hint}>
              {resource.fileKey
                ? "This resource's current file was uploaded directly. Uploading a new one replaces it and deletes the old copy from storage."
                : "This resource currently points at the external link below. Uploading a file here switches it to a hosted, admin-managed copy."}
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>...or file URL *</span>
            <input
              type="url"
              name="fileUrl"
              required
              maxLength={500}
              defaultValue={resource.fileUrl}
              className={styles.input}
            />
            <span className={styles.hint}>
              Ignored if you upload a replacement file above. Otherwise this is used as-is — editing
              it directly re-points an external link without re-uploading anything.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Access tier *</span>
            <select
              name="accessTier"
              required
              defaultValue={resource.accessTier}
              className={styles.select}
            >
              {ACCESS_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Published</span>
            <select
              name="isPublished"
              required
              defaultValue={resource.isPublished ? "true" : "false"}
              className={styles.select}
            >
              <option value="true">Published — visible in the download center</option>
              <option value="false">Unpublished — hidden from students</option>
            </select>
          </label>

          <p className={styles.hint}>{resource.downloadCount} downloads so far.</p>

          <div className={styles.actions}>
            <Link href="/admin/resources" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save changes
            </button>
          </div>
        </form>
      </Card>

      {/* Unpublish section */}
      <Card padding={6} style={{ marginTop: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            margin: "0 0 0.75rem 0",
            color: "var(--danger)",
          }}
        >
          Danger zone
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-500)", margin: "0 0 1rem 0" }}>
          Unpublishing hides this resource from the student download center. It is not deleted and
          can be republished at any time by editing it again.
        </p>
        <form action={handleDelete(id)}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--danger)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Unpublish resource
          </button>
        </form>

        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--ink-500)",
            margin: "1.5rem 0 1rem 0",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          Permanently deleting removes this resource entirely
          {resource.fileKey ? " and deletes its uploaded file from storage" : ""}. This cannot be
          undone — use it only for a genuinely wrong upload, not routine cleanup.
        </p>
        <form action={handlePurge(id)}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              color: "var(--danger)",
              border: "1px solid var(--danger)",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Permanently delete
          </button>
        </form>
      </Card>
    </div>
  );
}

function handleUpdate(id: string) {
  return async function (formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const category = String(formData.get("category") ?? "") as ResourceCategory;
    const fileType = String(formData.get("fileType") ?? "") as ResourceFileType;
    const fileUrl = String(formData.get("fileUrl") ?? "").trim();
    const accessTier = String(formData.get("accessTier") ?? "") as CourseAccessTier;
    const isPublished = String(formData.get("isPublished") ?? "true") === "true";
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

    const r = await updateResourceAction({
      id,
      patch: { title, description, category, fileType, fileUrl, accessTier, isPublished },
      file,
    });

    if (!r.ok) {
      redirect(`/admin/resources/${id}/edit?error=${r.error.kind}`);
      return;
    }

    redirect("/admin/resources");
  };
}

function handleDelete(id: string) {
  return async function () {
    "use server";
    const r = await deleteResourceAction({ id });
    if (!r.ok) {
      redirect(`/admin/resources/${id}/edit?error=${r.error.kind}`);
      return;
    }
    redirect("/admin/resources");
  };
}

function handlePurge(id: string) {
  return async function () {
    "use server";
    const r = await purgeResourceAction({ id });
    if (!r.ok) {
      redirect(`/admin/resources/${id}/edit?error=${r.error.kind}`);
      return;
    }
    redirect("/admin/resources");
  };
}
