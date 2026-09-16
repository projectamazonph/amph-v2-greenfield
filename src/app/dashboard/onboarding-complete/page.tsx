/**
 * /dashboard/onboarding-complete — celebration page after Module 0
 * (LEARN-015).
 *
 * Reads the learner's enrollment, asks the pure helper whether they
 * have finished Module 0, and either renders the four-section
 * summary or redirects back to the dashboard with a plain-language
 * explanation. The route is celebration only; it never grants XP,
 * awards badges, or changes entitlement.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { requireAuth } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { resolveOnboardingStatus } from "@/lib/onboardingComplete";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const PPC_FOUNDATIONS_SLUG = "ppc-foundations";

export default async function OnboardingCompletePage() {
  const user = await requireAuth();
  const container = buildContainer();

  const enrollmentsResult = await container.enrollmentRepo.findByUserId(user.id);
  if (!enrollmentsResult.ok) {
    redirect("/dashboard?onboarding=missing");
  }

  const enrollment = enrollmentsResult.value.find(
    (e) => e.courseId === PPC_FOUNDATIONS_SLUG || e.status === "active",
  );

  const catalogResult = await container.getCatalogCourse.execute(PPC_FOUNDATIONS_SLUG);
  if (!catalogResult.ok) {
    redirect("/dashboard?onboarding=missing");
  }
  const catalog = catalogResult.value;

  const modules = catalog.modules.map((m) => ({
    id: m.id,
    title: m.title,
    moduleNumber: m.displayOrder,
    displayOrder: m.displayOrder,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      estimatedMinutes: l.estimatedMinutes,
      displayOrder: l.displayOrder,
    })),
  }));

  const status = resolveOnboardingStatus(modules, enrollment?.completedLessonIds ?? []);

  if (status.kind === "missing_module_zero") {
    redirect("/dashboard?onboarding=missing");
  }

  if (status.kind === "module_zero_incomplete") {
    redirect(`/dashboard?onboarding=incomplete&remaining=${status.missingLessonCount}`);
  }

  if (status.kind === "no_next_module") {
    redirect("/dashboard?onboarding=no-next-module");
  }

  const minutesLabel =
    status.totalMinutes > 0 ? `about ${status.totalMinutes} minutes` : "less than an hour";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>You finished Module 0.</h1>
        <p className={styles.intro}>
          Onboarding is done. The next stop is Module 1: <strong>{status.nextModuleTitle}</strong>.
        </p>
      </header>

      <Card padding="comfortable">
        <h2 className={styles.sectionHeading}>Where you are</h2>
        <p>
          You completed every Module 0 lesson and ran at least one guided practice decision. The
          platform will keep the same safe work loop you learned in onboarding.
        </p>
      </Card>

      <Card padding="comfortable">
        <h2 className={styles.sectionHeading}>Next action</h2>
        <p>
          Open the first {status.nextModuleTitle} lesson and read it end-to-end before running any
          new bid changes.
        </p>
        <Link
          href={`/courses/${PPC_FOUNDATIONS_SLUG}/lessons/${status.nextLesson.id}`}
          className={styles.primaryAction}
        >
          Continue to {status.nextLesson.title}
        </Link>
      </Card>

      <Card padding="comfortable">
        <h2 className={styles.sectionHeading}>Expected time</h2>
        <p>
          Plan {minutesLabel} for {status.nextModuleTitle}. You can finish it in one sitting or
          break it into two.
        </p>
      </Card>

      <Card padding="comfortable">
        <h2 className={styles.sectionHeading}>Where to get help</h2>
        <p>
          Stuck on a term, a lesson, or the simulator? The FAQ has the answers we hear most often.
        </p>
        <Link href="/faq" className={styles.secondaryAction}>
          Open the FAQ
        </Link>
      </Card>

      <div className={styles.footer}>
        <Link href="/dashboard" className={styles.secondaryAction}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
