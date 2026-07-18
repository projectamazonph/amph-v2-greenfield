import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui';
import { formatDate } from '@/lib/format';
import styles from './courses.module.css';

export const metadata = { title: 'Manage Courses — Admin' };

export default async function AdminCoursesPage() {
  await requireAdmin();

  const courses = await db.course.findMany({
    include: {
      pricingTier: true,
      modules: {
        include: { lessons: { select: { id: true } } },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: [{ isPublished: 'desc' }, { sortOrder: 'asc' }],
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Courses</h1>
          <p className={styles.subtitle}>{courses.length} total</p>
        </div>
      </header>

      <div className={styles.grid}>
        {courses.map((course: typeof courses[number]) => (
          <div key={course.id} className={styles.courseCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.courseTitle}>{course.title}</h2>
                <p className={styles.courseDesc}>{course.description}</p>
              </div>
              <Badge variant={course.isPublished ? 'success' : 'default'}>
                {course.isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <div className={styles.cardMeta}>
              <span>
                <Icon name="BookOpen" size="sm" /> {course.modules.length} modules
              </span>
              <span>
                <Icon name="BookOpen" size="sm" />{' '}
                {course.modules.reduce((acc: number, m: typeof course.modules[number]) => acc + m.lessons.length, 0)} lessons
              </span>
              <span>
                <Icon name="User" size="sm" /> {course._count.enrollments} enrolled
              </span>
              {course.pricingTier && (
                <span>
                   {course.pricingTier.name}
                </span>
              )}
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}>
                {course.publishedAt
                  ? `Published ${formatDate(course.publishedAt)}`
                  : `Created ${formatDate(course.createdAt)}`}
              </span>
              <Link href={`/admin/courses/${course.id}`} className={styles.editBtn}>
                Edit <Icon name="ArrowRight" size="sm" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
