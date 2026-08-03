/**
 * /admin/resources/new — admin create download-center resource form.
 *
 * STORY-098. Server component.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createResourceAction } from "@/app/actions/createResource.action";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import type { ResourceCategory, ResourceFileType } from "@/domain/entities/Resource";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";
import styles from "./page.module.css";

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
  searchParams: Promise<{ error?: string }>;
}

export default async function NewResourcePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  const errorMsg = sp.error
    ? {
        invalid_title: "Title is required.",
        invalid_description: "Description is required.",
        invalid_category: "Please choose a category.",
        invalid_file_type: "Please choose a file type.",
        invalid_file_url: "Please enter a valid http(s) URL.",
        invalid_access_tier: "Please choose an access tier.",
        missing: "Please fill in every required field.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/resources" className={styles.backLink}>
        ← Back to download center
      </Link>

      <TopBar
        title="Add resource"
        subtitle="Publish a guide, template, automation tool, or handout to the download center"
      />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Title *</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              className={styles.input}
              placeholder="e.g. STR Winner/Bleeder Scanner"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description *</span>
            <textarea
              name="description"
              required
              maxLength={500}
              className={styles.textarea}
              placeholder="What it is and how to use it."
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Category *</span>
            <select name="category" required defaultValue="guide" className={styles.select}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>File type *</span>
            <select name="fileType" required defaultValue="pdf" className={styles.select}>
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>File URL *</span>
            <input
              type="url"
              name="fileUrl"
              required
              maxLength={500}
              className={styles.input}
              placeholder="https://docs.google.com/spreadsheets/d/.../copy"
            />
            <span className={styles.hint}>
              An externally-hosted link (Google Drive/Sheets share link, or a public asset URL).
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Access tier *</span>
            <select name="accessTier" required defaultValue="PREVIEW" className={styles.select}>
              {ACCESS_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className={styles.hint}>
              PREVIEW is free to any logged-in student. STARTER/PRO require a matching subscription.
            </span>
          </label>

          <div className={styles.actions}>
            <Link href="/admin/resources" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Publish resource
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "") as ResourceCategory;
  const fileType = String(formData.get("fileType") ?? "") as ResourceFileType;
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const accessTier = String(formData.get("accessTier") ?? "") as CourseAccessTier;

  if (!title || !description || !category || !fileType || !fileUrl || !accessTier) {
    redirect("/admin/resources/new?error=missing");
  }

  const r = await createResourceAction({
    title,
    description,
    category,
    fileType,
    fileUrl,
    accessTier,
  });

  if (!r.ok) {
    redirect(`/admin/resources/new?error=${r.error.kind}`);
    return;
  }

  redirect("/admin/resources");
}
