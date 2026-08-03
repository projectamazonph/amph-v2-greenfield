import { Result } from "@/domain/shared/Result";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";

/**
 * `Resource` domain entity.
 *
 * STORY-098: the download center. A downloadable guide, template,
 * automation tool (e.g. a Google Sheet that scans an STR report and
 * flags winners/bleeders), client reporting template, monitoring
 * sheet, audit template, student handout, cheat sheet, or quick
 * guide.
 *
 * `fileUrl` is either:
 *  - a root-relative path (`/downloads/...`) into `public/` for the
 *    pre-installed resources shipped with the app, or
 *  - an absolute http(s) URL — either an admin-pasted external link
 *    (Google Drive/Sheets) or a URL returned by `IFileStorage` (STORY-098.5)
 *    for an admin-uploaded file.
 *
 * `fileKey` (STORY-098.5) is non-null only when the file was uploaded
 * through `IFileStorage`: it's the storage key needed to delete or
 * replace that file later. It's null for pre-installed static assets
 * and for admin-pasted external links — in both cases we don't own
 * the file and have nothing to delete on our end.
 *
 * Gated the same way courses are: `accessTier` reuses
 * `CourseAccessTier` (PREVIEW/STARTER/PRO) and is checked against the
 * viewer's subscription tier via `subscriptionMeetsCourseTier`.
 *
 * Immutable — updates produce new instances via `updateResource`.
 */

export type ResourceCategory = "guide" | "template" | "automation_tool" | "cheat_sheet" | "handout";

const ALL_RESOURCE_CATEGORIES: readonly ResourceCategory[] = [
  "guide",
  "template",
  "automation_tool",
  "cheat_sheet",
  "handout",
];

export type ResourceFileType = "pdf" | "xlsx" | "gsheet" | "docx" | "zip" | "link";

const ALL_RESOURCE_FILE_TYPES: readonly ResourceFileType[] = [
  "pdf",
  "xlsx",
  "gsheet",
  "docx",
  "zip",
  "link",
];

const ALL_ACCESS_TIERS: readonly CourseAccessTier[] = ["STARTER", "PRO", "PREVIEW"];

/**
 * Type guards for values read back from persistence. A repository
 * adapter should call these before trusting a stored string. A
 * corrupt or legacy row must not silently hydrate an invalid value.
 */
export function isValidResourceCategory(v: string): v is ResourceCategory {
  return (ALL_RESOURCE_CATEGORIES as readonly string[]).includes(v);
}

export function isValidResourceFileType(v: string): v is ResourceFileType {
  return (ALL_RESOURCE_FILE_TYPES as readonly string[]).includes(v);
}

export function isValidResourceAccessTier(v: string): v is CourseAccessTier {
  return (ALL_ACCESS_TIERS as readonly string[]).includes(v);
}

export interface Resource {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: ResourceCategory;
  readonly fileType: ResourceFileType;
  readonly fileUrl: string;
  /** Storage key for admin-uploaded files (STORY-098.5); null for static assets and external links. */
  readonly fileKey: string | null;
  readonly accessTier: CourseAccessTier;
  readonly isPublished: boolean;
  readonly downloadCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateResourceInput {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  fileType: ResourceFileType;
  fileUrl: string;
  /** Storage key if this file was uploaded via IFileStorage. Omit/null for static assets and external links. */
  fileKey?: string | null;
  accessTier: CourseAccessTier;
}

export type UpdateResourcePatch = Partial<
  Pick<
    Resource,
    | "title"
    | "description"
    | "category"
    | "fileType"
    | "fileUrl"
    | "fileKey"
    | "accessTier"
    | "isPublished"
  >
>;

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type ResourceError =
  | { kind: "invalid_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_description" }
  | { kind: "invalid_category" }
  | { kind: "invalid_file_type" }
  | { kind: "invalid_file_url" }
  | { kind: "invalid_access_tier" };

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createResource(input: CreateResourceInput): Result<Resource, ResourceError> {
  const errors: ResourceError[] = [];

  if (!input.id.trim()) {
    errors.push({ kind: "invalid_id" });
  }
  if (!input.title.trim()) {
    errors.push({ kind: "invalid_title" });
  }
  if (!input.description.trim()) {
    errors.push({ kind: "invalid_description" });
  }
  if (!isValidResourceCategory(input.category)) {
    errors.push({ kind: "invalid_category" });
  }
  if (!isValidResourceFileType(input.fileType)) {
    errors.push({ kind: "invalid_file_type" });
  }
  if (!isValidUrl(input.fileUrl)) {
    errors.push({ kind: "invalid_file_url" });
  }
  if (!isValidResourceAccessTier(input.accessTier)) {
    errors.push({ kind: "invalid_access_tier" });
  }

  if (errors.length > 0) return { ok: false, error: errors[0]! };

  const now = new Date();
  return {
    ok: true,
    value: Object.freeze({
      id: input.id.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      fileType: input.fileType,
      fileUrl: input.fileUrl.trim(),
      fileKey: input.fileKey?.trim() || null,
      accessTier: input.accessTier,
      isPublished: true,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    }),
  };
}

export function updateResource(
  original: Resource,
  patch: UpdateResourcePatch,
): Result<Resource, ResourceError> {
  const errors: ResourceError[] = [];

  const title = patch.title !== undefined ? patch.title.trim() : original.title;
  if (!title) errors.push({ kind: "invalid_title" });

  const description =
    patch.description !== undefined ? patch.description.trim() : original.description;
  if (!description) errors.push({ kind: "invalid_description" });

  const category = patch.category !== undefined ? patch.category : original.category;
  if (!isValidResourceCategory(category)) errors.push({ kind: "invalid_category" });

  const fileType = patch.fileType !== undefined ? patch.fileType : original.fileType;
  if (!isValidResourceFileType(fileType)) errors.push({ kind: "invalid_file_type" });

  const fileUrl = patch.fileUrl !== undefined ? patch.fileUrl.trim() : original.fileUrl;
  if (!isValidUrl(fileUrl)) errors.push({ kind: "invalid_file_url" });

  const fileKey = patch.fileKey !== undefined ? patch.fileKey : original.fileKey;

  const accessTier = patch.accessTier !== undefined ? patch.accessTier : original.accessTier;
  if (!isValidResourceAccessTier(accessTier)) errors.push({ kind: "invalid_access_tier" });

  const isPublished = patch.isPublished !== undefined ? patch.isPublished : original.isPublished;

  if (errors.length > 0) return { ok: false, error: errors[0]! };

  return {
    ok: true,
    value: Object.freeze({
      ...original,
      title,
      description,
      category,
      fileType,
      fileUrl,
      fileKey,
      accessTier,
      isPublished,
      updatedAt: new Date(),
    }),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Accepts either a root-relative path into `public/` (`/downloads/...`,
 * for pre-installed static assets) or an absolute http(s) URL (an
 * external link, or a storage URL from `IFileStorage`). Rejects
 * protocol-relative (`//host/...`) and anything else that isn't
 * unambiguously same-origin or a real http(s) URL.
 */
function isValidUrl(s: string): boolean {
  if (s.startsWith("/") && !s.startsWith("//")) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
