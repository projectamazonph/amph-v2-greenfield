/**
 * ListUsers — paginated, filterable list of users for the admin panel.
 *
 * STORY-047: Admin users list.
 *
 * Filters applied in-memory after loading from the repo. This is fine
 * for a small admin app; if the user count grows beyond ~10k, push
 * the filters down to the DB via `PrismaUserRepository.where({...})`.
 *
 * Flow:
 *  1. Load all users from the repo
 *  2. Apply role + tier + search filters
 *  3. Compute totalCount (post-filter)
 *  4. Slice for the requested page
 *  5. Return { users, totalCount, page, pageSize }
 *
 * Defaults: page=1, pageSize=25. pageSize is capped at 100 to prevent
 * runaway queries. Invalid inputs (page<1, pageSize<1) are clamped to
 * the defaults.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { Role, SubscriptionTier, User } from "@/domain/entities/User";

// ── Input / Output types ───────────────────────────────────────────────────

export interface ListUsersInput {
  search?: string;
  role?: Role;
  subscriptionTier?: SubscriptionTier;
  page?: number;
  pageSize?: number;
}

export type ListUsersError = { kind: "db_error"; message: string };

export type ListUsersResult = Result<
  {
    users: readonly User[];
    totalCount: number;
    page: number;
    pageSize: number;
  },
  ListUsersError
>;

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface ListUsersDeps {
  userRepo: UserRepository;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class ListUsers {
  constructor(private readonly deps: ListUsersDeps) {}

  async execute(input: ListUsersInput): Promise<ListUsersResult> {
    // ── 1. Load ────────────────────────────────────────────
    const loadResult = await this.deps.userRepo.listAll();
    if (!loadResult.ok) {
      return Result.err({
        kind: "db_error",
        message: loadResult.error.kind === "db_error"
          ? loadResult.error.message
          : "Failed to load users",
      });
    }
    const allUsers = loadResult.value;

    // ── 2. Filter ─────────────────────────────────────────
    const filtered = allUsers.filter((u) => this.matches(u, input));

    // ── 3. Total count (post-filter) ──────────────────────
    const totalCount = filtered.length;

    // ── 4. Pagination ─────────────────────────────────────
    const page = input.page && input.page >= 1 ? Math.floor(input.page) : DEFAULT_PAGE;
    let pageSize =
      input.pageSize && input.pageSize >= 1 ? Math.floor(input.pageSize) : DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const users = filtered.slice(start, end);

    // ── 5. Return ─────────────────────────────────────────
    return Result.ok({ users, totalCount, page, pageSize });
  }

  private matches(user: User, input: ListUsersInput): boolean {
    if (input.role && user.role !== input.role) return false;
    if (input.subscriptionTier && user.subscriptionTier !== input.subscriptionTier) return false;
    if (input.search) {
      const q = input.search.toLowerCase();
      const haystack = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }
}
