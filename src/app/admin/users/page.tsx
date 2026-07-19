/**
 * /admin/users — admin users list.
 *
 * STORY-047. Server component.
 *
 * Layout:
 *   - TopBar with title "Users" + (optional) "Add user" action slot
 *   - Filter row: search input + role select + tier select
 *   - Table: avatar (initials) | name | email | role badge | tier badge | created
 *   - Pagination: Prev | page X of Y | Next
 *
 * Per design spec §10 (admin tables).
 *
 * SOLID: thin page. All business logic is in `ListUsers` (the use case).
 * The page only:
 *   1. Reads searchParams (Next 15+ async params)
 *   2. Calls the use case
 *   3. Renders the result
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import { ListUsers } from "@/usecases/ListUsers";
import type { Role, SubscriptionTier } from "@/domain/entities/User";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    tier?: string;
    page?: string;
  }>;
}

function parseRole(v: string | undefined): Role | undefined {
  if (v === "STUDENT" || v === "INSTRUCTOR" || v === "ADMIN") return v;
  return undefined;
}

function parseTier(v: string | undefined): SubscriptionTier | undefined {
  if (v === "FREE" || v === "STARTER" || v === "PRO") return v;
  return undefined;
}

function parsePage(v: string | undefined): number {
  if (!v) return 1;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const role = parseRole(params.role);
  const tier = parseTier(params.tier);
  const page = parsePage(params.page);

  const container = buildContainer();
  const listUsers: ListUsers = container.listUsers;
  const result = await listUsers.execute({
    search,
    role,
    subscriptionTier: tier,
    page,
    pageSize: 25,
  });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Users" subtitle="Search and manage all users" />
        <Card padding="comfortable">
          <p className={styles.error}>
            Failed to load users: {result.error.message}
          </p>
        </Card>
      </div>
    );
  }

  const { users, totalCount, pageSize } = result.value;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function buildPageHref(targetPage: number): string {
    const url = new URL("http://x/admin/users");
    if (search) url.searchParams.set("search", search);
    if (role) url.searchParams.set("role", role);
    if (tier) url.searchParams.set("tier", tier);
    url.searchParams.set("page", String(targetPage));
    return url.pathname + url.search;
  }

  return (
    <div>
      <TopBar title="Users" subtitle={`${totalCount} total`} />

      {/* Filter form */}
      <form className={styles.filters} method="get">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search name or email"
          className={styles.searchInput}
        />
        <select name="role" defaultValue={role ?? ""} className={styles.select}>
          <option value="">All roles</option>
          <option value="STUDENT">Student</option>
          <option value="INSTRUCTOR">Instructor</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select name="tier" defaultValue={tier ?? ""} className={styles.select}>
          <option value="">All tiers</option>
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
        </select>
        <button type="submit" className={styles.filterButton}>
          Apply
        </button>
      </form>

      {/* User table */}
      <Card padding="comfortable">
        {users.length === 0 ? (
          <p className={styles.emptyState}>No users match the current filters.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Role</th>
                <th className={styles.th}>Tier</th>
                <th className={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={styles.td}>
                    <Link href={`/admin/users/${u.id}`} className={styles.userLink}>
                      <span className={styles.avatar}>
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </span>
                      <span>
                        {u.firstName} {u.lastName}
                      </span>
                    </Link>
                  </td>
                  <td className={styles.td}>{u.email}</td>
                  <td className={styles.td}>
                    <Badge
                      variant={
                        u.role === "ADMIN"
                          ? "danger"
                          : u.role === "INSTRUCTOR"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className={styles.td}>
                    <Badge variant={u.subscriptionTier === "PRO" ? "accent" : "neutral"}>
                      {u.subscriptionTier}
                    </Badge>
                  </td>
                  <td className={styles.td}>
                    {u.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Pagination">
          {page > 1 ? (
            <Link href={buildPageHref(page - 1)} className={styles.pageLink}>
              ← Prev
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled}>← Prev</span>
          )}
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildPageHref(page + 1)} className={styles.pageLink}>
              Next →
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled}>Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
