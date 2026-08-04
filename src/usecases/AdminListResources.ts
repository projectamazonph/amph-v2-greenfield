/**
 * `AdminListResources` — search, filter, and paginate every download-center
 * resource for the admin panel, published or not.
 *
 * STORY-098. Search/filter/pagination added in review (a violated
 * established convention — every other admin list page follows
 * `ListUsers`'s pattern, see design spec §10; this one's header comment
 * used to defend the omission as deliberate given catalog size).
 *
 * Filters applied in-memory after loading from the repo, same trade-off
 * `ListUsers` makes for the same reason — fine at this catalog's scale;
 * push down to the DB via a real query if it grows much larger.
 *
 * Flow:
 *  1. Load all resources from the repo
 *  2. Apply search + category + accessTier filters
 *  3. Compute totalCount (post-filter)
 *  4. Slice for the requested page
 *  5. Return { resources, totalCount, page, pageSize }
 *
 * Defaults: page=1, pageSize=25. pageSize is capped at 100. Invalid
 * inputs (page<1, pageSize<1) are clamped to the defaults.
 */
import { Result } from "@/domain/shared/Result";
import type { Resource, ResourceCategory } from "@/domain/entities/Resource";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";

// ── Input / Output types ───────────────────────────────────────────────────

export interface AdminListResourcesInput {
  search?: string;
  category?: ResourceCategory;
  accessTier?: CourseAccessTier;
  page?: number;
  pageSize?: number;
}

export type AdminListResourcesResult = Result<
  {
    resources: readonly Resource[];
    totalCount: number;
    page: number;
    pageSize: number;
  },
  ResourceRepositoryError
>;

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export class AdminListResources {
  constructor(private readonly deps: { resourceRepo: IResourceRepository }) {}

  async execute(input: AdminListResourcesInput = {}): Promise<AdminListResourcesResult> {
    // ── 1. Load ────────────────────────────────────────────
    const loadResult = await this.deps.resourceRepo.listAll();
    if (!loadResult.ok) {
      return loadResult;
    }
    const allResources = loadResult.value;

    // ── 2. Filter ─────────────────────────────────────────
    const filtered = allResources.filter((r) => this.matches(r, input));

    // ── 3. Total count (post-filter) ──────────────────────
    const totalCount = filtered.length;

    // ── 4. Pagination ─────────────────────────────────────
    const page = input.page && input.page >= 1 ? Math.floor(input.page) : DEFAULT_PAGE;
    let pageSize =
      input.pageSize && input.pageSize >= 1 ? Math.floor(input.pageSize) : DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const resources = filtered.slice(start, end);

    // ── 5. Return ─────────────────────────────────────────
    return Result.ok({ resources, totalCount, page, pageSize });
  }

  private matches(resource: Resource, input: AdminListResourcesInput): boolean {
    if (input.category && resource.category !== input.category) return false;
    if (input.accessTier && resource.accessTier !== input.accessTier) return false;
    if (input.search) {
      const q = input.search.toLowerCase();
      const haystack = `${resource.title} ${resource.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }
}
