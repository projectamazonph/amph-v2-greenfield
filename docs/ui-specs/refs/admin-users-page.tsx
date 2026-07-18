import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPhp, formatDate } from '@/lib/format';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui';
import styles from './users.module.css';

export const metadata = { title: 'Manage Users — Admin' };

const PAGE_SIZE = 20;

interface SearchParams {
  q?: string;
  role?: string;
  page?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const query = sp.q?.trim() ?? '';
  const role = sp.role ?? 'ALL';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(query
      ? {
          OR: [
            { email: { contains: query } },
            { name: { contains: query } },
          ],
        }
      : {}),
    ...(role !== 'ALL' ? { role: role as 'ADMIN' | 'USER' } : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        enrollments: { select: { id: true, status: true } },
        payments: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>{total} total</p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <form className={styles.searchForm} method="get">
          <div className={styles.searchInput}>
            <Icon name="MagnifyingGlass" size="sm" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by name or email…"
            />
          </div>
          <select name="role" defaultValue={role} className={styles.select}>
            <option value="ALL">All roles</option>
            <option value="USER">Students</option>
            <option value="ADMIN">Admins</option>
          </select>
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>
      </div>

      {users.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="User" size="xl" />
          <p>No users found.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Enrollments</th>
                  <th>Payments</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.userName}>
                          {user.name ?? '—'}
                        </span>
                        <span className={styles.userEmail}>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant={user.role === 'ADMIN' ? 'warning' : 'default'}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        variant={
                          user.status === 'ACTIVE'
                            ? 'success'
                            : user.status === 'SUSPENDED'
                              ? 'danger'
                              : 'default'
                        }
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td>{user.enrollments.length}</td>
                    <td>{user.payments.length}</td>
                    <td className={styles.dateCell}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className={styles.viewBtn}
                      >
                        View
                        <Icon name="ArrowRight" size="sm" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              {page > 1 && (
                <Link
                  href={`/admin/users?q=${query}&role=${role}&page=${page - 1}`}
                  className={styles.pageBtn}
                >
                  <Icon name="CaretLeft" size="sm" /> Previous
                </Link>
              )}
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/admin/users?q=${query}&role=${role}&page=${page + 1}`}
                  className={styles.pageBtn}
                >
                  Next <Icon name="CaretRight" size="sm" />
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
