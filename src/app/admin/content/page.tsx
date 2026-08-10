import Link from "next/link";
import { BookOpen, DownloadSimple, GameController, Question } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@astryxdesign/core";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import styles from "./page.module.css";

const numberFormat = new Intl.NumberFormat("en-US");

export default async function AdminContentPage() {
  await requireAdmin();
  const result = await buildContainer().getAdminContentStats.execute();

  return (
    <div>
      <TopBar title="Content" subtitle="Manage the complete learning catalog from one workspace" />

      {!result.ok ? (
        <Card padding={6} className={styles.cardGap}>
          <p className={styles.error}>Content counts could not be loaded: {result.error.message}</p>
        </Card>
      ) : (
        <section className={styles.statGrid} aria-label="Content counts">
          <CountCard label="Courses" value={result.value.courseCount} />
          <CountCard label="Modules" value={result.value.moduleCount} />
          <CountCard label="Lessons" value={result.value.lessonCount} />
        </section>
      )}

      <section className={styles.actionGrid} aria-label="Content management areas">
        <ContentLink
          href="/admin/courses"
          icon={<BookOpen size={24} weight="duotone" />}
          title="Courses and lessons"
          description="Create courses, organize modules, edit lessons, and control publishing."
        />
        <ContentLink
          href="/admin/quizzes"
          icon={<Question size={24} weight="duotone" />}
          title="Quizzes"
          description="Build assessments, answer options, explanations, and passing scores."
        />
        <ContentLink
          href="/admin/simulators"
          icon={<GameController size={24} weight="duotone" />}
          title="Simulator scenarios"
          description="Draft, publish, version, and archive simulator practice scenarios."
        />
        <ContentLink
          href="/admin/resources"
          icon={<DownloadSimple size={24} weight="duotone" />}
          title="Download center"
          description="Upload and manage guides, templates, handouts, and access tiers."
        />
      </section>

      <Card padding={6}>
        <h2 className={styles.sectionTitle}>How curriculum content is stored</h2>
        <p className={styles.help}>
          Course structure is managed in the database through the course editor. Lesson bodies can
          reference MDX under <code>content/curriculum/</code>, while quizzes and simulator
          scenarios use their dedicated editors above.
        </p>
      </Card>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.countCard}>
      <div className={styles.countLabel}>{label}</div>
      <div className={styles.countValue}>{numberFormat.format(value)}</div>
    </div>
  );
}

function ContentLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className={styles.actionCard}>
      <span className={styles.actionIcon} aria-hidden>
        {icon}
      </span>
      <span className={styles.actionText}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </Link>
  );
}
