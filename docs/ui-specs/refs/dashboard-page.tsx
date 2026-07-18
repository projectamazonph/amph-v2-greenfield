import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { ProgressStatus } from '@/lib/enums';
import styles from './dashboard.module.css';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireAuth();

  // Get all published courses
  const courses = await db.course.findMany({
    where: { isPublished: true, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      modules: {
        where: { isPublished: true, deletedAt: null },
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { isPublished: true, deletedAt: null },
            orderBy: { lessonNumber: 'asc' },
            select: { id: true },
          },
        },
      },
    },
  });

  // Get user's lesson progress
  const lessonProgress = await db.lessonProgress.findMany({
    where: { userId: user.id, deletedAt: null },
    select: { lessonId: true, status: true },
  });
  const progressMap = new Map(lessonProgress.map((p) => [p.lessonId, p.status]));

  // Compute aggregate stats
  const allLessons = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons));
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => progressMap.get(l.id) === ProgressStatus.COMPLETED).length;
  const inProgressLessons = allLessons.filter((l) => progressMap.get(l.id) === ProgressStatus.IN_PROGRESS).length;

  return (
    <main id="main-content" className="container" style={{ padding: 'var(--space-8) 0' }}>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>
          Welcome, {user.name ?? user.email}
        </h1>
        <p style={{ color: 'var(--ink-500)' }}>
          {totalLessons > 0 ? (
            <>
              {completedLessons} of {totalLessons} lessons complete
              {inProgressLessons > 0 && ` • ${inProgressLessons} in progress`}
            </>
          ) : (
            'No courses published yet. Check back soon.'
          )}
        </p>
      </header>

      <section className={styles.statsRow}>
        <Card padding="md">
          <div className={styles.statBlock}>
            <div className={styles.statValue}>{user.xp}</div>
            <div className={styles.statLabel}>XP earned</div>
          </div>
        </Card>
        <Card padding="md">
          <div className={styles.statBlock}>
            <div className={styles.statValue}>Level {user.level}</div>
            <div className={styles.statLabel}>Current level</div>
          </div>
        </Card>
        <Card padding="md">
          <div className={styles.statBlock}>
            <div className={styles.statValue}>{user.streakDays}</div>
            <div className={styles.statLabel}>Day streak</div>
          </div>
        </Card>
        <Card padding="md">
          <div className={styles.statBlock}>
            <div className={styles.statValue}>{courses.length}</div>
            <div className={styles.statLabel}>Courses</div>
          </div>
        </Card>
      </section>

      <section>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Courses</h2>
        <div className={styles.courseGrid}>
          {courses.map((course) => {
            const courseLessons = course.modules.flatMap((m) => m.lessons);
            const courseCompleted = courseLessons.filter(
              (l) => progressMap.get(l.id) === ProgressStatus.COMPLETED
            ).length;
            const pct = courseLessons.length > 0
              ? Math.round((courseCompleted / courseLessons.length) * 100)
              : 0;

            return (
              <Card key={course.id} variant="interactive" padding="md">
                <Link href={`/courses/${course.slug}` as never} className={styles.courseLink}>
                  <CardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <CardTitle>{course.title}</CardTitle>
                      <Badge variant="default">{course.difficulty}</Badge>
                    </div>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={styles.courseMeta}>
                    <span>{courseCompleted} / {courseLessons.length} lessons</span>
                    <span>{pct}% complete</span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Tools</h2>
        <p style={{ color: 'var(--ink-500)', marginBottom: 'var(--space-4)' }}>
          Practice real Amazon Advertising Console workflows with synthetic data.
        </p>
        <Link href="/tools" className={styles.ctaPrimary}>
          Open the tools
        </Link>
      </section>
    </main>
  );
}