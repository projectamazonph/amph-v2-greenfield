/**
 * /admin/users — admin users list.
 *
 * STORY-047. Server component.
 *
 * Layout:
 *   - TopBar with title + total count
 *   - Filter form (GET, URL params): search + role + tier selects
 *   - Astryx Table (via AdminUsersTable client component)
 *   - Pagination Links (inside AdminUsersTable)
 *
 * Per design spec §10 (admin tables).
 *
 * SOLID: thin page. All business logic is in `ListUsers` (the use case).
 */

import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import { ListUsers } from "@/usecases/ListUsers";
import type { Role, SubscriptionTier } from "@/domain/entities/User";
import { AdminUsersTable, type UserRow } from "@/components/astryx/AdminUsersTable";
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
  const result = await container.listUsers.execute({
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
          <p className={styles.error}>Failed to load users: {result.error.message}</p>
        </Card>
      </div>
    );
  }

  const { users, totalCount, pageSize } = result.value;

  // Map domain User → UserRow (plain serializable data for client component)
  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    subscriptionTier: u.subscriptionTier,
    createdAt: u.createdAt,
  }));

  return (
    <div>
      <TopBar title="Users" subtitle={`${totalCount} total`} />

      {/* Filter form — GET submission updates URL params; server re-renders */}
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

      {/* Table — client component handles renderCell (function props) */}
      <Card padding="comfortable">
        <AdminUsersTable
          users={rows}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          filters={{ search, role, tier }}
        />
      </Card>
    </div>
  );
}
