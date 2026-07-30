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

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
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
        <Card padding={6}>
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
      <nav style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--ink-500)' }}>
        <Link href="/admin" style={{ color: 'var(--ink-500)', textDecoration: 'none' }}>Admin</Link>
        <span style={{ margin: '0 var(--space-2)' }}>/</span>
        <span>Users</span>
      </nav>

      <TopBar
        title="Users"
        subtitle={`${totalCount} total`}
        actions={
          <Link href="/admin/users/new" className={styles.addButton}>
            + Add student
          </Link>
        }
      />

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

      <div style={{ marginBottom: 'var(--space-4)' }}><input type="text" placeholder="Search by name or email..." className={styles.filterInput || ''} style={{ padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', width: '100%', maxWidth: 320 }} /></div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}><button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>All</button><button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>Student</button><button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>Admin</button></div>

      {/* Table — client component handles renderCell (function props) */}
      <Card padding={6}>
        <AdminUsersTable
          users={rows}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          filters={{ search, role, tier }}
        />
      </Card>

      {users.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--ink-500)' }}>
          <p>No users found.</p>
          <Link href="/admin/users/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
            + Create User
          </Link>
        </div>
      )}
    </div>
  );
}
